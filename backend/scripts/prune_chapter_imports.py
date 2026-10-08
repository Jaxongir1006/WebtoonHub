"""Dry-run by default. Delete expired/discarded import stages, never chapter media.

Run from backend: python scripts/prune_chapter_imports.py [--apply]
"""
import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.models  # noqa: F401
from sqlalchemy import select, or_
from app.core.database import AsyncSessionLocal
from app.core.transactions import entity_lock
from app.modules.webtoons.import_models import ChapterImport
from app.modules.webtoons.imports import STAGING_ROOT, _staging_path, _pages
from app.core.storage import StorageService
from app.core.remote_storage import SupabaseStorage


async def prune(apply=False):
    removed = 0
    expired = 0
    async with AsyncSessionLocal() as db:
        ids = list((await db.scalars(select(ChapterImport.id).where(or_(
            ChapterImport.status.in_(['finalized', 'cancelled']),
            ChapterImport.expires_at <= datetime.now(timezone.utc))))).all())
    for import_id in ids:
        async with entity_lock('chapter-import', import_id):
            async with AsyncSessionLocal() as db:
                session = await db.scalar(select(ChapterImport).where(ChapterImport.id == import_id).with_for_update())
                if session is None:
                    continue
                expiry = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
                if session.status == 'uploading' and expiry > datetime.now(timezone.utc):
                    continue
                pages = await _pages(db, import_id)
                if StorageService.remote():
                    import uuid
                    uuid.UUID(import_id)
                    files = await asyncio.to_thread(SupabaseStorage.list_files, import_id + '/', True)
                    removed += len(files)
                    expired += int(session.status == 'uploading')
                    if apply:
                        if session.status == 'uploading':
                            session.status = 'cancelled'
                        # Retain page records until remote cleanup succeeds, so failed
                        # cleanup remains retryable even when storage is unavailable.
                        await db.commit()
                        for file in files:
                            await asyncio.to_thread(SupabaseStorage.delete, file['name'], True)
                        if session.status == 'cancelled':
                            for page in pages:
                                await db.delete(page)
                            await db.commit()
                    continue
                # Only the exact private directory assigned by the durable session is eligible.
                directory = _staging_path(import_id, '.').resolve()
                if directory == STAGING_ROOT.resolve():
                    raise RuntimeError('Refusing to remove the private staging root')
                files = [file for file in directory.glob('*') if file.is_file() and file.resolve().is_relative_to(directory)]
                removed += len(files)
                expired += int(session.status == 'uploading')
                if not apply:
                    continue
                if session.status == 'uploading':
                    session.status = 'cancelled'
                if session.status == 'cancelled':
                    for page in pages:
                        await db.delete(page)
                await db.commit()
                for file in files:
                    await asyncio.to_thread(file.unlink, missing_ok=True)
                if directory.is_dir() and not any(directory.iterdir()):
                    directory.rmdir()
    print(f'{"Applied" if apply else "Dry run"}: {removed} private staged files; {expired} expired upload sessions. Published chapter files are untouched.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Actually discard expired uploads and remove private stages')
    asyncio.run(prune(parser.parse_args().apply))
