import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.modules.staff.models import Permission, Role, StaffSession, StaffUser
from app.modules.staff.schemas import (
    PermissionItem,
    RoleCreateRequest,
    RoleItem,
    StaffSessionItem,
    StaffSummary,
    StaffTokenResponse
)


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _detect_device_type(user_agent: Optional[str]) -> str:
    if not user_agent:
        return "Desktop"
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    return "Desktop"


class StaffService:
    @staticmethod
    async def login(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> StaffTokenResponse:
        stmt = (
            select(StaffUser)
            .options(
                selectinload(StaffUser.role).selectinload(Role.permissions)
            )
            .where(StaffUser.email == email)
        )
        result = await db.execute(stmt)
        staff = result.scalar_one_or_none()

        if not staff or not verify_password(password, staff.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kiritilgan email yoki parol xodimlar ro'yxatida topilmadi"
            )

        if not staff.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sizning xodimlik hisobingiz bloklangan"
            )

        # Generate refresh token & session
        raw_refresh_token = str(uuid.uuid4())
        refresh_hash = _hash_refresh_token(raw_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        session = StaffSession(
            staff_id=staff.id,
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

        permission_codes = [p.code for p in staff.role.permissions]

        access_token = create_access_token(
            subject=str(staff.id),
            extra_claims={
                "session_id": str(session.id),
                "role": "staff",
                "role_name": staff.role.name,
                "email": staff.email,
                "permissions": permission_codes
            }
        )

        role_item = RoleItem(
            id=staff.role.id,
            name=staff.role.name,
            description=staff.role.description,
            permissions=[PermissionItem.model_validate(p) for p in staff.role.permissions]
        )

        staff_summary = StaffSummary(
            id=staff.id,
            username=staff.username,
            email=staff.email,
            role=role_item,
            permissions=permission_codes
        )

        return StaffTokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            staff=staff_summary
        )

    @staticmethod
    async def get_profile(db: AsyncSession, staff_id: int) -> StaffSummary:
        stmt = (
            select(StaffUser)
            .options(
                selectinload(StaffUser.role).selectinload(Role.permissions)
            )
            .where(StaffUser.id == staff_id)
        )
        result = await db.execute(stmt)
        staff = result.scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xodim topilmadi")

        permission_codes = [p.code for p in staff.role.permissions]
        role_item = RoleItem(
            id=staff.role.id,
            name=staff.role.name,
            description=staff.role.description,
            permissions=[PermissionItem.model_validate(p) for p in staff.role.permissions]
        )

        return StaffSummary(
            id=staff.id,
            username=staff.username,
            email=staff.email,
            role=role_item,
            permissions=permission_codes
        )

    @staticmethod
    async def list_roles(db: AsyncSession) -> List[RoleItem]:
        stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.id.asc())
        result = await db.execute(stmt)
        roles = result.scalars().all()
        return [
            RoleItem(
                id=r.id,
                name=r.name,
                description=r.description,
                permissions=[PermissionItem.model_validate(p) for p in r.permissions]
            )
            for r in roles
        ]

    @staticmethod
    async def create_role(db: AsyncSession, data: RoleCreateRequest) -> RoleItem:
        stmt = select(Role).where(Role.name == data.name)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"'{data.name}' nomli rol allaqachon mavjud"
            )

        # Fetch permissions
        perms = []
        if data.permission_ids:
            p_stmt = select(Permission).where(Permission.id.in_(data.permission_ids))
            p_res = await db.execute(p_stmt)
            perms = list(p_res.scalars().all())

        new_role = Role(
            name=data.name,
            description=data.description,
            permissions=perms
        )
        db.add(new_role)
        await db.commit()
        await db.refresh(new_role)

        return RoleItem(
            id=new_role.id,
            name=new_role.name,
            description=new_role.description,
            permissions=[PermissionItem.model_validate(p) for p in perms]
        )

    @staticmethod
    async def list_permissions(db: AsyncSession) -> List[PermissionItem]:
        stmt = select(Permission).order_by(Permission.id.asc())
        result = await db.execute(stmt)
        perms = result.scalars().all()
        return [PermissionItem.model_validate(p) for p in perms]

    @staticmethod
    async def update_staff_role(db: AsyncSession, staff_id: int, role_id: int) -> None:
        r_stmt = select(Role).where(Role.id == role_id)
        r_res = await db.execute(r_stmt)
        role = r_res.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bunday rol topilmadi")

        s_stmt = update(StaffUser).where(StaffUser.id == staff_id).values(role_id=role_id)
        s_res = await db.execute(s_stmt)
        if s_res.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xodim topilmadi")
        await db.commit()

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        staff_id: int,
        current_session_id: Optional[str]
    ) -> List[StaffSessionItem]:
        stmt = (
            select(StaffSession)
            .where(StaffSession.staff_id == staff_id, StaffSession.is_active.is_(True))
            .order_by(StaffSession.last_active_at.desc())
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()

        items = []
        for s in sessions:
            is_curr = (current_session_id is not None and str(s.id) == str(current_session_id))
            items.append(
                StaffSessionItem(
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
    async def revoke_session(db: AsyncSession, staff_id: int, session_id: uuid.UUID) -> None:
        stmt = (
            update(StaffSession)
            .where(StaffSession.id == session_id, StaffSession.staff_id == staff_id)
            .values(is_active=False)
        )
        res = await db.execute(stmt)
        if res.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seans topilmadi")
        await db.commit()
