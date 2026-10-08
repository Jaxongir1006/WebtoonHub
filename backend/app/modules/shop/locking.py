"""SQLite has one writer; coordinate shop/wheel ownership with staff edits."""
import inspect
from functools import wraps
from app.core.transactions import entity_lock


def serialize_shop_catalog(function):
    signature = inspect.signature(function)
    @wraps(function)
    async def wrapper(*args, **kwargs):
        db = signature.bind(*args, **kwargs).arguments['db']
        if db.bind.dialect.name == 'sqlite':
            async with entity_lock('shop-catalog', 0):
                return await function(*args, **kwargs)
        return await function(*args, **kwargs)
    return wrapper
