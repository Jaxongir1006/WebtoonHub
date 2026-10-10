"""Background artwork remains animated; all API files and accounts are disposable."""
import io
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

import test_audit_regressions as audit
from fastapi import HTTPException
from PIL import Image, ImageDraw

from app.core.background_media import encode_animated_background, inspect_saved_background, save_background
from app.core.config import settings
from app.core.storage import MAX_MEDIA_BYTES, StorageService, safe_path, validated_media


def background_artwork(format='GIF', *, size=(96, 64), durations=(80, 120, 160), loop=0, transparent=False):
    frames = []
    try:
        for color in [(245, 30, 40), (30, 40, 245), (30, 245, 40)]:
            frame = Image.new('RGBA' if transparent else 'RGB', size, color)
            if transparent:
                ImageDraw.Draw(frame).rectangle((8, 8, 23, 23), fill=(0, 0, 0, 0))
            frames.append(frame)
        output = io.BytesIO()
        options = {'save_all': True, 'append_images': frames[1:], 'duration': list(durations)}
        if loop is not None:
            options['loop'] = loop
        if format == 'GIF':
            options['disposal'] = 2
        frames[0].save(output, format=format, **options)
        return output.getvalue()
    finally:
        for frame in frames:
            frame.close()


class BackgroundMediaTests(unittest.TestCase):
    def convert(self, data, *, name='backgrounds/test.gif', bucket=None):
        return validated_media(data, name, bucket or settings.MINIO_BUCKET_SHOP)

    def test_gif_webp_preserve_distinct_frames_timing_alpha_and_loop(self):
        for format in ['GIF', 'WEBP']:
            for loop in [None, 0, 2]:
                if format == 'WEBP' and loop is None:
                    continue
                with self.subTest(format=format, loop=loop):
                    encoded, name = self.convert(background_artwork(format, loop=loop, transparent=True))
                    self.assertEqual(name, 'backgrounds/test.webp')
                    with Image.open(io.BytesIO(encoded)) as image:
                        self.assertEqual(image.format, 'WEBP')
                        self.assertEqual(image.n_frames, 3)
                        self.assertEqual(image.size, (96, 64))
                        expected_loop = (1 if loop is None else 0 if loop == 0 else loop + 1) if format == 'GIF' else loop
                        self.assertEqual(image.info['loop'], expected_loop)
                        colors, durations = [], []
                        for index in range(3):
                            image.seek(index)
                            image.load()
                            durations.append(image.info['duration'])
                            self.assertEqual(image.convert('RGBA').getpixel((12, 12))[3], 0)
                            colors.append(image.convert('RGB').getpixel((50, 40)))
                        self.assertEqual(durations, [80, 120, 160])
                        self.assertEqual(len(set(colors)), 3)

    def test_animation_resize_preserves_aspect_ratio(self):
        encoded, _ = self.convert(background_artwork('WEBP', size=(2000, 20)))
        with Image.open(io.BytesIO(encoded)) as image:
            self.assertEqual(image.size, (1920, 19))
            self.assertEqual(image.n_frames, 3)

    def test_static_backgrounds_and_other_media_keep_existing_behavior(self):
        for format in ['PNG', 'JPEG', 'WEBP']:
            with self.subTest(format=format):
                output = io.BytesIO()
                with Image.new('RGB', (2000, 20), 'blue') as source:
                    source.save(output, format=format)
                encoded, _ = self.convert(output.getvalue())
                with Image.open(io.BytesIO(encoded)) as image:
                    self.assertEqual(image.size, (2000, 20))
                    self.assertEqual(image.mode, 'RGB')
                    self.assertEqual(image.n_frames, 1)
        for name, bucket in [('frames/test.gif', settings.MINIO_BUCKET_SHOP),
                             ('backgrounds/test.gif', settings.MINIO_BUCKET_COVERS),
                             ('pages/test.gif', settings.MINIO_BUCKET_CHAPTERS)]:
            with self.subTest(name=name, bucket=bucket):
                encoded, _ = self.convert(background_artwork(), name=name, bucket=bucket)
                with Image.open(io.BytesIO(encoded)) as image:
                    self.assertEqual(image.n_frames, 1)

    def test_invalid_and_oversized_or_expensive_animations_are_rejected(self):
        for data, status in [(b'not an image', 422), (b'x' * (MAX_MEDIA_BYTES + 1), 413),
                             (background_artwork(durations=[11000, 11000, 11000]), 422)]:
            with self.subTest(status=status):
                with self.assertRaises(HTTPException) as error:
                    self.convert(data)
                self.assertEqual(error.exception.status_code, status)
        for limit, value in [('MAX_BACKGROUND_FRAMES', 2), ('MAX_BACKGROUND_FRAME_PIXELS', 100),
                             ('MAX_BACKGROUND_TOTAL_PIXELS', 96 * 64 * 2)]:
            with self.subTest(limit=limit), patch('app.core.background_media.' + limit, value):
                with self.assertRaises(HTTPException) as error:
                    self.convert(background_artwork())
                self.assertEqual(error.exception.status_code, 422)
        with Image.open(io.BytesIO(background_artwork())) as source:
            with self.assertRaises(HTTPException) as error:
                encode_animated_background(source, max_bytes=1)
            self.assertEqual(error.exception.status_code, 413)

    def test_legacy_external_static_background_urls_are_compatible(self):
        for url in ['https://example.com/background.png', '/content/backgrounds/old.webp']:
            self.assertEqual(inspect_saved_background(url), {
                'asset_url': url, 'asset_preview_url': url, 'asset_animated': False})

    def test_svg_backgrounds_strip_smil_but_frame_svgs_keep_existing_behavior(self):
        animations = ['animate', 'animateTransform', 'animateMotion', 'animateColor', 'set', 'discard']
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><rect width="96" height="64">'
               + ''.join('<' + tag + ' attributeName="fill" values="red;blue" dur="1s" repeatCount="indefinite" />' for tag in animations)
               + '</rect><script>alert(1)</script></svg>').encode()
        encoded, name = self.convert(svg, name='backgrounds/static.svg')
        self.assertEqual(name, 'backgrounds/static.svg')
        tags = {element.tag.split('}')[-1] for element in ET.fromstring(encoded).iter()}
        self.assertEqual(tags, {'svg', 'rect'})
        encoded, _ = self.convert(svg, name='frames/frame.svg')
        tags = {element.tag.split('}')[-1] for element in ET.fromstring(encoded).iter()}
        self.assertTrue(set(animations).issubset(tags))
        self.assertNotIn('script', tags)

    def test_static_background_encoded_size_is_checked_before_storage(self):
        # A valid input can expand during WebP/SVG normalization: check the
        # actual encoded bytes even when the uploaded file passed its own cap.
        with patch('app.core.background_media.validated_media', return_value=(b'x' * 11, 'backgrounds/static.webp')):
            with patch('app.core.background_media.MAX_MEDIA_BYTES', 10), patch.object(StorageService, 'write_bytes') as write:
                with self.assertRaises(HTTPException) as error:
                    save_background(b'input is below cap', None)
                self.assertEqual(error.exception.status_code, 413)
                write.assert_not_called()


class BackgroundAssetApiTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = audit.AuditRegressionTests.asyncSetUp
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth

    def assert_saved_animation(self, item):
        self.assertTrue(item['asset_animated'])
        self.assertNotEqual(item['asset_url'], item['asset_preview_url'])
        with Image.open(safe_path(item['asset_url'].removeprefix('/content/'))) as image:
            self.assertEqual(image.n_frames, 3)
        with Image.open(safe_path(item['asset_preview_url'].removeprefix('/content/'))) as poster:
            self.assertEqual(poster.n_frames, 1)

    async def test_missing_poster_and_partial_storage_failure_cannot_create_backgrounds(self):
        response = await self.client.post('/api/v1/staff/shop/items/upload-asset', data={'item_type': 'background'},
            files={'file': ('forest.gif', background_artwork(), 'image/gif')}, headers=self.staff_auth())
        self.assertEqual(response.status_code, 200, response.text)
        asset = response.json()['data']
        safe_path(asset['asset_preview_url'].removeprefix('/content/')).unlink()
        created = await self.client.post('/api/v1/staff/shop/items', data={
            'name': 'Missing preview', 'item_type': 'background', 'price_coins': 25,
            'asset_url': asset['asset_url']}, headers=self.staff_auth())
        self.assertEqual(created.status_code, 422, created.text)
        before = set(self.media.rglob('*'))
        original_write = StorageService.write_bytes

        def fail_poster(name, data, content_type='image/webp'):
            if name.endswith('_preview.webp'):
                raise OSError('Poster storage unavailable')
            return original_write(name, data, content_type)

        with patch('app.core.background_media.StorageService.write_bytes', side_effect=fail_poster):
            failed = await self.client.post('/api/v1/staff/shop/items/upload-asset', data={'item_type': 'background'},
                files={'file': ('forest.gif', background_artwork(), 'image/gif')}, headers=self.staff_auth())
        self.assertEqual(failed.status_code, 503, failed.text)
        self.assertEqual(set(self.media.rglob('*')), before)
        self.assertEqual((await self.client.get('/api/v1/staff/shop/items', headers=self.staff_auth())).json()['data'], [])

    async def test_create_edit_purchase_and_profiles_share_trusted_animation_metadata(self):
        created = await self.client.post('/api/v1/staff/shop/items', data={
            'name': 'Animated forest', 'item_type': 'background', 'price_coins': 25},
            files={'asset_file': ('forest.gif', background_artwork(), 'image/gif')}, headers=self.staff_auth())
        self.assertEqual(created.status_code, 201, created.text)
        item = created.json()['data']
        self.assert_saved_animation(item)
        listed = (await self.client.get('/api/v1/staff/shop/items', headers=self.staff_auth())).json()['data']
        self.assertEqual(listed[0]['asset_preview_url'], item['asset_preview_url'])
        bought = await self.client.post('/api/v1/shop/buy/' + str(item['id']),
                                       json={'expected_price': 25}, headers=self.auth())
        self.assertEqual(bought.status_code, 200, bought.text)
        inventory = (await self.client.get('/api/v1/shop/inventory', headers=self.auth())).json()['data']
        self.assert_saved_animation(inventory[0])
        equipped = await self.client.post('/api/v1/shop/equip/' + str(item['id']), headers=self.auth())
        self.assertEqual(equipped.status_code, 200, equipped.text)
        for path in ['/api/v1/auth/me', '/api/v1/users/reader/public-profile']:
            profile = (await self.client.get(path, headers=self.auth())).json()['data']
            self.assert_saved_animation(profile['active_background'])
        upload = await self.client.post('/api/v1/staff/shop/items/upload-asset', data={'item_type': 'background'},
            files={'file': ('forest.webp', background_artwork('WEBP', loop=2), 'image/webp')}, headers=self.staff_auth())
        self.assertEqual(upload.status_code, 200, upload.text)
        artwork = upload.json()['data']
        self.assert_saved_animation(artwork)
        spoof = await self.client.patch('/api/v1/staff/shop/items/' + str(item['id']),
            json={'asset_url': artwork['asset_url'], 'asset_animated': False}, headers=self.staff_auth())
        self.assertEqual(spoof.status_code, 422, spoof.text)
        updated = await self.client.patch('/api/v1/staff/shop/items/' + str(item['id']),
            json={'asset_url': artwork['asset_url']}, headers=self.staff_auth())
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assert_saved_animation(updated.json()['data'])
        for old in [item['asset_url'], item['asset_preview_url']]:
            self.assertFalse(safe_path(old.removeprefix('/content/')).exists())
        with Image.open(safe_path(artwork['asset_url'].removeprefix('/content/'))) as image:
            self.assertEqual(image.info['loop'], 2)
        # Replacing animation with a static upload clears its metadata/poster.
        static = io.BytesIO()
        with Image.new('RGB', (96, 64), 'blue') as source:
            source.save(static, 'PNG')
        uploaded = await self.client.post('/api/v1/staff/shop/items/upload-asset', data={'item_type': 'background'},
            files={'file': ('static.png', static.getvalue(), 'image/png')}, headers=self.staff_auth())
        static_url = uploaded.json()['data']['asset_url']
        result = await self.client.patch('/api/v1/staff/shop/items/' + str(item['id']),
            json={'asset_url': static_url}, headers=self.staff_auth())
        self.assertEqual(result.status_code, 200, result.text)
        self.assertFalse(result.json()['data']['asset_animated'])
        self.assertEqual(result.json()['data']['asset_preview_url'], static_url)
        self.assertFalse(safe_path(artwork['asset_preview_url'].removeprefix('/content/')).exists())
