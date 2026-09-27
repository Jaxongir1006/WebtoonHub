from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.modules.auth.schemas import UserSummary


class CreatorRequestCreate(BaseModel):
    message: str = Field(min_length=10, max_length=2000)


class CreatorRequestReview(BaseModel):
    status: str = Field(pattern=r"^(approved|rejected)$")


class CreatorRequestItem(BaseModel):
    id: int
    user_id: int
    user: Optional[UserSummary] = None
    message: str
    status: str
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
