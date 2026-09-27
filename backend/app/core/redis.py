import json
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

# Async redis client
redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def close_redis() -> None:
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None


class CacheService:
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        client = await get_redis_client()
        val = await client.get(key)
        if val:
            try:
                return json.loads(val)
            except Exception:
                return val
        return None

    @staticmethod
    async def set(key: str, value: Any, expire_seconds: int = 300) -> None:
        client = await get_redis_client()
        serialized = json.dumps(value) if not isinstance(value, str) else value
        await client.set(key, serialized, ex=expire_seconds)

    @staticmethod
    async def delete(key: str) -> None:
        client = await get_redis_client()
        await client.delete(key)

    @staticmethod
    async def delete_pattern(pattern: str) -> None:
        client = await get_redis_client()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
