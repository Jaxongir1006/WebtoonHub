"""Isolated regressions for the October review; project data is never opened."""
import asyncio
import io
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from tests import test_audit_regressions as fixtures
from PIL import Image
from sqlalchemy import select, update, func
from app.modules.staff.models import Permission, Role, StaffUser, StaffSession
from app.modules.webtoons.models import Chapter, ChapterImage, Webtoon
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.service import ShopService
from app.modules.rewards.models import CoinTransaction
from app.modules.users.models import User
from app.core.security import create_access_token, decode_token


def page_bytes():
    output = io.BytesIO()
    Image.new('RGB', (10, 20), 'green').save(output, 'PNG')
    return output.getvalue()


class ContentIntegrityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.case = fixtures.AuditRegressionTests()
        await self.case.asyncSetUp()

    async def asyncTearDown(self):
        await self.case.asyncTearDown()

    async def own_work(self):
        t = self.case
        async with t.sessions() as db:
            await db.execute(update(Webtoon).where(Webtoon.id == t.work.id).values(uploader_staff_id=t.creator.id))
            await db.commit()

    async def comic_chapter(self):
        t = self.case
        async with t.sessions() as db:
            await db.execute(update(Webtoon).where(Webtoon.id == t.work.id).values(type='manga', uploader_staff_id=t.creator.id))
            image = ChapterImage(chapter_id=t.chapter.id, image_url='/content/1/1/existing.webp', order_index=1, width=10, height=20)
            db.add(image)
            await db.commit()
            return image.id

    async def test_renaming_creator_preserves_ownership_in_api_and_catalog(self):
        t = self.case
        async with t.sessions() as db:
            role_id = await db.scalar(select(Role.id).where(Role.system_key == 'creator'))
        response = await t.client.patch(f'/api/v1/staff/roles/{role_id}', headers=t.staff_auth(), json={'name': 'Author'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['data']['scope'], 'own_content')
        me = await t.client.get('/api/v1/staff/auth/me', headers=t.auth(t.creator_token))
        # The studio identity DTO carries immutable semantics after a display rename.
        if me.status_code == 404:
            me = await t.client.get('/api/v1/staff/me', headers=t.auth(t.creator_token))
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()['data']['role']['system_key'], 'creator')
        edit = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}', headers=t.auth(t.creator_token), json={'title': 'Other work'})
        self.assertEqual(edit.status_code, 403, edit.text)
        catalog = await t.client.get('/api/v1/staff/webtoons', headers=t.auth(t.creator_token))
        self.assertEqual(catalog.json()['data']['total'], 0)

    async def test_renamed_superadmin_retains_authority_and_reserved_names_cannot_grant_it(self):
        t = self.case
        async with t.sessions() as db:
            role_id = await db.scalar(select(Role.id).where(Role.system_key == 'superadmin'))
            custom = Role(name='Custom', permissions=[])
            db.add(custom)
            await db.commit()
            custom_id = custom.id
        rename = await t.client.patch(f'/api/v1/staff/roles/{role_id}', headers=t.staff_auth(), json={'name': 'Platform owner', 'permission_ids': []})
        self.assertEqual(rename.status_code, 200, rename.text)
        read = await t.client.get('/api/v1/staff/shop/items', headers=t.staff_auth())
        self.assertEqual(read.status_code, 200, read.text)
        spoof = await t.client.patch(f'/api/v1/staff/roles/{custom_id}', headers=t.staff_auth(), json={'name': 'superadmin'})
        self.assertEqual(spoof.status_code, 422, spoof.text)
        change_scope = await t.client.patch(f'/api/v1/staff/roles/{role_id}', headers=t.staff_auth(), json={'scope': 'own_content'})
        self.assertEqual(change_scope.status_code, 422, change_scope.text)

    async def test_creator_published_text_revision_requires_review(self):
        t = self.case
        await self.own_work()
        edit = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}', headers=t.auth(t.creator_token), json={'content_text': 'A revised complete story'})
        self.assertEqual(edit.status_code, 200, edit.text)
        self.assertEqual(edit.json()['data']['status'], 'pending')
        self.assertTrue(edit.json()['data']['status_changed_to_pending'])
        public = await t.client.get(f'/api/v1/chapters/{t.chapter.id}')
        self.assertEqual(public.status_code, 403, public.text)
        published = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}/status', headers=t.staff_auth(), json={'status': 'published'})
        self.assertEqual(published.status_code, 200, published.text)
        public = await t.client.get(f'/api/v1/chapters/{t.chapter.id}')
        self.assertEqual(public.json()['data']['content_text'], 'A revised complete story')

    async def test_creator_page_append_requires_review_and_idempotent_atomic_response(self):
        t = self.case
        image_id = await self.comic_chapter()
        headers = t.auth(t.creator_token) | {'Idempotency-Key': 'atomic-page-edit'}
        fields = {'retained_image_ids': json.dumps([image_id]), 'chapter_update': json.dumps({'title': 'Revised pages'})}
        files = [('images', ('page.png', page_bytes(), 'image/png'))]
        edit = await t.client.post(f'/api/v1/staff/chapters/{t.chapter.id}/images', headers=headers, data=fields, files=files)
        self.assertEqual(edit.status_code, 200, edit.text)
        data = edit.json()['data']
        self.assertEqual(data['chapter']['status'], 'pending')
        self.assertTrue(data['status_changed_to_pending'])
        retry = await t.client.post(f'/api/v1/staff/chapters/{t.chapter.id}/images', headers=headers, data=fields, files=files)
        self.assertEqual(retry.status_code, 200, retry.text)
        replay = retry.json()['data']
        # The durable upload result is identical; each response legitimately
        # issues fresh staff capabilities with its own ten-minute expiry.
        def logical_result(result):
            return result | {'added_images': [image | {'image_url': urlsplit(image['image_url']).path}
                for image in result['added_images']]}
        self.assertEqual(logical_result(replay), logical_result(data))
        for result in [data, replay]:
            for image in result['added_images']:
                url = urlsplit(image['image_url'])
                self.assertFalse(url.scheme or url.netloc)
                self.assertTrue(url.path.startswith(f'/content/{t.work.id}/{t.chapter.id}/'))
                query = parse_qs(url.query)
                self.assertEqual(set(query), {'media_token'})
                self.assertEqual(len(query['media_token']), 1)
                claims = decode_token(query['media_token'][0])
                self.assertIsNotNone(claims)
                self.assertEqual(claims['type'], 'media')
                self.assertEqual(claims['path'], url.path)
                self.assertEqual(claims['sub'], str(t.creator.id))
                self.assertEqual(claims['session_id'], str(t.creator_session.id))
                self.assertLessEqual(claims['exp'], int(datetime.now(timezone.utc).timestamp()) + 600)
                self.assertEqual((await t.client.get(image['image_url'])).status_code, 200)
                self.assertEqual((await t.client.get(url.path)).status_code, 403)
        async with t.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count(ChapterImage.id)).where(ChapterImage.chapter_id == t.chapter.id)), 2)

    async def test_failed_atomic_page_edit_preserves_metadata_pages_and_publication(self):
        t = self.case
        image_id = await self.comic_chapter()
        edit = await t.client.post(f'/api/v1/staff/chapters/{t.chapter.id}/images', headers=t.auth(t.creator_token),
            data={'retained_image_ids': '[]', 'chapter_update': json.dumps({'title': 'Should not save', 'reward_coins': 99})},
            files=[('images', ('bad.png', b'not an image', 'image/png'))])
        self.assertEqual(edit.status_code, 422, edit.text)
        async with t.sessions() as db:
            chapter = await db.get(Chapter, t.chapter.id)
            self.assertIsNone(chapter.title)
            self.assertEqual(chapter.reward_coins, 0)
            self.assertEqual(chapter.status, 'published')
            self.assertIsNotNone(await db.get(ChapterImage, image_id))

    async def test_empty_submitted_content_is_rejected_but_draft_may_be_incomplete(self):
        t = self.case
        await self.own_work()
        empty = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}', headers=t.auth(t.creator_token), json={'content_text': '  '})
        self.assertEqual(empty.status_code, 422, empty.text)
        image_id = await self.comic_chapter()
        empty_pages = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}', headers=t.staff_auth(), json={'image_ids': []})
        self.assertEqual(empty_pages.status_code, 422, empty_pages.text)
        draft = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}', headers=t.staff_auth(), json={'image_ids': [], 'status': 'draft'})
        self.assertEqual(draft.status_code, 200, draft.text)
        publish = await t.client.patch(f'/api/v1/staff/chapters/{t.chapter.id}/status', headers=t.staff_auth(), json={'status': 'published'})
        self.assertEqual(publish.status_code, 422, publish.text)

    async def test_atomic_metadata_only_edit_and_approver_public_edit(self):
        t = self.case
        response = await t.client.post(f'/api/v1/staff/chapters/{t.chapter.id}/images', headers=t.staff_auth(),
            data={'chapter_update': json.dumps({'content_text': 'An approved correction', 'title': 'Corrected'})})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['data']['chapter']['status'], 'published')
        self.assertFalse(response.json()['data']['status_changed_to_pending'])
        self.assertEqual(response.json()['data']['added_images'], [])

    async def test_stale_shop_price_rejects_without_wallet_inventory_or_ledger_changes(self):
        t = self.case
        async with t.sessions() as db:
            item = ShopItem(name='Test frame', item_type='frame', price_coins=100, asset_url='/content/test.webp')
            db.add(item)
            await db.commit()
            item_id = item.id
        listing = await t.client.get('/api/v1/shop/items', headers=t.auth())
        self.assertEqual(listing.json()['data'][0]['price_coins'], 100)
        update_price = await t.client.patch(f'/api/v1/staff/shop/items/{item_id}', headers=t.staff_auth(), json={'price_coins': 500})
        self.assertEqual(update_price.status_code, 200, update_price.text)
        buy = await t.client.post(f'/api/v1/shop/buy/{item_id}', headers=t.auth(), json={'expected_price': 100})
        self.assertEqual(buy.status_code, 409, buy.text)
        async with t.sessions() as db:
            self.assertEqual((await db.get(User, t.reader.id)).lightning_coins, 1000)
            self.assertEqual(await db.scalar(select(func.count(UserInventory.id))), 0)
            self.assertEqual(await db.scalar(select(func.count(CoinTransaction.id))), 0)
        confirm = await t.client.post(f'/api/v1/shop/buy/{item_id}', headers=t.auth(), json={'expected_price': 500})
        self.assertEqual(confirm.status_code, 200, confirm.text)
        self.assertEqual(confirm.json()['data']['price_paid'], 500)

    async def test_illustrated_novel_progress_uses_text_page_indexes(self):
        t = self.case
        async with t.sessions() as db:
            db.add(ChapterImage(chapter_id=t.chapter.id, image_url='/content/test.webp', order_index=1, width=10, height=10))
            await db.commit()
        await t.client.get(f'/api/v1/chapters/{t.chapter.id}', headers=t.auth())
        response = await t.client.put(f'/api/v1/users/reading-progress/{t.work.id}', headers=t.auth(),
            json={'chapter_id': t.chapter.id, 'page_index': 3, 'anchor': 'word:30', 'progress_percent': 75})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['data']['page_index'], 3)
        async with t.sessions() as db:
            await db.execute(update(Webtoon).where(Webtoon.id == t.work.id).values(type='manga'))
            await db.commit()
        response = await t.client.put(f'/api/v1/users/reading-progress/{t.work.id}', headers=t.auth(),
            json={'chapter_id': t.chapter.id, 'page_index': 3, 'progress_percent': 75})
        self.assertEqual(response.status_code, 422, response.text)

    async def test_shop_only_series_selector_is_narrow_and_paginated(self):
        t = self.case
        async with t.sessions() as db:
            permission = Permission(code='shop:manage')
            role = Role(name='Shop editor', permissions=[permission])
            staff = StaffUser(username='shopeditor', email='shopeditor@example.com', hashed_password=fixtures._PASSWORD, role=role)
            db.add(staff)
            await db.flush()
            session = StaffSession(staff_id=staff.id, refresh_token_hash='shop-editor-test', expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            db.add(session)
            await db.commit()
            token = create_access_token(str(staff.id), {'role': 'staff', 'session_id': str(session.id)})
        selector = await t.client.get('/api/v1/staff/shop/series?search=Published&limit=1', headers=t.auth(token))
        self.assertEqual(selector.status_code, 200, selector.text)
        self.assertEqual(selector.json()['data']['total'], 1)
        self.assertEqual(set(selector.json()['data']['items'][0]), {'id', 'title', 'type'})
        editorial = await t.client.get('/api/v1/staff/webtoons', headers=t.auth(token))
        self.assertEqual(editorial.status_code, 403, editorial.text)

    async def test_equips_take_database_user_lock_even_without_process_wrapper(self):
        t = self.case
        async with t.sessions() as db:
            item = ShopItem(name='Frame', item_type='frame', price_coins=1, asset_url='/content/frame.webp')
            db.add(item)
            await db.flush()
            db.add(UserInventory(user_id=t.reader.id, item_id=item.id))
            await db.commit()
            item_id = item.id
        async with t.sessions() as db:
            from app.core.transactions import lock_user
            with patch('app.modules.shop.service.lock_user', wraps=lock_user) as locked:
                await ShopService.equip_item.__wrapped__(db, t.reader.id, item_id)
                locked.assert_awaited_once_with(db, t.reader.id)

    async def test_recent_sort_uses_approval_date_instead_of_upload_date(self):
        t = self.case
        async with t.sessions() as db:
            old = datetime.now(timezone.utc)-timedelta(days=30)
            await db.execute(update(Chapter).where(Chapter.id == t.pending.id).values(created_at=old))
            newer = Webtoon(title='Other series', slug='other-series', type='novel', cover_image_url='/content/other.webp')
            db.add(newer)
            await db.flush()
            db.add(Chapter(webtoon_id=newer.id, chapter_number=1, status='published', content_text='Complete', published_at=datetime.now(timezone.utc)-timedelta(days=1)))
            await db.commit()
        response = await t.client.patch(f'/api/v1/staff/chapters/{t.pending.id}/status', headers=t.staff_auth(), json={'status': 'published'})
        self.assertEqual(response.status_code, 200, response.text)
        recent = await t.client.get('/api/v1/webtoons?sort=updated')
        self.assertEqual(recent.json()['data']['items'][0]['id'], t.work.id)
        self.assertIsNotNone(recent.json()['data']['items'][0]['latest_chapter']['published_at'])
