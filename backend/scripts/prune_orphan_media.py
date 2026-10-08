"""Review stale server-generated orphan media; deletion requires explicit --apply."""
import argparse
import asyncio
import time
import re
from pathlib import Path
from sqlalchemy import select
import app.models
from app.core.database import AsyncSessionLocal
from app.core.storage import CONTENT_ROOT
from app.core.media_cleanup import delete_unreferenced_media
from app.modules.users.models import User
from app.modules.webtoons.models import Webtoon, ChapterImage
from app.modules.shop.models import ShopItem
from app.modules.clans.models import Clan

async def run(apply=False, days=7):
    cutoff = time.time() - days*86400
    root = CONTENT_ROOT.resolve()
    async with AsyncSessionLocal() as db:
        references = set()
        columns = [User.avatar_url, Webtoon.cover_image_url, ChapterImage.image_url, ShopItem.asset_url, ShopItem.asset_preview_url, Clan.avatar_url, Clan.banner_url, Clan.frame_url]
        for column in columns:
            references.update(url.split('?')[0] for url in (await db.execute(select(column).where(column.isnot(None)))).scalars() if url and url.startswith('/content/'))
        # Preserve optimized siblings of retained legacy raster images.
        references.update(str(Path(url).with_suffix('.webp')).replace(chr(92), '/') for url in list(references) if url.lower().endswith(('.png','.jpg','.jpeg')))
        candidates = []
        for path in root.rglob('*'):
            resolved = path.resolve()
            if not resolved.is_relative_to(root) or not path.is_file() or path.stat().st_mtime >= cutoff:
                continue
            relative = path.relative_to(root)
            parts = relative.parts
            generated = (len(parts)==1 and re.fullmatch(r'.+_[a-f0-9]{8}\.webp',path.name)) or (len(parts)>2 and parts[0].isdigit() and parts[1].isdigit()) or (parts[0]=='avatars' and path.name.startswith('avatar_')) or (len(parts)>2 and parts[:2]==('clans','drafts')) or (parts[0] in {'frames','backgrounds','cards'} and path.name.startswith('asset_'))
            url='/content/'+relative.as_posix()
            if generated and url not in references:
                candidates.append(url)
        print('Candidate stale generated files:',len(candidates))
        for url in candidates:
            print(url)
            if apply:
                await delete_unreferenced_media(db,url)
        print('Deletion requested' if apply else 'Dry run only; review candidates before --apply')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--older-than-days',type=int,default=7)
    args=parser.parse_args()
    if args.older_than_days<1: parser.error('Retain at least one day before cleanup')
    asyncio.run(run(args.apply,args.older_than_days))

if __name__=='__main__': main()
