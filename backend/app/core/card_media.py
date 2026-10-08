"""Bounded animated card processing, separate from existing cosmetic storage."""
import asyncio
import io
import logging
import re
import uuid
from pathlib import Path
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.storage import safe_path
from app.core.transactions import entity_lock

MAX_CARD_BYTES = 10 * 1024 * 1024
MAX_CARD_FRAMES = 100
MAX_CARD_DURATION_MS = 10_000
MAX_CARD_FRAME_PIXELS = 4_000_000
MAX_CARD_TOTAL_PIXELS = 60_000_000
CARD_MAX_DIMENSION = 1200
logger = logging.getLogger(__name__)


def encode_card(data):
    if not data or len(data) > MAX_CARD_BYTES:
        raise HTTPException(413, 'Card artwork must be nonempty and at most 10 MiB')
    frames = []
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in {'JPEG', 'PNG', 'WEBP', 'GIF'}:
                raise HTTPException(422, 'Cards support JPEG, PNG, WebP and GIF only')
            durations = []
            total = 0
            total_pixels = 0
            # GIF's n_frames scans its whole stream. Stop seeking at our bound
            # instead, so a tiny file with thousands of frames stays bounded.
            for index in range(MAX_CARD_FRAMES + 1):
                try:
                    source.seek(index)
                except EOFError:
                    break
                pixels = source.width * source.height
                total_pixels += pixels
                if index == MAX_CARD_FRAMES or pixels > MAX_CARD_FRAME_PIXELS or total_pixels > MAX_CARD_TOTAL_PIXELS:
                    raise HTTPException(422, 'Card exceeds 100 frames, 4 million pixels per frame or 60 million total pixels')
                source.load()
                duration = max(20, int(source.info.get('duration', 100) or 100))
                total += duration
                if index > 0 and total > MAX_CARD_DURATION_MS:
                    raise HTTPException(422, 'Card animation must last at most 10 seconds')
                frame = ImageOps.exif_transpose(source).convert('RGBA')
                frame.thumbnail((CARD_MAX_DIMENSION, CARD_MAX_DIMENSION), Image.Resampling.LANCZOS)
                frames.append(frame)
                durations.append(duration)
        output = io.BytesIO()
        frames[0].save(output, 'WEBP', quality=85, method=4, save_all=len(frames) > 1,
                       append_images=frames[1:], duration=durations, loop=0)
        artwork = output.getvalue()
        if len(artwork) > MAX_CARD_BYTES:
            raise HTTPException(413, 'Encoded card artwork exceeds 10 MiB; use smaller images or fewer frames')
        with Image.open(io.BytesIO(artwork)) as encoded:
            animated = getattr(encoded, 'n_frames', 1) > 1
        preview = io.BytesIO()
        frames[0].save(preview, 'WEBP', quality=85, method=4)
        return artwork, preview.getvalue(), animated
    except (UnidentifiedImageError, OSError, ValueError, EOFError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, 'Upload a valid JPEG, PNG, GIF or WebP card') from exc
    finally:
        for frame in frames:
            frame.close()


def save_card(data):
    artwork, preview, animated = encode_card(data)
    name = 'cards/asset_' + uuid.uuid4().hex
    path = safe_path(name + '.webp')
    poster = safe_path(name + '_preview.webp')
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(artwork)
        if animated:
            poster.write_bytes(preview)
    except OSError as exc:
        for unused in (path, poster):
            try:
                unused.unlink(missing_ok=True)
            except OSError:
                logger.warning('Failed card upload cleanup could not complete', exc_info=True)
        raise HTTPException(503, 'Card storage is unavailable; artwork was not saved') from exc
    return {'asset_url': '/content/' + name + '.webp',
            'asset_preview_url': '/content/' + name + ('_preview.webp' if animated else '.webp'),
            'asset_animated': animated}


async def save_card_async(data):
    async with entity_lock('card-media', 0):
        return await asyncio.to_thread(save_card, data)


def inspect_saved_card(url):
    if not re.fullmatch(r'/content/cards/asset_[a-f0-9]{32}\.webp', url or ''):
        raise HTTPException(422, 'Upload card artwork through the card uploader first')
    path = safe_path(url.removeprefix('/content/'))
    try:
        if path.stat().st_size > MAX_CARD_BYTES:
            raise HTTPException(422, 'Card artwork exceeds the upload limit')
        with Image.open(path) as image:
            count = getattr(image, 'n_frames', 1)
            if image.format != 'WEBP' or count > MAX_CARD_FRAMES or image.width > CARD_MAX_DIMENSION or image.height > CARD_MAX_DIMENSION or image.width * image.height * count > MAX_CARD_TOTAL_PIXELS:
                raise HTTPException(422, 'Card artwork was not validated')
            total = 0
            for index in range(count):
                image.seek(index)
                image.load()
                total += int(image.info.get('duration', 100) or 100)
            if count > 1 and total > MAX_CARD_DURATION_MS:
                raise HTTPException(422, 'Card animation exceeds 10 seconds')
        animated = count > 1
        preview = url.replace('.webp', '_preview.webp') if animated else url
        if animated:
            with Image.open(safe_path(preview.removeprefix('/content/'))) as poster:
                poster.load()
                if poster.format != 'WEBP' or getattr(poster, 'n_frames', 1) != 1:
                    raise HTTPException(422, 'Card preview is invalid')
        return {'asset_url': url, 'asset_preview_url': preview, 'asset_animated': animated}
    except (OSError, ValueError, EOFError, UnidentifiedImageError) as exc:
        raise HTTPException(422, 'Card artwork or its preview no longer exists; upload it again') from exc


async def inspect_saved_card_async(url):
    async with entity_lock('card-media', 0):
        return await asyncio.to_thread(inspect_saved_card, url)
