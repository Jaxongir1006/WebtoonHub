"""Bounded profile-background animation and trusted first-frame posters."""
import asyncio
import io
import re
import uuid
import xml.etree.ElementTree as ET

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.storage import MAX_MEDIA_BYTES, StorageService, validated_media
from app.core.transactions import entity_lock

MAX_BACKGROUND_FRAMES = 120
MAX_BACKGROUND_DURATION_MS = 30_000
MAX_BACKGROUND_FRAME_PIXELS = 4_000_000
MAX_BACKGROUND_TOTAL_PIXELS = 40_000_000
BACKGROUND_MAX_DIMENSION = 1920
_VALIDATED_BACKGROUND = re.compile(r'/content/backgrounds/asset_[a-f0-9]{32}\.(webp|svg)')


def static_background_svg(data):
    """Remove SMIL from sanitized background SVGs so static posters stay static."""
    root = ET.fromstring(data)
    animated_tags = {'animate', 'animatetransform', 'animatemotion', 'animatecolor', 'set', 'discard'}
    for parent in root.iter():
        for child in list(parent):
            if child.tag.split('}')[-1].lower() in animated_tags:
                parent.remove(child)
    return ET.tostring(root, encoding='utf-8')


def encode_animated_background(source, max_bytes=MAX_MEDIA_BYTES):
    """Decode only bounded frames; retain alpha, timing and finite/infinite loops."""
    frames = []
    durations = []
    total_duration = total_pixels = 0
    loop = source.info.get('loop')
    # GIF counts repetitions after the first play, while WebP counts total plays.
    loop = (0 if loop == 0 else int(loop) + 1 if loop is not None else 1) if source.format == 'GIF' else int(loop or 0)
    if not 0 <= loop <= 65535:
        raise HTTPException(422, 'Background animation has too many repetitions')
    try:
        # Do not use GIF n_frames: it scans arbitrarily long animation streams.
        for index in range(MAX_BACKGROUND_FRAMES + 1):
            try:
                source.seek(index)
            except EOFError:
                break
            pixels = source.width * source.height
            total_pixels += pixels
            if index == MAX_BACKGROUND_FRAMES or pixels > MAX_BACKGROUND_FRAME_PIXELS or total_pixels > MAX_BACKGROUND_TOTAL_PIXELS:
                raise HTTPException(422, 'Background animation exceeds 120 frames, 4 million pixels per frame or 40 million total pixels')
            source.load()
            duration = max(1, int(source.info.get('duration', 100) or 100))
            total_duration += duration
            if total_duration > MAX_BACKGROUND_DURATION_MS:
                raise HTTPException(422, 'Background animation must last at most 30 seconds')
            frame = ImageOps.exif_transpose(source).convert('RGBA')
            frame.thumbnail((BACKGROUND_MAX_DIMENSION, BACKGROUND_MAX_DIMENSION), Image.Resampling.LANCZOS)
            frames.append(frame)
            durations.append(duration)
        output = io.BytesIO()
        frames[0].save(output, 'WEBP', quality=85, method=4, save_all=True,
                       append_images=frames[1:], duration=durations, loop=loop)
        encoded = output.getvalue()
        if len(encoded) > max_bytes:
            raise HTTPException(413, 'Encoded background exceeds 20 MiB; use smaller images or fewer frames')
        return encoded
    finally:
        for frame in frames:
            frame.close()


def save_background(data, filename='background.png'):
    filename = filename or 'background.png'
    suffix = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else '.png'
    base = 'backgrounds/asset_' + uuid.uuid4().hex
    artwork, name = validated_media(data, base + suffix, settings.MINIO_BUCKET_SHOP)
    if len(artwork) > MAX_MEDIA_BYTES:
        raise HTTPException(413, 'Encoded background exceeds 20 MiB; use a smaller image')
    animated = False
    poster = None
    if not name.endswith('.svg'):
        with Image.open(io.BytesIO(artwork)) as image:
            animated = getattr(image, 'is_animated', False)
            if animated:
                image.load()
                preview = io.BytesIO()
                image.save(preview, 'WEBP', quality=85, method=4)
                poster = preview.getvalue()
                if len(poster) > MAX_MEDIA_BYTES:
                    raise HTTPException(413, 'Background preview exceeds 20 MiB; use a smaller image')
    preview_name = base + '_preview.webp' if animated else name
    try:
        StorageService.write_bytes(name, artwork, 'image/svg+xml' if name.endswith('.svg') else 'image/webp')
        if poster is not None:
            StorageService.write_bytes(preview_name, poster)
    except (OSError, HTTPException) as exc:
        StorageService.delete_file('', name)
        if animated:
            StorageService.delete_file('', preview_name)
        raise HTTPException(503, 'Background storage is unavailable; artwork was not saved') from exc
    return {'asset_url': '/content/' + name, 'asset_preview_url': '/content/' + preview_name,
            'asset_animated': animated}


async def save_background_async(data, filename='background.png'):
    async with entity_lock('background-media', 0):
        return await asyncio.to_thread(save_background, data, filename)


def inspect_saved_background(url):
    """Derive new-upload metadata without rejecting legacy static cosmetic URLs."""
    if not _VALIDATED_BACKGROUND.fullmatch(url or ''):
        return {'asset_url': url, 'asset_preview_url': url, 'asset_animated': False}
    try:
        content = StorageService.read_bytes(url.removeprefix('/content/'), limit=MAX_MEDIA_BYTES)
        if url.endswith('.svg'):
            return {'asset_url': url, 'asset_preview_url': url, 'asset_animated': False}
        with Image.open(io.BytesIO(content)) as image:
            count = getattr(image, 'n_frames', 1)
            size = image.size
            if image.format != 'WEBP' or count > MAX_BACKGROUND_FRAMES or image.width * image.height > 40_000_000:
                raise HTTPException(422, 'Background artwork was not validated')
            animated = count > 1
            if animated:
                pixels = image.width * image.height
                if image.width > BACKGROUND_MAX_DIMENSION or image.height > BACKGROUND_MAX_DIMENSION or pixels > MAX_BACKGROUND_FRAME_PIXELS or pixels * count > MAX_BACKGROUND_TOTAL_PIXELS:
                    raise HTTPException(422, 'Background animation was not validated')
                duration = 0
                for index in range(count):
                    image.seek(index)
                    image.load()
                    duration += int(image.info.get('duration', 100) or 100)
                if duration > MAX_BACKGROUND_DURATION_MS:
                    raise HTTPException(422, 'Background animation exceeds 30 seconds')
        preview = url.replace('.webp', '_preview.webp') if animated else url
        if animated:
            content = StorageService.read_bytes(preview.removeprefix('/content/'), limit=MAX_MEDIA_BYTES)
            with Image.open(io.BytesIO(content)) as poster:
                if poster.format != 'WEBP' or getattr(poster, 'n_frames', 1) != 1 or poster.size != size or poster.width * poster.height > MAX_BACKGROUND_FRAME_PIXELS:
                    raise HTTPException(422, 'Background preview is invalid')
                poster.load()
        return {'asset_url': url, 'asset_preview_url': preview, 'asset_animated': animated}
    except HTTPException as exc:
        if exc.status_code in {404, 413}:
            raise HTTPException(422, 'Background artwork or its preview no longer exists or exceeds the upload limit') from None
        raise
    except (OSError, ValueError, EOFError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, 'Background artwork or its preview is invalid; upload it again') from exc


async def inspect_saved_background_async(url):
    async with entity_lock('background-media', 0):
        return await asyncio.to_thread(inspect_saved_background, url)
