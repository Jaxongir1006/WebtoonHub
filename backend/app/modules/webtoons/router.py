import json
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Header, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.modules.webtoons.models import Webtoon, Chapter, ChapterImage
from app.core.storage import StorageService
from app.core.config import settings
import uuid

from app.core.database import get_db
from app.modules.auth.dependencies import get_optional_user
from app.modules.staff.dependencies import require_permission, require_any_permission, owns_content_only, can_approve_chapters
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

def parse_genre_ids(value):
    try:
        ids = json.loads(value)
        if not isinstance(ids,list) or any(not isinstance(identifier,int) or isinstance(identifier,bool) or identifier<=0 for identifier in ids):
            raise ValueError()
        return list(dict.fromkeys(ids))
    except (ValueError, TypeError):
        raise HTTPException(422, 'genre_ids must be a JSON array of positive genre IDs')

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
    type: Optional[str] = Query(None, pattern=r"^(manhwa|manga|novel)$"),
    genre: Optional[str] = None,
    status: Optional[str] = Query(None, pattern=r"^(ongoing|completed)$"),
    search: Optional[str] = None,
    sort: str = Query("popular", pattern=r"^(popular|updated|newest|latest|title)$"),
    db: AsyncSession = Depends(get_db)
):
    catalog = await WebtoonService.list_catalog(
        db=db,
        page=page,
        limit=limit,
        type_filter=type,
        genre_slug=genre,
        status_filter=status,
        search_query=search, sort=sort
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
    type: str = Form("manhwa"),
    description: Optional[str] = Form(None),
    author_name: Optional[str] = Form(None),
    status: str = Form("ongoing"),
    genre_ids: str = Form("[]"),  # JSON array string e.g. "[1, 3]"
    cover_image: UploadFile = File(...),
    staff: StaffUser = Depends(require_permission("webtoons:create")),
    db: AsyncSession = Depends(get_db)
):
    parsed_genre_ids = parse_genre_ids(genre_ids)

    webtoon = await WebtoonService.create_webtoon(
        db=db,
        title=title,
        description=description,
        author_name=author_name,
        status_val=status,
        genre_ids=parsed_genre_ids,
        cover_file=cover_image,
        staff_id=staff.id,
        type_val=type
    )
    return {
        "success": True,
        "data": {
            "id": webtoon.id,
            "title": webtoon.title,
            "slug": webtoon.slug,
            "type": webtoon.type,
            "cover_image_url": webtoon.cover_image_url,
            "status": webtoon.status
        },
        "message": "Yangi asar muvaffaqiyatli yaratildi"
    }


