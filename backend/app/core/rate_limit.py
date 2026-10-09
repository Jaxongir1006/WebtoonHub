"""Distributed fixed-window limits, with a bounded local fallback during Redis outages."""
import hashlib
import time
from collections import OrderedDict
from fastapi.responses import JSONResponse
from app.core.redis import get_redis_client
from app.core.config import settings

_buckets = OrderedDict()

def policy(path, method):
    if method not in {'POST','PUT','PATCH','DELETE'}:
        return None
    if '/auth/login' in path or '/auth/refresh' in path:
        return 'auth', settings.AUTH_RATE_LIMIT, 300
    if '/auth/register' in path or '/password/forgot' in path or '/password/reset' in path:
        return 'recovery', 10, 3600
    if '/chat/send' in path:
        return 'chat', 120, 60
    if path.startswith('/api/v1/gacha/pools/') and path.endswith('/roll'):
        return 'gacha_roll', 30, 60
    if '/comments' in path or '/friends/request' in path:
        return 'social', 60, 60
    if '/staff/chapter-imports/' in path and '/pages/' in path:
        return 'import_pages', 240, 60
    if '/staff/chapter-imports' in path:
        return 'import_operations', 30, 60
    if '/staff/shop/items/upload-asset' in path:
        return 'shop_assets', 30, 60
    if '/uploads/' in path or '/avatar' in path or '/staff/chapters' in path or '/staff/webtoons' in path:
        return 'uploads', 30, 60
    return None

async def enforce_rate_limit(request, call_next):
    entry = policy(request.url.path, request.method)
    if entry:
        scope, maximum, seconds = entry
        now = int(time.time())
        window = now // seconds
        client = request.client.host if request.client else 'unknown'
        digest = hashlib.sha256(client.encode()).hexdigest()[:24]
        key = f'limit:{scope}:{digest}:{window}'
        count = None
        try:
            redis = await get_redis_client()
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, seconds + 1)
        except Exception:
            for old_key, (_, expires) in list(_buckets.items()):
                if expires <= now:
                    _buckets.pop(old_key, None)
            count = _buckets.get(key, (0, 0))[0] + 1
            _buckets[key] = (count, (window + 1) * seconds)
            _buckets.move_to_end(key)
            while len(_buckets) > 10000:
                _buckets.popitem(last=False)
        if count > maximum:
            retry = (window + 1) * seconds - now
            return JSONResponse(status_code=429, headers={'Retry-After': str(retry)}, content={
                'success': False, 'error': {'code': 'RATE_LIMITED', 'message': 'Too many requests. Try again shortly.'}})
    return await call_next(request)
