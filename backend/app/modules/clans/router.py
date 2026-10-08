import json
import asyncio
import uuid
import os
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import decode_token
from app.core.storage import StorageService
from app.core.media_cleanup import delete_unreferenced_media
from app.core.transactions import serialize_user, serialize_clan, lock_user, entity_lock
from app.modules.clans.connection_manager import valid_chat_session
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.clans.connection_manager import clan_ws_manager
from app.modules.clans.models import Clan, ClanLevelConfig, ClanMember, ClanMessage
from app.modules.clans.schemas import (
    ClanCreatePayload,
    ClanDetailResponse,
    ClanMemberItem,
    ClanMessageItem,
    ClanSummaryItem,
    ClanUpdatePayload,
)
from app.modules.rewards.models import CoinTransaction
from app.modules.shop.models import UserInventory, ShopItem
from app.modules.staff.models import SystemSetting
from app.modules.users.models import User

router = APIRouter(prefix="/clans", tags=["Clans"])


class ChatMessageSendPayload(BaseModel):
    client_message_id: Optional[str] = Field(None, min_length=1, max_length=64)
    content: str = Field(..., min_length=1, max_length=500)


class UpgradeIntent(BaseModel):
    expected_cost: int = Field(ge=0)

class RoleChangePayload(BaseModel):
    role: str = Field(..., pattern=r"^(leader|co_leader|elder|member)$")


async def _get_user_frame_svg(db: AsyncSession, user_id: int) -> Optional[str]:
    stmt = (
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(UserInventory.user_id == user_id, UserInventory.is_active.is_(True))
    )
    items = (await db.execute(stmt)).scalars().all()
    for inv in items:
        if inv.item.item_type == "frame":
            return inv.item.asset_url
    return None


@router.get("", status_code=status.HTTP_200_OK)
async def list_clans(
    q: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("level", pattern=r"^(level|members|created_at)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Clan).options(selectinload(Clan.leader))

    if q and q.strip():
        search = f"%{q.strip()}%"
        stmt = stmt.where(or_(Clan.name.ilike(search), Clan.tag.ilike(search)))

    member_count = select(func.count(ClanMember.id)).where(ClanMember.clan_id == Clan.id).correlate(Clan).scalar_subquery()
    if sort == "level":
        stmt = stmt.order_by(Clan.level.desc(), Clan.xp.desc(), Clan.id.desc())
    elif sort == "created_at":
        stmt = stmt.order_by(Clan.created_at.desc(), Clan.id.desc())
    else:
        stmt = stmt.order_by(member_count.desc(), Clan.id.desc())

    total = await db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    clans = (await db.execute(stmt.offset(offset).limit(limit))).scalars().all()
    counts = dict((await db.execute(select(ClanMember.clan_id, func.count(ClanMember.id)).where(ClanMember.clan_id.in_([clan.id for clan in clans])).group_by(ClanMember.clan_id))).all())

    items = []
    for c in clans:
        items.append({
            "id": c.id,
            "name": c.name,
            "tag": c.tag,
            "description": c.description,
            "avatar_url": c.avatar_url,
            "frame_url": c.frame_url,
            "banner_url": c.banner_url,
            "level": c.level,
            "xp": c.xp,
            "member_count": counts.get(c.id, 0),
            "max_members": c.max_members,
            "is_recruiting": c.is_recruiting,
            "leader_id": c.leader_id,
            "leader_username": c.leader.username if c.leader else "Boshliq",
            "created_at": c.created_at,
        })

    return {
        "success": True,
        "data": items,
        "pagination": {"offset": offset, "limit": limit, "total": total, "has_more": offset+len(items) < total},
        "message": "Klanlar ro'yxati muvaffaqiyatli yuklandi",
    }


@router.get("/my-clan", status_code=status.HTTP_200_OK)
async def get_my_clan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ClanMember)
        .options(
            selectinload(ClanMember.clan).selectinload(Clan.leader),
            selectinload(ClanMember.clan).selectinload(Clan.members),
        )
        .where(ClanMember.user_id == current_user.id)
    )
    cm = (await db.execute(stmt)).scalar_one_or_none()
    if not cm or not cm.clan:
        return {"success": True, "data": None}

    clan = cm.clan
    # Get level config
    lvl_cfg = await db.get(ClanLevelConfig, clan.level)
    req_xp = lvl_cfg.required_xp if lvl_cfg else 1000
    up_cost = lvl_cfg.upgrade_cost_coins if lvl_cfg else 500

    next_lvl_cfg = await db.get(ClanLevelConfig, clan.level + 1)

    return {
        "success": True,
        "data": {
            "id": clan.id,
            "name": clan.name,
            "tag": clan.tag,
            "description": clan.description,
            "avatar_url": clan.avatar_url,
            "frame_url": clan.frame_url,
            "banner_url": clan.banner_url,
            "leader_id": clan.leader_id,
            "leader_username": clan.leader.username if clan.leader else "Boshliq",
            "level": clan.level,
            "xp": clan.xp,
            "required_xp": req_xp, "has_next_level": bool(next_lvl_cfg),
            "upgrade_cost_coins": up_cost,
            "can_upgrade": bool(lvl_cfg and next_lvl_cfg and clan.xp >= req_xp and cm.role in {"leader", "co_leader"} and current_user.lightning_coins >= up_cost),
            "next_level_max_members": next_lvl_cfg.max_members if next_lvl_cfg else clan.max_members,
            "next_level_perks": next_lvl_cfg.perks_description if next_lvl_cfg else "Maksimal daraja",
            "max_members": clan.max_members,
            "member_count": len(clan.members),
            "is_recruiting": clan.is_recruiting,
            "my_role": cm.role,
            "created_at": clan.created_at,
        },
    }


