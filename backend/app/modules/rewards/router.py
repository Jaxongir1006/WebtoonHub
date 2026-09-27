from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rewards.schemas import ChapterRewardResponse, DailyCheckinResponse
from app.modules.rewards.service import RewardService
from app.modules.users.models import User

router = APIRouter(tags=["Rewards & Chaqmoq"])


# 1. Daily Check-in (+15 Chaqmoq, Tashkent 00:00 midnight reset)
@router.post("/rewards/daily-checkin", status_code=status.HTTP_200_OK)
async def daily_checkin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.claim_daily_checkin(db, user.id)
    return {
        "success": True,
        "data": result,
        "message": f"Kunlik bonus: +{result.reward_amount} Chaqmoq hisobingizga qo'shildi!"
    }


# 2. Chapter Read Reward (+5 Chaqmoq, Anti-farming protection)
@router.post("/chapters/{id}/reward", status_code=status.HTTP_200_OK)
async def claim_chapter_reward(
    id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.claim_chapter_reward(db, user.id, id)
    return {
        "success": True,
        "data": result,
        "message": f"Bob yakunlandi! +{result.reward_amount} Chaqmoq hisobingizga muvaffaqiyatli qo'shildi."
    }
