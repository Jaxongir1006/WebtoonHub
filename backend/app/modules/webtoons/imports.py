"""Resumable page-at-a-time imports with private staging and atomic finalization."""
import asyncio
import hashlib
import io
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.economy import economy_value
from app.core.redis import CacheService
from app.core.storage import MAX_MEDIA_BYTES, StorageService, safe_path, validated_media
from app.core.remote_storage import SupabaseStorage, object_key
from app.core.transactions import entity_lock
from app.modules.staff.dependencies import require_permission, can_approve_chapters
from app.modules.staff.models import Role, StaffUser
from app.modules.webtoons.import_models import ChapterImport, ChapterImportPage
from app.modules.webtoons.models import Chapter, ChapterImage
from app.modules.webtoons.service import WebtoonService

logger = logging.getLogger(__name__)
STAGING_ROOT = Path(__file__).resolve().parents[3] / 'private_chapter_imports'
MAX_CHAPTER_BYTES = 50 * 1024 * 1024
router = APIRouter(prefix='/staff/chapter-imports', tags=['Resumable chapter imports'])


class PageManifest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0, le=MAX_MEDIA_BYTES)
    last_modified: int | None = Field(default=None, ge=0)
    sha256: str | None = Field(default=None, pattern=r'^[a-fA-F0-9]{64}$')

    @field_validator('name')
    @classmethod
    def image_name(cls, value):
        # Names are labels only, never filesystem paths.
        if '\x00' in value or not value.strip():
            raise ValueError('A filename is required')
        if Path(value).suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
            raise ValueError('Use PNG, JPEG, GIF or WebP pages')
        return value

    @field_validator('sha256')
    @classmethod
    def normalize_hash(cls, value):
        return value.lower() if value else value


class ImportRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    webtoon_id: int = Field(gt=0)
    chapter_number: float = Field(gt=0, allow_inf_nan=False)
    title: str | None = Field(default=None, max_length=255)
    reward_coins: int | None = Field(default=None, ge=0, le=1000000)
    pages: list[PageManifest] = Field(min_length=1, max_length=100)
    idempotency_key: str = Field(min_length=1, max_length=128, pattern=r'^\S+$')


class FinalizeRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    publish: bool = False


def _expired(session):
    expiry = session.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return expiry <= datetime.now(timezone.utc)


def _staging_path(session_id, staging_name):
    path = (STAGING_ROOT / session_id / staging_name).resolve()
    if not path.is_relative_to(STAGING_ROOT.resolve()):
        raise HTTPException(400, 'Invalid import storage path')
    return path


def _write_private(path, data):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
        try:
            temporary.write_bytes(data)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    except OSError as exc:
        logger.warning('Import media storage unavailable', exc_info=True)
        raise HTTPException(503, 'Image storage is unavailable; retry this page') from exc


def _stage_key(import_id, name):
    try:
        uuid.UUID(import_id)
    except (ValueError, TypeError):
        raise HTTPException(400, 'Invalid import storage path')
    return object_key(import_id + '/' + name)


def _write_stage(import_id, name, data):
    if StorageService.remote():
        SupabaseStorage.write(_stage_key(import_id, name), data, private=True)
    else:
        _write_private(_staging_path(import_id, name), data)


def _read_stage(import_id, name):
    if StorageService.remote():
        try:
            return SupabaseStorage.read(_stage_key(import_id, name), private=True)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
    else:
        path = _staging_path(import_id, name)
        if path.is_file():
            return path.read_bytes()
    raise HTTPException(409, 'A saved page is missing; discard this import and upload it again')


def _delete_stage(import_id, name):
    try:
        if StorageService.remote():
            SupabaseStorage.delete(_stage_key(import_id, name), private=True)
        else:
            _staging_path(import_id, name).unlink(missing_ok=True)
    except (OSError, HTTPException):
        logger.warning('Private stage cleanup could not complete')


def _write_final_page(name, content):
    if StorageService.remote():
        StorageService.write_bytes(name, content)
    else:
        _write_private(safe_path(name), content)


async def _pages(db, session_id):
    return list((await db.scalars(select(ChapterImportPage).where(
        ChapterImportPage.import_id == session_id).order_by(ChapterImportPage.page_index))).all())


async def _response(db, session):
    pages = await _pages(db, session.id)
    expiry = session.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return {'success': True, 'data': {
        'id': session.id, 'status': session.status, 'chapter_id': session.chapter_id,
        'page_count': len(json.loads(session.manifest_json)), 'expires_at': expiry,
        'uploaded_pages': [{'index': page.page_index, 'name': page.original_name,
                            'size': page.source_size, 'sha256': page.sha256,
                            'width': page.width, 'height': page.height} for page in pages],
    }}


