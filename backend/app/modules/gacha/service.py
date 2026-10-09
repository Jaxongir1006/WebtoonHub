"""Backend-only, weighted character draws with one atomic durable receipt."""
import secrets
from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from app.core.idempotency import begin_operation, commit_operation
from app.core.transactions import lock_user, serialize_user
from app.modules.gacha.models import GachaPool, GachaPoolCard, GachaRoll
from app.modules.gacha.schemas import RARITIES, RollResponse
from app.modules.rewards.service import RewardService
from app.modules.shop.locking import serialize_shop_catalog
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.schemas import ShopItemResponse, card_fields


def weighted_pick(values, weights):
    """Integer cumulative weights avoid client seeds and floating point bias."""
    ticket = secrets.randbelow(sum(weights))
    for value, weight in zip(values, weights):
        if ticket < weight:
            return value
        ticket -= weight
    raise RuntimeError('Invalid draw weights')


def card_response(item, owned=False):
    return ShopItemResponse(id=item.id, name=item.name, item_type=item.item_type,
        price_coins=0, asset_url=item.asset_url, is_owned=owned, **card_fields(item))


def eligible_groups(pool):
    groups = {rarity: [] for rarity in RARITIES}
    for member in pool.cards:
        item = member.item
        if item and item.item_type == 'card' and item.is_available and member.weight > 0 and item.rarity in groups:
            groups[item.rarity].append(member)
    return {rarity: cards for rarity, cards in groups.items() if cards and pool.rarity_weights.get(rarity, 0) > 0}


async def load_pool(db, pool_id, lock=False):
    query = select(GachaPool).where(GachaPool.id == pool_id).options(selectinload(GachaPool.cards).selectinload(GachaPoolCard.item))
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    pool = await db.scalar(query)
    if pool is None:
        raise HTTPException(404, 'Character card pool not found')
    return pool


async def pool_response(db, pool, user_id=None, include_cards=True, staff=False):
    groups = eligible_groups(pool)
    total = sum(pool.rarity_weights[rarity] for rarity in groups)
    rates = [{'rarity': rarity, 'weight': pool.rarity_weights.get(rarity, 0),
        'probability_percent': pool.rarity_weights[rarity] / total * 100 if rarity in groups else 0.0} for rarity in RARITIES]
    response = dict(id=pool.id, title=pool.title, description=pool.description, cost_coins=pool.cost_coins,
        is_active=pool.is_active, version=pool.version, cards_count=sum(map(len, groups.values())),
        rarity_rates=rates, duplicate_refund='full_cost')
    if staff:
        response['rarity_weights'] = pool.rarity_weights
    if include_cards:
        owned = set((await db.scalars(select(UserInventory.item_id).where(UserInventory.user_id == user_id))).all()) if user_id else set()
        cards = []
        for member in pool.cards:
            item = member.item
            if item is None:
                continue
            rarity_members = groups.get(item.rarity, [])
            eligible = member in rarity_members
            if not staff and not eligible:
                continue
            probability = pool.rarity_weights[item.rarity] / total * member.weight / sum(card.weight for card in rarity_members) * 100 if eligible else 0.0
            cards.append(card_response(item, item.id in owned).model_dump() | {'weight': member.weight,
                'probability_percent': probability, 'is_available': item.is_available})
        response['cards'] = cards
    return response


