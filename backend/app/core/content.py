"""Keep unpublished/orphan chapter files private and constrain SVG documents."""
from datetime import timedelta, datetime, timezone
import uuid
from pathlib import PurePosixPath
import asyncio
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, decode_token
from app.modules.webtoons.models import Chapter, ChapterImage
from app.modules.staff.models import StaffUser, Role, StaffSession
from app.modules.staff.dependencies import is_superadmin, owns_content_only
from starlette.responses import RedirectResponse, Response
from app.core.storage import StorageService
from app.core.remote_storage import SupabaseStorage, object_key


def staff_media_url(url, staff):
    token = create_access_token(str(staff.id), {'type': 'media', 'path': url.split('?')[0], 'session_id': getattr(staff, '_authenticated_session_id', '')}, expires_delta=timedelta(minutes=10))
    return url + '?media_token=' + token

class ProtectedContent(StaticFiles):
    async def get_response(self, path, scope):
        if scope['method'] not in {'GET', 'HEAD'}:
            raise HTTPException(405, 'Method not allowed')
        public_path = object_key(path)
        parts = PurePosixPath(public_path).parts
        # Chapter uploads have numeric work/chapter prefixes; legacy chapter namespace also guarded.
        is_chapter = (len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit()) or bool(parts and parts[0] == 'chapters')
        if is_chapter:
            from urllib.parse import parse_qs
            url = '/content/' + public_path
            original_stem = str(PurePosixPath(url).with_suffix(''))
            async with AsyncSessionLocal() as db:
                images = (await db.execute(select(ChapterImage).options(selectinload(ChapterImage.chapter).selectinload(Chapter.webtoon))
                         .where(ChapterImage.image_url.like(original_stem + '.%')))).scalars().all()
                chapter = next((image.chapter for image in images if str(PurePosixPath(image.image_url).with_suffix('')) == original_stem), None)
                if chapter is None:
                    raise HTTPException(404, 'Chapter asset not found')
                if chapter.status != 'published':
                    params = parse_qs(scope.get('query_string', b'').decode())
                    claims = decode_token(params.get('media_token', [''])[0])
                    if not claims or claims.get('type') != 'media' or claims.get('path') != url:
                        raise HTTPException(403, 'Chapter asset is not published')
                    try:
                        session_id = uuid.UUID(claims.get('session_id', ''))
                    except ValueError:
                        raise HTTPException(403, 'Staff media session is invalid')
                    active_session = await db.scalar(select(StaffSession.id).where(StaffSession.id == session_id, StaffSession.staff_id == int(claims['sub']), StaffSession.is_active.is_(True), StaffSession.expires_at > datetime.now(timezone.utc)))
                    if not active_session:
                        raise HTTPException(403, 'Staff media session was revoked')
                    staff = await db.scalar(select(StaffUser).options(selectinload(StaffUser.role).selectinload(Role.permissions)).where(StaffUser.id == int(claims['sub']), StaffUser.is_active.is_(True)))
                    if not staff or (owns_content_only(staff) and chapter.webtoon.uploader_staff_id != staff.id):
                        raise HTTPException(403, 'Chapter asset unavailable')
                    if not is_superadmin(staff) and not {'webtoons:create','webtoons:edit','webtoons:delete','chapters:create','chapters:edit','chapters:delete','chapters:approve'} & {p.code for p in staff.role.permissions}:
                        raise HTTPException(403, 'Chapter asset permission missing')
        if StorageService.remote():
            if public_path.lower().endswith('.svg'):
                data = await asyncio.to_thread(StorageService.read_bytes, public_path)
                response = Response(data, media_type='image/svg+xml')
            else:
                url = await asyncio.to_thread(SupabaseStorage.signed_url, public_path)
                response = RedirectResponse(url, status_code=302, headers={'Cache-Control': 'private, no-store'})
        else:
            response = await super().get_response(path, scope)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        if path.lower().endswith('.svg'):
            response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
        if is_chapter:
            response.headers['Cache-Control'] = 'private, no-store'
        return response
