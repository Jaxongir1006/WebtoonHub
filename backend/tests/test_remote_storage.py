"""Remote storage flows use disposable SQL databases and an in-memory object store."""
import io
import json
import unittest
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import select, func
import test_audit_regressions as audit
import test_chapter_imports as imports_test
from test_character_cards import artwork
from app.core.config import settings, Settings
from app.core.remote_storage import SupabaseStorage, object_key
from app.core.storage import StorageService
from app.modules.webtoons.models import Chapter, ChapterImage
from app.modules.webtoons.import_models import ChapterImport


class RemoteStorageFlowTests(unittest.IsolatedAsyncioTestCase):
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth
    payload = imports_test.ChapterImportTests.payload
    create = imports_test.ChapterImportTests.create
    upload = imports_test.ChapterImportTests.upload
    finalize = imports_test.ChapterImportTests.finalize

    async def asyncSetUp(self):
        await imports_test.ChapterImportTests.asyncSetUp(self)
        self.objects = {}
        for name, value in [('STORAGE_BACKEND', 'supabase')]:
            item = patch.object(settings, name, value)
            item.start(); self.patches.append(item)
        methods = {'write': self.write, 'read': self.read, 'exists': self.exists,
                   'delete': self.delete, 'list_files': self.list_files,
                   'ready': lambda: True,
                   'signed_url': lambda name: 'https://example.supabase.co/signed/' + name}
        for name, value in methods.items():
            item = patch.object(SupabaseStorage, name, side_effect=value)
            item.start(); self.patches.append(item)

    def write(self, name, data, content_type='image/webp', private=False):
        self.objects[(private, name)] = data

    def read(self, name, private=False, limit=50*1024*1024):
        try:
            return self.objects[(private, name)]
        except KeyError:
            raise HTTPException(404, 'Image not found')

    def exists(self, name, private=False):
        return (private, name) in self.objects

    def delete(self, name, private=False):
        self.objects.pop((private, name), None)

    def list_files(self, prefix='', private=False):
        return [{'name': name} for (is_private, name) in self.objects
                if is_private == private and name.startswith(prefix)]

    async def test_import_survives_without_local_files_and_pending_media_is_guarded(self):
        session = await self.create(self.payload(count=1))
        uploaded = await self.upload(session['id'], 0)
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        self.assertEqual(len(self.objects), 1)
        self.assertTrue(next(iter(self.objects))[0])
        self.assertFalse(self.stages.exists())
        result = await self.finalize(session['id'])
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(len(self.objects), 1)
        self.assertFalse(next(iter(self.objects))[0])
        self.assertEqual(list(self.media.rglob('*')), [])
        async with self.sessions() as db:
            url = await db.scalar(select(ChapterImage.image_url))
        self.assertEqual((await self.client.get(url)).status_code, 403)
        detail = (await self.client.get(f'/api/v1/staff/webtoons/{self.image_work.id}', headers=self.staff_auth())).json()['data']
        preview = detail['chapters'][0]['images'][0]['image_url']
        response = await self.client.get(preview)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers['cache-control'], 'private, no-store')
        await self.client.post('/api/v1/staff/auth/logout', headers=self.staff_auth())
        self.assertEqual((await self.client.get(preview)).status_code, 403)
        self.assertEqual((await self.client.get('/content/999/999/orphan.webp')).status_code, 404)

    async def test_remote_finalize_failure_rolls_back_and_keeps_private_pages_for_retry(self):
        session = await self.create()
        for index in range(2):
            self.assertEqual((await self.upload(session['id'], index)).status_code, 200)
        count = 0
        def fail_second(name, data, content_type='image/webp', private=False):
            nonlocal count
            if not private:
                count += 1
                if count == 2:
                    raise HTTPException(503, 'Storage unavailable')
            self.write(name, data, content_type, private)
        with patch.object(SupabaseStorage, 'write', side_effect=fail_second):
            result = await self.finalize(session['id'])
        self.assertEqual(result.status_code, 503, result.text)
        self.assertTrue(all(private for private, _ in self.objects))
        self.assertEqual(len(self.objects), 2)
        async with self.sessions() as db:
            count = await db.scalar(select(func.count()).select_from(Chapter).where(Chapter.webtoon_id == self.image_work.id))
            self.assertEqual(count, 0)
            self.assertEqual((await db.get(ChapterImport, session['id'])).status, 'uploading')
        self.assertEqual((await self.finalize(session['id'])).status_code, 200)

    async def test_cancel_and_expired_cleanup_remove_only_private_import_objects(self):
        session = await self.create(self.payload(count=1))
        await self.upload(session['id'], 0)
        self.objects[(False, 'cards/preserved.webp')] = b'preserved'
        result = await self.client.delete('/api/v1/staff/chapter-imports/' + session['id'], headers=self.staff_auth())
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(self.objects), 1)
        expired = await self.create(self.payload(count=1, number=2))
        await self.upload(expired['id'], 0)
        async with self.sessions() as db:
            row = await db.get(ChapterImport, expired['id'])
            row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            await db.commit()
        from scripts import prune_chapter_imports
        with patch.object(prune_chapter_imports, 'AsyncSessionLocal', self.sessions), patch('builtins.print'):
            await prune_chapter_imports.prune(apply=False)
            self.assertEqual(len(self.objects), 2)
            await prune_chapter_imports.prune(apply=True)
        self.assertEqual(self.objects, {(False, 'cards/preserved.webp'): b'preserved'})

    async def test_animated_card_and_avatar_validation_use_remote_objects(self):
        upload = await self.client.post('/api/v1/staff/shop/items/upload-asset',
            files={'file': ('card.gif', artwork(), 'image/gif')}, data={'item_type': 'card'}, headers=self.staff_auth())
        self.assertEqual(upload.status_code, 200, upload.text)
        asset = upload.json()['data']
        self.assertTrue(asset['asset_animated'])
        self.assertEqual(len(self.objects), 2)
        result = await self.client.post('/api/v1/staff/shop/items', data={
            'name': 'Remote hero', 'item_type': 'card',
            'rarity': 'rare', 'character_name': 'Hero', 'asset_url': asset['asset_url']}, headers=self.staff_auth())
        self.assertEqual(result.status_code, 201, result.text)
        self.assertEqual(result.json()['data']['asset_preview_url'], asset['asset_preview_url'])
        avatar = await StorageService.upload_file_async(bucket_name='avatars',
            object_name=f'avatars/avatar_{self.reader.id}_{audit.uuid.uuid4().hex}.png', data=self.image)
        result = await self.client.patch('/api/v1/users/profile', json={'avatar_url': avatar}, headers=self.auth())
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(list(self.media.rglob('*')), [])

    async def test_signed_media_and_svg_headers_and_remote_readiness(self):
        self.objects[(False, 'frames/test.svg')] = b'<svg xmlns="http://www.w3.org/2000/svg"/>'
        response = await self.client.get('/content/frames/test.svg')
        self.assertEqual(response.status_code, 200)
        self.assertIn('sandbox', response.headers['content-security-policy'])
        self.assertEqual(response.headers['x-content-type-options'], 'nosniff')
        with patch.object(SupabaseStorage, 'ready', return_value=False), patch('app.core.database.AsyncSessionLocal', self.sessions):
            response = await self.client.get('/api/v1/health')
        self.assertEqual(response.status_code, 503)


