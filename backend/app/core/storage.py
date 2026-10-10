import asyncio
import io
import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.config import settings
from app.core.remote_storage import SupabaseStorage, object_key
logger = logging.getLogger(__name__)
CONTENT_ROOT = Path(__file__).resolve().parents[2] / 'public_content'
MAX_MEDIA_BYTES = 20 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000

def init_storage():
    CONTENT_ROOT.mkdir(parents=True, exist_ok=True)

def safe_path(name):
    path = (CONTENT_ROOT / name.lstrip('/')).resolve()
    if not path.is_relative_to(CONTENT_ROOT.resolve()):
        raise HTTPException(400, 'Invalid media path')
    return path

def sanitize_svg(data):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise HTTPException(422, 'SVG external entities are not allowed')
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        raise HTTPException(422, 'Invalid SVG image')
    if root.tag.split('}')[-1] != 'svg':
        raise HTTPException(422, 'Invalid SVG root')
    forbidden = {'script', 'foreignObject', 'iframe', 'object', 'embed', 'image', 'a', 'style', 'use'}
    for parent in root.iter():
        for child in list(parent):
            if child.tag.split('}')[-1] in forbidden:
                parent.remove(child)
        for key, value in list(parent.attrib.items()):
            local = key.split('}')[-1].lower()
            if local.startswith('on') or local in {'href','src'} or 'javascript:' in value.lower() or 'expression(' in value.lower() or any(not token.strip().startswith('#') for token in re.findall(r'url\(([^)]*)\)', value, flags=re.I)):
                del parent.attrib[key]
    return ET.tostring(root, encoding='utf-8')

def validated_media(data, object_name, bucket):
    if not data or len(data) > MAX_MEDIA_BYTES:
        raise HTTPException(413, 'Image must be nonempty and at most 20 MB')
    if Path(object_name).suffix.lower() == '.svg':
        if bucket in {settings.MINIO_BUCKET_CHAPTERS, settings.MINIO_BUCKET_COVERS}:
            raise HTTPException(422, 'Chapter pages and covers must be raster images')
        sanitized = sanitize_svg(data)
        if bucket == settings.MINIO_BUCKET_SHOP and object_name.replace(chr(92), '/').startswith('backgrounds/'):
            from app.core.background_media import static_background_svg
            sanitized = static_background_svg(sanitized)
        return sanitized, object_name
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in {'JPEG','PNG','WEBP','GIF'} or source.width * source.height > 40_000_000:
                raise HTTPException(422, 'Unsupported image')
            if bucket == settings.MINIO_BUCKET_SHOP and object_name.replace(chr(92), '/').startswith('backgrounds/') and source.format in {'GIF', 'WEBP'} and getattr(source, 'is_animated', False):
                from app.core.background_media import encode_animated_background
                encoded = encode_animated_background(source, MAX_MEDIA_BYTES)
                return encoded, str(Path(object_name).with_suffix('.webp')).replace(chr(92), '/')
            source.load()
            # PNG/GIF may store transparency in palette/key metadata without an alpha band.
            has_transparency = 'A' in source.getbands() or 'transparency' in source.info
            image = ImageOps.exif_transpose(source).convert('RGBA' if has_transparency else 'RGB')
            if bucket == settings.MINIO_BUCKET_CHAPTERS and image.width > 1200:
                image = image.resize((1200, round(image.height * 1200 / image.width)), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, 'WEBP', quality=85, method=4)
            return output.getvalue(), str(Path(object_name).with_suffix('.webp')).replace(chr(92), '/')
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, 'Upload a valid PNG, JPEG, GIF or WebP image')

class StorageService:
    @staticmethod
    def remote():
        return settings.STORAGE_BACKEND == 'supabase'
    @staticmethod
    def write_bytes(object_name, data, content_type='image/webp'):
        object_name = object_key(object_name)
        if StorageService.remote():
            SupabaseStorage.write(object_name, data, content_type)
        else:
            path = safe_path(object_name)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        return '/content/' + object_name
    @staticmethod
    def read_bytes(object_name, limit=MAX_MEDIA_BYTES):
        object_name = object_key(object_name)
        if StorageService.remote():
            return SupabaseStorage.read(object_name, limit=limit)
        path = safe_path(object_name)
        if path.stat().st_size > limit:
            raise HTTPException(413, 'Stored image exceeds the media size limit')
        return path.read_bytes()
    @staticmethod
    def exists(object_name):
        object_name = object_key(object_name)
        return SupabaseStorage.exists(object_name) if StorageService.remote() else safe_path(object_name).is_file()
    @staticmethod
    def optimized_image_url(url):
        # New remote uploads are already WebP. Avoid network I/O while
        # serializing whole chapter lists; legacy remote URLs remain valid.
        if StorageService.remote():
            return url
        if url.startswith('/content/') and url.lower().endswith(('.png','.jpg','.jpeg')):
            name = str(Path(url.removeprefix('/content/')).with_suffix('.webp')).replace(chr(92), '/')
            if StorageService.exists(name):
                return '/content/' + name
        return url
    @staticmethod
    def upload_file(bucket_name, object_name, data, content_type='image/webp'):
        data, object_name = validated_media(data, object_name, bucket_name)
        try:
            return StorageService.write_bytes(object_name, data,
                'image/svg+xml' if object_name.endswith('.svg') else 'image/webp')
        except OSError:
            logger.exception('Media write failed')
            raise HTTPException(503, 'Image storage unavailable; upload was not saved')
    @staticmethod
    async def upload_file_async(**kwargs):
        return await asyncio.to_thread(StorageService.upload_file, **kwargs)
    @staticmethod
    def delete_file(bucket_name, object_name):
        if object_name.startswith('/content/'):
            object_name = urlsplit(object_name).path.removeprefix('/content/')
        object_name = object_key(object_name)
        try:
            names = [object_name]
            if Path(object_name).suffix != '.webp':
                names.append(str(Path(object_name).with_suffix('.webp')).replace(chr(92), '/'))
            for name in names:
                if StorageService.remote():
                    SupabaseStorage.delete(name)
                else:
                    safe_path(name).unlink(missing_ok=True)
        except (OSError, HTTPException):
            logger.warning('Unused media cleanup could not complete', exc_info=True)
    @staticmethod
    async def delete_url(url):
        if url and url.startswith('/content/'):
            await asyncio.to_thread(StorageService.delete_file, '', url)


    @staticmethod
    def image_dimensions(url):
        if not url or not url.startswith('/content/'):
            return None
        try:
            content = StorageService.read_bytes(StorageService.optimized_image_url(url).removeprefix('/content/'))
            with Image.open(io.BytesIO(content)) as image:
                if image.width * image.height <= 40_000_000:
                    return image.width, image.height
        except (OSError, ValueError, HTTPException, Image.DecompressionBombError):
            return None
    @staticmethod
    async def image_dimensions_async(url):
        return await asyncio.to_thread(StorageService.image_dimensions, url)
