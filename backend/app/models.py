# Import all models to ensure SQLAlchemy's mapper registry is completely populated
from app.modules.users.models import User, UserSession
from app.modules.staff.models import Role, Permission, RolePermission, StaffUser, StaffSession, SystemSetting
from app.modules.creator_requests.models import CreatorRequest
from app.modules.webtoons.models import Genre, Webtoon, WebtoonGenre, Chapter, ChapterImage, ChapterUploadBatch
from app.modules.rewards.models import ReadReward, CoinTransaction
from app.modules.shop.models import ShopItem, UserInventory, UserFeaturedCard
from app.modules.comments.models import Comment
from app.modules.library.models import Bookmark
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin
from app.modules.friends.models import Friendship
from app.modules.clans.models import Clan, ClanMember, ClanLevelConfig, ClanMessage
from app.core.idempotency import OperationReceipt

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
    "ChapterUploadBatch",
    "ChapterImport",
    "ChapterImportPage",
    "ReadingProgress",
    "PasswordReset",
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
    "OperationReceipt",
]

from app.modules.library.progress import ReadingProgress
from app.modules.auth.recovery import PasswordReset
from app.modules.webtoons.import_models import ChapterImport, ChapterImportPage