class RemoteStorageTransportTests(unittest.TestCase):
    def test_traversal_and_query_characters_are_rejected(self):
        for name in ['../private/file.webp', '/absolute.webp', 'a/../x.webp', 'a//x', 'a?token=x', 'a#x', 'a/./x', 'a\x00x']:
            with self.assertRaises(HTTPException):
                object_key(name)

    def test_storage_error_does_not_expose_credentials_and_missing_is_not_an_outage(self):
        key = 'sb_secret_transport_test'
        with patch.object(settings, 'SUPABASE_URL', 'https://test.supabase.co'), \
             patch.object(settings, 'SUPABASE_SECRET_KEY', SecretStr(key)):
            error = HTTPError('https://test.supabase.co/storage/v1/object/info/missing', 400,
                              'Bad Request', {}, io.BytesIO(json.dumps({'statusCode':'404','code':'not_found'}).encode()))
            with patch('app.core.remote_storage.urlopen', side_effect=error) as call:
                self.assertFalse(SupabaseStorage.exists('missing.webp'))
                request = call.call_args.args[0]
                self.assertNotIn(key, request.full_url)
                self.assertEqual(request.get_header('Apikey'), key)
                self.assertIsNone(request.get_header('Authorization'))
            error = HTTPError('https://test.supabase.co/storage/v1/object/info/missing', 401,
                              'Unauthorized', {}, io.BytesIO(b'{}'))
            with patch('app.core.remote_storage.urlopen', side_effect=error):
                with self.assertRaises(HTTPException) as result:
                    SupabaseStorage.exists('missing.webp')
                self.assertEqual(result.exception.status_code, 503)
                self.assertNotIn(key, str(result.exception))

    def test_supabase_configuration_requires_secure_endpoint_and_backend_key(self):
        for endpoint in ['http://test.supabase.co', 'https://evil.example', 'https://test.supabase.co/storage', 'https://user:pass@test.supabase.co']:
            with self.assertRaises(ValueError):
                Settings(_env_file=None, STORAGE_BACKEND='supabase', SUPABASE_URL=endpoint, SUPABASE_SECRET_KEY='sb_secret_test')


if __name__ == '__main__':
    unittest.main()
