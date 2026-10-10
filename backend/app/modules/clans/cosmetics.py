"""Clan-owned cosmetics use the shared catalog and the acting leader's wallet."""
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.transactions import lock_user, serialize_clan, serialize_user
from app.modules.clans.models import Clan, ClanInventory, ClanMember
from app.modules.rewards.service import RewardService
from app.modules.shop.locking import serialize_shop_catalog
from app.modules.shop.models import ShopItem
from app.modules.shop.schemas import InventoryItemResponse, ShopItemResponse, card_fields

COSMETIC_TYPES = ('frame', 'background')
MANAGER_ROLES = ('leader', 'co_leader')


async def lock_clan(db, clan_id):
    clan = await db.scalar(select(Clan).where(Clan.id == clan_id).with_for_update()
        .execution_options(populate_existing=True))
    if clan is None:
        raise HTTPException(404, 'Clan not found')
    return clan


async def require_clan_member(db, clan_id, user_id, *, manage=False):
    member = await db.scalar(select(ClanMember).where(ClanMember.clan_id == clan_id,
        ClanMember.user_id == user_id).execution_options(populate_existing=True))
    if member is None:
        raise HTTPException(403, 'Only clan members may view the clan shop and inventory')
    if manage and member.role not in MANAGER_ROLES:
        raise HTTPException(403, 'Only the clan leader or co-leader may buy or equip clan cosmetics')
    return member


def _active_asset(item):
    return {'id': item.id, 'name': item.name, 'asset_url': item.asset_url,
        'asset_preview_url': item.asset_preview_url, 'asset_animated': item.asset_animated}


def empty_cosmetics():
    return {'frame_url': None, 'banner_url': None, 'active_frame': None, 'active_background': None}


async def batch_active_cosmetics(db, clan_ids):
    """Resolve purchased appearances in one query, ignoring legacy raw URLs."""
    ids = set(clan_ids)
    results = {clan_id: empty_cosmetics() for clan_id in ids}
    if not ids:
        return results
    rows = (await db.execute(select(ClanInventory.clan_id, ShopItem)
        .join(ShopItem, ShopItem.id == ClanInventory.item_id)
        .where(ClanInventory.clan_id.in_(ids), ClanInventory.is_active.is_(True),
            ShopItem.item_type.in_(COSMETIC_TYPES)).order_by(ClanInventory.id))).all()
    for clan_id, item in rows:
        key = 'active_frame' if item.item_type == 'frame' else 'active_background'
        results[clan_id][key] = _active_asset(item)
        results[clan_id]['frame_url' if item.item_type == 'frame' else 'banner_url'] = item.asset_url
    return results


