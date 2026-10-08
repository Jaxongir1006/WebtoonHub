"""Reading continuity and time-bounded completion receipts, scoped to readers."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Float, String, Boolean, UniqueConstraint, select, func
from sqlalchemy.orm import selectinload
from app.core.database import Base, BigIntId, get_db
from app.modules.users.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.webtoons.models import Chapter, Webtoon
from app.core.transactions import entity_lock, serialize_user, lock_user

def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value

class ReadingProgress(Base):
    __tablename__ = 'reading_progress'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    user_id = Column(BigIntId, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    webtoon_id = Column(BigIntId, ForeignKey('webtoons.id', ondelete='CASCADE'), nullable=False, index=True)
    chapter_id = Column(BigIntId, ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True)
    page_index = Column(Integer, nullable=False, default=0)
    anchor = Column(String(200), nullable=True)
    progress_percent = Column(Float, nullable=False, default=0)
    started_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    __table_args__ = (UniqueConstraint('user_id', 'chapter_id', name='uq_reader_chapter_progress'),)

class ProgressUpdate(BaseModel):
    chapter_id: int = Field(gt=0)
    page_index: int = Field(0, ge=0, le=100000)
    anchor: str | None = Field(None, max_length=200)
    progress_percent: float = Field(0, ge=0, le=100, allow_inf_nan=False)
    completed: bool = False

def progress_data(row):
    return {'webtoon_id': row.webtoon_id, 'chapter_id': row.chapter_id, 'page_index': row.page_index,
            'anchor': row.anchor, 'progress_percent': row.progress_percent, 'completed': row.completed,
            'updated_at': utc(row.updated_at).isoformat(),
            'reward_eligible_at': (utc(row.started_at) + timedelta(seconds=10)).isoformat(), 'minimum_read_seconds': 10}

def latest_progress_query(user_id, work_ids=None):
    """Select one published chapter position per work before applying list limits."""
    ranked = (select(ReadingProgress.id.label('id'),
               func.row_number().over(partition_by=ReadingProgress.webtoon_id,
                 order_by=(ReadingProgress.updated_at.desc(), ReadingProgress.id.desc())).label('position'))
               .join(Chapter, ReadingProgress.chapter_id == Chapter.id)
               .where(ReadingProgress.user_id == user_id, Chapter.status == 'published'))
    if work_ids is not None:
        ranked = ranked.where(ReadingProgress.webtoon_id.in_(work_ids))
    ranked = ranked.subquery()
    return select(ReadingProgress).join(ranked, ReadingProgress.id == ranked.c.id).where(ranked.c.position == 1)

async def begin_reading(db, user_id, chapter):
    await lock_user(db, user_id)
    row = (await db.execute(select(ReadingProgress).where(ReadingProgress.user_id == user_id,
                        ReadingProgress.chapter_id == chapter.id))).scalar_one_or_none()
    if row is None:
        now = datetime.now(timezone.utc)
        row = ReadingProgress(user_id=user_id, webtoon_id=chapter.webtoon_id, chapter_id=chapter.id,
                              started_at=now, updated_at=now, page_index=0, progress_percent=0, completed=False)
        db.add(row)
        await db.flush()
    return row

router = APIRouter(prefix='/users/reading-progress', tags=['Reading progress'])

@router.get('')
async def list_progress(user: User = Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(latest_progress_query(user.id).add_columns(Webtoon.title, Webtoon.cover_image_url, Webtoon.type, Webtoon.slug, Chapter.chapter_number)
              .join(Webtoon, ReadingProgress.webtoon_id == Webtoon.id).join(Chapter, ReadingProgress.chapter_id == Chapter.id)
              .order_by(ReadingProgress.updated_at.desc(), ReadingProgress.id.desc()).limit(1000))).all()
    return {'success': True, 'data': [progress_data(row) | {'webtoon_title': title, 'cover_image_url': cover,
             'webtoon_type': work_type, 'webtoon_slug': slug, 'chapter_number': float(number)}
             for row, title, cover, work_type, slug, number in rows]}

@router.get('/{webtoon_id}')
async def get_progress(webtoon_id: int, user: User = Depends(get_current_user), db=Depends(get_db)):
    row = (await db.execute(latest_progress_query(user.id, [webtoon_id]))).scalar_one_or_none()
    return {'success': True, 'data': progress_data(row) if row else None}

@router.put('/{webtoon_id}')
@serialize_user
async def save_progress(webtoon_id: int, data: ProgressUpdate, user: User = Depends(get_current_user), db=Depends(get_db)):
    chapter = (await db.execute(select(Chapter).options(selectinload(Chapter.images), selectinload(Chapter.webtoon))
                   .where(Chapter.id == data.chapter_id, Chapter.webtoon_id == webtoon_id,
                          Chapter.status == 'published'))).scalar_one_or_none()
    if chapter is None:
        raise HTTPException(404, 'Published chapter not found')
    row = (await db.execute(select(ReadingProgress).where(ReadingProgress.user_id == user.id,
                      ReadingProgress.chapter_id == chapter.id).with_for_update())).scalar_one_or_none()
    if row is None:
        raise HTTPException(409, 'Open the chapter before saving reading progress')
    if chapter.webtoon.type != 'novel' and chapter.images and data.page_index >= len(chapter.images):
        raise HTTPException(422, 'Page index is outside this chapter')
    row.page_index, row.anchor, row.progress_percent = data.page_index, data.anchor, data.progress_percent
    row.updated_at = datetime.now(timezone.utc)
    if data.completed and data.progress_percent >= 95 and (row.updated_at - utc(row.started_at)).total_seconds() >= 10:
        row.completed = True
    await db.commit()
    return {'success': True, 'data': progress_data(row)}
