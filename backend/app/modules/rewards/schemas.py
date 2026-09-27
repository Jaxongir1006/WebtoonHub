from typing import List, Optional
from pydantic import BaseModel, Field


class DailyCheckinResponse(BaseModel):
    reward_amount: int
    total_lightning_coins: int
    claimed_at: datetime


class ChapterRewardResponse(BaseModel):
    chapter_id: int
    reward_amount: int
    total_lightning_coins: int


class CoinTransactionItem(BaseModel):
    id: int
    user_id: int
    username: str
    amount: int
    transaction_type: str
    description: Optional[str] = None
    created_by_staff_id: Optional[int] = None
    created_at: datetime


class CoinTransactionListResponse(BaseModel):
    items: List[CoinTransactionItem]
    total: int
    page: int
    limit: int


class AdjustUserCoinsRequest(BaseModel):
    amount_delta: int = Field(..., description="Qo'shiladigan yoki ayriladigan miqdor")
    reason: str = Field(..., min_length=2, max_length=255, description="Sabab")


class AdjustUserCoinsResponse(BaseModel):
    user_id: int
    previous_coins: int
    new_coins: int
    amount_delta: int
    reason: str


class DistributeCoinsRequest(BaseModel):
    amount: int = Field(..., ge=1, description="Har bir foydalanuvchiga beriladigan miqdor")
    reason: str = Field(..., min_length=2, max_length=255, description="Sabab")
    all_active_users: bool = True
    target_user_ids: List[int] = []


class DistributeCoinsResponse(BaseModel):
    rewarded_users_count: int
    amount_per_user: int
    total_coins_distributed: int
    reason: str


class CoinsSummaryResponse(BaseModel):
    total_coins_in_wallets: int
    total_coins_earned_all_time: int
    total_coins_spent_in_shop: int
    total_transactions_count: int