@router.get("/{clan_id:int}", status_code=status.HTTP_200_OK)
async def get_clan_detail(
    clan_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clan)
        .options(selectinload(Clan.leader), selectinload(Clan.members))
        .where(Clan.id == clan_id)
    )
    clan = (await db.execute(stmt)).scalar_one_or_none()
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    # My role
    my_role = None
    if current_user:
        for m in clan.members:
            if m.user_id == current_user.id:
                my_role = m.role
                break

    # Level configs
    lvl_cfg = await db.get(ClanLevelConfig, clan.level)
    req_xp = lvl_cfg.required_xp if lvl_cfg else 1000
    up_cost = lvl_cfg.upgrade_cost_coins if lvl_cfg else 500

    next_lvl_cfg = await db.get(ClanLevelConfig, clan.level + 1)

    return {
        "success": True,
        "data": {
            "id": clan.id,
            "name": clan.name,
            "tag": clan.tag,
            "description": clan.description,
            "avatar_url": clan.avatar_url,
            "frame_url": clan.frame_url,
            "banner_url": clan.banner_url,
            "leader_id": clan.leader_id,
            "leader_username": clan.leader.username if clan.leader else "Boshliq",
            "level": clan.level,
            "xp": clan.xp,
            "required_xp": req_xp, "has_next_level": bool(next_lvl_cfg),
            "upgrade_cost_coins": up_cost,
            "can_upgrade": bool(lvl_cfg and next_lvl_cfg and clan.xp >= req_xp and my_role in {"leader", "co_leader"} and current_user and current_user.lightning_coins >= up_cost),
            "next_level_max_members": next_lvl_cfg.max_members if next_lvl_cfg else clan.max_members,
            "next_level_perks": next_lvl_cfg.perks_description if next_lvl_cfg else "Maksimal daraja",
            "max_members": clan.max_members,
            "member_count": len(clan.members),
            "is_recruiting": clan.is_recruiting,
            "my_role": my_role,
            "created_at": clan.created_at,
        },
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@serialize_user
async def create_clan(
    payload: ClanCreatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user = await lock_user(db, current_user.id)
    # 1. Enforce rule: 1 user can only belong to 1 clan
    existing_membership = (
        await db.execute(select(ClanMember).where(ClanMember.user_id == current_user.id))
    ).scalar_one_or_none()
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siz allaqachon klan a'zosisiz! Yangi klan ochish uchun avvalgi klandan chiqishingiz zarur.",
        )

    # 2. Check name and tag uniqueness
    clean_name = payload.name.strip()
    clean_tag = payload.tag.strip().upper()

    name_exists = (
        await db.execute(select(Clan).where(Clan.name == clean_name))
    ).scalar_one_or_none()
    if name_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ushbu nomdagi klan allaqachon mavjud")

    tag_exists = (
        await db.execute(select(Clan).where(Clan.tag == clean_tag))
    ).scalar_one_or_none()
    if tag_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ushbu klan tegi allaqachon band")

    # 3. Fetch creation cost from system settings
    cost_setting = await db.get(SystemSetting, "clan_creation_cost")
    creation_cost = int(cost_setting.value) if cost_setting and cost_setting.value.isdigit() else 300

    if payload.expected_cost != creation_cost:
        raise HTTPException(409, "Clan creation cost changed. Refresh settings and confirm again.")
    # 4. Check user balance
    if current_user.lightning_coins < creation_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Klan tashkil etish uchun {creation_cost} ⚡ talab qilinadi. Sizning balansingizda: {current_user.lightning_coins} ⚡",
        )

    # Deduct coins
    current_user.lightning_coins -= creation_cost
    tx = CoinTransaction(
        user_id=current_user.id,
        amount=-creation_cost,
        transaction_type="clan_create",
        description=f"'{clean_name}' [{clean_tag}] klanini tashkil etish to'lovi",
    )
    db.add(tx)

    # Get level 1 config for max members
    lvl_1 = await db.get(ClanLevelConfig, 1)
    max_members = lvl_1.max_members if lvl_1 else 15

    new_clan = Clan(
        name=clean_name,
        tag=clean_tag,
        description=payload.description or "Yangi klan",
        avatar_url=payload.avatar_url or current_user.avatar_url,
        frame_url=payload.frame_url,
        banner_url=payload.banner_url,
        leader_id=current_user.id,
        level=1,
        xp=0,
        max_members=max_members,
        is_recruiting=True,
    )
    db.add(new_clan)
    await db.flush()

    # Add leader to members
    leader_member = ClanMember(
        clan_id=new_clan.id,
        user_id=current_user.id,
        role="leader",
        contribution_points=creation_cost,
    )
    db.add(leader_member)

    # Welcome system message
    sys_msg = ClanMessage(
        clan_id=new_clan.id,
        user_id=None,
        message_type="system",
        content=f"⚡ {new_clan.name} [{new_clan.tag}] klani tashkil topdi! Barchaga omad!",
    )
    db.add(sys_msg)

    await db.commit()
    await db.refresh(new_clan)

    return {
        "success": True,
        "data": {
            "id": new_clan.id,
            "name": new_clan.name,
            "tag": new_clan.tag, "remaining_coins": current_user.lightning_coins,
        },
        "message": f"'{new_clan.name}' klani muvaffaqiyatli tashkil etildi!",
    }