class GachaService:
    @staticmethod
    async def list_pools(db, user_id=None, staff=False):
        query = select(GachaPool).options(selectinload(GachaPool.cards).selectinload(GachaPoolCard.item)).order_by(GachaPool.id)
        if not staff:
            query = query.where(GachaPool.is_active.is_(True))
        pools = (await db.scalars(query)).all()
        return [await pool_response(db, pool, user_id, include_cards=staff, staff=staff) for pool in pools]

    @staticmethod
    async def detail(db, pool_id, user_id=None):
        pool = await load_pool(db, pool_id)
        if not pool.is_active:
            raise HTTPException(404, 'Character card pool not found')
        return await pool_response(db, pool, user_id)

    @staticmethod
    @serialize_shop_catalog
    async def configure(db, data, pool_id=None):
        pool = await load_pool(db, pool_id, lock=True) if pool_id is not None else GachaPool(version=1)
        if pool_id is not None and data.expected_version != pool.version:
            raise HTTPException(409, 'Pool settings changed. Refresh before saving.')
        values = data.model_dump(exclude_unset=True)
        for key in ['title', 'description', 'cost_coins', 'is_active', 'rarity_weights']:
            if key in values:
                if values[key] is None and key != 'description':
                    raise HTTPException(422, f'{key} cannot be null')
                setattr(pool, key, values[key])
        if pool_id is None:
            defaults = data.model_dump()
            for key in ['title', 'description', 'cost_coins', 'is_active', 'rarity_weights']:
                setattr(pool, key, defaults[key])
            db.add(pool)
            await db.flush()
        if 'cards' in values or pool_id is None:
            if data.cards is None:
                raise HTTPException(422, 'cards cannot be null')
            ids = [card.item_id for card in data.cards]
            items = (await db.scalars(select(ShopItem).where(ShopItem.id.in_(ids)).order_by(ShopItem.id).with_for_update()
                .execution_options(populate_existing=True))).all() if ids else []
            if len(items) != len(ids) or any(item.item_type != 'card' for item in items):
                raise HTTPException(422, 'Pool prizes must be existing character cards')
            await db.execute(delete(GachaPoolCard).where(GachaPoolCard.pool_id == pool.id))
            db.add_all([GachaPoolCard(pool_id=pool.id, item_id=card.item_id, weight=card.weight) for card in data.cards])
            await db.flush()
        if pool_id is not None:
            pool.version += 1
        await db.flush()
        pool = await load_pool(db, pool.id, lock=True)
        if pool.is_active and not eligible_groups(pool):
            raise HTTPException(422, 'Add an available character card with a positive rarity weight before activating this pool')
        response = await pool_response(db, pool, staff=True)
        await db.commit()
        return response

    @staticmethod
    @serialize_shop_catalog
    async def archive(db, pool_id):
        pool = await load_pool(db, pool_id, lock=True)
        pool.is_active = False
        pool.version += 1
        await db.commit()

    @staticmethod
    @serialize_user
    @serialize_shop_catalog
    async def roll(db, user_id, pool_id, intent):
        receipt, replay = await begin_operation(db, f'reader:{user_id}', 'gacha.roll', intent.operation_key,
            {'pool_id': pool_id, 'expected_cost': intent.expected_cost, 'expected_version': intent.expected_version})
        if replay is not None:
            return RollResponse.model_validate(replay)
        user = await lock_user(db, user_id)
        if user is None:
            raise HTTPException(404, 'User not found')
        pool = await load_pool(db, pool_id, lock=True)
        if not pool.is_active:
            raise HTTPException(409, 'This character card pool is no longer active')
        if intent.expected_cost != pool.cost_coins or intent.expected_version != pool.version:
            raise HTTPException(409, 'Draw price or drop rates changed. Refresh and confirm again.')
        ids = sorted(member.item_id for member in pool.cards)
        items = (await db.scalars(select(ShopItem).where(ShopItem.id.in_(ids)).order_by(ShopItem.id).with_for_update()
            .execution_options(populate_existing=True))).all() if ids else []
        # Refresh identity/availability after obtaining catalog row locks.
        by_id = {item.id: item for item in items}
        for member in pool.cards:
            member.item = by_id.get(member.item_id)
        groups = eligible_groups(pool)
        if not groups:
            raise HTTPException(409, 'This pool currently has no available character cards')
        if user.lightning_coins < pool.cost_coins:
            raise HTTPException(400, 'Not enough Lightning for this draw')
        rarity = weighted_pick(list(groups), [pool.rarity_weights[key] for key in groups])
        winner = weighted_pick(groups[rarity], [card.weight for card in groups[rarity]]).item
        duplicate = await db.scalar(select(UserInventory.id).where(UserInventory.user_id == user_id, UserInventory.item_id == winner.id)) is not None
        user.lightning_coins -= pool.cost_coins
        await RewardService.record_transaction(db, user_id, -pool.cost_coins, 'gacha_roll', f"Character draw: {pool.title}")
        refund = pool.cost_coins if duplicate else 0
        if duplicate:
            user.lightning_coins += refund
            await RewardService.record_transaction(db, user_id, refund, 'gacha_duplicate_refund', f"Duplicate character card: {winner.name}")
        else:
            db.add(UserInventory(user_id=user_id, item_id=winner.id, is_active=False))
        winning_card = card_response(winner, True)
        roll = GachaRoll(user_id=user_id, pool_id=pool.id, item_id=winner.id, pool_title=pool.title,
            pool_version=pool.version, card_snapshot=winning_card.model_dump(mode='json'), cost_paid=pool.cost_coins,
            is_duplicate=duplicate, refund_coins=refund)
        db.add(roll)
        await db.flush()
        candidates = [member.item for cards in groups.values() for member in cards]
        animation_cards = [card_response(secrets.choice(candidates)) for _ in range(40)]
        animation_cards[35] = winning_card
        message = f'You already own {winner.name}. Your {refund} Lightning draw cost was refunded.' if duplicate else f'{winner.name} joined your collection!'
        response = RollResponse(roll_id=roll.id, pool_id=pool.id, winning_card=winning_card, animation_cards=animation_cards,
            winning_index=35, new_balance=user.lightning_coins, cost_paid=pool.cost_coins,
            is_duplicate=duplicate, refund_coins=refund, message=message)
        await commit_operation(db, receipt, response)
        return response

    @staticmethod
    async def history(db, user_id=None, pool_id=None, limit=20, staff=False):
        query = select(GachaRoll).order_by(GachaRoll.id.desc()).limit(limit)
        if user_id is not None:
            query = query.where(GachaRoll.user_id == user_id)
        if pool_id is not None:
            query = query.where(GachaRoll.pool_id == pool_id)
        rolls = (await db.scalars(query)).all()
        return [dict(id=roll.id, pool_id=roll.pool_id, pool_title=roll.pool_title, winning_card=roll.card_snapshot,
            cost_paid=roll.cost_paid, is_duplicate=roll.is_duplicate, refund_coins=roll.refund_coins,
            created_at=roll.created_at, **({'user_id': roll.user_id} if staff else {})) for roll in rolls]
