"""Card APIs and animated media use disposable databases/files only."""
import asyncio
import io
import unittest
from unittest.mock import patch
from PIL import Image
from sqlalchemy import func, select
import test_audit_regressions as audit
from app.core.card_media import encode_card
from app.core.storage import safe_path, StorageService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.rewards.models import CoinTransaction
from app.modules.rewards.service import RewardService
from app.modules.wheel.models import Wheel, WheelItem


def artwork(format='GIF', *, animated=True, durations=None):
    output = io.BytesIO()
    images = [Image.new('RGB', (64, 96), color) for color in ('red', 'blue', 'green')]
    images[0].save(output, format=format, save_all=animated, append_images=images[1:] if animated else [],
                   duration=durations or [80, 120, 160], loop=0)
    for image in images:
        image.close()
    return output.getvalue()


class CharacterCardTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = audit.AuditRegressionTests.asyncSetUp
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth

    async def upload(self, data=None, item_type='card', filename='card.gif'):
        return await self.client.post('/api/v1/staff/shop/items/upload-asset',
            files={'file': (filename, artwork() if data is None else data, 'application/octet-stream')},
            data={'item_type': item_type}, headers=self.staff_auth())

    async def create_card(self, rarity='legendary', name='Hero', asset=None):
        if asset is None:
            upload = await self.upload()
            self.assertEqual(upload.status_code, 200, upload.text)
            asset = upload.json()['data']['asset_url']
        result = await self.client.post('/api/v1/staff/shop/items', data={
            'name': name, 'item_type': 'card', 'price_coins': 20, 'rarity': rarity,
            'character_name': name, 'series_title': 'A series', 'asset_url': asset}, headers=self.staff_auth())
        self.assertEqual(result.status_code, 201, result.text)
        return result.json()['data']

    async def test_gif_and_animated_webp_preserve_frames_and_static_preview(self):
        for format in ['GIF', 'WEBP']:
            response = await self.upload(artwork(format), filename='card.' + format.lower())
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()['data']
            self.assertTrue(data['asset_animated'])
            with Image.open(safe_path(data['asset_url'].removeprefix('/content/'))) as image:
                self.assertEqual(image.n_frames, 3)
                image.load(); first = image.convert('RGB').getpixel((20, 20))
                durations = []
                for index in range(image.n_frames):
                    image.seek(index); image.load(); durations.append(image.info['duration'])
                self.assertEqual(durations, [80, 120, 160])
                self.assertNotEqual(image.convert('RGB').getpixel((20, 20)), first)
            with Image.open(safe_path(data['asset_preview_url'].removeprefix('/content/'))) as preview:
                self.assertEqual(getattr(preview, 'n_frames', 1), 1)
            card = await self.create_card(asset=data['asset_url'])
            self.assertEqual(card['asset_preview_url'], data['asset_preview_url'])
            self.assertTrue(card['asset_animated'])

    async def test_static_formats_and_legacy_cosmetic_behavior(self):
        for format in ['JPEG', 'PNG', 'WEBP']:
            response = await self.upload(artwork(format, animated=False), filename='card.png')
            self.assertEqual(response.status_code, 200, response.text)
            asset = response.json()['data']
            self.assertFalse(asset['asset_animated'])
            self.assertEqual(asset['asset_url'], asset['asset_preview_url'])
        legacy = await self.upload(item_type='background')
        self.assertEqual(legacy.status_code, 200, legacy.text)
        with Image.open(safe_path(legacy.json()['data']['asset_url'].removeprefix('/content/'))) as image:
            self.assertEqual(getattr(image, 'n_frames', 1), 1)
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
        self.assertEqual((await self.upload(svg, item_type='frame', filename='frame.svg')).status_code, 200)

    async def test_reject_unsupported_and_bounded_animation_work(self):
        for content in [b'<svg/>', b'<html/>', b'not an image']:
            self.assertEqual((await self.upload(content)).status_code, 422)
        self.assertEqual((await self.upload(b'x' * (10 * 1024 * 1024 + 1))).status_code, 413)
        self.assertEqual((await self.upload(artwork(durations=[4000, 4000, 4000]))).status_code, 422)
        self.assertEqual((await self.upload(artwork('WEBP', durations=[4000, 4000, 4000]))).status_code, 422)
        for limit in [('MAX_CARD_FRAMES', 2), ('MAX_CARD_FRAME_PIXELS', 100), ('MAX_CARD_TOTAL_PIXELS', 64 * 96 * 2)]:
            with patch('app.core.card_media.' + limit[0], limit[1]):
                self.assertEqual((await self.upload()).status_code, 422)
        self.assertEqual(len(list(self.media.rglob('*.webp'))), 0)

    async def test_metadata_validation_requires_validated_local_artwork_and_permissions(self):
        base = {'name': 'Card', 'item_type': 'card', 'price_coins': 20, 'character_name': 'Hero', 'rarity': 'rare'}
        for change in [{'rarity': 'mythical'}, {'character_name': ''}, {'asset_url': 'https://example.com/image.gif'},
                       {'asset_url': '/content/frame.webp'}, {'webtoon_id': 999999}]:
            response = await self.client.post('/api/v1/staff/shop/items', data=base | change, headers=self.staff_auth())
            self.assertEqual(response.status_code, 422, response.text)
        response = await self.client.post('/api/v1/staff/shop/items/upload-asset', files={'file': ('card.gif', artwork())},
            data={'item_type': 'card'}, headers=self.auth(self.creator_token))
        self.assertEqual(response.status_code, 403)
        card = await self.create_card()
        spoof = await self.client.patch('/api/v1/staff/shop/items/' + str(card['id']),
            json={'asset_animated': False, 'asset_preview_url': '/content/other.webp'}, headers=self.staff_auth())
        self.assertEqual(spoof.status_code, 422)

    async def test_buy_counts_public_summary_featured_order_and_ownership(self):
        cards = [await self.create_card(rarity, name=rarity) for rarity in ['legendary', 'common', 'rare', 'epic']]
        for card in cards:
            bought = await self.client.post('/api/v1/shop/buy/' + str(card['id']), json={'expected_price':card['price_coins']}, headers=self.auth())
            self.assertEqual(bought.status_code, 200, bought.text)
        collection = (await self.client.get('/api/v1/shop/collection', headers=self.auth())).json()['data']
        self.assertEqual(collection['total_cards'], 4)
        self.assertEqual(collection['rarity_counts'], {'common': 1, 'rare': 1, 'epic': 1, 'legendary': 1})
        featured_ids = [cards[2]['id'], cards[0]['id'], cards[1]['id']]
        featured = await self.client.put('/api/v1/shop/collection/featured', json={'item_ids': featured_ids}, headers=self.auth())
        self.assertEqual(featured.status_code, 200, featured.text)
        self.assertEqual([item['id'] for item in featured.json()['data']['featured_cards']], featured_ids)
        for values in [featured_ids + [cards[3]['id']], [cards[0]['id']] * 2, [999999]]:
            self.assertEqual((await self.client.put('/api/v1/shop/collection/featured', json={'item_ids': values}, headers=self.auth())).status_code, 422)
        self.assertEqual((await self.client.put('/api/v1/shop/collection/featured', json={'item_ids': featured_ids}, headers=self.auth(self.creator_token))).status_code, 401)
        public = (await self.client.get(f'/api/v1/shop/collection/{self.reader.id}')).json()['data']
        self.assertEqual(public['total_cards'], 4); self.assertNotIn('cards', public)
        self.assertNotIn('purchased_at', str(public))
        profile = (await self.client.get('/api/v1/auth/me', headers=self.auth())).json()['data']
        self.assertEqual(profile['card_collection']['rarity_counts']['legendary'], 1)
        public_profile = (await self.client.get('/api/v1/users/reader/public-profile')).json()['data']
        self.assertEqual(public_profile['card_collection']['total_cards'], 4)
        self.assertEqual((await self.client.post('/api/v1/shop/equip/' + str(cards[0]['id']), headers=self.auth())).status_code, 422)

    async def test_concurrent_purchase_unique_ownership_and_locked_identity(self):
        card = await self.create_card()
        responses = await asyncio.gather(*[self.client.post('/api/v1/shop/buy/' + str(card['id']), json={'expected_price':card['price_coins']}, headers=self.auth()) for _ in range(2)])
        self.assertEqual(sorted(response.status_code for response in responses), [200, 400])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(UserInventory)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)), 1)
        for change in [{'rarity': 'common'}, {'character_name': 'Other'}, {'series_title': 'Other'}, {'name': 'Other'}]:
            response = await self.client.patch('/api/v1/staff/shop/items/' + str(card['id']), json=change, headers=self.staff_auth())
            self.assertEqual(response.status_code, 409, response.text)
        listing = (await self.client.get('/api/v1/staff/shop/items', headers=self.staff_auth())).json()['data']
        self.assertTrue(listing[0]['identity_locked']); self.assertEqual(listing[0]['owned_count'], 1)
        self.assertEqual((await self.client.delete('/api/v1/staff/shop/items/' + str(card['id']), headers=self.staff_auth())).status_code, 409)

    async def test_artwork_replacement_preserves_ownership_and_poster_cleanup_references(self):
        card = await self.create_card()
        old = card['asset_url']; poster = card['asset_preview_url']
        await self.client.post('/api/v1/shop/buy/' + str(card['id']), json={'expected_price':card['price_coins']}, headers=self.auth())
        replacement = (await self.upload(artwork('PNG', animated=False))).json()['data']
        async with self.sessions() as db:
            # A second catalog item also references this artwork/poster.
            other = ShopItem(name='Other', item_type='card', rarity='rare', character_name='Other', price_coins=10,
                asset_url=old, asset_preview_url=poster, asset_animated=True)
            db.add(other); await db.commit()
        result = await self.client.patch('/api/v1/staff/shop/items/' + str(card['id']),
            json={'asset_url': replacement['asset_url'], 'price_coins': 30}, headers=self.staff_auth())
        self.assertEqual(result.status_code, 200, result.text)
        self.assertTrue(safe_path(poster.removeprefix('/content/')).exists())
        self.assertTrue(safe_path(old.removeprefix('/content/')).exists())
        await self.client.delete('/api/v1/staff/shop/items/' + str(other.id), headers=self.staff_auth())
        self.assertFalse(safe_path(poster.removeprefix('/content/')).exists())
        self.assertFalse(safe_path(old.removeprefix('/content/')).exists())
        owned = (await self.client.get('/api/v1/shop/collection', headers=self.auth())).json()['data']
        self.assertEqual(owned['total_cards'], 1)
        self.assertEqual(owned['cards'][0]['asset_url'], replacement['asset_url'])

    async def test_first_purchase_serializes_identity_edit_and_deletion(self):
        original_record = RewardService.record_transaction
        for action in ['identity', 'delete']:
            card = await self.create_card(name='Race ' + action)
            purchase_ready = asyncio.Event(); release_purchase = asyncio.Event()
            async def blocked_record(*args, **kwargs):
                result = await original_record(*args, **kwargs)
                purchase_ready.set()
                await asyncio.wait_for(release_purchase.wait(), 5)
                return result
            with patch.object(RewardService, 'record_transaction', side_effect=blocked_record):
                buying = asyncio.create_task(self.client.post('/api/v1/shop/buy/' + str(card['id']), json={'expected_price':card['price_coins']}, headers=self.auth()))
                await asyncio.wait_for(purchase_ready.wait(), 5)
                if action == 'identity':
                    mutating = asyncio.create_task(self.client.patch('/api/v1/staff/shop/items/' + str(card['id']),
                        json={'rarity': 'common'}, headers=self.staff_auth()))
                else:
                    mutating = asyncio.create_task(self.client.delete('/api/v1/staff/shop/items/' + str(card['id']), headers=self.staff_auth()))
                await asyncio.sleep(.05)
                self.assertFalse(mutating.done(), 'Staff mutation must wait for in-flight acquisition')
                release_purchase.set()
                bought, changed = await asyncio.gather(buying, mutating)
            self.assertEqual(bought.status_code, 200, bought.text)
            self.assertEqual(changed.status_code, 409, changed.text)
            async with self.sessions() as db:
                self.assertEqual((await db.get(ShopItem, card['id'])).rarity, 'legendary')
                self.assertEqual(await db.scalar(select(func.count()).select_from(UserInventory).where(UserInventory.item_id == card['id'])), 1)

    async def test_wheel_awards_card_and_preserves_duplicate_compensation(self):
        card = await self.create_card()
        async with self.sessions() as db:
            wheel = Wheel(title='Card wheel', slug='card-wheel', cost_coins=5, has_daily_free_spin=False, is_active=True)
            db.add(wheel); await db.flush()
            db.add_all([WheelItem(wheel_id=wheel.id, reward_type='shop_item', shop_item_id=card['id'], label='Hero', weight=1),
                        WheelItem(wheel_id=wheel.id, reward_type='shop_item', shop_item_id=card['id'], label='Hero again', weight=1)])
            await db.commit()
        for index in range(2):
            result = await self.client.post(f'/api/v1/wheels/{wheel.id}/spin',
                json={'expected_mode': 'paid', 'expected_cost': 5, 'operation_key':str(audit.uuid.uuid4())}, headers=self.auth())
            self.assertEqual(result.status_code, 200, result.text)
            self.assertTrue(result.json()['data']['winning_item']['shop_item']['asset_animated'])
            self.assertEqual(result.json()['data']['winning_item']['shop_item']['rarity'], 'legendary')
        summary = (await self.client.get('/api/v1/shop/collection', headers=self.auth())).json()['data']
        self.assertEqual(summary['total_cards'], 1)
        async with self.sessions() as db:
            self.assertEqual((await db.get(audit.User, self.reader.id)).lightning_coins, 1010)

    async def test_failed_storage_cleanup_does_not_mask_503(self):
        from pathlib import Path
        with patch.object(Path, 'write_bytes', side_effect=OSError('write failure')), \
             patch.object(Path, 'unlink', side_effect=OSError('cleanup failure')):
            result = await self.upload()
        self.assertEqual(result.status_code, 503, result.text)


if __name__ == '__main__':
    unittest.main()
