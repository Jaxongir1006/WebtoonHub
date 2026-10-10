from app.core.transactions import serialize_user, serialize_wallet_targets
from datetime import datetime, timezone
from app.modules.library.progress import utc
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.clans.models import ClanMember
from app.modules.rewards.models import ReadReward
from app.modules.rewards.schemas import ChapterRewardResponse, DailyCheckinResponse
from app.modules.users.models import User
from app.modules.webtoons.models import Chapter


class RewardService:
    @staticmethod
    @serialize_user
    async def claim_daily_checkin(db: AsyncSession, user_id: int) -> DailyCheckinResponse:
        stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        uz_tz = ZoneInfo(settings.TIMEZONE)
        now_utc = datetime.now(timezone.utc)
        now_uz = now_utc.astimezone(uz_tz)

        if user.last_daily_login:
            last_uz = utc(user.last_daily_login).astimezone(uz_tz)
            if last_uz.date() == now_uz.date():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bugungi kunlik bonus allaqachon olingan. Keyingi bonus Toshkent vaqti bilan 00:00 da ochiladi."
                )

        from app.core.economy import economy_value
        daily_coins = await economy_value(db, "daily_checkin_reward")
        user.lightning_coins += daily_coins
        user.last_daily_login = now_utc

        await RewardService.record_transaction(
            db=db,
            user_id=user.id,
            amount=daily_coins,
            transaction_type="daily_checkin",
            description="Kunlik kirish bonusi"
        )

        await db.commit()
        await db.refresh(user)

        return DailyCheckinResponse(
            reward_amount=daily_coins,
            total_lightning_coins=user.lightning_coins,
            claimed_at=now_uz
        )

    @staticmethod
    async def get_daily_status(db: AsyncSession, user_id: int) -> dict:
        stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        uz_tz = ZoneInfo(settings.TIMEZONE)
        now_utc = datetime.now(timezone.utc)
        now_uz = now_utc.astimezone(uz_tz)
        daily_bonus_claimed = False

        if user.last_daily_login:
            last_uz = utc(user.last_daily_login).astimezone(uz_tz)
            daily_bonus_claimed = (last_uz.date() == now_uz.date())

        return {
            "claimed_today": daily_bonus_claimed,
            "reward_amount": await __import__("app.core.economy", fromlist=["economy_value"]).economy_value(db, "daily_checkin_reward"),
            "last_daily_login": user.last_daily_login.isoformat() if user.last_daily_login else None
        }

    @staticmethod
    @serialize_user
    async def claim_chapter_reward(db: AsyncSession, user_id: int, chapter_id: int) -> ChapterRewardResponse:
        u_stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        # 1. Verify chapter exists and is published
        ch_stmt = select(Chapter).where(Chapter.id == chapter_id)
        ch_res = await db.execute(ch_stmt)
        chapter = ch_res.scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        if chapter.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu bob hali chop etilmagan"
            )

        # 2. Check anti-farming: if reward was already claimed for this chapter
        r_stmt = select(ReadReward).where(
            ReadReward.user_id == user_id,
            ReadReward.chapter_id == chapter_id
        )
        r_res = await db.execute(r_stmt)
        if r_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Siz ushbu bob uchun avval mukofot olgansiz."
            )

        # 3. Add reward and increment coins
        from app.modules.library.progress import ReadingProgress
        receipt = (await db.execute(select(ReadingProgress).where(ReadingProgress.user_id == user_id,
                        ReadingProgress.chapter_id == chapter_id, ReadingProgress.completed.is_(True)))).scalar_one_or_none()
        if receipt is None:
            raise HTTPException(409, 'Finish the chapter and save reading progress before claiming its reward')
        reward_coins = chapter.reward_coins
        from app.core.economy import economy_value
        from app.modules.rewards.models import CoinTransaction
        from sqlalchemy import func
        from datetime import timedelta
        today = datetime.now(timezone.utc).astimezone(ZoneInfo(settings.TIMEZONE)).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        cap = await economy_value(db, 'daily_max_limit')
        earned = (await db.execute(select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(
                      CoinTransaction.user_id == user_id, CoinTransaction.transaction_type == 'chapter_read',
                      CoinTransaction.created_at >= today))).scalar()
        if cap and earned + reward_coins > cap:
            raise HTTPException(409, 'Daily chapter reward limit reached')
        cooldown = await economy_value(db, 'anti_farming_cooldown_min')
        if cooldown:
            recent = (await db.execute(select(ReadReward.id).where(ReadReward.user_id == user_id,
                         ReadReward.claimed_at > datetime.now(timezone.utc) - timedelta(minutes=cooldown)).limit(1))).scalar_one_or_none()
            if recent:
                raise HTTPException(409, 'Please wait before claiming the next chapter reward')

        read_record = ReadReward(
            user_id=user.id,
            chapter_id=chapter.id,
            coins_earned=reward_coins
        )
        db.add(read_record)
        user.lightning_coins += reward_coins

        # Record transaction
        await RewardService.record_transaction(
            db=db,
            user_id=user.id,
            amount=reward_coins,
            transaction_type="chapter_read",
            description=f"{chapter.title or str(chapter.chapter_number) + '-bob'} mutolaasi uchun"
        )

        # Check clan membership to award Clan XP
        clan_stmt = (
            select(ClanMember)
            .options(selectinload(ClanMember.clan))
            .where(ClanMember.user_id == user.id)
        )
        cm = (await db.execute(clan_stmt)).scalar_one_or_none()
        if cm and cm.clan:
            clan_xp_gain = 25
            from app.modules.clans.models import Clan
            from sqlalchemy import update
            await db.execute(update(Clan).where(Clan.id == cm.clan_id).values(xp=Clan.xp + clan_xp_gain))
            cm.contribution_points += clan_xp_gain

        await db.commit()
        await db.refresh(user)

        return ChapterRewardResponse(
            chapter_id=chapter.id,
            reward_amount=reward_coins,
            total_lightning_coins=user.lightning_coins
        )

    @staticmethod
    async def record_transaction(
        db: AsyncSession,
        user_id: int,
        amount: int,
        transaction_type: str,
        description: str = "",
        staff_id: int = None
    ) -> None:
        from app.modules.rewards.models import CoinTransaction
        tx = CoinTransaction(
            user_id=user_id,
            amount=amount,
            transaction_type=transaction_type,
            description=description,
            created_by_staff_id=staff_id
        )
        db.add(tx)

    @staticmethod
    async def list_transactions(
        db: AsyncSession,
        user_id: int = None,
        transaction_type: str = None,
        page: int = 1,
        limit: int = 20
    ):
        from sqlalchemy import func
        from sqlalchemy.orm import selectinload
        from app.modules.rewards.models import CoinTransaction
        from app.modules.rewards.schemas import CoinTransactionItem, CoinTransactionListResponse

        query = select(CoinTransaction).options(selectinload(CoinTransaction.user))
        count_stmt = select(func.count(CoinTransaction.id))

        if user_id:
            query = query.where(CoinTransaction.user_id == user_id)
            count_stmt = count_stmt.where(CoinTransaction.user_id == user_id)
        if transaction_type:
            query = query.where(CoinTransaction.transaction_type == transaction_type)
            count_stmt = count_stmt.where(CoinTransaction.transaction_type == transaction_type)

        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * limit
        query = query.order_by(CoinTransaction.created_at.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        items = res.scalars().all()

        return CoinTransactionListResponse(
            items=[
                CoinTransactionItem(
                    id=t.id,
                    user_id=t.user_id,
                    username=t.user.username if t.user else "Noma'lum",
                    amount=t.amount,
                    transaction_type=t.transaction_type,
                    type=t.transaction_type,
                    title=t.description or t.transaction_type,
                    description=t.description,
                    created_by_staff_id=t.created_by_staff_id,
                    created_at=t.created_at
                )
                for t in items
            ],
            total=total,
            page=page,
            limit=limit
        )

    @staticmethod
    @serialize_user
    async def adjust_user_coins(
        db: AsyncSession,
        staff_id: int,
        user_id: int,
        amount_delta: int,
        reason: str,
        operation_key: str = None
    ):
        from app.modules.rewards.schemas import AdjustUserCoinsResponse
        from app.core.idempotency import begin_operation, commit_operation
        receipt, replay = await begin_operation(db, f'staff:{staff_id}', 'coins.adjust', operation_key,
            {'user_id': user_id, 'amount_delta': amount_delta, 'reason': reason})
        if replay is not None:
            return AdjustUserCoinsResponse.model_validate(replay)

        stmt = select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        prev = user.lightning_coins
        new_val = prev + amount_delta
        if new_val < 0:
            new_val = 0
        actual_delta = new_val - prev
        user.lightning_coins = new_val

        await RewardService.record_transaction(
            db=db,
            user_id=user.id,
            amount=actual_delta,
            transaction_type="admin_adjustment",
            description=reason,
            staff_id=staff_id
        )

        await db.flush()
        await db.refresh(user)

        response = AdjustUserCoinsResponse(
            user_id=user.id,
            previous_coins=prev,
            new_coins=new_val,
            amount_delta=actual_delta,
            reason=reason
        )
        await commit_operation(db, receipt, response)
        return response

    @staticmethod
    @serialize_wallet_targets
    async def distribute_coins(
        db: AsyncSession,
        staff_id: int,
        amount: int,
        reason: str,
        all_active_users: bool = True,
        target_user_ids: list = None,
        operation_key: str = None
    ):
        from app.modules.rewards.schemas import DistributeCoinsResponse
        from app.core.idempotency import begin_operation, commit_operation
        receipt, replay = await begin_operation(db, f'staff:{staff_id}', 'coins.distribute', operation_key,
            {'amount': amount, 'reason': reason, 'all_active_users': all_active_users,
             'target_user_ids': sorted(set(target_user_ids or []))})
        if replay is not None:
            return DistributeCoinsResponse.model_validate(replay)

        if all_active_users:
            stmt = select(User).where(User.is_active.is_(True))
        elif target_user_ids:
            stmt = select(User).where(User.id.in_(target_user_ids), User.is_active.is_(True))
        else:
            raise HTTPException(422, "Select at least one target reader")

        stmt = stmt.order_by(User.id).with_for_update().execution_options(populate_existing=True)
        res = await db.execute(stmt)
        users = res.scalars().all()

        for u in users:
            u.lightning_coins += amount
            await RewardService.record_transaction(
                db=db,
                user_id=u.id,
                amount=amount,
                transaction_type="admin_gift",
                description=reason,
                staff_id=staff_id
            )

        response = DistributeCoinsResponse(
            rewarded_users_count=len(users),
            amount_per_user=amount,
            total_coins_distributed=len(users) * amount,
            reason=reason
        )
        await commit_operation(db, receipt, response)
        return response

    @staticmethod
    async def get_coins_summary(db: AsyncSession):
        from sqlalchemy import func
        from app.modules.rewards.models import CoinTransaction
        from app.modules.rewards.schemas import CoinsSummaryResponse

        total_wallets = (await db.execute(select(func.coalesce(func.sum(User.lightning_coins), 0)))).scalar() or 0
        total_tx = (await db.execute(select(func.count(CoinTransaction.id)))).scalar() or 0

        earned_stmt = select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(CoinTransaction.amount > 0)
        total_earned = (await db.execute(earned_stmt)).scalar() or 0

        spent_stmt = select(func.coalesce(func.sum(func.abs(CoinTransaction.amount)), 0)).where(CoinTransaction.transaction_type.in_(["shop_purchase", "clan_shop_purchase"]))
        total_spent = (await db.execute(spent_stmt)).scalar() or 0

        return CoinsSummaryResponse(
            total_coins_in_wallets=total_wallets,
            total_coins_earned_all_time=total_earned,
            total_coins_spent_in_shop=total_spent,
            total_transactions_count=total_tx
        )
