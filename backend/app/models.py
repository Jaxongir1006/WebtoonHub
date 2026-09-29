# Import all models to ensure SQLAlchemy's mapper registry is completely populated
from app.modules.users.models import User, UserSession
from app.modules.staff.models import Role, Permission, RolePermission, StaffUser, StaffSession, SystemSetting
from app.modules.creator_requests.models import CreatorRequest
from app.modules.webtoons.models import Genre, Webtoon, WebtoonGenre, Chapter, ChapterImage
from app.modules.rewards.models import ReadReward, CoinTransaction
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.comments.models import Comment
from app.modules.library.models import Bookmark
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin
from app.modules.friends.models import Friendship
from app.modules.clans.models import Clan, ClanMember, ClanLevelConfig, ClanMessage

__all__ = [
    "User",
    "UserSession",
    "Role",
    "Permission",
    "RolePermission",
    "StaffUser",
    "StaffSession",
    "SystemSetting",
    "CreatorRequest",
    "Genre",
    "Webtoon",
    "WebtoonGenre",
    "Chapter",
    "ChapterImage",
    "ReadReward",
    "CoinTransaction",
    "ShopItem",
    "UserInventory",
    "Comment",
    "Bookmark",
    "Wheel",
    "WheelItem",
    "WheelSpin",
    "Friendship",
    "Clan",
    "ClanMember",
    "ClanLevelConfig",
    "ClanMessage",
]
