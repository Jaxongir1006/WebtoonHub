from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GenreItem(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class LatestChapterInfo(BaseModel):
    id: int
    chapter_number: float
    created_at: datetime


class WebtoonSummaryItem(BaseModel):
    id: int
    title: str
    slug: str
    cover_image_url: str
    author_name: Optional[str] = None
    status: str
    view_count: int
    genres: List[str] = []
    latest_chapter: Optional[LatestChapterInfo] = None


class WebtoonCatalogResponse(BaseModel):
    items: List[WebtoonSummaryItem]
    total: int
    page: int
    limit: int
    pages: int


class ChapterItemSimple(BaseModel):
    id: int
    chapter_number: float
    title: Optional[str] = None
    reward_coins: int
    is_claimed: bool = False
    created_at: datetime


class WebtoonDetailResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    cover_image_url: str
    author_name: Optional[str] = None
    status: str
    view_count: int
    genres: List[str] = []
    chapters: List[ChapterItemSimple] = []


class ChapterImageItem(BaseModel):
    id: int
    image_url: str
    order_index: int

    class Config:
        from_attributes = True


class ChapterReaderResponse(BaseModel):
    id: int
    webtoon_id: int
    webtoon_title: str
    chapter_number: float
    title: Optional[str] = None
    reward_coins: int
    is_reward_claimed: bool = False
    images: List[ChapterImageItem] = []
    prev_chapter_id: Optional[int] = None
    next_chapter_id: Optional[int] = None


class ChapterStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(published|rejected)$")


class PendingChapterItem(BaseModel):
    id: int
    webtoon_id: int
    webtoon_title: str
    chapter_number: float
    title: Optional[str] = None
    status: str
    images_count: int
    created_at: datetime
