"""PDF uploads use disposable content, staff and databases only."""
import io
import unittest
import uuid
from unittest.mock import patch

from PIL import Image
from sqlalchemy import select, func
import test_chapter_imports as imports
from app.modules.webtoons.models import Chapter, ChapterImage


def chapter_pdf():
    output = io.BytesIO()
    with Image.new('RGB', (400, 600), '#d02020') as first, Image.new('RGB', (600, 400), '#2040d0') as second:
        first.save(output, 'PDF', save_all=True, append_images=[second], resolution=72)
    return output.getvalue()


class PdfChapterTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = imports.ChapterImportTests.asyncSetUp
    asyncTearDown = imports.ChapterImportTests.asyncTearDown
    auth = imports.ChapterImportTests.auth
    staff_auth = imports.ChapterImportTests.staff_auth

    async def upload(self, *, content=None, key=None, number=1, work=None, publish=False, headers=None, filename='chapter.pdf'):
        return await self.client.post('/api/v1/staff/chapter-imports/pdf', data={
            'webtoon_id': work or self.image_work.id, 'chapter_number': number,
            'title': 'PDF chapter', 'reward_coins': 0, 'publish': str(publish).lower(),
            'idempotency_key': key or str(uuid.uuid4()),
        }, files={'pdf': (filename, chapter_pdf() if content is None else content, 'application/pdf')}, headers=headers or self.staff_auth())

    async def test_pdf_creates_one_pending_chapter_in_page_order_and_retry_does_not_duplicate(self):
        key = str(uuid.uuid4())
        content = chapter_pdf()
        response = await self.upload(content=content, key=key)
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()['data']
        self.assertEqual(data['status'], 'pending')
        self.assertEqual(data['images_count'], 2)
        again = await self.upload(content=content, key=key)
        self.assertEqual(again.status_code, 201, again.text)
        self.assertEqual(again.json()['data']['id'], data['id'])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(Chapter.webtoon_id == self.image_work.id)), 1)
            chapter = await db.get(Chapter, data['id'])
            self.assertEqual(chapter.reward_coins, 0)
            pages = list(await db.scalars(select(ChapterImage).where(ChapterImage.chapter_id == data['id']).order_by(ChapterImage.order_index)))
            self.assertEqual([page.order_index for page in pages], [1, 2])
            self.assertEqual([(page.width, page.height) for page in pages], [(800, 1200), (1200, 800)])
            for page, channel in zip(pages, [0, 2]):
                with Image.open(self.media / page.image_url.removeprefix('/content/')) as image:
                    pixel = image.convert('RGB').getpixel((image.width // 2, image.height // 2))
                    self.assertGreater(pixel[channel], 180)
            self.assertEqual((await self.client.get(pages[0].image_url)).status_code, 403)
        self.assertEqual(list(self.stages.rglob('*.webp')), [])
        duplicate = await self.upload(number=1)
        self.assertEqual(duplicate.status_code, 409, duplicate.text)

    async def test_published_pdf_uses_existing_reader_and_normal_content_delivery(self):
        response = await self.upload(publish=True)
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()['data']
        self.assertEqual(data['status'], 'published')
        reader = await self.client.get(f'/api/v1/chapters/{data["id"]}')
        self.assertEqual(reader.status_code, 200, reader.text)
        self.assertEqual(len(reader.json()['data']['images']), 2)
        for page in reader.json()['data']['images']:
            self.assertEqual((await self.client.get(page['image_url'])).status_code, 200)

    async def test_permissions_and_novel_rejection_precede_conversion(self):
        from unittest.mock import AsyncMock
        with patch('app.modules.webtoons.imports.convert_pdf', AsyncMock()) as convert:
            reader = await self.upload(headers=self.auth())
            self.assertEqual(reader.status_code, 401, reader.text)
            other_work = await self.upload(headers=self.auth(self.creator_token))
            self.assertEqual(other_work.status_code, 403, other_work.text)
            cannot_publish = await self.upload(work=self.creator_work.id, publish=True, headers=self.auth(self.creator_token))
            self.assertEqual(cannot_publish.status_code, 403, cannot_publish.text)
            novel = await self.upload(work=self.work.id)
            self.assertEqual(novel.status_code, 422, novel.text)
            convert.assert_not_awaited()
        creator = await self.upload(work=self.creator_work.id, headers=self.auth(self.creator_token))
        self.assertEqual(creator.status_code, 201, creator.text)
        self.assertEqual(creator.json()['data']['status'], 'pending')

    async def test_invalid_oversized_and_excess_page_pdfs_leave_no_chapter(self):
        import pypdfium2 as pdfium
        for content, filename, expected in [(b'not pdf', 'chapter.pdf', 422),
                (b'%PDF-1.7 broken', 'broken.pdf', 422),
                (b'%PDF-' + b'x' * (20 * 1024 * 1024), 'large.pdf', 413),
                (chapter_pdf(), 'chapter.png', 422)]:
            response = await self.upload(content=content, filename=filename)
            self.assertEqual(response.status_code, expected, response.text)
        output = io.BytesIO()
        with pdfium.PdfDocument.new() as document:
            for _ in range(101):
                document.new_page(50, 50).close()
            document.save(output)
        response = await self.upload(content=output.getvalue())
        self.assertEqual(response.status_code, 422, response.text)
        self.assertIn('100 pages', response.text)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(Chapter.webtoon_id == self.image_work.id)), 0)

    async def test_storage_failure_is_atomic_and_same_pdf_can_resume(self):
        from app.modules.webtoons import imports as endpoints
        original = endpoints._write_final_page
        calls = 0
        def fail_second(*args):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError('Simulated failed storage')
            return original(*args)
        key, content = str(uuid.uuid4()), chapter_pdf()
        with patch.object(endpoints, '_write_final_page', side_effect=fail_second):
            with self.assertRaises(OSError):
                await self.upload(key=key, content=content)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Chapter).where(Chapter.webtoon_id == self.image_work.id)), 0)
        self.assertEqual(list((self.media / str(self.image_work.id)).rglob('*.webp')), [])
        retry = await self.upload(key=key, content=content)
        self.assertEqual(retry.status_code, 201, retry.text)
        self.assertEqual(retry.json()['data']['images_count'], 2)
