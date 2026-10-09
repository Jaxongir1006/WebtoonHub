"""Lock linked pools before card rows, matching draw/configuration lock order."""
from sqlalchemy import select
from app.modules.gacha.models import GachaPool, GachaPoolCard


async def lock_card_pools(db, item_id):
    return (await db.scalars(select(GachaPool).join(GachaPoolCard, GachaPoolCard.pool_id == GachaPool.id)
        .where(GachaPoolCard.item_id == item_id).order_by(GachaPool.id)
        .with_for_update(of=GachaPool).execution_options(populate_existing=True))).all()
