"""Coordinate reward catalogs and acquisition with staff edits in one lock order."""
import inspect
from functools import wraps
from sqlalchemy import text
from app.core.transactions import entity_lock, lock_user


def serialize_shop_catalog(function):
    signature = inspect.signature(function)
    @wraps(function)
    async def wrapper(*args, **kwargs):
        arguments = signature.bind(*args, **kwargs).arguments
        db = arguments['db']
        # Acquisitions must lock their wallet before the catalog advisory lock.
        # Clan acquisition also locks its clan before entering this decorator.
        # Staff edits have no wallet, so cannot form the reverse dependency.
        if arguments.get('user_id') is not None:
            await lock_user(db, arguments['user_id'])
        if db.bind.dialect.name == 'sqlite':
            async with entity_lock('shop-catalog', 0):
                return await function(*args, **kwargs)
        if db.bind.dialect.name == 'postgresql':
            # A pool membership can be added while a card editor waits for its
            # row. Serialize before any pool/card row lock so linked versions
            # cannot miss that membership. The transaction releases this lock.
            await db.execute(text('SELECT pg_advisory_xact_lock(1464353859)'))
        return await function(*args, **kwargs)
    return wrapper
