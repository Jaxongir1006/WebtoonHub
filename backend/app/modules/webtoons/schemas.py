from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GenreItem(BaseModel):
    id: int
    name: str
    slug: str
    webtoon_count: int = 0

    class Config:
        from_attributes = True


class LatestChapterInfo(BaseModel):
    id: int
    chapter_number: float
    created_at: datetime
    published_at: Optional[datetime] = None


class WebtoonSummaryItem(BaseModel):
    id: int
    title: str
    slug: str
    type: str = "manhwa"
    description: Optional[str] = None
    cover_image_url: str
    author_name: Optional[str] = None
    status: str
    view_count: int
    genres: List[str] = []
    genre_ids: List[int] = []
    chapter_count: int = 0
    latest_chapter: Optional[LatestChapterInfo] = None
    first_chapter: Optional[LatestChapterInfo] = None


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
    content_text: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None


class WebtoonDetailResponse(BaseModel):
    id: int
    title: str
    slug: str
    type: str = "manhwa"
    description: Optional[str] = None
    cover_image_url: str
    author_name: Optional[str] = None
    status: str
    view_count: int
    genres: List[str] = []
    genre_ids: List[int] = []
    chapter_count: int = 0
    chapters: List[ChapterItemSimple] = []


class ChapterImageItem(BaseModel):
    id: int
    image_url: str
    order_index: int
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        from_attributes = True


class ChapterReaderResponse(BaseModel):
    id: int
    webtoon_id: int
    webtoon_title: str
    webtoon_type: str = "manhwa"
    chapter_number: float
    title: Optional[str] = None
    reward_coins: int
    is_reward_claimed: bool = False
    content_text: Optional[str] = None
    images: List[ChapterImageItem] = []
    reading_progress: Optional[dict] = None
    reward_eligible_at: Optional[datetime] = None
    minimum_read_seconds: int = 10
    prev_chapter_id: Optional[int] = None
    next_chapter_id: Optional[int] = None


class ChapterStatusUpdate(BaseModel):
    feedback: Optional[str] = Field(None, max_length=1000)
    status: str = Field(pattern=r"^(published|rejected)$")


class PendingChapterItem(BaseModel):
    id: int
    webtoon_id: int
    webtoon_title: str
    chapter_number: float
    title: Optional[str] = None
    status: str
    content_text: Optional[str] = None
    images_count: int
    created_at: datetime


class GenreCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    slug: Optional[str] = None


class GenreUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    slug: Optional[str] = None


class StaffChapterItem(BaseModel):
    id: int
    webtoon_id: int
    chapter_number: float
    title: Optional[str] = None
    reward_coins: int = 5
    status: str
    content_text: Optional[str] = None
    images_count: int = 0
    created_at: datetime


class ChapterUpdateRequest(BaseModel):
    model_config = {"extra": "forbid"}
    chapter_number: Optional[float] = Field(None, gt=0, allow_inf_nan=False)
    title: Optional[str] = Field(None, max_length=255)
    content_text: Optional[str] = Field(None, max_length=2000000)
    reward_coins: Optional[int] = Field(None, ge=0, le=1000000)
    image_ids: Optional[List[int]] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(draft|pending|published|rejected)$")

