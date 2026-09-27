from datetime import datetime
from pydantic import BaseModel


class DailyCheckinResponse(BaseModel):
    reward_amount: int
    total_lightning_coins: int
    claimed_at: datetime


class ChapterRewardResponse(BaseModel):
    chapter_id: int
    reward_amount: int
    total_lightning_coins: int
