from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.media_cleanup import delete_unreferenced_media
from app.modules.clans.models import Clan, ClanLevelConfig, ClanMember
from app.modules.clans.schemas import ClanLevelConfigItem
from app.modules.staff.dependencies import require_any_permission
from app.modules.staff.models import StaffUser, SystemSetting

staff_router = APIRouter(prefix="/staff/clans", tags=["Staff Clan Management"])
clan_permission = require_any_permission("settings:manage", "users:manage", "roles:manage")


class CreationCostUpdatePayload(BaseModel):
    cost: int = Field(..., ge=0, le=100000)


class ClanLevelCreateOrUpdatePayload(BaseModel):
    level: int = Field(..., ge=1, le=100)
    required_xp: int = Field(..., ge=10)
    upgrade_cost_coins: int = Field(..., ge=0)
    max_members: int = Field(..., ge=1, le=1000)
    perks_description: Optional[str] = Field(None, max_length=255)


@staff_router.get("/settings", status_code=status.HTTP_200_OK)
async def get_clan_settings(
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    cost_setting = await db.get(SystemSetting, "clan_creation_cost")
    creation_cost = int(cost_setting.value) if cost_setting and cost_setting.value.isdigit() else 300

    levels_stmt = select(ClanLevelConfig).order_by(ClanLevelConfig.level.asc())
    levels = (await db.execute(levels_stmt)).scalars().all()

    return {
        "success": True,
        "data": {
            "clan_creation_cost": creation_cost,
            "levels": [
                {
                    "level": lvl.level,
                    "required_xp": lvl.required_xp,
                    "upgrade_cost_coins": lvl.upgrade_cost_coins,
                    "max_members": lvl.max_members,
                    "perks_description": lvl.perks_description,
                    "updated_at": lvl.updated_at,
                }
                for lvl in levels
            ],
        },
    }


@staff_router.patch("/settings/cost", status_code=status.HTTP_200_OK)
async def update_clan_creation_cost(
    payload: CreationCostUpdatePayload,
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    setting = await db.get(SystemSetting, "clan_creation_cost")
    if not setting:
        setting = SystemSetting(
            key="clan_creation_cost",
            value=str(payload.cost),
            description="Klan tashkil qilish narxi (Chaqmoq)",
        )
        db.add(setting)
    else:
        setting.value = str(payload.cost)

    await db.commit()
    return {
        "success": True,
        "data": {"clan_creation_cost": payload.cost},
        "message": f"Klan tashkil qilish narxi {payload.cost} ⚡ ga yangilandi",
    }


@staff_router.post("/levels", status_code=status.HTTP_200_OK)
async def save_or_create_level(
    payload: ClanLevelCreateOrUpdatePayload,
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.get(ClanLevelConfig, payload.level)
    if existing:
        existing.required_xp = payload.required_xp
        existing.upgrade_cost_coins = payload.upgrade_cost_coins
        existing.max_members = payload.max_members
        existing.perks_description = payload.perks_description
    else:
        new_lvl = ClanLevelConfig(
            level=payload.level,
            required_xp=payload.required_xp,
            upgrade_cost_coins=payload.upgrade_cost_coins,
            max_members=payload.max_members,
            perks_description=payload.perks_description,
        )
        db.add(new_lvl)

    await db.commit()
    return {
        "success": True,
        "message": f"{payload.level}-daraja talablari muvaffaqiyatli saqlandi",
    }


@staff_router.delete("/levels/{level}", status_code=status.HTTP_200_OK)
async def delete_level(
    level: int,
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    lvl = await db.get(ClanLevelConfig, level)
    if not lvl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daraja sozlamasi topilmadi")

    await db.delete(lvl)
    await db.commit()
    return {"success": True, "message": f"{level}-daraja sozlamasi o'chirildi"}


@staff_router.get("", status_code=status.HTTP_200_OK)
async def list_all_clans_admin(
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clan)
        .options(selectinload(Clan.leader), selectinload(Clan.members))
        .order_by(Clan.level.desc(), Clan.created_at.desc())
    )
    clans = (await db.execute(stmt)).scalars().all()

    items = []
    for c in clans:
        items.append({
            "id": c.id,
            "name": c.name,
            "tag": c.tag,
            "description": c.description,
            "avatar_url": c.avatar_url,
            "banner_url": c.banner_url,
            "level": c.level,
            "xp": c.xp,
            "max_members": c.max_members,
            "member_count": len(c.members),
            "is_recruiting": c.is_recruiting,
            "leader_id": c.leader_id,
            "leader_username": c.leader.username if c.leader else "Boshliq",
            "created_at": c.created_at,
        })

    return {"success": True, "data": items}


@staff_router.delete("/{clan_id}", status_code=status.HTTP_200_OK)
async def delete_clan_admin(
    clan_id: int,
    _staff: StaffUser = Depends(clan_permission),
    db: AsyncSession = Depends(get_db),
):
    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    old_assets = [clan.avatar_url, clan.frame_url, clan.banner_url]
    await db.delete(clan)
    await db.commit()
    for url in old_assets:
        await delete_unreferenced_media(db, url)
    return {"success": True, "message": f"'{clan.name}' klani tizimdan o'chirildi"}
