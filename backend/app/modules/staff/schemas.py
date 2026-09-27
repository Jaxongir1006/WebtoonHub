import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class PermissionItem(BaseModel):
    id: int
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: List[PermissionItem] = []

    class Config:
        from_attributes = True


class StaffSummary(BaseModel):
    id: int
    username: str
    email: str
    role: RoleItem
    permissions: List[str]

    class Config:
        from_attributes = True


class StaffTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    staff: StaffSummary


class RoleCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    description: Optional[str] = None
    permission_ids: List[int] = []


class StaffRoleUpdateRequest(BaseModel):
    role_id: int


class StaffSessionItem(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = "Desktop"
    is_current: bool = False
    last_active_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class StaffUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)
    role_id: int


class StaffUserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: RoleItem
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReaderUserItem(BaseModel):
    id: int
    username: str
    email: str
    lightning_coins: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReaderListResponse(BaseModel):
    items: List[ReaderUserItem]
    total: int
    page: int
    limit: int


class ReaderUpdateRequest(BaseModel):
    lightning_coins: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class DashboardStatsResponse(BaseModel):
    total_readers: int
    total_webtoons: int
    total_chapters: int
    pending_chapters: int
    pending_creator_requests: int
    total_comments: int
    total_coins_in_circulation: int


class SystemSettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemSettingUpdateEntry(BaseModel):
    key: str
    value: str


class UpdateSystemSettingsRequest(BaseModel):
    settings: List[SystemSettingUpdateEntry]


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class StaffUserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