# 5b. Staff Webtoons Listing & Detail
@staff_router.get("/webtoons", status_code=status.HTTP_200_OK)
async def list_staff_webtoons(
    _staff: StaffUser = Depends(require_any_permission("webtoons:create", "webtoons:edit", "webtoons:delete", "chapters:create", "chapters:edit", "chapters:delete", "chapters:approve")),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, pattern=r"^(manhwa|manga|novel)$"),
    genre: Optional[str] = None,
    status: Optional[str] = Query(None, pattern=r"^(ongoing|completed)$"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    catalog = await WebtoonService.list_catalog(
        db=db,
        page=page,
        limit=limit,
        type_filter=type,
        genre_slug=genre,
        status_filter=status,
        search_query=search,
        owner_id=_staff.id if owns_content_only(_staff) else None,
        include_unpublished=True
    )
    return {
        "success": True,
        "data": catalog
    }


@staff_router.get("/webtoons/{id_or_slug}", status_code=status.HTTP_200_OK)
async def get_staff_webtoon(
    id_or_slug: str,
    _staff: StaffUser = Depends(require_any_permission("webtoons:create", "webtoons:edit", "webtoons:delete", "chapters:create", "chapters:edit", "chapters:delete", "chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    detail = await WebtoonService.staff_detail(db, id_or_slug, _staff)
    from app.core.content import staff_media_url
    for chapter in detail["chapters"]:
        for image in chapter["images"]:
            image["image_url"] = staff_media_url(image["image_url"], _staff)
    return {"success": True, "data": detail}


# 6. Upload Chapter (Creator / Admin)
@staff_router.post("/chapters", status_code=status.HTTP_201_CREATED)
async def upload_chapter(
    webtoon_id: int = Form(...),
    chapter_number: float = Form(..., gt=0, allow_inf_nan=False),
    title: Optional[str] = Form(None),
    content_text: Optional[str] = Form(None),
    reward_coins: Optional[int] = Form(None, ge=0, le=1000000),
    images: Optional[List[UploadFile]] = File(None),
    _staff: StaffUser = Depends(require_permission("chapters:create")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.authorize_work(db, webtoon_id, _staff)
    chapter = await WebtoonService.upload_chapter(
        db=db,
        webtoon_id=webtoon_id,
        chapter_number=chapter_number,
        title=title,
        content_text=content_text,
        images=images, reward_coins=reward_coins
    )
    images_count = len(images) if images else 0
    return {
        "success": True,
        "data": {
            "id": chapter.id,
            "webtoon_id": chapter.webtoon_id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "status": chapter.status,
            "content_text": chapter.content_text,
            "images_count": images_count,
            "reward_coins": chapter.reward_coins
        },
        "message": "Bob muvaffaqiyatli yuklandi va tekshiruvga yuborildi"
    }


# 7. Moderate Chapter (Admin / Moderator)
@staff_router.patch("/chapters/{id}/status", status_code=status.HTTP_200_OK)
async def moderate_chapter(
    id: int,
    data: ChapterStatusUpdate,
    _staff: StaffUser = Depends(require_permission("chapters:approve")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.moderate_chapter(db, id, data.status, data.feedback)
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
    count = select(func.count(Chapter.id))
    if status and status != "all":
        count = count.where(Chapter.status == status)
    total = await db.scalar(count)
    return {
        "success": True,
        "data": {
            "items": chapters,
            "total": total, "page": page, "limit": limit
        }
    }


@staff_router.get("/chapters/{id}", status_code=status.HTTP_200_OK)
async def read_staff_chapter(
    id: int,
    _staff: StaffUser = Depends(require_any_permission("chapters:approve", "chapters:edit", "chapters:create")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.authorize_chapter(db, id, _staff)
    chapter_data = await WebtoonService.read_chapter(db, id, None, is_staff=True)
    from app.core.content import staff_media_url
    for image in chapter_data.images:
        image.image_url = staff_media_url(image.image_url, _staff)
    return {
        "success": True,
        "data": chapter_data
    }


# 9. Edit Webtoon (Creator / Admin)
@staff_router.patch("/webtoons/{id}", status_code=status.HTTP_200_OK)
async def update_webtoon(
    id: int,
    title: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    author_name: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    genre_ids: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    _staff: StaffUser = Depends(require_permission("webtoons:edit")),
    db: AsyncSession = Depends(get_db)
):
    parsed_ids = parse_genre_ids(genre_ids) if genre_ids is not None else None

    await WebtoonService.authorize_work(db, id, _staff)
    updated = await WebtoonService.update_webtoon(
        db=db,
        webtoon_id=id,
        title=title,
        type_val=type,
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
            "type": updated.type,
            "status": updated.status,
            "cover_image_url": updated.cover_image_url
        },
        "message": "Asar ma'lumotlari muvaffaqiyatli yangilandi"
    }


# 10. Delete Webtoon (Admin)
@staff_router.delete("/webtoons/{id}", status_code=status.HTTP_200_OK)
async def delete_webtoon(
    id: int,
    _staff: StaffUser = Depends(require_permission("webtoons:delete")),
    db: AsyncSession = Depends(get_db)
):
    await WebtoonService.authorize_work(db, id, _staff)
    await WebtoonService.delete_webtoon(db, id)
    return {
        "success": True,
        "data": None,
        "message": "Manhwa va uning barcha materiallari muvaffaqiyatli o'chirildi"
    }


# 11. Staff Genres listing alias
@staff_router.get("/genres", status_code=status.HTTP_200_OK)
async def list_staff_genres(_staff: StaffUser = Depends(require_any_permission("genres:manage", "webtoons:create", "webtoons:edit")), db: AsyncSession = Depends(get_db)):
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
    await WebtoonService.authorize_work(db, id, _staff)
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
    await WebtoonService.authorize_chapter(db, id, _staff)
    if data.status in {"published", "rejected"} and not can_approve_chapters(_staff):
        raise HTTPException(403, "Publishing and rejecting chapters requires chapters:approve")
    chapter = await WebtoonService.update_chapter(db, chapter_id=id, data=data, can_approve=can_approve_chapters(_staff))
    return {
        "success": True,
        "data": {
            "id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "reward_coins": chapter.reward_coins,
            "status": chapter.status,
            "status_changed_to_pending": getattr(chapter, '_status_changed_to_pending', False)
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
    await WebtoonService.authorize_chapter(db, id, _staff)
    await WebtoonService.delete_chapter(db, chapter_id=id)
    return {
        "success": True,
        "data": None,
        "message": "Bob muvaffaqiyatli o'chirildi"
    }



@client_router.get('/webtoons/{id_or_slug}/chapters')
async def published_chapters(id_or_slug: str, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), user: Optional[User] = Depends(get_optional_user), db=Depends(get_db)):
    condition = Webtoon.id == int(id_or_slug) if id_or_slug.isdigit() else Webtoon.slug == id_or_slug
    work_id = await db.scalar(select(Webtoon.id).where(condition))
    if work_id is None: raise HTTPException(404, 'Work not found')
    rows = (await db.execute(select(Chapter.id,Chapter.chapter_number,Chapter.title,Chapter.reward_coins,Chapter.created_at)
                   .where(Chapter.webtoon_id == work_id,Chapter.status == 'published').order_by(Chapter.chapter_number.asc(),Chapter.id.asc()).offset(offset).limit(limit))).all()
    from app.modules.rewards.models import ReadReward
    claimed = set((await db.execute(select(ReadReward.chapter_id).where(ReadReward.user_id == user.id, ReadReward.chapter_id.in_([row.id for row in rows])))).scalars()) if user else set()
    return {'success': True, 'data': [{'id': row.id, 'chapter_number': float(row.chapter_number), 'title': row.title,
               'reward_coins': row.reward_coins, 'created_at': row.created_at, 'is_claimed': row.id in claimed} for row in rows]}

@staff_router.post('/chapters/{id}/images')
async def append_chapter_images(id: int, images: Optional[List[UploadFile]] = File(None), retained_image_ids: Optional[str] = Form(None), chapter_update: Optional[str] = Form(None), idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key', max_length=128), _staff: StaffUser = Depends(require_permission('chapters:edit')), db=Depends(get_db)):
    await WebtoonService.authorize_chapter(db, id, _staff)
    retained = None
    if retained_image_ids is not None:
        try:
            retained = json.loads(retained_image_ids)
            if (not isinstance(retained, list) or len(retained) > 100 or len(set(retained)) != len(retained)
                    or any(not isinstance(value, int) or isinstance(value, bool) or value <= 0 for value in retained)):
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(422, 'retained_image_ids must be an ordered JSON array of unique positive image IDs')
    changes = None
    if chapter_update is not None:
        from pydantic import ValidationError
        try:
            changes = ChapterUpdateRequest.model_validate_json(chapter_update)
        except ValidationError:
            raise HTTPException(422, 'chapter_update must contain valid chapter metadata')
        if changes.image_ids is not None:
            raise HTTPException(422, 'Use retained_image_ids to specify ordered pages')
    result = await WebtoonService.append_images(db, id, images, _staff.id, idempotency_key, retained, changes, can_approve_chapters(_staff))
    added = result['added_images'] if isinstance(result, dict) else result
    from app.core.content import staff_media_url
    for image in added:
        image['image_url'] = staff_media_url(image['image_url'], _staff)
    return {'success': True, 'data': result}


@client_router.get('/share/webtoons/{id_or_slug}')
async def share_work(id_or_slug: str, db=Depends(get_db)):
    from html import escape
    from urllib.parse import quote
    from fastapi.responses import HTMLResponse
    condition = Webtoon.id == int(id_or_slug) if id_or_slug.isdigit() else Webtoon.slug == id_or_slug
    work = await db.scalar(select(Webtoon).where(condition, Webtoon.chapters.any(Chapter.status == 'published')))
    if not work:
        raise HTTPException(404, 'Published work not found')
    reader_url = settings.FRONTEND_URL.rstrip('/') + '/webtoons/' + quote(work.slug, safe='')
    cover = work.cover_image_url if work.cover_image_url.startswith(('https://', 'http://')) else settings.FRONTEND_URL.rstrip('/') + work.cover_image_url
    title, description = escape(work.title, quote=True), escape((work.description or 'Read on WebtoonHub')[:300], quote=True)
    canonical, image = escape(reader_url, quote=True), escape(cover, quote=True)
    html = f'<html><head><meta charset="utf-8"><title>{title} - WebtoonHub</title><meta name="description" content="{description}"><meta property="og:type" content="book"><meta property="og:title" content="{title}"><meta property="og:description" content="{description}"><meta property="og:image" content="{image}"><meta property="og:url" content="{canonical}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{description}"><meta name="twitter:image" content="{image}"><link rel="canonical" href="{canonical}"><meta http-equiv="refresh" content="0;url={canonical}"></head><body><a href="{canonical}">Read {title} on WebtoonHub</a></body></html>'
    return HTMLResponse(html, headers={'Cache-Control':'public,max-age=300', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"})