async def _owned(db, import_id, staff, *, lock=False, allow_expired=False, allow_cancelled=False):
    query = select(ChapterImport).where(ChapterImport.id == import_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    session = await db.scalar(query)
    # Upload drafts belong to the originating staff account, even for administrators.
    if session is None or session.staff_id != staff.id:
        raise HTTPException(404, 'Upload session not found')
    await WebtoonService.authorize_work(db, session.webtoon_id, staff)
    if session.status == 'cancelled' and not allow_cancelled:
        raise HTTPException(410, 'Upload session was discarded')
    if session.status == 'uploading' and _expired(session) and not allow_expired:
        raise HTTPException(410, 'Upload session expired; start a new import')
    return session


async def _duplicate(db, work_id, number):
    return await db.scalar(select(Chapter.id).where(
        Chapter.webtoon_id == work_id, Chapter.chapter_number == number).limit(1))


@router.post('', status_code=201)
async def create_import(data: ImportRequest, staff: StaffUser = Depends(require_permission('chapters:create')),
                        db: AsyncSession = Depends(get_db)):
    if sum(page.size for page in data.pages) > MAX_CHAPTER_BYTES:
        raise HTTPException(413, 'A chapter may contain at most 50 MB of source images')
    work = await WebtoonService.authorize_work(db, data.webtoon_id, staff)
    if work.type not in {'manga', 'manhwa'}:
        raise HTTPException(422, 'Bulk image importing supports manga and manhwa')
    fingerprint = hashlib.sha256(json.dumps(data.model_dump(exclude={'idempotency_key'}),
                        sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    owner_id = staff.id
    async with entity_lock('chapter-import-create', (staff.id, data.idempotency_key)):
        query = select(ChapterImport).where(ChapterImport.staff_id == staff.id,
                    ChapterImport.idempotency_key == data.idempotency_key)
        session = await db.scalar(query.execution_options(populate_existing=True))
        if session:
            if session.request_hash != fingerprint:
                raise HTTPException(409, 'This upload key belongs to different chapter content')
            session = await _owned(db, session.id, staff)
            return await _response(db, session)
        if await _duplicate(db, data.webtoon_id, data.chapter_number):
            raise HTTPException(409, f'Chapter {data.chapter_number:g} already exists; choose another number')
        # Bound abandoned private drafts per account without affecting published content.
        active_count = await db.scalar(select(func.count()).select_from(ChapterImport).where(
            ChapterImport.staff_id == staff.id, ChapterImport.status == 'uploading',
            ChapterImport.expires_at > datetime.now(timezone.utc)))
        if active_count >= 200:
            raise HTTPException(429, 'Discard an unfinished import before adding more chapters')
        session = ChapterImport(id=str(uuid.uuid4()), staff_id=staff.id, webtoon_id=data.webtoon_id,
            chapter_number=data.chapter_number, title=(data.title.strip() or None) if data.title else None,
            reward_coins=data.reward_coins if data.reward_coins is not None else await economy_value(db, 'chapter_read_reward'),
            idempotency_key=data.idempotency_key, request_hash=fingerprint,
            manifest_json=json.dumps([page.model_dump() for page in data.pages]),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7), status='uploading')
        db.add(session)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            session = await db.scalar(query)
            if not session or session.request_hash != fingerprint:
                raise HTTPException(409, 'Upload key conflict; refresh the chapter queue')
            # rollback expires ORM authentication objects. Reload instead of triggering
            # asynchronous lazy loads when another process won the unique-key race.
            staff = await db.scalar(select(StaffUser).options(
                selectinload(StaffUser.role).selectinload(Role.permissions)
            ).where(StaffUser.id == owner_id, StaffUser.is_active.is_(True)))
            if staff is None:
                raise HTTPException(401, 'Staff account is unavailable')
            session = await _owned(db, session.id, staff)
        return await _response(db, session)


@router.get('/{import_id}')
async def get_import(import_id: str, staff: StaffUser = Depends(require_permission('chapters:create')),
                     db: AsyncSession = Depends(get_db)):
    return await _response(db, await _owned(db, import_id, staff))


@router.put('/{import_id}/pages/{index}')
async def upload_page(import_id: str, index: int, image: UploadFile = File(...),
                      staff: StaffUser = Depends(require_permission('chapters:create')),
                      db: AsyncSession = Depends(get_db)):
    async with entity_lock('chapter-import', import_id):
        session = await _owned(db, import_id, staff, lock=True)
        manifest = json.loads(session.manifest_json)
        if index < 0 or index >= len(manifest):
            raise HTTPException(422, 'Page index does not belong to this upload')
        expected = manifest[index]
        data = await image.read(MAX_MEDIA_BYTES + 1)
        if not data or len(data) > MAX_MEDIA_BYTES:
            raise HTTPException(413, 'Each page must be nonempty and at most 20 MB')
        if len(data) != expected['size']:
            raise HTTPException(409, 'Selected page size changed; reselect the original file')
        digest = hashlib.sha256(data).hexdigest()
        if expected.get('sha256') and digest != expected['sha256']:
            raise HTTPException(409, 'Selected page differs from the original file')
        existing = await db.scalar(select(ChapterImportPage).where(
            ChapterImportPage.import_id == import_id, ChapterImportPage.page_index == index))
        if existing:
            if existing.sha256 != digest:
                raise HTTPException(409, 'This page slot already contains a different image')
            return await _response(db, session)
        if session.status != 'uploading':
            raise HTTPException(409, 'This import is already finalized')
        content, _ = await asyncio.to_thread(validated_media, data, 'page.webp', settings.MINIO_BUCKET_CHAPTERS)
        with Image.open(io.BytesIO(content)) as decoded:
            width, height = decoded.size
        name = f'{index:03d}_{uuid.uuid4().hex}.webp'
        await asyncio.to_thread(_write_stage, import_id, name, content)
        page = ChapterImportPage(import_id=import_id, page_index=index, original_name=expected['name'],
            source_size=len(data), sha256=digest, staging_name=name, width=width, height=height)
        db.add(page)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        try:
            await db.commit()
        except Exception:
            await db.rollback()
            await asyncio.to_thread(_delete_stage, import_id, name)
            raise
        return await _response(db, session)


async def _invalidate(db, work_id):
    await CacheService.delete_pattern('webtoons:catalog:*')
    from app.modules.webtoons.models import Webtoon
    work = await db.get(Webtoon, work_id)
    if work:
        await CacheService.delete(f'webtoons:{work.slug}')


@router.post('/{import_id}/finalize')
async def finalize_import(import_id: str, data: FinalizeRequest,
                          staff: StaffUser = Depends(require_permission('chapters:create')),
                          db: AsyncSession = Depends(get_db)):
    if data.publish and not can_approve_chapters(staff):
        raise HTTPException(403, 'Publishing requires chapters:approve permission; submit for review instead')
    async with entity_lock('chapter-import', import_id):
        session = await _owned(db, import_id, staff, lock=True)
        if session.status == 'finalized':
            return await _response(db, session)
        work = await WebtoonService.authorize_work(db, session.webtoon_id, staff)
        if work.type not in {'manga', 'manhwa'}:
            raise HTTPException(409, 'The work type changed; image importing requires manga or manhwa')
        pages = await _pages(db, import_id)
        if len(pages) != len(json.loads(session.manifest_json)):
            raise HTTPException(409, 'Upload every page before finalizing this chapter')
        if await _duplicate(db, session.webtoon_id, session.chapter_number):
            raise HTTPException(409, f'Chapter {session.chapter_number:g} already exists; discard this duplicate import')
        chapter = Chapter(webtoon_id=session.webtoon_id, chapter_number=session.chapter_number,
            title=session.title, reward_coins=session.reward_coins, status='published' if data.publish else 'pending',
            published_at=datetime.now(timezone.utc) if data.publish else None)
        db.add(chapter)
        copied = []
        try:
            await db.flush()
            for page in pages:
                object_name = f'{session.webtoon_id}/{chapter.id}/{page.page_index + 1:03d}_{uuid.UUID(import_id).hex}.webp'
                content = await asyncio.to_thread(_read_stage, import_id, page.staging_name)
                await asyncio.to_thread(_write_final_page, object_name, content)
                url = '/content/' + object_name
                copied.append(url)
                db.add(ChapterImage(chapter_id=chapter.id, image_url=url, order_index=page.page_index + 1,
                                    width=page.width, height=page.height))
            session.status = 'finalized'
            session.chapter_id = chapter.id
            await db.commit()
        except Exception:
            await db.rollback()
            for url in copied:
                await StorageService.delete_url(url)
            raise
        for page in pages:
            await asyncio.to_thread(_delete_stage, import_id, page.staging_name)
        await _invalidate(db, session.webtoon_id)
        return await _response(db, session)


@router.delete('/{import_id}')
async def cancel_import(import_id: str, staff: StaffUser = Depends(require_permission('chapters:create')),
                        db: AsyncSession = Depends(get_db)):
    async with entity_lock('chapter-import', import_id):
        session = await _owned(db, import_id, staff, lock=True, allow_expired=True, allow_cancelled=True)
        if session.status == 'finalized':
            raise HTTPException(409, 'A completed chapter must be managed from the chapter list')
        pages = await _pages(db, import_id)
        session.status = 'cancelled'
        for page in pages:
            await db.delete(page)
        await db.commit()
        for page in pages:
            await asyncio.to_thread(_delete_stage, import_id, page.staging_name)
        return {'success': True, 'data': {'id': import_id, 'status': 'cancelled'}}
