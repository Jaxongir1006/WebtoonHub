from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.clans.models import ClanMember
from app.modules.friends.models import Friendship
from app.modules.friends.schemas import (
    FriendRequestItem,
    FriendRequestsResponse,
    FriendUserSummary,
    SendFriendRequestPayload,
)
from app.modules.shop.models import UserInventory
from app.modules.users.models import User

router = APIRouter(prefix="/friends", tags=["Friends"])


async def _get_user_assets(db: AsyncSession, user_id: int):
    inv_stmt = (
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(UserInventory.user_id == user_id, UserInventory.is_active.is_(True))
    )
    inv_items = (await db.execute(inv_stmt)).scalars().all()
    frame = None
    bg = None
    for inv in inv_items:
        if inv.item.item_type == "frame":
            frame = {"id": inv.item.id, "name": inv.item.name, "asset_url": inv.item.asset_url}
        elif inv.item.item_type == "background":
            bg = {"id": inv.item.id, "name": inv.item.name, "asset_url": inv.item.asset_url}
    return frame, bg


async def _get_user_clan(db: AsyncSession, user_id: int):
    clan_stmt = (
        select(ClanMember)
        .options(selectinload(ClanMember.clan))
        .where(ClanMember.user_id == user_id)
    )
    cm = (await db.execute(clan_stmt)).scalar_one_or_none()
    if cm and cm.clan:
        return {
            "id": cm.clan.id,
            "name": cm.clan.name,
            "tag": cm.clan.tag,
            "avatar_url": cm.clan.avatar_url,
            "level": cm.clan.level,
            "role": cm.role,
        }
    return None


@router.get("", status_code=status.HTTP_200_OK)
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Find all accepted friendships where current_user is user_id or friend_id
    stmt = (
        select(Friendship)
        .options(selectinload(Friendship.user), selectinload(Friendship.friend))
        .where(
            or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id),
            Friendship.status == "accepted",
        )
        .order_by(Friendship.updated_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()

    friends_data = []
    for f in rows:
        target = f.friend if f.user_id == current_user.id else f.user
        frame, bg = await _get_user_assets(db, target.id)
        clan = await _get_user_clan(db, target.id)
        friends_data.append({
            "id": target.id,
            "username": target.username,
            "avatar_url": target.avatar_url,
            "bio": target.bio,
            "active_frame": frame,
            "active_background": bg,
            "clan": clan,
            "friendship_id": f.id,
            "friends_since": f.updated_at or f.created_at,
        })

    return {
        "success": True,
        "data": friends_data,
        "message": "Do'stlar ro'yxati muvaffaqiyatli yuklandi",
    }


@router.get("/requests", status_code=status.HTTP_200_OK)
async def list_friend_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Incoming: friend_id == current_user.id
    in_stmt = (
        select(Friendship)
        .options(selectinload(Friendship.user))
        .where(Friendship.friend_id == current_user.id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
    )
    in_rows = (await db.execute(in_stmt)).scalars().all()

    # Outgoing: user_id == current_user.id
    out_stmt = (
        select(Friendship)
        .options(selectinload(Friendship.friend))
        .where(Friendship.user_id == current_user.id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
    )
    out_rows = (await db.execute(out_stmt)).scalars().all()

    incoming = []
    for r in in_rows:
        frame, _ = await _get_user_assets(db, r.user.id)
        clan = await _get_user_clan(db, r.user.id)
        incoming.append({
            "id": r.id,
            "sender_id": r.user.id,
            "receiver_id": current_user.id,
            "username": r.user.username,
            "avatar_url": r.user.avatar_url,
            "active_frame": frame,
            "clan_tag": clan["tag"] if clan else None,
            "created_at": r.created_at,
        })

    outgoing = []
    for r in out_rows:
        frame, _ = await _get_user_assets(db, r.friend.id)
        clan = await _get_user_clan(db, r.friend.id)
        outgoing.append({
            "id": r.id,
            "sender_id": current_user.id,
            "receiver_id": r.friend.id,
            "username": r.friend.username,
            "avatar_url": r.friend.avatar_url,
            "active_frame": frame,
            "clan_tag": clan["tag"] if clan else None,
            "created_at": r.created_at,
        })

    return {
        "success": True,
        "data": {
            "incoming": incoming,
            "outgoing": outgoing,
        },
    }


@router.post("/request", status_code=status.HTTP_200_OK)
async def send_friend_request(
    payload: SendFriendRequestPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_user = None
    if payload.user_id:
        target_user = await db.get(User, payload.user_id)
    elif payload.username:
        u_stmt = select(User).where(User.username == payload.username.strip())
        target_user = (await db.execute(u_stmt)).scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foydalanuvchi topilmadi",
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O'zingizga do'stlik so'rovi yubora olmaysiz",
        )

    # Check existing friendship
    f_stmt = select(Friendship).where(
        or_(
            (Friendship.user_id == current_user.id) & (Friendship.friend_id == target_user.id),
            (Friendship.user_id == target_user.id) & (Friendship.friend_id == current_user.id),
        )
    )
    existing = (await db.execute(f_stmt)).scalar_one_or_none()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Siz allaqachon do'st bo'lgansiz",
            )
        if existing.status == "pending":
            if existing.user_id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Do'stlik so'rovi allaqachon yuborilgan",
                )
            else:
                # Target user already sent request to me! Accept it automatically
                existing.status = "accepted"
                await db.commit()
                return {
                    "success": True,
                    "data": {"friendship_id": existing.id, "status": "accepted"},
                    "message": f"Ushbu foydalanuvchi sizga so'rov yuborgan edi, do'stlik qabul qilindi!",
                }
        elif existing.status == "rejected":
            # Re-open pending
            existing.user_id = current_user.id
            existing.friend_id = target_user.id
            existing.status = "pending"
            await db.commit()
            return {
                "success": True,
                "data": {"friendship_id": existing.id, "status": "pending"},
                "message": "Do'stlik so'rovi yuborildi",
            }

    # Create new request
    new_req = Friendship(
        user_id=current_user.id,
        friend_id=target_user.id,
        status="pending",
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)

    return {
        "success": True,
        "data": {"friendship_id": new_req.id, "status": "pending"},
        "message": f"{target_user.username} ga do'stlik so'rovi yuborildi",
    }


@router.post("/requests/{request_id}/accept", status_code=status.HTTP_200_OK)
async def accept_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Friendship).where(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending",
    )
    f_row = (await db.execute(stmt)).scalar_one_or_none()
    if not f_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Do'stlik so'rovi topilmadi",
        )

    f_row.status = "accepted"
    await db.commit()

    return {
        "success": True,
        "data": {"friendship_id": f_row.id, "status": "accepted"},
        "message": "Do'stlik so'rovi qabul qilindi",
    }


