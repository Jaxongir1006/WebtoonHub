"""Serialize entity writes locally and lock fresh rows in PostgreSQL."""
import asyncio
import inspect
from contextlib import asynccontextmanager, AsyncExitStack
from functools import wraps
from weakref import WeakValueDictionary

from sqlalchemy import select
from app.modules.users.models import User

_locks = WeakValueDictionary()

@asynccontextmanager
async def entity_lock(kind, identifier):
    key = (kind, identifier)
    lock = _locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _locks[key] = lock
    async with lock:
        yield

def serialize_user(function):
    signature = inspect.signature(function)
    @wraps(function)
    async def wrapper(*args, **kwargs):
        arguments = signature.bind(*args, **kwargs).arguments
        user_id = arguments.get('user_id')
        actor = arguments.get('current_user') or arguments.get('user')
        if user_id is None and actor is not None:
            user_id = actor.id
        if user_id is None:
            return await function(*args, **kwargs)
        async with entity_lock('user', user_id):
            return await function(*args, **kwargs)
    return wrapper

async def lock_user(db, user_id):
    return (await db.execute(select(User).where(User.id == user_id).with_for_update()
                            .execution_options(populate_existing=True))).scalar_one_or_none()


def serialize_clan(function):
    signature = inspect.signature(function)
    @wraps(function)
    async def wrapper(*args, **kwargs):
        arguments = signature.bind(*args, **kwargs).arguments
        async with entity_lock('clan', arguments['clan_id']):
            return await function(*args, **kwargs)
    return wrapper


def serialize_wallet_targets(function):
    signature = inspect.signature(function)
    @wraps(function)
    async def wrapper(*args, **kwargs):
        arguments = signature.bind(*args, **kwargs).arguments
        db = arguments['db']
        query = select(User.id).where(User.is_active.is_(True)).order_by(User.id)
        if not arguments.get('all_active_users', True):
            query = query.where(User.id.in_(arguments.get('target_user_ids') or []))
        ids = (await db.execute(query)).scalars().all()
        async with AsyncExitStack() as stack:
            for user_id in ids:
                await stack.enter_async_context(entity_lock('user', user_id))
            return await function(*args, **kwargs)
    return wrapper
