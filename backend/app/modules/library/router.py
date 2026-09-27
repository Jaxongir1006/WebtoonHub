from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.library.schemas import BookmarkStatusUpdate
from app.modules.library.service import LibraryService
from app.modules.users.models import User

router = APIRouter(prefix="/users/library", tags=["Library & Bookmarks"])


# 1. Get Library
@router.get("", status_code=status.HTTP_200_OK)
async def get_library(
    status: Optional[str] = Query(None, pattern=r"^(reading|plan_to_read|completed|dropped)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    items = await LibraryService.get_library(db, user.id, status)
    return {
        "success": True,
        "data": items
    }


# 2. Add or Update Bookmark Status
@router.post("/{webtoon_id}", status_code=status.HTTP_200_OK)
async def update_bookmark(
    webtoon_id: int,
    data: BookmarkStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    bookmark = await LibraryService.update_bookmark(db, user.id, webtoon_id, data.status)
    return {
        "success": True,
        "data": {
            "webtoon_id": bookmark.webtoon_id,
            "status": bookmark.status
        },
        "message": f"Kutubxona holati muvaffaqiyatli '{bookmark.status}' ga o'zgartirildi"
    }


# 3. Remove from Library
@router.delete("/{webtoon_id}", status_code=status.HTTP_200_OK)
async def remove_bookmark(
    webtoon_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await LibraryService.remove_bookmark(db, user.id, webtoon_id)
    return {
        "success": True,
        "data": None,
        "message": "Manhwa kutubxonangizdan o'chirildi"
    }
