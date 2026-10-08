import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=100)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class UserSummary(BaseModel):
    id: int
    email: str
    username: str
    lightning_coins: int
    avatar_url: Optional[str] = None
    daily_bonus_claimed: bool = False
    last_daily_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSummary


class ActiveAsset(BaseModel):
    id: int
    name: str
    asset_url: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    username: str
    lightning_coins: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    clan: Optional[Dict[str, Any]] = None
    active_frame: Optional[ActiveAsset] = None
    active_background: Optional[ActiveAsset] = None
    card_collection: Optional[Dict[str, Any]] = None
    daily_bonus_claimed: bool = False
    last_daily_login: Optional[datetime] = None
    created_at: datetime


class UserSessionItem(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = "Desktop"
    is_current: bool = False
    last_active_at: datetime
    created_at: datetime

    @field_validator('last_active_at', 'created_at')
    @classmethod
    def explicit_utc(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

    class Config:
        from_attributes = True


class UserProfileUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    old_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=100)
