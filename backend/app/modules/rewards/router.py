from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rewards.schemas import (
    AdjustUserCoinsRequest,
    ChapterRewardResponse,
    DailyCheckinResponse,
    DistributeCoinsRequest
)
from app.modules.rewards.service import RewardService
from app.modules.staff.dependencies import require_any_permission, require_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User

router = APIRouter(tags=["Rewards & Chaqmoq"])
client_router = router

staff_router = APIRouter(prefix="/staff", tags=["Staff - Coins Management"])


# 1. Daily Check-in (+15 Chaqmoq, Tashkent 00:00 midnight reset)
@client_router.get("/rewards/daily-status", status_code=status.HTTP_200_OK)
@client_router.get("/rewards/daily-checkin", status_code=status.HTTP_200_OK)
async def get_daily_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.get_daily_status(db, user.id)
    return {
        "success": True,
        "data": result
    }


@client_router.post("/rewards/daily-checkin", status_code=status.HTTP_200_OK)
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
@client_router.post("/chapters/{id}/reward", status_code=status.HTTP_200_OK)
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


# 3. Staff Coins Transactions History
@staff_router.get("/coins/transactions", status_code=status.HTTP_200_OK)
async def list_coin_transactions(
    user_id: Optional[int] = Query(None, description="Foydalanuvchi ID"),
    transaction_type: Optional[str] = Query(None, description="Tranzaksiya turi"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _staff: StaffUser = Depends(require_permission("coins:view")),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.list_transactions(
        db=db,
        user_id=user_id,
        transaction_type=transaction_type,
        page=page,
        limit=limit
    )
    return {
        "success": True,
        "data": result
    }


# 4. Staff Adjust User Coins
@staff_router.post("/readers/{id}/coins", status_code=status.HTTP_200_OK)
async def adjust_reader_coins(
    id: int,
    data: AdjustUserCoinsRequest,
    staff: StaffUser = Depends(require_permission("coins:adjust")),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.adjust_user_coins(
        db=db,
        staff_id=staff.id,
        user_id=id,
        amount_delta=data.get_delta(),
        reason=data.reason
    )
    return {
        "success": True,
        "data": result,
        "message": "Foydalanuvchi chaqmoq balansi muvaffaqiyatli o'zgartirildi"
    }


# 4b. Economy Transactions Alias for Admin Panel
@staff_router.get("/economy/transactions", status_code=status.HTTP_200_OK)
async def list_economy_transactions_alias(
    user_id: Optional[int] = Query(None, description="Foydalanuvchi ID"),
    transaction_type: Optional[str] = Query(None, description="Tranzaksiya turi"),
    type: Optional[str] = Query(None, description="Tranzaksiya turi (alias)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _staff: StaffUser = Depends(require_any_permission("coins:view", "users:manage")),
    db: AsyncSession = Depends(get_db)
):
    actual_type = transaction_type or type
    if actual_type == "all":
        actual_type = None
    result = await RewardService.list_transactions(
        db=db,
        user_id=user_id,
        transaction_type=actual_type,
        page=page,
        limit=limit
    )
    return {
        "success": True,
        "data": result
    }


# 5. Staff Distribute Coins
@staff_router.post("/coins/distribute", status_code=status.HTTP_200_OK)
async def distribute_coins(
    data: DistributeCoinsRequest,
    staff: StaffUser = Depends(require_permission("coins:distribute")),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.distribute_coins(
        db=db,
        staff_id=staff.id,
        amount=data.amount,
        reason=data.reason,
        all_active_users=data.all_active_users,
        target_user_ids=data.target_user_ids
    )
    return {
        "success": True,
        "data": result,
        "message": "Chaqmoqlar foydalanuvchilarga muvaffaqiyatli tarqatildi"
    }


# 6. Staff Coins Summary
@staff_router.get("/coins/summary", status_code=status.HTTP_200_OK)
async def get_coins_summary(
    _staff: StaffUser = Depends(require_permission("coins:view")),
    db: AsyncSession = Depends(get_db)
):
    result = await RewardService.get_coins_summary(db=db)
    return {
        "success": True,
        "data": result
    }
