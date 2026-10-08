"""Owned card summaries and an ordered, inventory-backed profile showcase."""
from sqlalchemy import delete, func, select
from fastapi import HTTPException
from app.core.transactions import entity_lock, lock_user
from app.modules.shop.models import ShopItem, UserInventory, UserFeaturedCard
from app.modules.shop.schemas import ShopItemResponse, card_fields

RARITIES = ('common', 'rare', 'epic', 'legendary')


async def collection_summary(db, user_id):
    counts = {rarity: 0 for rarity in RARITIES}
    rows = await db.execute(select(ShopItem.rarity, func.count(UserInventory.id)).join(
        UserInventory, UserInventory.item_id == ShopItem.id).where(
        UserInventory.user_id == user_id, ShopItem.item_type == 'card').group_by(ShopItem.rarity))
    for rarity, count in rows:
        counts[rarity or 'common'] = count
    items = (await db.scalars(select(ShopItem).join(UserFeaturedCard, UserFeaturedCard.item_id == ShopItem.id)
        .join(UserInventory, (UserInventory.item_id == ShopItem.id) & (UserInventory.user_id == user_id))
        .where(UserFeaturedCard.user_id == user_id, ShopItem.item_type == 'card')
        .order_by(UserFeaturedCard.order_index))).all()
    return {'total_cards': sum(counts.values()), 'rarity_counts': counts,
            'featured_cards': [ShopItemResponse(id=item.id, name=item.name, item_type=item.item_type,
                price_coins=item.price_coins, asset_url=item.asset_url, is_owned=True, **card_fields(item)) for item in items]}


async def feature_cards(db, user_id, item_ids):
    async with entity_lock('user', user_id):
        await lock_user(db, user_id)
        owned = set((await db.scalars(select(UserInventory.item_id).join(ShopItem).where(
            UserInventory.user_id == user_id, ShopItem.item_type == 'card', UserInventory.item_id.in_(item_ids)))).all())
        if owned != set(item_ids):
            raise HTTPException(422, 'Only cards owned by this account can be featured')
        await db.execute(delete(UserFeaturedCard).where(UserFeaturedCard.user_id == user_id))
        for order, item_id in enumerate(item_ids):
            db.add(UserFeaturedCard(user_id=user_id, item_id=item_id, order_index=order))
        await db.commit()
        return await collection_summary(db, user_id)