class ClanCosmeticService:
    @staticmethod
    async def list_shop(db, clan_id, user_id):
        if await db.get(Clan, clan_id) is None:
            raise HTTPException(404, 'Clan not found')
        await require_clan_member(db, clan_id, user_id)
        items = (await db.scalars(select(ShopItem).where(ShopItem.is_available.is_(True),
            ShopItem.item_type.in_(COSMETIC_TYPES)).order_by(ShopItem.price_coins, ShopItem.id))).all()
        owned = set((await db.scalars(select(ClanInventory.item_id).where(ClanInventory.clan_id == clan_id))).all())
        return [ShopItemResponse(id=item.id, name=item.name, item_type=item.item_type,
            price_coins=item.price_coins, asset_url=item.asset_url, is_owned=item.id in owned,
            **card_fields(item)) for item in items]

    @staticmethod
    async def list_inventory(db, clan_id, user_id):
        if await db.get(Clan, clan_id) is None:
            raise HTTPException(404, 'Clan not found')
        await require_clan_member(db, clan_id, user_id)
        owned = (await db.scalars(select(ClanInventory).options(selectinload(ClanInventory.item))
            .where(ClanInventory.clan_id == clan_id)
            .order_by(ClanInventory.purchased_at.desc(), ClanInventory.id.desc()))).all()
        return [InventoryItemResponse(id=entry.item.id, name=entry.item.name,
            item_type=entry.item.item_type, price_coins=entry.item.price_coins,
            asset_url=entry.item.asset_url, is_active=entry.is_active,
            purchased_at=entry.purchased_at, **card_fields(entry.item))
            for entry in owned if entry.item and entry.item.item_type in COSMETIC_TYPES]

    @staticmethod
    @serialize_user
    @serialize_clan
    async def buy_item(db, clan_id, user_id, item_id, expected_price):
        # The same order is used for personal spending, membership changes and
        # catalog writes: wallet -> clan -> shared catalog -> item/inventory.
        user = await lock_user(db, user_id)
        if user is None or not user.is_active:
            raise HTTPException(403, 'Account is unavailable')
        await lock_clan(db, clan_id)
        await require_clan_member(db, clan_id, user_id, manage=True)
        return await ClanCosmeticService._buy_locked(db, clan_id, user, item_id, expected_price)

    @staticmethod
    @serialize_shop_catalog
    async def _buy_locked(db, clan_id, user, item_id, expected_price):
        item = await db.scalar(select(ShopItem).where(ShopItem.id == item_id)
            .with_for_update().execution_options(populate_existing=True))
        if item is None:
            raise HTTPException(404, 'Shop item not found')
        if item.item_type not in COSMETIC_TYPES:
            raise HTTPException(422, 'Clans can buy only avatar frames and backgrounds; cards are obtained through Character Card Gacha')
        if not item.is_available:
            raise HTTPException(404, 'This shop item is no longer available')
        if item.price_coins != expected_price:
            raise HTTPException(409, 'Item price changed. Refresh the offer and confirm its new price.')
        if await db.scalar(select(ClanInventory.id).where(ClanInventory.clan_id == clan_id,
            ClanInventory.item_id == item_id)) is not None:
            raise HTTPException(409, 'The clan already owns this item')
        if user.lightning_coins < item.price_coins:
            raise HTTPException(400, 'Not enough Lightning to buy this clan cosmetic')
        user.lightning_coins -= item.price_coins
        db.add(ClanInventory(clan_id=clan_id, item_id=item_id,
            purchased_by_user_id=user.id, price_paid=item.price_coins, is_active=False))
        await RewardService.record_transaction(db, user.id, -item.price_coins,
            'clan_shop_purchase', f'Clan #{clan_id} cosmetic: {item.name}')
        response = {'item_id': item.id, 'item_name': item.name,
            'price_paid': item.price_coins, 'new_balance': user.lightning_coins}
        await db.commit()
        return response

    @staticmethod
    @serialize_user
    @serialize_clan
    async def equip_item(db, clan_id, user_id, item_id):
        user = await lock_user(db, user_id)
        if user is None or not user.is_active:
            raise HTTPException(403, 'Account is unavailable')
        await lock_clan(db, clan_id)
        await require_clan_member(db, clan_id, user_id, manage=True)
        return await ClanCosmeticService._set_active_locked(db, clan_id, item_id, True)

    @staticmethod
    @serialize_user
    @serialize_clan
    async def unequip_item(db, clan_id, user_id, item_id):
        user = await lock_user(db, user_id)
        if user is None or not user.is_active:
            raise HTTPException(403, 'Account is unavailable')
        await lock_clan(db, clan_id)
        await require_clan_member(db, clan_id, user_id, manage=True)
        return await ClanCosmeticService._set_active_locked(db, clan_id, item_id, False)

    @staticmethod
    @serialize_shop_catalog
    async def _set_active_locked(db, clan_id, item_id, active):
        item = await db.scalar(select(ShopItem).where(ShopItem.id == item_id)
            .with_for_update().execution_options(populate_existing=True))
        if item is not None and item.item_type not in COSMETIC_TYPES:
            raise HTTPException(422, 'Only purchased clan frames and backgrounds can be equipped')
        entry = await db.scalar(select(ClanInventory).where(ClanInventory.clan_id == clan_id,
            ClanInventory.item_id == item_id).with_for_update().execution_options(populate_existing=True))
        if entry is None or item is None:
            raise HTTPException(404, 'This item is not in the clan inventory')
        if active:
            same_type = select(ShopItem.id).where(ShopItem.item_type == item.item_type)
            await db.execute(update(ClanInventory).where(ClanInventory.clan_id == clan_id,
                ClanInventory.item_id.in_(same_type), ClanInventory.is_active.is_(True)).values(is_active=False))
        entry.is_active = active
        await db.commit()
        return {'item_id': item_id, 'item_type': item.item_type, 'is_active': active}
