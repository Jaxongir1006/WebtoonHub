import fnmatch
import json
import time
from collections import OrderedDict
import redis.asyncio as aioredis
from app.core.config import settings
redis_client = None
_memory_cache = OrderedDict()
MAX_CACHE_ENTRIES = 512
async def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=.2, socket_timeout=.2)
    return redis_client
async def close_redis():
    global redis_client
    if redis_client is not None:
        await redis_client.aclose()
        redis_client = None

def prune():
    now = time.monotonic()
    for key in [k for k, (_, expiry) in _memory_cache.items() if expiry <= now]:
        _memory_cache.pop(key, None)
    while len(_memory_cache) > MAX_CACHE_ENTRIES:
        _memory_cache.popitem(last=False)

class CacheService:
    @staticmethod
    async def get(key):
        try:
            value = await (await get_redis_client()).get(key)
            if value is not None:
                return json.loads(value)
        except Exception:
            pass
        prune()
        if key in _memory_cache:
            value, _ = _memory_cache[key]
            _memory_cache.move_to_end(key)
            return json.loads(value)
        return None
    @staticmethod
    async def set(key, value, expire_seconds=300):
        serialized = json.dumps(value)
        try:
            await (await get_redis_client()).set(key, serialized, ex=expire_seconds)
        except Exception:
            _memory_cache[key] = (serialized, time.monotonic() + expire_seconds)
            _memory_cache.move_to_end(key)
            prune()
    @staticmethod
    async def delete(key):
        _memory_cache.pop(key, None)
        try:
            await (await get_redis_client()).delete(key)
        except Exception:
            pass
    @staticmethod
    async def delete_pattern(pattern):
        for key in list(_memory_cache):
            if fnmatch.fnmatch(key, pattern):
                _memory_cache.pop(key, None)
        try:
            client = await get_redis_client()
            async for key in client.scan_iter(match=pattern, count=100):
                await client.delete(key)
        except Exception:
            pass
