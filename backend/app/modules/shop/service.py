from app.core.transactions import serialize_user, lock_user
import uuid
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.storage import StorageService
from app.core.media_cleanup import delete_unreferenced_media
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.schemas import EquipResponse, InventoryItemResponse, ShopBuyResponse, ShopItemResponse, card_fields
from app.core.card_media import MAX_CARD_BYTES, save_card_async, inspect_saved_card_async
from app.core.background_media import save_background_async, inspect_saved_background_async
from app.modules.shop.locking import serialize_shop_catalog
from app.modules.users.models import User


class ShopService:
    @staticmethod
    async def list_items(
        db: AsyncSession,
        user_id: Optional[int] = None,
        item_type: Optional[str] = None
    ) -> List[ShopItemResponse]:
        query = select(ShopItem).where(ShopItem.is_available.is_(True), ShopItem.item_type.in_(['frame', 'background']))
        if item_type:
            query = query.where(ShopItem.item_type == item_type)
        query = query.order_by(ShopItem.price_coins.asc())

        result = await db.execute(query)
        items = result.scalars().all()

        owned_ids = set()
        if user_id:
            inv_stmt = select(UserInventory.item_id).where(UserInventory.user_id == user_id)
            inv_res = await db.execute(inv_stmt)
            owned_ids = set(inv_res.scalars().all())

        return [
            ShopItemResponse(
                id=item.id,
                name=item.name,
                item_type=item.item_type,
                price_coins=item.price_coins,
                asset_url=item.asset_url,
                is_owned=(item.id in owned_ids), **card_fields(item)
            )
            for item in items
        ]

    @staticmethod
    async def list_user_inventory(
        db: AsyncSession,
        user_id: int,
        item_type: Optional[str] = None
    ) -> List[InventoryItemResponse]:
        query = (
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == user_id)
            .order_by(UserInventory.purchased_at.desc())
        )
        res = await db.execute(query)
        inventories = res.scalars().all()

        results = []
        for inv in inventories:
            if not inv.item:
                continue
            if item_type and inv.item.item_type != item_type:
                continue
            results.append(
                InventoryItemResponse(
                    id=inv.item.id,
                    name=inv.item.name,
                    item_type=inv.item.item_type,
                    price_coins=inv.item.price_coins,
                    asset_url=inv.item.asset_url,
                    is_active=inv.is_active,
                    purchased_at=inv.purchased_at, **card_fields(inv.item)
                )
            )
        return results

    @staticmethod
    @serialize_user
    @serialize_shop_catalog
    async def buy_item(db: AsyncSession, user_id: int, item_id: int, expected_price: Optional[int] = None) -> ShopBuyResponse:
        # 3. Check user balance
        u_stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        # 1. Fetch item
        stmt = select(ShopItem).where(ShopItem.id == item_id, ShopItem.is_available.is_(True)).with_for_update()
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do'kon buyumi topilmadi")
        if item.item_type == 'card':
            raise HTTPException(422, 'Character cards are obtainable only through Character Card Gacha')
        if expected_price is not None and item.price_coins != expected_price:
            raise HTTPException(409, 'Item price changed. Refresh the offer and confirm its new price.')

        # 2. Check if already owned
        inv_stmt = select(UserInventory).where(UserInventory.user_id == user_id, UserInventory.item_id == item_id)
        inv_res = await db.execute(inv_stmt)
        if inv_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Siz ushbu buyumni avval sotib olgansiz"
            )

        if user.lightning_coins < item.price_coins:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu buyumni sotib olish uchun Chaqmoq balansingiz yetarli emas"
            )

        # 4. Deduct coins and add to inventory
        user.lightning_coins -= item.price_coins
        new_inv = UserInventory(
            user_id=user.id,
            item_id=item.id,
            is_active=False
        )
        db.add(new_inv)

        from app.modules.rewards.service import RewardService
        await RewardService.record_transaction(
            db=db,
            user_id=user.id,
            amount=-item.price_coins,
            transaction_type="shop_purchase",
            description=f"'{item.name}' buyumini xarid qilish"
        )

        await db.commit()
        await db.refresh(user)

        return ShopBuyResponse(
            item_id=item.id,
            item_name=item.name,
            price_paid=item.price_coins,
            remaining_coins=user.lightning_coins
        )

    @staticmethod
    @serialize_user
    async def equip_item(db: AsyncSession, user_id: int, item_id: int) -> EquipResponse:
        if await lock_user(db, user_id) is None:
            raise HTTPException(404, 'User not found')
        # 1. Fetch target item from inventory with item loaded
        inv_stmt = (
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == user_id, UserInventory.item_id == item_id)
        )
        inv_res = await db.execute(inv_stmt)
        target_inv = inv_res.scalar_one_or_none()
        if not target_inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Siz bu buyumni hali sotib olmagansiz"
            )

        target_type = target_inv.item.item_type
        if target_type == 'card':
            raise HTTPException(422, 'Feature collectible cards through the collection showcase')

        # 2. Deactivate any existing active item of the same item_type
        all_user_items_stmt = (
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == user_id, UserInventory.is_active.is_(True))
        )
        all_res = await db.execute(all_user_items_stmt)
        active_items = all_res.scalars().all()

        for a in active_items:
            if a.item.item_type == target_type:
                a.is_active = False

        # 3. Activate target item
        target_inv.is_active = True
        await db.commit()

        return EquipResponse(
            item_id=item_id,
            item_type=target_type,
            is_active=True
        )

    @staticmethod
    @serialize_user
    async def unequip_item(db: AsyncSession, user_id: int, item_id: int) -> None:
        stmt = (
            update(UserInventory)
            .where(UserInventory.user_id == user_id, UserInventory.item_id == item_id)
            .values(is_active=False)
        )
        res = await db.execute(stmt)
        if res.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventarda buyum topilmadi")
        await db.commit()

    @staticmethod
    async def create_item(
        db: AsyncSession,
        name: str,
        item_type: str,
        price_coins: Optional[int] = None,
        asset_file: Optional[UploadFile] = None,
        asset_url: Optional[str] = None,
        rarity: Optional[str] = None,
        character_name: Optional[str] = None,
        series_title: Optional[str] = None,
        webtoon_id: Optional[int] = None,
    ) -> ShopItem:
        if item_type == 'card':
            if price_coins not in (None, 0):
                raise HTTPException(422, 'Character cards have no purchase price; add them to a gacha pool')
            price_coins = 0
        elif price_coins is None or price_coins < 1:
            raise HTTPException(422, 'Frames and backgrounds require a positive purchase price')
        final_url = asset_url or ""
        derived = {}
        metadata = await ShopService.validate_card_metadata(db, item_type, rarity, character_name, series_title, webtoon_id)
        if asset_file and asset_file.filename:
            if item_type == 'card':
                derived = await save_card_async(await asset_file.read(MAX_CARD_BYTES + 1))
                final_url = derived['asset_url']
            elif item_type == 'background':
                derived = await save_background_async(await asset_file.read(20 * 1024 * 1024 + 1), asset_file.filename)
                final_url = derived['asset_url']
            else:
                file_ext = asset_file.filename.split(".")[-1].lower() if asset_file.filename else "png"
                folder = "frames" if item_type == "frame" else "backgrounds"
                object_name = f"{folder}/{uuid.uuid4().hex[:10]}.{file_ext}"
                content = await asset_file.read(20*1024*1024+1)
                final_url = await StorageService.upload_file_async(bucket_name=settings.MINIO_BUCKET_SHOP,
                    object_name=object_name, data=content, content_type=asset_file.content_type or "image/png")
        if item_type == 'card' and not derived:
            derived = await inspect_saved_card_async(final_url)
        elif item_type == 'background' and not derived:
            derived = await inspect_saved_background_async(final_url)

        item = ShopItem(
            name=name,
            item_type=item_type,
            price_coins=price_coins,
            asset_url=final_url,
            is_available=True, **metadata, **{key: value for key, value in derived.items() if key != 'asset_url'}
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def list_staff_items(db: AsyncSession):
        stmt = select(ShopItem).order_by(ShopItem.created_at.desc())
        res = await db.execute(stmt)
        items = res.scalars().all()
        owned = dict((await db.execute(select(UserInventory.item_id, func.count(UserInventory.id)).group_by(UserInventory.item_id))).all())
        return [{column.name: getattr(item, column.name) for column in ShopItem.__table__.columns} | {
            'owned_count': owned.get(item.id, 0), 'identity_locked': item.item_type == 'card' and owned.get(item.id, 0) > 0} for item in items]

    @staticmethod
    async def validate_card_metadata(db, item_type, rarity, character_name, series_title, webtoon_id):
        if item_type != 'card':
            if any(value is not None for value in [rarity, character_name, series_title, webtoon_id]):
                raise HTTPException(422, 'Character metadata applies to collectible cards only')
            return {}
        if rarity not in {'common', 'rare', 'epic', 'legendary'} or not character_name or not character_name.strip() or len(character_name) > 100:
            raise HTTPException(422, 'Choose a valid rarity and enter a character name up to 100 characters')
        if series_title is not None and len(series_title) > 255:
            raise HTTPException(422, 'Series title must be at most 255 characters')
        if webtoon_id is not None:
            from app.modules.webtoons.models import Webtoon
            work = await db.get(Webtoon, webtoon_id)
            if work is None:
                raise HTTPException(422, 'Linked series does not exist')
            series_title = series_title.strip() if series_title else work.title
        return {'rarity': rarity, 'character_name': character_name.strip(), 'series_title': series_title.strip() or None if series_title else None, 'webtoon_id': webtoon_id}

    @staticmethod
    @serialize_shop_catalog
    async def update_item(
        db: AsyncSession,
        item_id: int,
        name: Optional[str] = None,
        price_coins: Optional[int] = None,
        asset_url: Optional[str] = None,
        is_available: Optional[bool] = None,
        rarity: Optional[str] = None, character_name: Optional[str] = None,
        series_title: Optional[str] = None, webtoon_id: Optional[int] = None,
        metadata_fields: Optional[set] = None,
    ) -> ShopItem:
        from app.modules.gacha.locking import lock_card_pools
        linked_pools = await lock_card_pools(db, item_id)
        stmt = select(ShopItem).where(ShopItem.id == item_id).with_for_update().execution_options(populate_existing=True)
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do'kon buyumi topilmadi")

        old_asset = item.asset_url
        old_preview = item.asset_preview_url
        old_rarity, old_available = item.rarity, item.is_available
        if item.item_type == 'card':
            if price_coins not in (None, 0):
                raise HTTPException(422, 'Character cards cannot have a purchase price')
            item.price_coins = 0
            fields = metadata_fields or set()
            metadata = await ShopService.validate_card_metadata(db, 'card',
                rarity if 'rarity' in fields else item.rarity,
                character_name if 'character_name' in fields else item.character_name,
                series_title if 'series_title' in fields else item.series_title,
                webtoon_id if 'webtoon_id' in fields else item.webtoon_id)
            identity_changed = (name is not None and name != item.name) or any(getattr(item, key) != value for key, value in metadata.items())
            if identity_changed and await db.scalar(select(UserInventory.id).where(UserInventory.item_id == item.id).limit(1)):
                raise HTTPException(409, 'This card is already collected. Its name, character, series and rarity cannot change; create another card instead')
            for key, value in metadata.items():
                setattr(item, key, value)
            if asset_url is not None and asset_url.strip():
                for key, value in (await inspect_saved_card_async(asset_url.strip())).items():
                    setattr(item, key, value)
        elif any(value is not None for value in [rarity, character_name, series_title, webtoon_id]):
            raise HTTPException(422, 'Character metadata applies to collectible cards only')
        if item.item_type != 'card' and price_coins is not None and price_coins < 1:
            raise HTTPException(422, 'Frames and backgrounds require a positive purchase price')
        if item.item_type == 'background' and asset_url is not None and asset_url.strip():
            for key, value in (await inspect_saved_background_async(asset_url.strip())).items():
                setattr(item, key, value)
        if name is not None:
            item.name = name
        if price_coins is not None:
            item.price_coins = price_coins
        if asset_url is not None and asset_url.strip():
            item.asset_url = asset_url.strip()
        if is_available is not None:
            item.is_available = is_available
        if old_rarity != item.rarity or old_available != item.is_available:
            for pool in linked_pools:
                pool.version += 1

        await db.commit()
        await db.refresh(item)
        if old_asset != item.asset_url:
            await delete_unreferenced_media(db, old_asset)
        if old_preview != item.asset_preview_url:
            await delete_unreferenced_media(db, old_preview)
        return item

    @staticmethod
    @serialize_shop_catalog
    async def delete_item(db: AsyncSession, item_id: int) -> None:
        from app.modules.gacha.locking import lock_card_pools
        linked_pools = await lock_card_pools(db, item_id)
        stmt = select(ShopItem).where(ShopItem.id == item_id).with_for_update().execution_options(populate_existing=True)
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do'kon buyumi topilmadi")

        from app.modules.wheel.models import WheelItem
        from app.modules.gacha.models import GachaRoll
        if linked_pools or await db.scalar(select(GachaRoll.id).where(GachaRoll.item_id == item_id).limit(1)) or await db.scalar(select(UserInventory.id).where(UserInventory.item_id == item_id).limit(1)) or await db.scalar(select(WheelItem.id).where(WheelItem.shop_item_id == item_id).limit(1)):
            raise HTTPException(409, "This item is owned or used by a reward pool. Make it unavailable instead of deleting it.")
        old_asset = item.asset_url
        old_preview = item.asset_preview_url
        await db.delete(item)
        await db.commit()
        await delete_unreferenced_media(db, old_asset)
        await delete_unreferenced_media(db, old_preview)
