import fnmatch
import json
import socket
import time
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

# Async redis client
redis_client: Optional[aioredis.Redis] = None

# High-performance in-memory cache fallback when Redis is offline
_memory_cache: dict[str, tuple[Any, float]] = {}
_redis_available: Optional[bool] = None
_last_redis_check: float = 0.0


def _check_redis_availability() -> bool:
    global _redis_available, _last_redis_check
    now = time.time()
    # Cache availability status for 30 seconds to prevent opening sockets repeatedly
    if _redis_available is not None and (now - _last_redis_check) < 30.0:
        return _redis_available

    _last_redis_check = now
    try:
        url = settings.REDIS_URL.replace("redis://", "").split("/")[0]
        if ":" in url:
            host, port_str = url.split(":", 1)
            port = int(port_str)
        else:
            host = url
            port = 6379
        with socket.create_connection((host, port), timeout=0.1):
            _redis_available = True
            return True
    except Exception:
        _redis_available = False
        return False


async def get_redis_client() -> Optional[aioredis.Redis]:
    global redis_client
    if not _check_redis_availability():
        return None

    if redis_client is None:
        try:
            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2
            )
        except Exception:
            return None
    return redis_client


async def close_redis() -> None:
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.close()
        except Exception:
            pass
        redis_client = None


class CacheService:
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        if not _check_redis_availability():
            now = time.time()
            if key in _memory_cache:
                val, expire_at = _memory_cache[key]
                if expire_at > now:
                    return val
                del _memory_cache[key]
            return None

        try:
            client = await get_redis_client()
            if not client:
                return None
            val = await client.get(key)
            if val:
                try:
                    return json.loads(val)
                except Exception:
                    return val
            return None
        except Exception:
            return None

    @staticmethod
    async def set(key: str, value: Any, expire_seconds: int = 300) -> None:
        if not _check_redis_availability():
            _memory_cache[key] = (value, time.time() + expire_seconds)
            return

        try:
            client = await get_redis_client()
            if not client:
                _memory_cache[key] = (value, time.time() + expire_seconds)
                return
            serialized = json.dumps(value) if not isinstance(value, str) else value
            await client.set(key, serialized, ex=expire_seconds)
        except Exception:
            _memory_cache[key] = (value, time.time() + expire_seconds)

    @staticmethod
    async def delete(key: str) -> None:
        _memory_cache.pop(key, None)
        if not _check_redis_availability():
            return
        try:
            client = await get_redis_client()
            if client:
                await client.delete(key)
        except Exception:
            pass

    @staticmethod
    async def delete_pattern(pattern: str) -> None:
        to_del = [k for k in _memory_cache if fnmatch.fnmatch(k, pattern)]
        for k in to_del:
            _memory_cache.pop(k, None)

        if not _check_redis_availability():
            return

        try:
            client = await get_redis_client()
            if client:
                keys = await client.keys(pattern)
                if keys:
                    await client.delete(*keys)
        except Exception:
            pass
