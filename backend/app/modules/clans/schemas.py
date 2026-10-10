from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.auth.schemas import ActiveAsset


class ClanCreatePayload(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_cost: int = Field(ge=0)
    name: str = Field(..., min_length=3, max_length=50)
    tag: str = Field(..., min_length=2, max_length=8)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)


class ClanUpdatePayload(BaseModel):
    model_config = ConfigDict(extra='forbid')
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    is_recruiting: Optional[bool] = None


class ClanMemberItem(BaseModel):
    id: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    active_frame: Optional[Dict[str, Any]] = None
    role: str
    contribution_points: int
    joined_at: datetime


class ClanDetailResponse(BaseModel):
    id: int
    name: str
    tag: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    frame_url: Optional[str] = None
    banner_url: Optional[str] = None
    active_frame: Optional[ActiveAsset] = None
    active_background: Optional[ActiveAsset] = None
    leader_id: int
    leader_username: str
    level: int
    xp: int
    required_xp: int
    upgrade_cost_coins: int
    has_next_level: bool = False
    can_upgrade: bool
    next_level_max_members: Optional[int] = None
    next_level_perks: Optional[str] = None
    max_members: int
    member_count: int
    is_recruiting: bool
    my_role: Optional[str] = None
    created_at: datetime


class ClanSummaryItem(BaseModel):
    id: int
    name: str
    tag: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    frame_url: Optional[str] = None
    banner_url: Optional[str] = None
    active_frame: Optional[ActiveAsset] = None
    active_background: Optional[ActiveAsset] = None
    level: int
    xp: int
    member_count: int
    max_members: int
    is_recruiting: bool
    leader_id: int
    leader_username: str
    created_at: datetime


class ClanLevelConfigItem(BaseModel):
    level: int
    required_xp: int
    upgrade_cost_coins: int
    max_members: int
    perks_description: Optional[str] = None


class ClanMessageItem(BaseModel):
    id: int
    clan_id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    active_frame_svg: Optional[str] = None
    role: Optional[str] = None
    message_type: str
    content: str
    created_at: datetime
