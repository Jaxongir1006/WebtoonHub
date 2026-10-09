"""Raster upload conversion keeps frame openings transparent without writing files."""
import io
import unittest

from PIL import Image, ImageDraw

from app.core.config import settings
from app.core.storage import validated_media


class StorageMediaTransparencyTests(unittest.TestCase):
    def converted(self, source, format, **save_options):
        uploaded = io.BytesIO()
        source.save(uploaded, format=format, **save_options)
        encoded, name = validated_media(uploaded.getvalue(), 'frames/frame.' + format.lower(),
                                        settings.MINIO_BUCKET_SHOP)
        self.assertEqual(name, 'frames/frame.webp')
        with Image.open(io.BytesIO(encoded)) as result:
            result.load()
            self.assertEqual(result.format, 'WEBP')
            self.assertEqual(result.size, (64, 64))
            return result.copy()

    def assert_open_center(self, converted):
        self.assertEqual(converted.mode, 'RGBA')
        self.assertEqual(converted.getpixel((32, 32))[3], 0)
        self.assertEqual(converted.getpixel((0, 0))[3], 255)

    def test_indexed_png_and_gif_preserve_transparent_center(self):
        with Image.new('P', (64, 64), 1) as frame:
            frame.putpalette([255, 0, 255, 255, 190, 0] + [0] * 762)
            ImageDraw.Draw(frame).rectangle((16, 16, 47, 47), fill=0)
            for format in ['PNG', 'GIF']:
                with self.subTest(format=format):
                    converted = self.converted(frame, format, transparency=0)
                    self.assert_open_center(converted)
                    converted.close()

    def test_rgb_png_transparency_key_preserves_transparent_center(self):
        with Image.new('RGB', (64, 64), (255, 190, 0)) as frame:
            ImageDraw.Draw(frame).rectangle((16, 16, 47, 47), fill=(255, 0, 255))
            converted = self.converted(frame, 'PNG', transparency=(255, 0, 255))
            self.assert_open_center(converted)
            converted.close()

    def test_rgba_png_preserves_transparent_center(self):
        with Image.new('RGBA', (64, 64), (255, 190, 0, 255)) as frame:
            ImageDraw.Draw(frame).rectangle((16, 16, 47, 47), fill=(0, 0, 0, 0))
            converted = self.converted(frame, 'PNG')
            self.assert_open_center(converted)
            converted.close()

    def test_opaque_png_and_jpeg_remain_opaque_rgb(self):
        with Image.new('RGB', (64, 64), (255, 190, 0)) as image:
            for format in ['PNG', 'JPEG']:
                with self.subTest(format=format):
                    converted = self.converted(image, format)
                    self.assertEqual(converted.mode, 'RGB')
                    converted.close()


if __name__ == '__main__':
    unittest.main()