@router.post("/requests/{request_id}/reject", status_code=status.HTTP_200_OK)
async def reject_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Friendship).where(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending",
    )
    f_row = (await db.execute(stmt)).scalar_one_or_none()
    if not f_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Do'stlik so'rovi topilmadi",
        )

    await db.delete(f_row)
    await db.commit()

    return {
        "success": True,
        "data": None,
        "message": "Do'stlik so'rovi rad etildi",
    }


@router.delete("/{target_user_or_friendship_id}", status_code=status.HTTP_200_OK)
async def remove_friend(
    target_user_or_friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Try finding by friendship ID first
    f_stmt = select(Friendship).where(
        Friendship.id == target_user_or_friendship_id,
        or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id),
    )
    f_row = (await db.execute(f_stmt)).scalar_one_or_none()

    # If not found by friendship ID, try by target user ID
    if not f_row:
        f_stmt = select(Friendship).where(
            or_(
                (Friendship.user_id == current_user.id) & (Friendship.friend_id == target_user_or_friendship_id),
                (Friendship.user_id == target_user_or_friendship_id) & (Friendship.friend_id == current_user.id),
            )
        )
        f_row = (await db.execute(f_stmt)).scalar_one_or_none()

    if not f_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Do'stlik aloqasi topilmadi",
        )

    await db.delete(f_row)
    await db.commit()

    return {
        "success": True,
        "data": None,
        "message": "Do'stlik o'chirildi",
    }


@router.get("/search", status_code=status.HTTP_200_OK)
async def search_users(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(User)
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.username.ilike(f"%{q.strip()}%"),
        )
        .limit(15)
    )
    users = (await db.execute(stmt)).scalars().all()

    results = []
    for u in users:
        frame, _ = await _get_user_assets(db, u.id)
        clan = await _get_user_clan(db, u.id)

        # Check friendship
        f_stmt = select(Friendship).where(
            or_(
                (Friendship.user_id == current_user.id) & (Friendship.friend_id == u.id),
                (Friendship.user_id == u.id) & (Friendship.friend_id == current_user.id),
            )
        )
        f_row = (await db.execute(f_stmt)).scalar_one_or_none()
        friendship_status = "none"
        friendship_id = None
        if f_row:
            friendship_id = f_row.id
            if f_row.status == "accepted":
                friendship_status = "friends"
            elif f_row.status == "pending":
                friendship_status = "pending_sent" if f_row.user_id == current_user.id else "pending_received"

        results.append({
            "id": u.id,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "active_frame": frame,
            "clan": clan,
            "friendship": {
                "status": friendship_status,
                "friendship_id": friendship_id,
            },
        })

    return {
        "success": True,
        "data": results,
    }
