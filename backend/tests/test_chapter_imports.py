"""Imports are tested against disposable databases and media only."""
import asyncio
import hashlib
import io
import unittest
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import HTTPException
from PIL import Image
from sqlalchemy import func, select
import test_audit_regressions as audit
from app.modules.webtoons.import_models import ChapterImport, ChapterImportPage
from app.modules.webtoons.models import Webtoon, Chapter, ChapterImage


class ChapterImportTests(unittest.IsolatedAsyncioTestCase):
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth

    async def asyncSetUp(self):
        await audit.AuditRegressionTests.asyncSetUp(self)
        self.stages = self.media.parent / 'private-stages'
        stage_patch = patch('app.modules.webtoons.imports.STAGING_ROOT', self.stages)
        stage_patch.start()
        self.patches.append(stage_patch)
        output = io.BytesIO()
        Image.new('RGB', (500, 750), 'navy').save(output, format='PNG')
        self.image = output.getvalue()
        async with self.sessions() as db:
            self.image_work = Webtoon(title='Import work', slug='import-work', type='manga',
                cover_image_url='/content/cover.webp', uploader_staff_id=self.admin.id)
            self.creator_work = Webtoon(title='Creator work', slug='creator-work', type='manhwa',
                cover_image_url='/content/cover.webp', uploader_staff_id=self.creator.id)
            db.add_all([self.image_work, self.creator_work])
            await db.commit()

    def payload(self, *, count=2, number=1, work=None, key=None):
        return {'webtoon_id': work or self.image_work.id, 'chapter_number': number, 'title': 'The opening',
            'idempotency_key': key or str(uuid.uuid4()), 'pages': [
                {'name': f'{index + 1:03d}.png', 'size': len(self.image),
                 'sha256': hashlib.sha256(self.image).hexdigest()} for index in range(count)]}

    async def create(self, payload=None, headers=None):
        response = await self.client.post('/api/v1/staff/chapter-imports', json=payload or self.payload(),
                                           headers=headers or self.staff_auth())
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()['data']

    async def upload(self, session_id, index, *, data=None, headers=None):
        return await self.client.put(f'/api/v1/staff/chapter-imports/{session_id}/pages/{index}',
            files={'image': ('page.png', self.image if data is None else data, 'image/png')},
            headers=headers or self.staff_auth())

    async def finalize(self, session_id, *, publish=False, headers=None):
        return await self.client.post(f'/api/v1/staff/chapter-imports/{session_id}/finalize',
            json={'publish': publish}, headers=headers or self.staff_auth())

    async def test_resume_ordered_pending_then_idempotent_finalize(self):
        payload = self.payload()
        session = await self.create(payload)
        self.assertEqual((await self.upload(session['id'], 1)).status_code, 200)
        resumed = await self.create(payload)
        self.assertEqual(resumed['id'], session['id'])
        self.assertTrue(resumed['expires_at'].endswith(('Z', '+00:00')))
        self.assertEqual([page['index'] for page in resumed['uploaded_pages']], [1])
        incomplete = await self.finalize(session['id'])
        self.assertEqual(incomplete.status_code, 409)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(
                Chapter.webtoon_id == self.image_work.id)), 0)
        # A new HTTP client/database connection resumes from durable state, not browser memory.
        self.assertEqual((await self.upload(session['id'], 0)).status_code, 200)
        self.assertEqual((await self.upload(session['id'], 1)).status_code, 200)
        done = await self.finalize(session['id'])
        self.assertEqual(done.status_code, 200, done.text)
        chapter_id = done.json()['data']['chapter_id']
        repeated = await self.finalize(session['id'])
        self.assertEqual(repeated.json()['data']['chapter_id'], chapter_id)
        async with self.sessions() as db:
            chapter = await db.get(Chapter, chapter_id)
            self.assertEqual(chapter.status, 'pending')
            pages = list((await db.scalars(select(ChapterImage).where(
                ChapterImage.chapter_id == chapter_id).order_by(ChapterImage.order_index))).all())
            self.assertEqual([page.order_index for page in pages], [1, 2])
            self.assertTrue(all((page.width, page.height) == (500, 750) for page in pages))
            self.assertTrue(all((self.media / page.image_url.removeprefix('/content/')).is_file() for page in pages))
        self.assertEqual((await self.client.get(pages[0].image_url)).status_code, 403)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 0)
        self.assertEqual((await self.upload(session['id'], 1)).status_code, 200)

    async def test_private_stages_and_owner_authorization(self):
        session = await self.create()
        self.assertEqual((await self.upload(session['id'], 0)).status_code, 200)
        stage = next(self.stages.rglob('*.webp'))
        self.assertFalse(stage.is_relative_to(self.media))
        self.assertEqual((await self.client.get('/content/private_chapter_imports/' + session['id'] + '/' + stage.name)).status_code, 404)
        for method, path, kwargs in [
            ('get', f'/api/v1/staff/chapter-imports/{session["id"]}', {}),
            ('delete', f'/api/v1/staff/chapter-imports/{session["id"]}', {}),
            ('post', f'/api/v1/staff/chapter-imports/{session["id"]}/finalize', {'json': {'publish': False}}),
        ]:
            response = await getattr(self.client, method)(path, headers=self.auth(self.creator_token), **kwargs)
            self.assertEqual(response.status_code, 404, response.text)
        rejected = await self.client.post('/api/v1/staff/chapter-imports', json=self.payload(), headers=self.auth(self.creator_token))
        self.assertEqual(rejected.status_code, 403)
        self.assertEqual((await self.client.get('/api/v1/staff/chapter-imports/' + session['id'], headers=self.auth())).status_code, 401)

    async def test_publish_permission_and_creator_review(self):
        headers = self.auth(self.creator_token)
        session = await self.create(self.payload(count=1, work=self.creator_work.id), headers)
        self.assertEqual((await self.upload(session['id'], 0, headers=headers)).status_code, 200)
        self.assertEqual((await self.finalize(session['id'], publish=True, headers=headers)).status_code, 403)
        pending = await self.finalize(session['id'], headers=headers)
        self.assertEqual(pending.status_code, 200, pending.text)
        published = await self.create(self.payload(count=1, number=2))
        await self.upload(published['id'], 0)
        result = await self.finalize(published['id'], publish=True)
        self.assertEqual(result.status_code, 200, result.text)
        async with self.sessions() as db:
            chapter = await db.get(Chapter, result.json()['data']['chapter_id'])
            self.assertEqual(chapter.status, 'published')
            url = await db.scalar(select(ChapterImage.image_url).where(ChapterImage.chapter_id == chapter.id))
        self.assertEqual((await self.client.get(url)).status_code, 200)

    async def test_manifest_and_actual_content_limits(self):
        for changes in [{'pages': []}, {'pages': [{'name': 'bad.svg', 'size': 12}]},
                        {'pages': [{'name': 'page.png', 'size': 20 * 1024 * 1024 + 1}]},
                        {'pages': self.payload(count=101)['pages']}, {'chapter_number': 0}]:
            payload = self.payload() | changes
            result = await self.client.post('/api/v1/staff/chapter-imports', json=payload, headers=self.staff_auth())
            self.assertEqual(result.status_code, 422, result.text)
        payload = self.payload(count=3)
        for page in payload['pages']:
            page['size'] = 20 * 1024 * 1024
        result = await self.client.post('/api/v1/staff/chapter-imports', json=payload, headers=self.staff_auth())
        self.assertEqual(result.status_code, 413)
        novel = await self.client.post('/api/v1/staff/chapter-imports', json=self.payload(work=self.work.id), headers=self.staff_auth())
        self.assertEqual(novel.status_code, 422)
        session = await self.create(self.payload(count=1))
        self.assertEqual((await self.upload(session['id'], -1)).status_code, 422)
        self.assertEqual((await self.upload(session['id'], 1)).status_code, 422)
        self.assertEqual((await self.upload(session['id'], 0, data=b'wrong-size')).status_code, 409)
        changed = self.image[:-1] + bytes([self.image[-1] ^ 1])
        self.assertEqual((await self.upload(session['id'], 0, data=changed)).status_code, 409)
        invalid = self.payload(count=1, number=3)
        invalid['pages'][0] = {'name': 'pretend.png', 'size': 8}
        bad_session = await self.create(invalid)
        self.assertEqual((await self.upload(bad_session['id'], 0, data=b'notimage')).status_code, 422)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 0)

    async def test_concurrent_keys_slots_and_finalize_never_duplicate(self):
        payload = self.payload(count=1)
        first, second = await asyncio.gather(self.create(payload), self.create(payload))
        self.assertEqual(first['id'], second['id'])
        results = await asyncio.gather(self.upload(first['id'], 0), self.upload(first['id'], 0))
        self.assertTrue(all(result.status_code == 200 for result in results), [result.text for result in results])
        done = await asyncio.gather(self.finalize(first['id']), self.finalize(first['id']))
        self.assertTrue(all(result.status_code == 200 for result in done), [result.text for result in done])
        self.assertEqual(done[0].json()['data']['chapter_id'], done[1].json()['data']['chapter_id'])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(
                Chapter.webtoon_id == self.image_work.id)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(ChapterImportPage)), 1)
        conflict = await self.client.post('/api/v1/staff/chapter-imports', json=payload | {'title': 'Changed'}, headers=self.staff_auth())
        self.assertEqual(conflict.status_code, 409)
        duplicate = await self.client.post('/api/v1/staff/chapter-imports', json=self.payload(count=1), headers=self.staff_auth())
        self.assertEqual(duplicate.status_code, 409)

    async def test_duplicate_chapter_race_preserves_other_import(self):
        first = await self.create(self.payload(count=1))
        other = await self.create(self.payload(count=1))
        await self.upload(first['id'], 0)
        await self.upload(other['id'], 0)
        responses = await asyncio.gather(self.finalize(first['id']), self.finalize(other['id']))
        self.assertEqual(sorted(result.status_code for result in responses), [200, 409])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(
                Chapter.webtoon_id == self.image_work.id)), 1)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 1)

    async def test_create_key_race_across_workers_recovers_after_database_rollback(self):
        from app.modules.webtoons import imports
        # Separate server processes do not share the in-process asyncio lock.
        @asynccontextmanager
        async def unlocked(*args):
            yield
        original_duplicate = imports._duplicate
        arrived = 0
        barrier = asyncio.Event()
        async def synchronized_duplicate(*args):
            nonlocal arrived
            result = await original_duplicate(*args)
            arrived += 1
            if arrived == 2:
                barrier.set()
            await asyncio.wait_for(barrier.wait(), 5)
            return result
        payload = self.payload(count=1)
        with patch.object(imports, 'entity_lock', unlocked), \
             patch.object(imports, '_duplicate', side_effect=synchronized_duplicate):
            first, second = await asyncio.gather(self.create(payload), self.create(payload))
        self.assertEqual(first['id'], second['id'])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(ChapterImport)), 1)

    async def test_atomic_storage_failure_can_retry_without_empty_chapter(self):
        session = await self.create()
        await self.upload(session['id'], 0)
        await self.upload(session['id'], 1)
        from app.modules.webtoons import imports
        original = imports._write_private
        writes = 0
        def fail_second(path, content):
            nonlocal writes
            writes += 1
            if writes == 2:
                raise HTTPException(503, 'Injected storage failure')
            return original(path, content)
        with patch.object(imports, '_write_private', side_effect=fail_second):
            result = await self.finalize(session['id'])
        self.assertEqual(result.status_code, 503, result.text)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(
                Chapter.webtoon_id == self.image_work.id)), 0)
            self.assertEqual((await db.get(ChapterImport, session['id'])).status, 'uploading')
        self.assertEqual(len(list(self.media.rglob('*.webp'))), 0)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 2)
        self.assertEqual((await self.finalize(session['id'])).status_code, 200)

    async def test_cancel_and_expiry_do_not_expose_or_create_chapters(self):
        session = await self.create(self.payload(count=1))
        await self.upload(session['id'], 0)
        response = await self.client.delete('/api/v1/staff/chapter-imports/' + session['id'], headers=self.staff_auth())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 0)
        self.assertEqual((await self.finalize(session['id'])).status_code, 410)
        expired = await self.create(self.payload(count=1, number=2))
        await self.upload(expired['id'], 0)
        async with self.sessions() as db:
            row = await db.get(ChapterImport, expired['id'])
            row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            await db.commit()
        self.assertEqual((await self.client.get('/api/v1/staff/chapter-imports/' + expired['id'], headers=self.staff_auth())).status_code, 410)
        self.assertEqual((await self.upload(expired['id'], 0)).status_code, 410)
        # Cleanup is an explicit, safe dry-run first and never scans chapter media.
        from scripts import prune_chapter_imports
        preserved = self.media / 'published-page.webp'
        preserved.write_bytes(b'preserved published content')
        with patch.object(prune_chapter_imports, 'AsyncSessionLocal', self.sessions), \
             patch.object(prune_chapter_imports, 'STAGING_ROOT', self.stages), patch('builtins.print'):
            await prune_chapter_imports.prune(apply=False)
            self.assertEqual(len(list(self.stages.rglob('*.webp'))), 1)
            async with self.sessions() as db:
                self.assertEqual((await db.get(ChapterImport, expired['id'])).status, 'uploading')
            await prune_chapter_imports.prune(apply=True)
        self.assertEqual(len(list(self.stages.rglob('*.webp'))), 0)
        self.assertEqual(preserved.read_bytes(), b'preserved published content')
        async with self.sessions() as db:
            self.assertEqual((await db.get(ChapterImport, expired['id'])).status, 'cancelled')


if __name__ == '__main__':
    unittest.main()
