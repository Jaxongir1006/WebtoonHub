"""Supabase private object storage. Credentials never enter saved media URLs."""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException
from app.core.config import settings

MAX_OBJECT_BYTES = 50 * 1024 * 1024


def object_key(name):
    name = str(name).replace(chr(92), '/')
    if (not name or len(name) > 1024 or any(part in {'', '.', '..'} for part in name.split('/'))
            or any(ord(char) < 32 for char in name) or '?' in name or '#' in name):
        raise HTTPException(400, 'Invalid media path')
    return name


class SupabaseStorage:
    @staticmethod
    def request(method, path, data=None, content_type='application/json', limit=MAX_OBJECT_BYTES):
        base = settings.SUPABASE_URL.rstrip('/') + '/storage/v1'
        headers = {'apikey': settings.SUPABASE_SECRET_KEY.get_secret_value(),
                   'Content-Type': content_type, 'User-Agent': 'WebtoonHub-backend/1.0'}
        request = Request(base + path, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=10) as response:
                content = response.read(limit + 1)
            if len(content) > limit:
                raise HTTPException(413, 'Stored image exceeds the media size limit')
            return content
        except HTTPError as exc:
            # Do not log request headers, response bodies or signed tokens.
            error_code, status_code = None, None
            try:
                error = json.loads(exc.read(65536))
                if isinstance(error, dict):
                    error_code = error.get('code') or error.get('error')
                    status_code = str(error.get('statusCode', ''))
            except (ValueError, OSError):
                pass
            # Storage can report a missing object as HTTP 400 with a 404
            # statusCode, or the NoSuchKey/not_found storage error code.
            if exc.code == 404 or (exc.code == 400 and (status_code == '404' or error_code in {'NoSuchKey', 'not_found'})):
                raise HTTPException(404, 'Image not found') from None
            raise HTTPException(503, 'Image storage is unavailable; retry shortly') from None
        except (URLError, OSError, TimeoutError):
            raise HTTPException(503, 'Image storage is unavailable; retry shortly') from None

    @staticmethod
    def bucket(private=False):
        return settings.STORAGE_BUCKET_IMPORTS if private else settings.STORAGE_BUCKET_MEDIA

    @classmethod
    def path(cls, name, private=False):
        return quote(cls.bucket(private), safe='') + '/' + quote(object_key(name), safe='/')

    @classmethod
    def write(cls, name, data, content_type='image/webp', private=False):
        if not data or len(data) > MAX_OBJECT_BYTES:
            raise HTTPException(413, 'Stored image must be nonempty and at most 50 MiB')
        cls.request('POST', '/object/' + cls.path(name, private), data, content_type)

    @classmethod
    def read(cls, name, private=False, limit=MAX_OBJECT_BYTES):
        return cls.request('GET', '/object/authenticated/' + cls.path(name, private), limit=limit)

    @classmethod
    def exists(cls, name, private=False):
        try:
            cls.request('GET', '/object/info/' + cls.path(name, private), limit=65536)
            return True
        except HTTPException as exc:
            if exc.status_code == 404:
                return False
            raise

    @classmethod
    def delete(cls, name, private=False):
        payload = json.dumps({'prefixes': [object_key(name)]}).encode()
        cls.request('DELETE', '/object/' + quote(cls.bucket(private), safe=''), payload, limit=65536)

    @classmethod
    def signed_url(cls, name):
        payload = json.dumps({'expiresIn': settings.STORAGE_SIGNED_URL_SECONDS}).encode()
        result = json.loads(cls.request('POST', '/object/sign/' + cls.path(name), payload, limit=65536))
        path = result.get('signedURL') or result.get('signedUrl')
        if not isinstance(path, str) or not path.startswith('/object/sign/'):
            raise HTTPException(503, 'Image storage returned an invalid download link')
        return settings.SUPABASE_URL.rstrip('/') + '/storage/v1' + path

    @classmethod
    def list_files(cls, prefix='', private=False):
        if prefix:
            object_key(prefix.rstrip('/'))
        files, directories = [], [prefix.rstrip('/')]
        while directories:
            directory = directories.pop()
            offset = 0
            while True:
                payload = json.dumps({'prefix': directory, 'limit': 100, 'offset': offset,
                                      'sortBy': {'column': 'name', 'order': 'asc'}}).encode()
                entries = json.loads(cls.request('POST', '/object/list/' + quote(cls.bucket(private), safe=''),
                                                 payload, limit=1024*1024))
                if not isinstance(entries, list):
                    raise HTTPException(503, 'Image storage returned an invalid file listing')
                for entry in entries:
                    name = entry.get('name', '')
                    if '/' in name or chr(92) in name:
                        raise HTTPException(503, 'Image storage returned an invalid object name')
                    key = object_key(directory + '/' + name if directory else name)
                    if entry.get('id') is None:
                        directories.append(key)
                    else:
                        files.append({**entry, 'name': key})
                if len(entries) < 100:
                    break
                offset += len(entries)
        return files

    @classmethod
    def ready(cls):
        buckets = json.loads(cls.request('GET', '/bucket', limit=65536))
        selected = {b['id']: b for b in buckets if b.get('id') in {cls.bucket(), cls.bucket(True)}}
        return len(selected) == 2 and all(b.get('public') is False for b in selected.values())
