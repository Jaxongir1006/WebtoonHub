"""Serve only synthetic temporary DB/media; never boot the project's database."""
import asyncio
import os
import sys
from pathlib import Path

os.environ['APP_ENV'] = 'test'
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///:memory:'
os.environ.pop('AUDIT_TEST_DATABASE_URL', None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))

from tests.test_audit_regressions import AuditRegressionTests
from app.main import app
from app.modules.users.models import User
from app.modules.webtoons.models import Webtoon, Chapter, ChapterImage
from app.modules.shop.models import ShopItem
from sqlalchemy import update
from PIL import Image
import uvicorn


async def main():
    fixture = AuditRegressionTests()
    await fixture.asyncSetUp()
    try:
        cover = fixture.media / 'covers' / 'fixture.webp'
        cover.parent.mkdir(parents=True, exist_ok=True)
        Image.new('RGB', (300, 450), '#166534').save(cover, 'WEBP')
        avatar = fixture.media / 'avatars' / 'fixture.webp'
        avatar.parent.mkdir(parents=True, exist_ok=True)
        Image.new('RGB', (80, 80), '#0e7490').save(avatar, 'WEBP')
        async with fixture.sessions() as db:
            await db.execute(update(User).values(avatar_url='/content/avatars/fixture.webp'))
            await db.execute(update(Webtoon).where(Webtoon.id == fixture.work.id).values(
                title='Fixture illustrated novel', slug='fixture-novel', uploader_staff_id=fixture.creator.id,
                cover_image_url='/content/covers/fixture.webp'))
            paragraphs = ['A synthetic paragraph ' + ' '.join(f'word{index}' for index in range(80)) + '.' for _ in range(28)]
            await db.execute(update(Chapter).where(Chapter.id == fixture.chapter.id).values(
                title='Fixture novel chapter', content_text='\n\n'.join(paragraphs)))
            novel_image = fixture.media / str(fixture.work.id) / str(fixture.chapter.id) / 'illustration.webp'
            novel_image.parent.mkdir(parents=True, exist_ok=True)
            Image.new('RGB', (500, 800), '#7e22ce').save(novel_image, 'WEBP')
            db.add(ChapterImage(chapter_id=fixture.chapter.id,
                image_url=f'/content/{fixture.work.id}/{fixture.chapter.id}/illustration.webp', order_index=1, width=500, height=800))
            comic = Webtoon(title='Fixture tall manga', slug='fixture-manga', type='manga',
                cover_image_url='/content/covers/fixture.webp', uploader_staff_id=fixture.creator.id)
            db.add(comic)
            await db.flush()
            chapter = Chapter(webtoon_id=comic.id, chapter_number=1, title='Fixture comic chapter', status='published', reward_coins=5)
            db.add(chapter)
            await db.flush()
            page = fixture.media / str(comic.id) / str(chapter.id) / 'tall.webp'
            page.parent.mkdir(parents=True, exist_ok=True)
            Image.new('RGB', (700, 2800), '#0f766e').save(page, 'WEBP')
            db.add(ChapterImage(chapter_id=chapter.id, image_url=f'/content/{comic.id}/{chapter.id}/tall.webp', order_index=1, width=700, height=2800))
            manga = Chapter(webtoon_id=comic.id, chapter_number=2, title='Fixture two tall pages', status='published')
            db.add(manga)
            await db.flush()
            for index, color in enumerate(['#0f766e', '#be123c'], start=1):
                manga_page = fixture.media / str(comic.id) / str(manga.id) / f'page{index}.webp'
                manga_page.parent.mkdir(parents=True, exist_ok=True)
                Image.new('RGB', (700, 2800), color).save(manga_page, 'WEBP')
                db.add(ChapterImage(chapter_id=manga.id, image_url=f'/content/{comic.id}/{manga.id}/page{index}.webp', order_index=index, width=700, height=2800))
            frame = fixture.media / 'frames' / 'fixture.webp'
            frame.parent.mkdir(parents=True, exist_ok=True)
            Image.new('RGBA', (200, 200), '#f59e0b80').save(frame, 'WEBP')
            item = ShopItem(name='Fixture frame', item_type='frame', price_coins=100, asset_url='/content/frames/fixture.webp')
            db.add(item)
            gacha_reader = User(username='fixture_gacha_reader', email='fixture-gacha@example.com',
                hashed_password=fixture.reader.hashed_password, lightning_coins=1000, is_active=True)
            db.add(gacha_reader)
            await db.commit()
            data = {'novel_work_id': fixture.work.id, 'novel_chapter_id': fixture.chapter.id,
                'comic_work_id': comic.id, 'comic_chapter_id': chapter.id, 'manga_chapter_id': manga.id, 'shop_item_id': item.id,
                'reader_email': fixture.reader.email, 'admin_email': fixture.admin.email,
                'creator_email': fixture.creator.email, 'profile_reader_email': fixture.third.email,
                'gacha_reader_email': gacha_reader.email,
                'password': 'regression-password-long'}

        @app.get('/__e2e__/fixtures')
        async def fixture_ids():
            return data

        # Disable the application's development lifespan: fixture owns every DB/media
        # dependency, and no server startup should touch the normal content directory.
        server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=58180, lifespan='off', log_level='warning'))
        await server.serve()
    finally:
        await fixture.asyncTearDown()


if __name__ == '__main__':
    asyncio.run(main())
