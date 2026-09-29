import asyncio
import logging
from app.core.database import engine, Base

import app.models
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Create all tables asynchronously in PostgreSQL and ensure columns exist"""
    async with engine.begin() as conn:
        logger.info("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        # Ensure new columns exist in PostgreSQL
        if not engine.url.drivername.startswith("sqlite"):
            await conn.execute(text("ALTER TABLE creator_requests ADD COLUMN IF NOT EXISTS admin_feedback TEXT;"))
            await conn.execute(text("ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'manhwa';"))
            await conn.execute(text("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content_text TEXT;"))
        logger.info("All tables and columns created successfully!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
