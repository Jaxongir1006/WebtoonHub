"""Remove local files only after all persistent references have disappeared."""
from sqlalchemy import select, or_
from app.core.storage import StorageService

async def delete_unreferenced_media(db, url):
    if not url or not url.startswith('/content/'):
        return
    from app.modules.users.models import User
    from app.modules.webtoons.models import Webtoon, ChapterImage
    from app.modules.shop.models import ShopItem
    from app.modules.clans.models import Clan
    from app.modules.gacha.models import GachaRoll
    queries = [select(User.id).where(User.avatar_url == url), select(Webtoon.id).where(Webtoon.cover_image_url == url),
               select(ChapterImage.id).where(ChapterImage.image_url == url), select(ShopItem.id).where(or_(ShopItem.asset_url == url, ShopItem.asset_preview_url == url)),
               select(Clan.id).where(or_(Clan.avatar_url == url, Clan.banner_url == url, Clan.frame_url == url)),
               select(GachaRoll.id).where(or_(GachaRoll.card_snapshot['asset_url'].as_string() == url,
                   GachaRoll.card_snapshot['asset_preview_url'].as_string() == url))]
    for query in queries:
        if await db.scalar(query.limit(1)):
            return
    await StorageService.delete_url(url)
