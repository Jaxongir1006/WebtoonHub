import uuid
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.storage import StorageService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.schemas import EquipResponse, ShopBuyResponse, ShopItemResponse
from app.modules.users.models import User


class ShopService:
    @staticmethod
    async def list_items(
        db: AsyncSession,
        user_id: Optional[int] = None,
        item_type: Optional[str] = None
    ) -> List[ShopItemResponse]:
        query = select(ShopItem).where(ShopItem.is_available.is_(True))
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
                is_owned=(item.id in owned_ids)
            )
            for item in items
        ]

    @staticmethod
    async def buy_item(db: AsyncSession, user_id: int, item_id: int) -> ShopBuyResponse:
        # 1. Fetch item
        stmt = select(ShopItem).where(ShopItem.id == item_id, ShopItem.is_available.is_(True))
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do'kon buyumi topilmadi")

        # 2. Check if already owned
        inv_stmt = select(UserInventory).where(UserInventory.user_id == user_id, UserInventory.item_id == item_id)
        inv_res = await db.execute(inv_stmt)
        if inv_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Siz ushbu buyumni avval sotib olgansiz"
            )

        # 3. Check user balance
        u_stmt = select(User).where(User.id == user_id)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

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
        await db.commit()
        await db.refresh(user)

        return ShopBuyResponse(
            item_id=item.id,
            item_name=item.name,
            price_paid=item.price_coins,
            remaining_coins=user.lightning_coins
        )

    @staticmethod
    async def equip_item(db: AsyncSession, user_id: int, item_id: int) -> EquipResponse:
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
        price_coins: int,
        asset_file: UploadFile
    ) -> ShopItem:
        file_ext = asset_file.filename.split(".")[-1].lower() if asset_file.filename else "png"
        folder = "frames" if item_type == "frame" else "backgrounds"
        object_name = f"{folder}/{uuid.uuid4().hex[:10]}.{file_ext}"

        content = await asset_file.read()
        asset_url = StorageService.upload_file(
            bucket_name=settings.MINIO_BUCKET_SHOP,
            object_name=object_name,
            data=content,
            content_type=asset_file.content_type or "image/png"
        )

        item = ShopItem(
            name=name,
            item_type=item_type,
            price_coins=price_coins,
            asset_url=asset_url,
            is_available=True
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item
