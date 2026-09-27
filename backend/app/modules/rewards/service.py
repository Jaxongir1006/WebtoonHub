from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.rewards.models import ReadReward
from app.modules.rewards.schemas import ChapterRewardResponse, DailyCheckinResponse
from app.modules.users.models import User
from app.modules.webtoons.models import Chapter


class RewardService:
    @staticmethod
    async def claim_daily_checkin(db: AsyncSession, user_id: int) -> DailyCheckinResponse:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        uz_tz = ZoneInfo(settings.TIMEZONE)
        now_utc = datetime.now(timezone.utc)
        now_uz = now_utc.astimezone(uz_tz)

        if user.last_daily_login:
            last_uz = user.last_daily_login.astimezone(uz_tz)
            if last_uz.date() == now_uz.date():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bugungi kunlik bonus allaqachon olingan. Keyingi bonus Toshkent vaqti bilan 00:00 da ochiladi."
                )

        user.lightning_coins += settings.DAILY_LOGIN_COINS
        user.last_daily_login = now_utc
        await db.commit()
        await db.refresh(user)

        return DailyCheckinResponse(
            reward_amount=settings.DAILY_LOGIN_COINS,
            total_lightning_coins=user.lightning_coins,
            claimed_at=now_uz
        )

    @staticmethod
    async def claim_chapter_reward(db: AsyncSession, user_id: int, chapter_id: int) -> ChapterRewardResponse:
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
        u_stmt = select(User).where(User.id == user_id)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        reward_coins = chapter.reward_coins or settings.CHAPTER_READ_COINS

        read_record = ReadReward(
            user_id=user.id,
            chapter_id=chapter.id,
            coins_earned=reward_coins
        )
        db.add(read_record)
        user.lightning_coins += reward_coins

        await db.commit()
        await db.refresh(user)

        return ChapterRewardResponse(
            chapter_id=chapter.id,
            reward_amount=reward_coins,
            total_lightning_coins=user.lightning_coins
        )
