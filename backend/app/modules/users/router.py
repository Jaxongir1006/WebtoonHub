import os
import shutil
import time
import uuid
import re
from app.core.storage import StorageService
from app.core.media_cleanup import delete_unreferenced_media
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.clans.models import ClanMember
from app.modules.comments.models import Comment
from app.modules.friends.models import Friendship
from app.modules.library.models import Bookmark
from app.modules.rewards.models import ReadReward
from app.modules.shop.models import UserInventory
from app.modules.users.models import User

router = APIRouter(prefix="/users", tags=["Users & Public Profiles"])

ALLOWED_AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


class UserProfileUpdatePayload(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")


@router.post("/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat rasm formatidagi fayllar qabul qilinadi (.png, .jpg, .jpeg, .webp, .gif)",
        )

    # Read content & size validation
    content = await file.read(MAX_AVATAR_SIZE + 1)
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar hajmi 5MB dan oshmasligi kerak",
        )

    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex}{ext}"
    avatar_url = await StorageService.upload_file_async(bucket_name='avatars', object_name=f'avatars/{filename}', data=content)
    old_avatar = current_user.avatar_url
    current_user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(current_user)
    await delete_unreferenced_media(db, old_avatar)

    return {
        "success": True,
        "data": {
            "avatar_url": avatar_url,
        },
        "message": "Avatar muvaffaqiyatli yangilandi",
    }


@router.patch("/profile", status_code=status.HTTP_200_OK)
async def update_my_profile(
    payload: UserProfileUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.username and payload.username != current_user.username:
        # Check uniqueness
        stmt = select(User).where(User.username == payload.username)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu taxallus (username) band, boshqasini tanlang",
            )
        current_user.username = payload.username

    old_avatar = current_user.avatar_url
    if payload.avatar_url is not None:
        if payload.avatar_url != current_user.avatar_url and not re.fullmatch(rf'/content/avatars/avatar_{current_user.id}_[a-f0-9]{{32}}\.webp', payload.avatar_url):
            raise HTTPException(422, 'Use an avatar uploaded for this account')
        import asyncio
        if not await asyncio.to_thread(StorageService.exists, payload.avatar_url.removeprefix("/content/")):
            raise HTTPException(422, "Avatar draft no longer exists")
        current_user.avatar_url = payload.avatar_url
    if payload.bio is not None:
        current_user.bio = payload.bio

    await db.commit()
    await db.refresh(current_user)
    if old_avatar != current_user.avatar_url:
        await delete_unreferenced_media(db, old_avatar)

    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "username": current_user.username,
            "bio": current_user.bio,
            "avatar_url": current_user.avatar_url,
        },
        "message": "Profil ma'lumotlari muvaffaqiyatli saqlandi",
    }


@router.get("/{identifier}/public-profile", status_code=status.HTTP_200_OK)
async def get_public_profile(
    identifier: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    # Exact usernames have priority over numeric legacy ID links
    stmt = select(User).where(User.username == identifier)
    target_user = (await db.execute(stmt)).scalar_one_or_none()
    if not target_user and identifier.isdigit():
        target_user = await db.get(User, int(identifier))

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foydalanuvchi topilmadi",
        )

    # 1. Active equipped frame and background
    inv_stmt = (
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(UserInventory.user_id == target_user.id, UserInventory.is_active.is_(True))
    )
    inv_items = (await db.execute(inv_stmt)).scalars().all()

    active_frame = None
    active_background = None
    for inv in inv_items:
        if inv.item.item_type == "frame":
            active_frame = {
                "id": inv.item.id,
                "name": inv.item.name,
                "asset_url": inv.item.asset_url,
            }
        elif inv.item.item_type == "background":
            active_background = {
                "id": inv.item.id,
                "name": inv.item.name,
                "asset_url": inv.item.asset_url,
                "asset_preview_url": inv.item.asset_preview_url or inv.item.asset_url,
                "asset_animated": inv.item.asset_animated,
            }

    # 2. Clan membership
    clan_stmt = (
        select(ClanMember)
        .options(selectinload(ClanMember.clan))
        .where(ClanMember.user_id == target_user.id)
    )
    clan_member = (await db.execute(clan_stmt)).scalar_one_or_none()
    clan_info = None
    clan_contribution = 0
    if clan_member and clan_member.clan:
        clan_contribution = clan_member.contribution_points
        clan_info = {
            "id": clan_member.clan.id,
            "name": clan_member.clan.name,
            "tag": clan_member.clan.tag,
            "avatar_url": clan_member.clan.avatar_url,
            "banner_url": clan_member.clan.banner_url,
            "level": clan_member.clan.level,
            "role": clan_member.role,
        }

    # 3. User Statistics
    bookmarks_count = (await db.execute(
        select(func.count(Bookmark.id)).where(Bookmark.user_id == target_user.id)
    )).scalar() or 0

    read_count = (await db.execute(
        select(func.count(ReadReward.id)).where(ReadReward.user_id == target_user.id)
    )).scalar() or 0

    comments_count = (await db.execute(
        select(func.count(Comment.id)).where(Comment.user_id == target_user.id)
    )).scalar() or 0

    # 4. Friendship status with current user
    friendship_status = "none"
    friendship_id = None

    if current_user:
        if current_user.id == target_user.id:
            friendship_status = "self"
        else:
            f_stmt = select(Friendship).where(
                or_(
                    (Friendship.user_id == current_user.id) & (Friendship.friend_id == target_user.id),
                    (Friendship.user_id == target_user.id) & (Friendship.friend_id == current_user.id),
                )
            )
            f_row = (await db.execute(f_stmt)).scalar_one_or_none()
            if f_row:
                friendship_id = f_row.id
                if f_row.status == "accepted":
                    friendship_status = "friends"
                elif f_row.status == "pending":
                    if f_row.user_id == current_user.id:
                        friendship_status = "pending_sent"
                    else:
                        friendship_status = "pending_received"

    from app.modules.shop.collection import collection_summary
    card_collection = await collection_summary(db, target_user.id)
    return {
        "success": True,
        "data": {
            "id": target_user.id,
            "username": target_user.username,
            "avatar_url": target_user.avatar_url,
            "bio": target_user.bio,
            "created_at": target_user.created_at,
            "active_frame": active_frame,
            "active_background": active_background,
            "card_collection": card_collection,
            "clan": clan_info,
            "friendship": {
                "status": friendship_status,
                "friendship_id": friendship_id,
            },
            "stats": {
                "bookmarks_count": bookmarks_count,
                "read_chapters_count": read_count,
                "comments_count": comments_count,
                "clan_contribution": clan_contribution,
            },
        },
    }

@router.post('/avatar/draft')
async def draft_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read(MAX_AVATAR_SIZE + 1)
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(413, 'Avatar must be at most 5 MB')
    url = await StorageService.upload_file_async(bucket_name='avatars', object_name=f'avatars/avatar_{current_user.id}_{uuid.uuid4().hex}.webp', data=content)
    return {'success': True, 'data': {'avatar_url': url}}


@router.get('/id/{user_id}/public-profile')
async def public_profile_by_id(user_id: int, current_user: Optional[User] = Depends(get_optional_user), db=Depends(get_db)):
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(404, 'User not found')
    return await get_public_profile(target.username, current_user, db)
