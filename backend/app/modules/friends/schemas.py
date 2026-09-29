from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SendFriendRequestPayload(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


class FriendUserSummary(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    active_frame: Optional[Dict[str, Any]] = None
    active_background: Optional[Dict[str, Any]] = None
    clan: Optional[Dict[str, Any]] = None
    friendship_id: int
    friends_since: datetime


class FriendRequestItem(BaseModel):
    id: int  # friendship id
    sender_id: int
    receiver_id: int
    username: str
    avatar_url: Optional[str] = None
    active_frame: Optional[Dict[str, Any]] = None
    clan_tag: Optional[str] = None
    created_at: datetime


class FriendRequestsResponse(BaseModel):
    incoming: List[FriendRequestItem]
    outgoing: List[FriendRequestItem]
