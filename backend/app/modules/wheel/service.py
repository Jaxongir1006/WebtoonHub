from app.core.transactions import serialize_user
from app.core.idempotency import begin_operation, commit_operation
import random
import re
from datetime import datetime, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.rewards.service import RewardService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.schemas import card_fields
from app.modules.shop.locking import serialize_shop_catalog
from app.modules.users.models import User
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin
from app.modules.wheel.schemas import (
    SpinHistoryItem,
    SpinResultResponse,
    WheelCreateRequest,
    WheelDetailResponse,
    WheelItemCreateRequest,
    WheelItemResponse,
    WheelItemUpdateRequest,
    WheelShopItemInfo,
    WheelSummaryResponse,
    WheelUpdateRequest,
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)


def get_tashkent_today_bounds():
    uz_tz = ZoneInfo(settings.TIMEZONE)
    now_utc = datetime.now(timezone.utc)
    now_uz = now_utc.astimezone(uz_tz)
    today_start_uz = now_uz.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_uz.astimezone(timezone.utc)
    return today_start_utc, today_start_utc.replace(tzinfo=None)


class WheelService:
    @staticmethod
    async def list_wheels(db: AsyncSession, user_id: Optional[int] = None) -> List[WheelSummaryResponse]:
        query = (
            select(Wheel)
            .options(selectinload(Wheel.items))
            .where(Wheel.is_active.is_(True))
            .order_by(Wheel.order_index.asc(), Wheel.id.asc())
        )
        res = await db.execute(query)
        wheels = res.scalars().all()

        start_utc, start_naive = get_tashkent_today_bounds()

        used_free_spin_wheel_ids = set()
        if user_id:
            spin_stmt = (
                select(WheelSpin.wheel_id)
                .where(
                    WheelSpin.user_id == user_id,
                    WheelSpin.is_free_spin.is_(True),
                    WheelSpin.created_at >= start_naive,
                )
            )
            spin_res = await db.execute(spin_stmt)
            used_free_spin_wheel_ids = set(spin_res.scalars().all())

        results = []
        for w in wheels:
            is_free = False
            if w.has_daily_free_spin:
                if user_id:
                    is_free = w.id not in used_free_spin_wheel_ids
                else:
                    is_free = True

            results.append(
                WheelSummaryResponse(
                    id=w.id,
                    title=w.title,
                    slug=w.slug,
                    description=w.description,
                    cost_coins=w.cost_coins,
                    has_daily_free_spin=w.has_daily_free_spin,
                    is_free_spin_available=is_free,
                    icon=w.icon,
                    color=w.color,
                    is_active=w.is_active,
                    items_count=sum(item.reward_type == 'coins' for item in w.items),
                )
            )
        return results

    @staticmethod
    async def get_wheel(db: AsyncSession, wheel_id: int, user_id: Optional[int] = None) -> WheelDetailResponse:
        query = (
            select(Wheel)
            .options(
                selectinload(Wheel.items).selectinload(WheelItem.shop_item),
            )
            .where(Wheel.id == wheel_id, Wheel.is_active.is_(True))
        )
        res = await db.execute(query)
        wheel = res.scalar_one_or_none()
        if not wheel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        start_utc, start_naive = get_tashkent_today_bounds()

        is_free = False
        if wheel.has_daily_free_spin:
            if user_id:
                spin_stmt = (
                    select(WheelSpin.id)
                    .where(
                        WheelSpin.wheel_id == wheel.id,
                        WheelSpin.user_id == user_id,
                        WheelSpin.is_free_spin.is_(True),
                        WheelSpin.created_at >= start_naive,
                    )
                )
                spin_res = await db.execute(spin_stmt)
                is_free = spin_res.scalar_one_or_none() is None
            else:
                is_free = True

        total_spins_stmt = select(func.count(WheelSpin.id)).where(WheelSpin.wheel_id == wheel.id)
        total_spins_res = await db.execute(total_spins_stmt)
        total_spins = total_spins_res.scalar() or 0

        total_weight = sum(item.weight for item in wheel.items if item.reward_type == 'coins') or 1
        items_resp = []
        for item in wheel.items:
            if item.reward_type != 'coins':
                continue
            shop_info = None
            if item.shop_item:
                shop_info = WheelShopItemInfo(
                    id=item.shop_item.id,
                    name=item.shop_item.name,
                    item_type=item.shop_item.item_type,
                    price_coins=item.shop_item.price_coins,
                    asset_url=item.shop_item.asset_url,
                    **card_fields(item.shop_item),
                )
            items_resp.append(
                WheelItemResponse(
                    id=item.id,
                    wheel_id=item.wheel_id,
                    reward_type=item.reward_type,
                    reward_coins=item.reward_coins or 0,
                    shop_item_id=item.shop_item_id,
                    shop_item=shop_info,
                    label=item.label,
                    color=item.color,
                    text_color=item.text_color,
                    icon=item.icon,
                    weight=item.weight,
                    probability_percent=round((item.weight / total_weight) * 100, 2),
                    is_jackpot=item.is_jackpot,
                    order_index=item.order_index,
                )
            )

        return WheelDetailResponse(
            id=wheel.id,
            title=wheel.title,
            slug=wheel.slug,
            description=wheel.description,
            cost_coins=wheel.cost_coins,
            has_daily_free_spin=wheel.has_daily_free_spin,
            is_free_spin_available=is_free,
            icon=wheel.icon,
            color=wheel.color,
            is_active=wheel.is_active,
            items=items_resp,
            total_spins_count=total_spins,
        )

    @staticmethod
    @serialize_user
    @serialize_shop_catalog
    async def spin_wheel(db: AsyncSession, user_id: int, wheel_id: int, expected_mode: str, expected_cost: int, operation_key: Optional[str] = None) -> SpinResultResponse:
        receipt, replay = await begin_operation(db, f'reader:{user_id}', 'wheel.spin', operation_key,
            {'wheel_id': wheel_id, 'expected_mode': expected_mode, 'expected_cost': expected_cost})
        if replay is not None:
            return SpinResultResponse.model_validate(replay)
        # 1. Fetch wheel with items
        query = (
            select(Wheel)
            .options(selectinload(Wheel.items).selectinload(WheelItem.shop_item))
            .where(Wheel.id == wheel_id, Wheel.is_active.is_(True))
            .with_for_update()
        )
        res = await db.execute(query)
        wheel = res.scalar_one_or_none()
        if not wheel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        if any(item.reward_type != 'coins' or item.shop_item_id is not None or (item.reward_coins or 0) < 0 for item in wheel.items):
            raise HTTPException(409, 'This wheel contains legacy item prizes. Update its Lightning sectors before spinning.')

        if not wheel.items or len(wheel.items) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu charxda yetarli yutuq sektorlari mavjud emas (kamida 2 ta bo'lishi kerak)",
            )

        # 2. Fetch user
        u_stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        # 3. Determine if free spin
        start_utc, start_naive = get_tashkent_today_bounds()
        is_free = False
        if wheel.has_daily_free_spin:
            spin_check_stmt = (
                select(WheelSpin.id)
                .where(
                    WheelSpin.wheel_id == wheel.id,
                    WheelSpin.user_id == user_id,
                    WheelSpin.is_free_spin.is_(True),
                    WheelSpin.created_at >= start_naive,
                )
            )
            spin_check_res = await db.execute(spin_check_stmt)
            if spin_check_res.scalar_one_or_none() is None:
                is_free = True

        cost = 0 if is_free else wheel.cost_coins
        actual_mode = "free" if is_free else "paid"
        if expected_mode != actual_mode or expected_cost != cost:
            raise HTTPException(409, "Spin availability or cost changed. Refresh the wheel and confirm again.")

        # 4. Check user balance
        if not is_free and user.lightning_coins < cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Charxni aylantirish uchun mablag' yetarli emas. Kerak: {cost} ⚡, sizda: {user.lightning_coins} ⚡",
            )

        # 5. Deduct cost
        if not is_free and cost > 0:
            user.lightning_coins -= cost
            await RewardService.record_transaction(
                db=db,
                user_id=user.id,
                amount=-cost,
                transaction_type="wheel_spin",
                description=f"'{wheel.title}' charxini aylantirish narxi",
            )

        # 6. Weighted random selection
        items = list(wheel.items)
        weights = [it.weight for it in items]
        total_weight = sum(weights) or 1
        winning_item = random.choices(items, weights=weights, k=1)[0]
        winning_index = items.index(winning_item)

        # 7. Credit prize
        message = ""
        comp_coins = 0
        if winning_item.reward_type == "coins":
            coins_won = winning_item.reward_coins or 0
            if coins_won > 0:
                user.lightning_coins += coins_won
                await RewardService.record_transaction(
                    db=db,
                    user_id=user.id,
                    amount=coins_won,
                    transaction_type="wheel_reward",
                    description=f"'{wheel.title}' charxidan yutuq: +{coins_won} Chaqmoq",
                )
            message = f"Tabriklaymiz! Siz {winning_item.label} yutib oldingiz!"
        # 8. Record spin log
        spin_record = WheelSpin(
            user_id=user.id,
            wheel_id=wheel.id,
            wheel_item_id=winning_item.id,
            is_free_spin=is_free,
            cost_paid=cost,
            reward_type=winning_item.reward_type,
            reward_coins=winning_item.reward_coins if winning_item.reward_type == "coins" else comp_coins,
            shop_item_id=winning_item.shop_item_id,
            reward_label=winning_item.label,
        )
        db.add(spin_record)

        await db.flush()
        await db.refresh(spin_record)
        await db.refresh(user)

        shop_info = None
        if winning_item.shop_item:
            shop_info = WheelShopItemInfo(
                id=winning_item.shop_item.id,
                name=winning_item.shop_item.name,
                item_type=winning_item.shop_item.item_type,
                price_coins=winning_item.shop_item.price_coins,
                asset_url=winning_item.shop_item.asset_url,
                **card_fields(winning_item.shop_item),
            )

        winning_item_resp = WheelItemResponse(
            id=winning_item.id,
            wheel_id=winning_item.wheel_id,
            reward_type=winning_item.reward_type,
            reward_coins=winning_item.reward_coins or 0,
            shop_item_id=winning_item.shop_item_id,
            shop_item=shop_info,
            label=winning_item.label,
            color=winning_item.color,
            text_color=winning_item.text_color,
            icon=winning_item.icon,
            weight=winning_item.weight,
            probability_percent=round((winning_item.weight / total_weight) * 100, 2),
            is_jackpot=winning_item.is_jackpot,
            order_index=winning_item.order_index,
        )

        response = SpinResultResponse(
            spin_id=spin_record.id,
            winning_item=winning_item_resp,
            winning_index=winning_index,
            new_balance=user.lightning_coins,
            is_free_spin=is_free,
            message=message,
            outcome="coins",
            reward_coins=spin_record.reward_coins or 0,
            reward_item_name=winning_item.shop_item.name if winning_item.shop_item else None,
        )
        await commit_operation(db, receipt, response)
        return response

    @staticmethod
    async def get_recent_spins(
        db: AsyncSession,
        wheel_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 20,
    ) -> List[SpinHistoryItem]:
        query = (
            select(WheelSpin)
            .options(selectinload(WheelSpin.user), selectinload(WheelSpin.wheel))
            .order_by(desc(WheelSpin.created_at))
            .limit(limit)
        )
        if wheel_id:
            query = query.where(WheelSpin.wheel_id == wheel_id)
        if user_id:
            query = query.where(WheelSpin.user_id == user_id)

        res = await db.execute(query)
        spins = res.scalars().all()

        return [
            SpinHistoryItem(
                id=s.id,
                wheel_id=s.wheel_id,
                wheel_title=s.wheel.title if s.wheel else "Omad Charxi",
                user_id=s.user_id,
                user_name=s.user.username if s.user else "Foydalanuvchi",
                reward_label=s.reward_label,
                reward_type=s.reward_type,
                reward_coins=s.reward_coins,
                shop_item_id=s.shop_item_id,
                is_free_spin=s.is_free_spin,
                cost_paid=s.cost_paid,
                created_at=s.created_at,
            )
            for s in spins
        ]

    # ----------------------------------------------------
    # Staff Wheel Management CRUD
    # ----------------------------------------------------
    @staticmethod
    async def list_staff_wheels(db: AsyncSession) -> List[WheelDetailResponse]:
        query = (
            select(Wheel)
            .options(selectinload(Wheel.items).selectinload(WheelItem.shop_item))
            .order_by(Wheel.order_index.asc(), Wheel.id.asc())
        )
        res = await db.execute(query)
        wheels = res.scalars().all()

        results = []
        for w in wheels:
            total_spins_stmt = select(func.count(WheelSpin.id)).where(WheelSpin.wheel_id == w.id)
            spins_res = await db.execute(total_spins_stmt)
            spins_count = spins_res.scalar() or 0

            total_weight = sum(item.weight for item in w.items) or 1
            items_resp = []
            for item in w.items:
                shop_info = None
                if item.shop_item:
                    shop_info = WheelShopItemInfo(
                        id=item.shop_item.id,
                        name=item.shop_item.name,
                        item_type=item.shop_item.item_type,
                        price_coins=item.shop_item.price_coins,
                        asset_url=item.shop_item.asset_url,
                        **card_fields(item.shop_item),
                    )
                items_resp.append(
                    WheelItemResponse(
                        id=item.id,
                        wheel_id=item.wheel_id,
                        reward_type=item.reward_type,
                        reward_coins=item.reward_coins or 0,
                        shop_item_id=item.shop_item_id,
                        shop_item=shop_info,
                        label=item.label,
                        color=item.color,
                        text_color=item.text_color,
                        icon=item.icon,
                        weight=item.weight,
                        probability_percent=round((item.weight / total_weight) * 100, 2),
                        is_jackpot=item.is_jackpot,
                        order_index=item.order_index,
                    )
                )

            results.append(
                WheelDetailResponse(
                    id=w.id,
                    title=w.title,
                    slug=w.slug,
                    description=w.description,
                    cost_coins=w.cost_coins,
                    has_daily_free_spin=w.has_daily_free_spin,
                    is_free_spin_available=w.has_daily_free_spin,
                    icon=w.icon,
                    color=w.color,
                    is_active=w.is_active,
                    items=items_resp,
                    total_spins_count=spins_count,
                )
            )
        return results

    @staticmethod
    @serialize_shop_catalog
    async def create_wheel(db: AsyncSession, data: WheelCreateRequest) -> Wheel:
        base_slug = data.slug or slugify(data.title)
        slug = base_slug
        counter = 1
        while True:
            exists_stmt = select(Wheel.id).where(Wheel.slug == slug)
            exists_res = await db.execute(exists_stmt)
            if not exists_res.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        wheel = Wheel(
            title=data.title,
            slug=slug,
            description=data.description,
            cost_coins=data.cost_coins,
            has_daily_free_spin=data.has_daily_free_spin,
            icon=data.icon or "sparkles",
            color=data.color or "#F59E0B",
            is_active=data.is_active,
            order_index=data.order_index,
        )
        db.add(wheel)
        await db.commit()
        await db.refresh(wheel)
        return wheel

    @staticmethod
    @serialize_shop_catalog
    async def update_wheel(db: AsyncSession, wheel_id: int, data: WheelUpdateRequest) -> Wheel:
        stmt = select(Wheel).where(Wheel.id == wheel_id)
        res = await db.execute(stmt)
        wheel = res.scalar_one_or_none()
        if not wheel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        if data.title is not None:
            wheel.title = data.title
        if data.slug is not None:
            wheel.slug = data.slug
        if data.description is not None:
            wheel.description = data.description
        if data.cost_coins is not None:
            wheel.cost_coins = data.cost_coins
        if data.has_daily_free_spin is not None:
            wheel.has_daily_free_spin = data.has_daily_free_spin
        if data.icon is not None:
            wheel.icon = data.icon
        if data.color is not None:
            wheel.color = data.color
        if data.is_active is not None:
            wheel.is_active = data.is_active
        if data.order_index is not None:
            wheel.order_index = data.order_index

        await db.commit()
        await db.refresh(wheel)
        return wheel

    @staticmethod
    @serialize_shop_catalog
    async def delete_wheel(db: AsyncSession, wheel_id: int) -> None:
        stmt = select(Wheel).where(Wheel.id == wheel_id)
        res = await db.execute(stmt)
        wheel = res.scalar_one_or_none()
        if not wheel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        await db.delete(wheel)
        await db.commit()

    @staticmethod
    @serialize_shop_catalog
    async def create_wheel_item(db: AsyncSession, wheel_id: int, data: WheelItemCreateRequest) -> WheelItem:
        wheel_stmt = select(Wheel).where(Wheel.id == wheel_id)
        wheel_res = await db.execute(wheel_stmt)
        if not wheel_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        item = WheelItem(
            wheel_id=wheel_id,
            reward_type=data.reward_type,
            reward_coins=data.reward_coins,
            shop_item_id=None,
            label=data.label,
            color=data.color or "#F59E0B",
            text_color=data.text_color or "#FFFFFF",
            icon=data.icon or "coins",
            weight=data.weight,
            is_jackpot=data.is_jackpot,
            order_index=data.order_index,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    @serialize_shop_catalog
    async def update_wheel_item(db: AsyncSession, item_id: int, data: WheelItemUpdateRequest) -> WheelItem:
        stmt = select(WheelItem).where(WheelItem.id == item_id)
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charx sektori topilmadi")

        item.reward_type = "coins"
        item.shop_item_id = None
        if data.reward_coins is not None:
            item.reward_coins = data.reward_coins

        if data.label is not None:
            item.label = data.label.strip()
        if data.color is not None:
            item.color = data.color
        if data.text_color is not None:
            item.text_color = data.text_color
        if data.icon is not None:
            item.icon = data.icon
        if data.weight is not None:
            item.weight = data.weight
        if data.is_jackpot is not None:
            item.is_jackpot = data.is_jackpot
        if data.order_index is not None:
            item.order_index = data.order_index

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    @serialize_shop_catalog
    async def populate_preset_sectors(db: AsyncSession, wheel_id: int) -> List[WheelItem]:
        wheel_stmt = select(Wheel).where(Wheel.id == wheel_id)
        wheel_res = await db.execute(wheel_stmt)
        wheel = wheel_res.scalar_one_or_none()
        if not wheel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Omad charxi topilmadi")

        presets = [
            {
                "label": "+10 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 10,
                "shop_item_id": None,
                "color": "#0F766E",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 35,
                "is_jackpot": False,
                "order_index": 0,
            },
            {
                "label": "+25 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 25,
                "shop_item_id": None,
                "color": "#0369A1",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 25,
                "is_jackpot": False,
                "order_index": 1,
            },
            {
                "label": "+50 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 50,
                "shop_item_id": None,
                "color": "#4338CA",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 18,
                "is_jackpot": False,
                "order_index": 2,
            },
            {
                "label": "+100 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 100,
                "shop_item_id": None,
                "color": "#7C3AED",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 12,
                "is_jackpot": False,
                "order_index": 3,
            },
            {
                "label": "+200 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 200,
                "shop_item_id": None,
                "color": "#B45309",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 7,
                "is_jackpot": False,
                "order_index": 4,
            },
            {
                "label": "+300 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 300,
                "shop_item_id": None,
                "color": "#059669",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 5,
                "is_jackpot": False,
                "order_index": 5,
            },
            {
                "label": "+500 Chaqmoq",
                "reward_type": "coins",
                "reward_coins": 500,
                "shop_item_id": None,
                "color": "#D97706",
                "text_color": "#FFFFFF",
                "icon": "coins",
                "weight": 3,
                "is_jackpot": False,
                "order_index": 6,
            },
            {
                "label": "🔥 JACKPOT 1000 ⚡",
                "reward_type": "coins",
                "reward_coins": 1000,
                "shop_item_id": None,
                "color": "#E11D48",
                "text_color": "#FFFFFF",
                "icon": "sparkles",
                "weight": 1,
                "is_jackpot": True,
                "order_index": 7,
            },
        ]

        created_items = []
        for p in presets:
            item = WheelItem(
                wheel_id=wheel_id,
                reward_type=p["reward_type"],
                reward_coins=p["reward_coins"],
                shop_item_id=p["shop_item_id"],
                label=p["label"],
                color=p["color"],
                text_color=p["text_color"],
                icon=p["icon"],
                weight=p["weight"],
                is_jackpot=p["is_jackpot"],
                order_index=p["order_index"],
            )
            db.add(item)
            created_items.append(item)

        await db.commit()
        for it in created_items:
            await db.refresh(it)
        return created_items

    @staticmethod
    @serialize_shop_catalog
    async def delete_wheel_item(db: AsyncSession, item_id: int) -> None:
        stmt = select(WheelItem).where(WheelItem.id == item_id)
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charx sektori topilmadi")

        await db.delete(item)
        await db.commit()
