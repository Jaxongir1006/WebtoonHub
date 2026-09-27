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
