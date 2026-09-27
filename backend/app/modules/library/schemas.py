from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BookmarkStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(reading|plan_to_read|completed|dropped)$")


class WebtoonBookmarkInfo(BaseModel):
    id: int
    title: str
    slug: str
    cover_image_url: str
    status: str

    class Config:
        from_attributes = True


class BookmarkItemResponse(BaseModel):
    webtoon: WebtoonBookmarkInfo
    reading_status: str
    updated_at: datetime
