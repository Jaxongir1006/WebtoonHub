import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.mailer import send_welcome_email
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.schemas import (
    ActiveAsset,
    TokenResponse,
    UserProfileResponse,
    UserRegisterRequest,
    UserSessionItem,
    UserSummary
)
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.users.models import User, UserSession
from app.modules.clans.models import ClanMember


def _hash_refresh_token(token: str) -> str:
    """Hash refresh token for secure database storage"""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _detect_device_type(user_agent: Optional[str]) -> str:
    if not user_agent:
        return "Desktop"
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop"


def _is_daily_bonus_claimed(last_daily_login: Optional[datetime]) -> bool:
    if not last_daily_login:
        return False
    uz_tz = ZoneInfo(settings.TIMEZONE)
    now_uz = datetime.now(timezone.utc).astimezone(uz_tz)
    last_uz = last_daily_login.astimezone(uz_tz)
    return last_uz.date() == now_uz.date()


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: UserRegisterRequest) -> User:
        # Check if email or username already exists
        stmt = select(User).where((User.email == data.email) | (User.username == data.username))
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ushbu email yoki username orqali avval ro'yxatdan o'tilgan"
            )

        new_user = User(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            lightning_coins=settings.INITIAL_COINS,
            is_active=True
        )
        db.add(new_user)
        await db.flush()

        from app.modules.rewards.service import RewardService
        await RewardService.record_transaction(
            db=db,
            user_id=new_user.id,
            amount=settings.INITIAL_COINS,
            transaction_type="register_bonus",
            description="Ro'yxatdan o'tish sovg'asi"
        )

        await db.commit()
        await db.refresh(new_user)

        # Trigger welcome email asynchronously (non-blocking)
        try:
            await send_welcome_email(new_user.email, new_user.username)
        except Exception:
            pass

        return new_user

    @staticmethod
    async def login(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> TokenResponse:
        # Find user
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kiritilgan email yoki parol noto'g'ri"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sizning hisobingiz bloklangan"
            )

        # Generate Refresh Token
        raw_refresh_token = str(uuid.uuid4())
        refresh_hash = _hash_refresh_token(raw_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        # Create Session in DB
        session = UserSession(
            user_id=user.id,
            refresh_token_hash=refresh_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=_detect_device_type(user_agent),
            is_active=True,
            expires_at=expires_at
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Generate JWT Access Token with session_id claim
        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={
                "session_id": str(session.id),
                "role": "user",
                "email": user.email,
                "username": user.username
            }
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserSummary(
                id=user.id,
                email=user.email,
                username=user.username,
                lightning_coins=user.lightning_coins,
                avatar_url=user.avatar_url,
                daily_bonus_claimed=_is_daily_bonus_claimed(user.last_daily_login),
                last_daily_login=user.last_daily_login,
                created_at=user.created_at
            )
        )

    @staticmethod
    async def refresh_access_token(db: AsyncSession, raw_refresh_token: str) -> str:
        refresh_hash = _hash_refresh_token(raw_refresh_token)
        stmt = (
            select(UserSession)
            .options(selectinload(UserSession.user))
            .where(
                UserSession.refresh_token_hash == refresh_hash,
                UserSession.is_active.is_(True),
                UserSession.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session or not session.user or not session.user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Seans muddati tugagan yoki bekor qilingan. Iltimos, qaytadan kiring."
            )

        # Update last active timestamp
        session.last_active_at = datetime.now(timezone.utc)
        await db.commit()

        # Generate new Access Token
        new_access_token = create_access_token(
            subject=str(session.user.id),
            extra_claims={
                "session_id": str(session.id),
                "role": "user",
                "email": session.user.email,
                "username": session.user.username
            }
        )
        return new_access_token

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: int) -> UserProfileResponse:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        # Fetch active equipped assets
        inv_stmt = (
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == user_id, UserInventory.is_active.is_(True))
        )
        inv_result = await db.execute(inv_stmt)
        active_items = inv_result.scalars().all()

        active_frame: Optional[ActiveAsset] = None
        active_background: Optional[ActiveAsset] = None

        for inv in active_items:
            if inv.item.item_type == "frame":
                active_frame = ActiveAsset(
                    id=inv.item.id,
                    name=inv.item.name,
                    asset_url=inv.item.asset_url
                )
            elif inv.item.item_type == "background":
                active_background = ActiveAsset(
                    id=inv.item.id,
                    name=inv.item.name,
                    asset_url=inv.item.asset_url
                )

        # Check clan membership
        clan_stmt = (
            select(ClanMember)
            .options(selectinload(ClanMember.clan))
            .where(ClanMember.user_id == user_id)
        )
        clan_member = (await db.execute(clan_stmt)).scalar_one_or_none()
        clan_info = None
        if clan_member and clan_member.clan:
            clan_info = {
                "id": clan_member.clan.id,
                "name": clan_member.clan.name,
                "tag": clan_member.clan.tag,
                "avatar_url": clan_member.clan.avatar_url,
                "level": clan_member.clan.level,
                "role": clan_member.role,
                "contribution_points": clan_member.contribution_points
            }

        return UserProfileResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            lightning_coins=user.lightning_coins,
            avatar_url=user.avatar_url,
            bio=user.bio,
            clan=clan_info,
            active_frame=active_frame,
            active_background=active_background,
            daily_bonus_claimed=_is_daily_bonus_claimed(user.last_daily_login),
            last_daily_login=user.last_daily_login,
            created_at=user.created_at
        )

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        user_id: int,
        current_session_id: Optional[str]
    ) -> List[UserSessionItem]:
        stmt = (
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_active.is_(True))
            .order_by(UserSession.last_active_at.desc())
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()

        items = []
        for s in sessions:
            is_curr = (current_session_id is not None and str(s.id) == str(current_session_id))
            items.append(
                UserSessionItem(
                    id=s.id,
                    ip_address=s.ip_address,
                    user_agent=s.user_agent,
                    device_type=s.device_type,
                    is_current=is_curr,
                    last_active_at=s.last_active_at,
                    created_at=s.created_at
                )
            )
        return items

    @staticmethod
    async def revoke_session(db: AsyncSession, user_id: int, session_id: uuid.UUID) -> None:
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id, UserSession.user_id == user_id)
            .values(is_active=False)
        )
        result = await db.execute(stmt)
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bunday seans topilmadi yoki u sizga tegishli emas"
            )
        await db.commit()

    @staticmethod
    async def revoke_other_sessions(db: AsyncSession, user_id: int, current_session_id: str) -> None:
        try:
            curr_uuid = uuid.UUID(current_session_id)
        except ValueError:
            curr_uuid = None

        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_active.is_(True),
                UserSession.id != curr_uuid
            )
            .values(is_active=False)
        )
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    async def update_profile(db: AsyncSession, user_id: int, data) -> User:
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        if data.username is not None and data.username != user.username:
            u_stmt = select(User).where(User.username == data.username)
            u_res = await db.execute(u_stmt)
            if u_res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ushbu username allaqachon band")
            user.username = data.username

        if data.new_password is not None:
            if not data.old_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parolni o'zgartirish uchun eski parolni kiritish shart"
                )
            if not verify_password(data.old_password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Eski parol noto'g'ri kiritildi"
                )
            user.hashed_password = hash_password(data.new_password)

        await db.commit()
        await db.refresh(user)
        return user
