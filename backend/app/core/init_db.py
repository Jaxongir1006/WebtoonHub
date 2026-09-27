import asyncio
import logging
from app.core.database import engine, Base

# Import all models to ensure they are registered with Base.metadata
from app.modules.users.models import User, UserSession
from app.modules.staff.models import Role, Permission, RolePermission, StaffUser, StaffSession
from app.modules.creator_requests.models import CreatorRequest
from app.modules.webtoons.models import Genre, Webtoon, WebtoonGenre, Chapter, ChapterImage
from app.modules.rewards.models import ReadReward
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.comments.models import Comment
from app.modules.library.models import Bookmark

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Create all tables asynchronously in PostgreSQL"""
    async with engine.begin() as conn:
        logger.info("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("All tables created successfully!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
