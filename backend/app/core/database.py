from typing import AsyncGenerator
from sqlalchemy import BigInteger, Integer
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

from sqlalchemy import BigInteger, Integer, event

# Universal BigInt primary key supporting PostgreSQL BigSerial and SQLite AutoIncrement
BigIntId = BigInteger().with_variant(Integer, "sqlite")

# Create async engine for PostgreSQL or SQLite
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
if not is_sqlite and settings.DATABASE_SSL_REQUIRE:
    connect_args['ssl'] = 'require'

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    hide_parameters=True,
    future=True,
    connect_args=connect_args,
    **({} if is_sqlite else {"pool_size": settings.DATABASE_POOL_SIZE,
                           "max_overflow": settings.DATABASE_MAX_OVERFLOW,
                           "pool_pre_ping": True, "pool_recycle": 1800})
)

if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

# Async session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


# Base model
class Base(DeclarativeBase):
    pass


# Dependency to yield async database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
