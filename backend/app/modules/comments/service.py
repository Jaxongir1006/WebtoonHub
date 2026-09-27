from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.comments.models import Comment
from app.modules.comments.schemas import (
    CommentAuthor,
    CommentCreate,
    CommentCreatedResponse,
    CommentReplyResponse,
    CommentResponse,
)
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.webtoons.models import Chapter


class CommentsService:
    @staticmethod
    async def list_comments(db: AsyncSession, chapter_id: int) -> List[CommentResponse]:
        # Check chapter exists
        ch_stmt = select(Chapter.id).where(Chapter.id == chapter_id)
        ch_res = await db.execute(ch_stmt)
        if not ch_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        # 1. Fetch top-level comments
        stmt = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.chapter_id == chapter_id, Comment.parent_id.is_(None))
            .order_by(Comment.created_at.desc())
        )
        result = await db.execute(stmt)
        top_comments = result.scalars().all()

        # 2. Fetch replies
        reply_stmt = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.chapter_id == chapter_id, Comment.parent_id.isnot(None))
            .order_by(Comment.created_at.asc())
        )
        reply_result = await db.execute(reply_stmt)
        replies = reply_result.scalars().all()

        # Collect user ids to load active frames in one query
        user_ids = set()
        for c in top_comments:
            if c.user:
                user_ids.add(c.user.id)
        for r in replies:
            if r.user:
                user_ids.add(r.user.id)

        user_frame_map: Dict[int, str] = {}
        if user_ids:
            frame_stmt = (
                select(UserInventory.user_id, ShopItem.asset_url)
                .join(ShopItem, UserInventory.item_id == ShopItem.id)
                .where(
                    UserInventory.user_id.in_(user_ids),
                    UserInventory.is_active.is_(True),
                    ShopItem.item_type == "frame"
                )
            )
            frame_res = await db.execute(frame_stmt)
            for uid, url in frame_res.all():
                user_frame_map[uid] = url

        # Group replies by parent_id
        replies_by_parent: Dict[int, List[CommentReplyResponse]] = {}
        for r in replies:
            author = CommentAuthor(
                id=r.user.id if r.user else 0,
                username=r.user.username if r.user else "Unknown",
                active_frame_url=user_frame_map.get(r.user.id) if r.user else None
            )
            reply_dto = CommentReplyResponse(
                id=r.id,
                parent_id=r.parent_id,
                user=author,
                content=r.content,
                created_at=r.created_at
            )
            replies_by_parent.setdefault(r.parent_id, []).append(reply_dto)

        # Build response
        response: List[CommentResponse] = []
        for c in top_comments:
            author = CommentAuthor(
                id=c.user.id if c.user else 0,
                username=c.user.username if c.user else "Unknown",
                active_frame_url=user_frame_map.get(c.user.id) if c.user else None
            )
            response.append(
                CommentResponse(
                    id=c.id,
                    user=author,
                    content=c.content,
                    created_at=c.created_at,
                    replies=replies_by_parent.get(c.id, [])
                )
            )

        return response

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        user_id: int,
        chapter_id: int,
        data: CommentCreate
    ) -> CommentCreatedResponse:
        # Check chapter exists and published
        ch_stmt = select(Chapter).where(Chapter.id == chapter_id)
        ch_res = await db.execute(ch_stmt)
        chapter = ch_res.scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")
        if chapter.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu bob hali chop etilmagan, unga sharh qoldirib bo'lmaydi"
            )

        target_parent_id: Optional[int] = None
        if data.parent_id is not None:
            p_stmt = select(Comment).where(Comment.id == data.parent_id)
            p_res = await db.execute(p_stmt)
            parent_comment = p_res.scalar_one_or_none()
            if not parent_comment:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Javob berilayotgan sharh topilmadi")
            if parent_comment.chapter_id != chapter_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Javob berilayotgan sharh ushbu bobga tegishli emas"
                )
            # If the parent is already a reply, link to the root top-level comment
            target_parent_id = parent_comment.parent_id if parent_comment.parent_id else parent_comment.id

        comment = Comment(
            chapter_id=chapter_id,
            user_id=user_id,
            parent_id=target_parent_id,
            content=data.content
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)

        return CommentCreatedResponse(
            id=comment.id,
            chapter_id=comment.chapter_id,
            parent_id=comment.parent_id,
            content=comment.content,
            created_at=comment.created_at
        )

    @staticmethod
    async def delete_comment(
        db: AsyncSession,
        comment_id: int,
        actor_role: str,
        actor_id: int,
        permissions: Optional[List[str]] = None
    ) -> None:
        stmt = select(Comment).where(Comment.id == comment_id)
        res = await db.execute(stmt)
        comment = res.scalar_one_or_none()
        if not comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sharh topilmadi")

        if actor_role == "user":
            if comment.user_id != actor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Siz faqat o'zingiz yozgan sharhlarni o'chira olasiz"
                )
        elif actor_role == "staff":
            perms = permissions or []
            if "superadmin" not in perms and "comments:moderate" not in perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sizda ushbu amalni bajarish uchun 'comments:moderate' huquqi mavjud emas"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu amalni bajarish uchun ruxsat yo'q"
            )

        await db.delete(comment)
        await db.commit()

    @staticmethod
    async def list_all_comments_for_staff(db: AsyncSession, page: int = 1, limit: int = 20):
        from sqlalchemy import func
        from app.modules.comments.schemas import StaffCommentItem, StaffCommentListResponse

        count_stmt = select(func.count(Comment.id))
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * limit
        stmt = (
            select(Comment)
            .options(
                selectinload(Comment.user),
                selectinload(Comment.chapter).selectinload(Chapter.webtoon)
            )
            .order_by(Comment.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await db.execute(stmt)
        comments = res.scalars().all()

        items = []
        for c in comments:
            ch_title = c.chapter.title if c.chapter and c.chapter.title else f"{c.chapter.chapter_number if c.chapter else '?'}-bob"
            w_title = c.chapter.webtoon.title if c.chapter and c.chapter.webtoon else "Noma'lum"
            author = CommentAuthor(
                id=c.user.id if c.user else 0,
                username=c.user.username if c.user else "Noma'lum"
            )
            items.append(
                StaffCommentItem(
                    id=c.id,
                    chapter_id=c.chapter_id,
                    chapter_title=ch_title,
                    webtoon_title=w_title,
                    user=author,
                    content=c.content,
                    created_at=c.created_at
                )
            )

        return StaffCommentListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit
        )

    @staticmethod
    async def update_comment(db: AsyncSession, comment_id: int, content: str) -> Comment:
        stmt = select(Comment).where(Comment.id == comment_id)
        res = await db.execute(stmt)
        comment = res.scalar_one_or_none()
        if not comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sharh topilmadi")

        comment.content = content.strip()
        await db.commit()
        await db.refresh(comment)
        return comment

