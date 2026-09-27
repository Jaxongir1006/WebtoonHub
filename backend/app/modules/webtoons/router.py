import json
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_optional_user
from app.modules.staff.dependencies import require_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User
from app.modules.webtoons.schemas import (
    ChapterStatusUpdate,
    ChapterUpdateRequest,
    GenreCreateRequest,
    GenreItem,
    GenreUpdateRequest,
    WebtoonCatalogResponse,
    WebtoonDetailResponse
)
from app.modules.webtoons.service import WebtoonService

client_router = APIRouter(tags=["Webtoons & Reader (Public)"])
staff_router = APIRouter(prefix="/staff", tags=["Webtoons & Chapters (Staff)"])


# 1. Genres List
@client_router.get("/genres", status_code=status.HTTP_200_OK)
async def list_genres(db: AsyncSession = Depends(get_db)):
    genres = await WebtoonService.list_genres(db)
    return {
        "success": True,
        "data": genres
    }


# 2. Webtoons Catalog & Search
@client_router.get("/webtoons", status_code=status.HTTP_200_OK)
async def list_catalog(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
    status: Optional[str] = Query(None, pattern=r"^(ongoing|completed)$"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    catalog = await WebtoonService.list_catalog(
        db=db,
        page=page,
        limit=limit,
        genre_slug=genre,
        status_filter=status,
        search_query=search
    )
    return {
        "success": True,
        "data": catalog
    }


# 3. Webtoon Details & Chapters
@client_router.get("/webtoons/{id_or_slug}", status_code=status.HTTP_200_OK)
async def get_webtoon(
    id_or_slug: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    detail = await WebtoonService.get_webtoon_detail(db, id_or_slug, user_id)
    return {
        "success": True,
        "data": detail
    }


# 4. Vertical Chapter Reader
@client_router.get("/chapters/{id}", status_code=status.HTTP_200_OK)
async def read_chapter(
    id: int,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    chapter_data = await WebtoonService.read_chapter(db, id, user_id)
    return {
        "success": True,
        "data": chapter_data
    }


# --- STAFF ENDPOINTS ---

# 5. Create Webtoon (Creator / Admin)
@staff_router.post("/webtoons", status_code=status.HTTP_201_CREATED)
async def create_webtoon(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    author_name: Optional[str] = Form(None),
    status: str = Form("ongoing"),
    genre_ids: str = Form("[]"),  # JSON array string e.g. "[1, 3]"
    cover_image: UploadFile = File(...),
    staff: StaffUser = Depends(require_permission("webtoons:create")),
    db: AsyncSession = Depends(get_db)
):
    try:
        parsed = json.loads(genre_ids)
        if isinstance(parsed, list):
            parsed_genre_ids = [int(x) for x in parsed]
        elif isinstance(parsed, int):
            parsed_genre_ids = [parsed]
        else:
            parsed_genre_ids = []
    except Exception:
        try:
            parsed_genre_ids = [int(x.strip()) for x in genre_ids.split(",") if x.strip().isdigit()]
        except Exception:
            parsed_genre_ids = []

    webtoon = await WebtoonService.create_webtoon(
        db=db,
        title=title,
        description=description,
        author_name=author_name,
        status_val=status,
        genre_ids=parsed_genre_ids,
        cover_file=cover_image,
        staff_id=staff.id
    )
    return {
        "success": True,
        "data": {
            "id": webtoon.id,
            "title": webtoon.title,
            "slug": webtoon.slug,
            "cover_image_url": webtoon.cover_image_url,
            "status": webtoon.status
        },
        "message": "Yangi manhva muvaffaqiyatli yaratildi"
    }


# 5b. Staff Webtoons Listing & Detail
@staff_router.get("/webtoons", status_code=status.HTTP_200_OK)
async def list_staff_webtoons(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
    status: Optional[str] = Query(None, pattern=r"^(ongoing|completed)$"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    catalog = await WebtoonService.list_catalog(
        db=db,
        page=page,
        limit=limit,
        genre_slug=genre,
        status_filter=status,
        search_query=search
    )
    return {
        "success": True,
        "data": catalog
    }


@staff_router.get("/webtoons/{id_or_slug}", status_code=status.HTTP_200_OK)
async def get_staff_webtoon(
    id_or_slug: str,
    db: AsyncSession = Depends(get_db)
):
    detail = await WebtoonService.get_webtoon_detail(db, id_or_slug, None)
    return {
        "success": True,
        "data": detail
    }


# 6. Upload Chapter (Creator / Admin)
@staff_router.post("/chapters", status_code=status.HTTP_201_CREATED)
async def upload_chapter(
    webtoon_id: int = Form(...),
    chapter_number: float = Form(...),
    title: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
    _staff: StaffUser = Depends(require_permission("chapters:create")),
    db: AsyncSession = Depends(get_db)
):
    chapter = await WebtoonService.upload_chapter(
        db=db,
        webtoon_id=webtoon_id,
        chapter_number=chapter_number,
        title=title,
        images=images
    )
    return {
        "success": True,
        "data": {
            "id": chapter.id,
            "webtoon_id": chapter.webtoon_id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "status": chapter.status,
            "images_count": len(images),
            "reward_coins": chapter.reward_coins
        },
        "message": "Bob rasmlari muvaffaqiyatli yuklandi va tekshiruvga yuborildi"
    }


# 7. Moderate Chapter (Admin / Moderator)
@staff_router.patch("/chapters/{id}/status", status_code=status.HTTP_200_OK)
async def moderate_chapter(
    id: int,
    data: ChapterStatusUpdate,
    _staff: StaffUser = Depends(require_permission("chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.moderate_chapter(db, id, data.status)
    msg = "Bob muvaffaqiyatli tasdiqlandi va ommaga e'lon qilindi!" if data.status == "published" else "Bob rad etildi"
    return {
        "success": True,
        "data": {
            "id": id,
            "status": data.status
        },
        "message": msg
    }


# 8. List Pending Chapters (Admin / Moderator)
@staff_router.get("/chapters/pending", status_code=status.HTTP_200_OK)
async def list_pending_chapters(
    _staff: StaffUser = Depends(require_permission("chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    chapters = await WebtoonService.list_pending_chapters(db)
    return {
        "success": True,
        "data": chapters
    }


# 8b. List All Chapters & Read Chapter (Admin / Moderator)
@staff_router.get("/chapters", status_code=status.HTTP_200_OK)
async def list_staff_chapters(
    status: Optional[str] = Query(None, description="Bob statusi filtri"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    _staff: StaffUser = Depends(require_permission("chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    chapters = await WebtoonService.list_all_chapters_staff(db, status_filter=status, page=page, limit=limit)
    return {
        "success": True,
        "data": {
            "items": chapters,
            "total": len(chapters)
        }
    }


@staff_router.get("/chapters/{id}", status_code=status.HTTP_200_OK)
async def read_staff_chapter(
    id: int,
    _staff: StaffUser = Depends(require_permission("chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    chapter_data = await WebtoonService.read_chapter(db, id, None)
    return {
        "success": True,
        "data": chapter_data
    }


# 9. Edit Webtoon (Creator / Admin)
@staff_router.patch("/webtoons/{id}", status_code=status.HTTP_200_OK)
async def update_webtoon(
    id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    author_name: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    genre_ids: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    _staff: StaffUser = Depends(require_permission("webtoons:edit")),
    db: AsyncSession = Depends(get_db)
):
    parsed_ids = None
    if genre_ids:
        try:
            parsed = json.loads(genre_ids)
            if isinstance(parsed, list):
                parsed_ids = [int(x) for x in parsed]
            elif isinstance(parsed, int):
                parsed_ids = [parsed]
        except Exception:
            try:
                parsed_ids = [int(x.strip()) for x in genre_ids.split(",") if x.strip().isdigit()]
            except Exception:
                parsed_ids = None

    updated = await WebtoonService.update_webtoon(
        db=db,
        webtoon_id=id,
        title=title,
        description=description,
        author_name=author_name,
        status_val=status,
        genre_ids=parsed_ids,
        cover_file=cover_image
    )
    return {
        "success": True,
        "data": {
            "id": updated.id,
            "title": updated.title,
            "slug": updated.slug,
            "status": updated.status,
            "cover_image_url": updated.cover_image_url
        },
        "message": "Manhwa ma'lumotlari muvaffaqiyatli yangilandi"
    }


# 10. Delete Webtoon (Admin)
@staff_router.delete("/webtoons/{id}", status_code=status.HTTP_200_OK)
async def delete_webtoon(
    id: int,
    _staff: StaffUser = Depends(require_permission("webtoons:delete")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.delete_webtoon(db, id)
    return {
        "success": True,
        "data": None,
        "message": "Manhwa va uning barcha materiallari muvaffaqiyatli o'chirildi"
    }


# 11. Staff Genres listing alias
@staff_router.get("/genres", status_code=status.HTTP_200_OK)
async def list_staff_genres(db: AsyncSession = Depends(get_db)):
    genres = await WebtoonService.list_genres(db)
    return {
        "success": True,
        "data": genres
    }


# 12. Create Genre (Staff)
@staff_router.post("/genres", status_code=status.HTTP_201_CREATED)
async def create_genre(
    data: GenreCreateRequest,
    _staff: StaffUser = Depends(require_permission("genres:manage")),
    db: AsyncSession = Depends(get_db)
):
    genre = await WebtoonService.create_genre(db, name=data.name, slug=data.slug)
    return {
        "success": True,
        "data": GenreItem.model_validate(genre),
        "message": "Yangi janr muvaffaqiyatli yaratildi"
    }


# 13. Update Genre (Staff)
@staff_router.patch("/genres/{id}", status_code=status.HTTP_200_OK)
async def update_genre(
    id: int,
    data: GenreUpdateRequest,
    _staff: StaffUser = Depends(require_permission("genres:manage")),
    db: AsyncSession = Depends(get_db)
):
    genre = await WebtoonService.update_genre(db, genre_id=id, name=data.name, slug=data.slug)
    return {
        "success": True,
        "data": GenreItem.model_validate(genre),
        "message": "Janr ma'lumotlari muvaffaqiyatli yangilandi"
    }


# 14. Delete Genre (Staff)
@staff_router.delete("/genres/{id}", status_code=status.HTTP_200_OK)
async def delete_genre(
    id: int,
    _staff: StaffUser = Depends(require_permission("genres:manage")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.delete_genre(db, genre_id=id)
    return {
        "success": True,
        "data": None,
        "message": "Janr muvaffaqiyatli o'chirildi"
    }


# 15. List Webtoon Chapters (Staff)
@staff_router.get("/webtoons/{id}/chapters", status_code=status.HTTP_200_OK)
async def list_webtoon_chapters(
    id: int,
    status: Optional[str] = Query(None, description="Bob statusi filtri"),
    _staff: StaffUser = Depends(require_permission("webtoons:create")),
    db: AsyncSession = Depends(get_db)
):
    chapters = await WebtoonService.list_webtoon_chapters_staff(db, webtoon_id=id, status_filter=status)
    return {
        "success": True,
        "data": chapters
    }


# 16. Update Chapter (Staff)
@staff_router.patch("/chapters/{id}", status_code=status.HTTP_200_OK)
async def update_chapter(
    id: int,
    data: ChapterUpdateRequest,
    _staff: StaffUser = Depends(require_permission("chapters:edit")),
    db: AsyncSession = Depends(get_db)
):
    chapter = await WebtoonService.update_chapter(db, chapter_id=id, data=data)
    return {
        "success": True,
        "data": {
            "id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "reward_coins": chapter.reward_coins,
            "status": chapter.status
        },
        "message": "Bob ma'lumotlari muvaffaqiyatli yangilandi"
    }


# 17. Delete Chapter (Staff)
@staff_router.delete("/chapters/{id}", status_code=status.HTTP_200_OK)
async def delete_chapter(
    id: int,
    _staff: StaffUser = Depends(require_permission("chapters:delete")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.delete_chapter(db, chapter_id=id)
    return {
        "success": True,
        "data": None,
        "message": "Bob muvaffaqiyatli o'chirildi"
    }

