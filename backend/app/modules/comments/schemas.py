from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CommentAuthor(BaseModel):
    id: int
    username: str
    active_frame_url: Optional[str] = None


class CommentReplyResponse(BaseModel):
    id: int
    parent_id: int
    user: CommentAuthor
    content: str
    created_at: datetime


class CommentResponse(BaseModel):
    id: int
    user: CommentAuthor
    content: str
    created_at: datetime
    replies: List[CommentReplyResponse] = []


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500, description="Sharh matni")
    parent_id: Optional[int] = None


class CommentCreatedResponse(BaseModel):
    id: int
    chapter_id: int
    parent_id: Optional[int] = None
    content: str
    created_at: datetime
