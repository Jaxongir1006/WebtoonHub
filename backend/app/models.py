# Import all models to ensure SQLAlchemy's mapper registry is completely populated
from app.modules.users.models import User, UserSession
from app.modules.staff.models import Role, Permission, RolePermission, StaffUser, StaffSession
from app.modules.creator_requests.models import CreatorRequest
from app.modules.webtoons.models import Genre, Webtoon, WebtoonGenre, Chapter, ChapterImage
from app.modules.rewards.models import ReadReward
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.comments.models import Comment
from app.modules.library.models import Bookmark

__all__ = [
    "User",
    "UserSession",
    "Role",
    "Permission",
    "RolePermission",
    "StaffUser",
    "StaffSession",
    "CreatorRequest",
    "Genre",
    "Webtoon",
    "WebtoonGenre",
    "Chapter",
    "ChapterImage",
    "ReadReward",
    "ShopItem",
    "UserInventory",
    "Comment",
    "Bookmark",
]
