from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.library.models import Bookmark
from app.modules.library.schemas import BookmarkItemResponse, WebtoonBookmarkInfo
from app.modules.webtoons.models import Webtoon


class LibraryService:
    @staticmethod
    async def get_library(
        db: AsyncSession,
        user_id: int,
        status_filter: Optional[str] = None
    ) -> List[BookmarkItemResponse]:
        query = (
            select(Bookmark)
            .options(selectinload(Bookmark.webtoon))
            .where(Bookmark.user_id == user_id)
        )
        if status_filter:
            query = query.where(Bookmark.status == status_filter)
        query = query.order_by(Bookmark.updated_at.desc())

        result = await db.execute(query)
        bookmarks = result.scalars().all()

        return [
            BookmarkItemResponse(
                webtoon=WebtoonBookmarkInfo.model_validate(b.webtoon),
                reading_status=b.status,
                updated_at=b.updated_at
            )
            for b in bookmarks
            if b.webtoon is not None
        ]

    @staticmethod
    async def update_bookmark(
        db: AsyncSession,
        user_id: int,
        webtoon_id: int,
        status_val: str
    ) -> Bookmark:
        # Check webtoon exists
        w_stmt = select(Webtoon).where(Webtoon.id == webtoon_id)
        w_res = await db.execute(w_stmt)
        if not w_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        stmt = select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.webtoon_id == webtoon_id)
        res = await db.execute(stmt)
        bookmark = res.scalar_one_or_none()

        if bookmark:
            bookmark.status = status_val
        else:
            bookmark = Bookmark(
                user_id=user_id,
                webtoon_id=webtoon_id,
                status=status_val
            )
            db.add(bookmark)

        await db.commit()
        await db.refresh(bookmark)
        return bookmark

    @staticmethod
    async def remove_bookmark(db: AsyncSession, user_id: int, webtoon_id: int) -> None:
        stmt = delete(Bookmark).where(Bookmark.user_id == user_id, Bookmark.webtoon_id == webtoon_id)
        res = await db.execute(stmt)
        if res.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xatcho'p topilmadi")
        await db.commit()