@router.patch("/{clan_id}", status_code=status.HTTP_200_OK)
async def update_clan(
    clan_id: int,
    payload: ClanUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    # Check leadership
    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()

    if not cm or cm.role not in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat klan yetakchilari tahrirlashi mumkin")

    old_assets = [clan.avatar_url, clan.frame_url, clan.banner_url]
    if payload.description is not None:
        clan.description = payload.description
    if payload.avatar_url is not None:
        clan.avatar_url = payload.avatar_url
    if payload.frame_url is not None:
        clan.frame_url = payload.frame_url if payload.frame_url.strip() else None
    if payload.banner_url is not None:
        clan.banner_url = payload.banner_url
    if payload.is_recruiting is not None:
        clan.is_recruiting = payload.is_recruiting

    await db.commit()
    for url in old_assets:
        await delete_unreferenced_media(db, url)
    return {"success": True, "message": "Klan ma'lumotlari yangilandi"}


@router.post("/{clan_id}/upload-avatar", status_code=status.HTTP_200_OK)
async def upload_clan_avatar(
    clan_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not cm or cm.role not in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat klan yetakchilari logo yuklashi mumkin")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rasm fayli formati noto'g'ri (.png, .jpg, .webp, .svg)")

    content = await file.read(10*1024*1024+1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fayl hajmi 5MB dan oshmasligi kerak")

    filename = f"clan_avatar_{clan_id}_{int(time.time())}{ext}"
    avatar_url = await StorageService.upload_file_async(
        bucket_name="clans",
        object_name=f"avatars/{filename}",
        data=content,
        content_type=file.content_type or "image/png"
    )

    old_asset = clan.avatar_url
    clan.avatar_url = avatar_url
    await db.commit()
    await delete_unreferenced_media(db, old_asset)
    return {"success": True, "avatar_url": avatar_url, "message": "Klan logosi muvaffaqiyatli yangilandi"}


@router.post("/{clan_id}/upload-banner", status_code=status.HTTP_200_OK)
async def upload_clan_banner(
    clan_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not cm or cm.role not in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat klan yetakchilari fon yuklashi mumkin")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rasm fayli formati noto'g'ri (.png, .jpg, .webp, .svg)")

    content = await file.read(10*1024*1024+1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fayl hajmi 10MB dan oshmasligi kerak")

    filename = f"clan_banner_{clan_id}_{int(time.time())}{ext}"
    banner_url = await StorageService.upload_file_async(
        bucket_name="clans",
        object_name=f"backgrounds/{filename}",
        data=content,
        content_type=file.content_type or "image/jpeg"
    )

    old_asset = clan.banner_url
    clan.banner_url = banner_url
    await db.commit()
    await delete_unreferenced_media(db, old_asset)
    return {"success": True, "banner_url": banner_url, "message": "Klan foni muvaffaqiyatli yangilandi"}


@router.post("/{clan_id}/upload-frame", status_code=status.HTTP_200_OK)
async def upload_clan_frame(
    clan_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not cm or cm.role not in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat klan yetakchilari ramka yuklashi mumkin")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".png", ".svg", ".webp"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ramka formati SVG yoki PNG bo'lishi kerak")

    content = await file.read(10*1024*1024+1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fayl hajmi 5MB dan oshmasligi kerak")

    filename = f"clan_frame_{clan_id}_{int(time.time())}{ext}"
    frame_url = await StorageService.upload_file_async(
        bucket_name="clans",
        object_name=f"frames/{filename}",
        data=content,
        content_type="image/svg+xml" if ext == ".svg" else (file.content_type or "image/png")
    )

    old_asset = clan.frame_url
    clan.frame_url = frame_url
    await db.commit()
    await delete_unreferenced_media(db, old_asset)
    return {"success": True, "frame_url": frame_url, "message": "Klan ramkasi muvaffaqiyatli yangilandi"}


@router.post("/{clan_id}/join", status_code=status.HTTP_200_OK)
@serialize_user
@serialize_clan
async def join_clan(
    clan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user = await lock_user(db, current_user.id)
    # Rule: 1 user, 1 clan
    existing = (await db.execute(
        select(ClanMember).where(ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siz allaqachon biror klan a'zosisiz! Avval o'sha klandan chiqing.",
        )

    clan = (await db.execute(
        select(Clan).options(selectinload(Clan.members)).where(Clan.id == clan_id).with_for_update().execution_options(populate_existing=True)
    )).scalar_one_or_none()
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    if not clan.is_recruiting:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ushbu klan hozirda yangi a'zolarni qabul qilmayapti")

    if len(clan.members) >= clan.max_members:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Klandagi a'zolar o'rni to'lgan")

    new_member = ClanMember(
        clan_id=clan.id,
        user_id=current_user.id,
        role="member",
        contribution_points=0,
    )
    db.add(new_member)

    # Post system message
    sys_msg = ClanMessage(
        clan_id=clan.id,
        user_id=None,
        message_type="system",
        content=f"⚡ {current_user.username} klanga qo'shildi!",
    )
    db.add(sys_msg)

    await db.commit()

    # Broadcast via websocket
    await clan_ws_manager.broadcast(clan.id, {
        "id": 0,
        "clan_id": clan.id,
        "user_id": None,
        "username": "WebtoonHub Bot",
        "avatar_url": None,
        "active_frame_svg": None,
        "role": "system",
        "message_type": "system",
        "content": f"⚡ {current_user.username} klanga qo'shildi!",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "message": f"'{clan.name}' klaniga muvaffaqiyatli qo'shildingiz!"}


@router.post("/{clan_id}/leave", status_code=status.HTTP_200_OK)
async def leave_clan(
    clan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()

    if not cm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Siz bu klan a'zosi emassiz")

    if cm.role == "leader":
        # Check member count
        all_members = (await db.execute(
            select(ClanMember).where(ClanMember.clan_id == clan_id)
        )).scalars().all()
        if len(all_members) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Klan yetakchisi klanni tark etishdan oldin yetakchilikni boshqa a'zoga topshirishi shart!",
            )
        else:
            # Last member, delete whole clan
            clan = await db.get(Clan, clan_id)
            old_assets = [clan.avatar_url, clan.frame_url, clan.banner_url] if clan else []
            if clan:
                await db.delete(clan)
            await db.commit()
            await clan_ws_manager.close_member(clan_id, current_user.id)
            for url in old_assets:
                await delete_unreferenced_media(db, url)
            return {"success": True, "message": "Klan tarqatib yuborildi"}

    await clan_ws_manager.close_member(clan_id, current_user.id)
    await db.delete(cm)

    # System message
    sys_msg = ClanMessage(
        clan_id=clan_id,
        user_id=None,
        message_type="system",
        content=f"{current_user.username} klanni tark etdi.",
    )
    db.add(sys_msg)
    await db.commit()

    await clan_ws_manager.broadcast(clan_id, {
        "id": 0,
        "clan_id": clan_id,
        "user_id": None,
        "username": "WebtoonHub Bot",
        "avatar_url": None,
        "active_frame_svg": None,
        "role": "system",
        "message_type": "system",
        "content": f"{current_user.username} klanni tark etdi.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "message": "Klandan chiqdingiz"}


@router.post("/{clan_id}/kick/{target_user_id}", status_code=status.HTTP_200_OK)
async def kick_clan_member(
    clan_id: int,
    target_user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    my_cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()

    if not my_cm or my_cm.role not in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Huquqingiz yetarli emas")

    target_cm = (await db.execute(
        select(ClanMember).options(selectinload(ClanMember.user)).where(ClanMember.clan_id == clan_id, ClanMember.user_id == target_user_id)
    )).scalar_one_or_none()

    if not target_cm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="A'zo topilmadi")

    if target_cm.role == "leader":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Klan yetakchisini haydash mumkin emas")

    if my_cm.role == "co_leader" and target_cm.role in ["leader", "co_leader"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="O'rinbosar boshqa yetakchilarni hayday olmaydi")

    await clan_ws_manager.close_member(clan_id, target_user_id)
    target_username = target_cm.user.username if target_cm.user else f"Foydalanuvchi #{target_user_id}"
    await db.delete(target_cm)

    sys_msg = ClanMessage(
        clan_id=clan_id,
        user_id=None,
        message_type="system",
        content=f"{target_username} klandan chetlatildi.",
    )
    db.add(sys_msg)
    await db.commit()

    await clan_ws_manager.broadcast(clan_id, {
        "id": 0,
        "clan_id": clan_id,
        "user_id": None,
        "username": "WebtoonHub Bot",
        "avatar_url": None,
        "active_frame_svg": None,
        "role": "system",
        "message_type": "system",
        "content": f"{target_username} klandan chetlatildi.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "message": f"{target_username} klandan chetlatildi"}


@router.post("/{clan_id}/upgrade-level", status_code=status.HTTP_200_OK)
@serialize_user
@serialize_clan
async def upgrade_clan_level(
    clan_id: int,
    payload: UpgradeIntent,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Clan Leveling Upgrade:
    Requires:
    1. Clan XP must be 100% full for current level: clan.xp >= level_config.required_xp.
       If clan.xp < level_config.required_xp, strictly prohibit upgrading!
    2. Clan leader / co-leader must pay the required Chaqmoq coins configured for this level.
    """
    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()

    if not cm or cm.role not in ["leader", "co_leader"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat klan yetakchisi yoki o'rinbosari klan darajasini oshirishi mumkin",
        )

    clan = await db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klan topilmadi")

    current_user = await lock_user(db, current_user.id)
    clan = await db.scalar(select(Clan).where(Clan.id == clan_id).with_for_update().execution_options(populate_existing=True))
    # Fetch configuration for current clan level
    lvl_cfg = await db.get(ClanLevelConfig, clan.level)
    if not lvl_cfg or not await db.get(ClanLevelConfig, clan.level + 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Klan maksimal darajaga yetgan yoki daraja sozlamalari mavjud emas",
        )

    # 1. Check XP requirement
    if clan.xp < lvl_cfg.required_xp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Klan XP si hali to'lmagan ({clan.xp}/{lvl_cfg.required_xp} XP). "
                f"Keyingi darajaga o'tish uchun klan a'zolari boblarni o'qib XP ni to'liq yig'ishlari shart!"
            ),
        )

    # 2. Check Chaqmoq coins requirement
    upgrade_fee = lvl_cfg.upgrade_cost_coins
    if payload.expected_cost != upgrade_fee:
        raise HTTPException(409, "Clan upgrade cost changed. Refresh the clan and confirm again.")
    if current_user.lightning_coins < upgrade_fee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Klan darajasini oshirish uchun {upgrade_fee} ⚡ talab qilinadi. "
                f"Sizning balansingizda esa {current_user.lightning_coins} ⚡ mavjud."
            ),
        )

    # Deduct coins from upgrade initiator
    current_user.lightning_coins -= upgrade_fee
    tx = CoinTransaction(
        user_id=current_user.id,
        amount=-upgrade_fee,
        transaction_type="clan_upgrade",
        description=f"'{clan.name}' klanini {clan.level + 1}-darajaga ko'tarish to'lovi",
    )
    db.add(tx)

    # Upgrade clan
    clan.xp = clan.xp - lvl_cfg.required_xp
    clan.level += 1

    # Check next level capacity
    next_cfg = await db.get(ClanLevelConfig, clan.level)
    if next_cfg:
        clan.max_members = next_cfg.max_members

    # Add contribution to leader
    cm.contribution_points += upgrade_fee

    # Broadcast system message
    announcement = f"🎉 DIQQAT: Klan {clan.level}-darajaga muvaffaqiyatli ko'tarildi! Maksimal a'zolar: {clan.max_members} ta!"
    sys_msg = ClanMessage(
        clan_id=clan.id,
        user_id=None,
        message_type="system",
        content=announcement,
    )
    db.add(sys_msg)

    await db.commit()

    await clan_ws_manager.broadcast(clan.id, {
        "id": 0,
        "clan_id": clan.id,
        "user_id": None,
        "username": "WebtoonHub Bot",
        "avatar_url": None,
        "active_frame_svg": None,
        "role": "system",
        "message_type": "system",
        "content": announcement,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "success": True,
        "data": {
            "level": clan.level,
            "xp": clan.xp,
            "max_members": clan.max_members, "remaining_coins": current_user.lightning_coins,
        },
        "message": f"Tabriklaymiz! '{clan.name}' klani {clan.level}-darajaga ko'tarildi!",
    }


@router.get("/{clan_id}/members", status_code=status.HTTP_200_OK)
async def list_clan_members(
    clan_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ClanMember)
        .options(selectinload(ClanMember.user))
        .where(ClanMember.clan_id == clan_id)
        .order_by(
            # leader first, then co_leader, elder, member
            desc(ClanMember.role == "leader"),
            desc(ClanMember.role == "co_leader"),
            desc(ClanMember.role == "elder"),
            ClanMember.contribution_points.desc(),
        )
    )
    members = (await db.execute(stmt)).scalars().all()

    frames = await _batch_frames(db, [member.user_id for member in members])
    items = []
    for m in members:
        user = m.user
        frame_svg = frames.get(user.id) if user else None
        items.append({
            "id": m.id,
            "user_id": user.id if user else 0,
            "username": user.username if user else "Foydalanuvchi",
            "avatar_url": user.avatar_url if user else None,
            "active_frame": {"asset_url": frame_svg} if frame_svg else None,
            "role": m.role,
            "contribution_points": m.contribution_points,
            "joined_at": m.joined_at,
        })

    return {"success": True, "data": items}


@router.get("/{clan_id}/chat/messages", status_code=status.HTTP_200_OK)
async def get_clan_messages(
    clan_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = Query(None, gt=0),
    after_id: Optional[int] = Query(None, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if before_id is not None and after_id is not None:
        raise HTTPException(422, 'Use either before_id or after_id')
    # Verify user is in clan
    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not cm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Siz ushbu klan a'zosi emassiz")

    stmt = (
        select(ClanMessage)
        .options(selectinload(ClanMessage.user))
        .where(ClanMessage.clan_id == clan_id)
        .where(ClanMessage.id < before_id if before_id else True)
        .where(ClanMessage.id > after_id if after_id is not None else True)
        .order_by(ClanMessage.id.asc() if after_id is not None else ClanMessage.id.desc())
        .limit(limit + 1)
    )
    fetched = (await db.execute(stmt)).scalars().all()
    has_more = len(fetched) > limit
    messages = fetched[:limit] if after_id is not None else list(reversed(fetched[:limit]))

    # Build cache of roles and frames for user_ids in this clan
    members_stmt = select(ClanMember).where(ClanMember.clan_id == clan_id)
    clan_members_map = {m.user_id: m.role for m in (await db.execute(members_stmt)).scalars().all()}

    frames = await _batch_frames(db, [msg.user_id for msg in messages if msg.user_id])
    items = []
    for msg in messages:
        user = msg.user
        role = clan_members_map.get(msg.user_id, "member") if msg.user_id else "system"
        frame_svg = frames.get(msg.user_id) if msg.user_id else None

        items.append({
            "id": msg.id,
            "clan_id": msg.clan_id,
            "user_id": msg.user_id,
            "username": user.username if user else "Tizim",
            "avatar_url": user.avatar_url if user else None,
            "active_frame_svg": frame_svg,
            "role": role,
            "message_type": msg.message_type,
            "content": msg.content,
            "created_at": msg.created_at,
        })

    return {"success": True, "data": items, "has_more": has_more,
            "pagination": {"has_more": has_more, "limit": limit},
            "next_after_id": messages[-1].id if messages else after_id}


@router.post("/{clan_id}/chat/send", status_code=status.HTTP_200_OK)
@serialize_user
async def send_clan_message(
    clan_id: int,
    payload: ChatMessageSendPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # A process-local lock cannot deduplicate retries handled by another worker.
    # Lock the author in the transaction before checking the message identity.
    current_user = await lock_user(db, current_user.id)
    if current_user is None or not current_user.is_active:
        raise HTTPException(403, "Chat account is unavailable")
    # Verify membership
    cm = (await db.execute(
        select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id)
    )).scalar_one_or_none()
    if not cm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Siz bu klan a'zosi emassiz")

    if not payload.content.strip():
        raise HTTPException(422, "Message cannot be blank")
    msg = None
    if payload.client_message_id:
        msg = await db.scalar(select(ClanMessage).where(ClanMessage.user_id == current_user.id, ClanMessage.client_message_id == payload.client_message_id))
        if msg and (msg.clan_id != clan_id or msg.content != payload.content.strip()):
            raise HTTPException(409, "Message identifier was already used")
    if msg is None:
        msg = ClanMessage(clan_id=clan_id, user_id=current_user.id, message_type="text", content=payload.content.strip(), client_message_id=payload.client_message_id)
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
    else:
        # Release the author lock before network delivery, including on replay.
        await db.commit()

    frame_svg = await _get_user_frame_svg(db, current_user.id)
    msg_dict = {
        "id": msg.id,
        "clan_id": clan_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "active_frame_svg": frame_svg,
        "role": cm.role,
        "message_type": "text",
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }

    # Broadcast via websocket
    await clan_ws_manager.broadcast(clan_id, msg_dict)

    return {"success": True, "data": msg_dict}


# Read-only live transport; messages persist through REST acknowledgements.
@router.websocket('/{clan_id}/chat/ws')
async def clan_chat_websocket(websocket: WebSocket, clan_id: int, token: Optional[str] = Query(None)):
    claims = decode_token(token) if token else None
    try:
        if not claims or claims.get('type') != 'access' or claims.get('role') != 'user':
            raise ValueError()
        user_id, session_id = int(claims['sub']), uuid.UUID(claims['session_id'])
        async with AsyncSessionLocal() as db:
            if not await valid_chat_session(db, clan_id, user_id, session_id):
                raise ValueError()
    except (ValueError, KeyError, TypeError):
        await websocket.close(code=1008)
        return
    await clan_ws_manager.connect(clan_id, websocket, user_id, session_id)
    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                pass
            async with AsyncSessionLocal() as db:
                if not await valid_chat_session(db, clan_id, user_id, session_id) or claims.get('exp', 0) <= time.time():
                    await clan_ws_manager.close(clan_id, websocket)
                    return
    except WebSocketDisconnect:
        pass
    finally:
        clan_ws_manager.disconnect(clan_id, websocket)

@router.get('/settings')
async def clan_settings(db=Depends(get_db)):
    setting = await db.get(SystemSetting, 'clan_creation_cost')
    cost = int(setting.value) if setting and setting.value.isdigit() else 300
    levels = (await db.execute(select(ClanLevelConfig).order_by(ClanLevelConfig.level))).scalars().all()
    return {'success': True, 'data': {'clan_creation_cost': cost,
        'levels': [{key: getattr(level, key) for key in ['level','required_xp','upgrade_cost_coins','max_members','perks_description']} for level in levels]}}

@router.post('/uploads/{kind}')
async def draft_clan_upload(kind: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if kind not in {'avatar','banner','frame'}:
        raise HTTPException(404, 'Unknown clan image kind')
    extension = 'svg' if (file.filename or '').lower().endswith('.svg') and kind == 'frame' else 'webp'
    content = await file.read(5*1024*1024+1)
    if len(content) > 5*1024*1024:
        raise HTTPException(413, 'Clan appearance image must be at most 5 MB')
    url = await StorageService.upload_file_async(bucket_name='clans', object_name=f'clans/drafts/{current_user.id}/{kind}_{uuid.uuid4().hex}.{extension}',
                                               data=content, content_type=file.content_type)
    return {'success': True, 'data': {'url': url, f'{kind}_url': url}}

@router.patch('/{clan_id}/members/{user_id}/role')
async def change_member_role(clan_id: int, user_id: int, payload: RoleChangePayload, current_user: User = Depends(get_current_user), db=Depends(get_db)):
    async with entity_lock('clan', clan_id):
        clan = await db.scalar(select(Clan).where(Clan.id == clan_id).with_for_update())
        actor = await db.scalar(select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == current_user.id))
        member = await db.scalar(select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == user_id))
        if not clan or not member:
            raise HTTPException(404, 'Clan member not found')
        if not actor or actor.role != 'leader' or actor.user_id == user_id:
            raise HTTPException(403, 'Only the leader may change another member role')
        if payload.role == 'leader':
            actor.role = 'co_leader'
            clan.leader_id = user_id
        member.role = payload.role
        await db.commit()
    return {'success': True, 'data': {'user_id': user_id, 'role': member.role, 'leader_id': clan.leader_id}}


async def _batch_frames(db, ids):
    return dict((await db.execute(select(UserInventory.user_id, ShopItem.asset_url).join(ShopItem).where(UserInventory.user_id.in_(ids), UserInventory.is_active.is_(True), ShopItem.item_type == 'frame'))).all())
