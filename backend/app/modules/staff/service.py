import hashlib
import asyncio
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
            .where((StaffUser.email == email) | (StaffUser.username == email))
        )
        result = await db.execute(stmt)
        staff = result.scalar_one_or_none()

        password_hash = staff.hashed_password if staff else ''
        if staff and staff.user_id:
            from app.modules.users.models import User
            reader = await db.get(User, staff.user_id)
            if not reader or not reader.is_active:
                raise HTTPException(403, 'Linked reader account is unavailable')
            password_hash = reader.hashed_password
        if not staff or not await asyncio.to_thread(verify_password, password, password_hash):
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
            system_key=staff.role.system_key, scope=staff.role.scope,
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
            system_key=staff.role.system_key, scope=staff.role.scope,
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
                system_key=r.system_key, scope=r.scope,
                description=r.description,
                permissions=[PermissionItem.model_validate(p) for p in r.permissions]
            )
            for r in roles
        ]

    @staticmethod
    async def create_role(db: AsyncSession, data: RoleCreateRequest) -> RoleItem:
        if data.name.strip().lower() in {'creator', 'superadmin'}:
            raise HTTPException(422, 'This name is reserved for a system role')
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
            name=data.name.strip(), system_key=None, scope='global',
            description=data.description,
            permissions=perms
        )
        db.add(new_role)
        await db.commit()
        await db.refresh(new_role)

        return RoleItem(
            id=new_role.id,
            name=new_role.name,
            system_key=new_role.system_key, scope=new_role.scope,
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
            .where(StaffSession.staff_id == staff_id, StaffSession.is_active.is_(True), StaffSession.expires_at > datetime.now(timezone.utc))
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

    @staticmethod
    async def revoke_other_sessions(db: AsyncSession, staff_id: int, current_session_id: str) -> None:
        curr_uuid = uuid.UUID(str(current_session_id))
        stmt = (
            update(StaffSession)
            .where(
                StaffSession.staff_id == staff_id,
                StaffSession.id != curr_uuid,
                StaffSession.is_active.is_(True)
            )
            .values(is_active=False)
        )
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    async def list_staff_users(db: AsyncSession):
        stmt = (
            select(StaffUser)
            .options(selectinload(StaffUser.role).selectinload(Role.permissions))
            .order_by(StaffUser.id.asc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def create_staff_user(db: AsyncSession, data):
        # Check uniqueness
        stmt = select(StaffUser).where((StaffUser.email == data.email) | (StaffUser.username == data.username))
        res = await db.execute(stmt)
        if res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ushbu email yoki username orqali xodim allaqachon mavjud"
            )

        # Check role exists
        r_stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == data.role_id)
        r_res = await db.execute(r_stmt)
        role = r_res.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bunday rol topilmadi")

        from app.core.security import hash_password
        new_staff = StaffUser(
            username=data.username,
            email=data.email,
            hashed_password=await asyncio.to_thread(hash_password, data.password),
            role_id=data.role_id,
            is_active=True
        )
        db.add(new_staff)
        await db.commit()
        await db.refresh(new_staff)
        new_staff.role = role
        return new_staff

    @staticmethod
    async def list_readers(db: AsyncSession, search: Optional[str] = None, page: int = 1, limit: int = 20):
        from sqlalchemy import func
        from app.modules.users.models import User
        from app.modules.staff.schemas import ReaderListResponse, ReaderUserItem

        query = select(User)
        count_stmt = select(func.count(User.id))
        if search:
            s_term = f"%{search.strip()}%"
            query = query.where((User.username.ilike(s_term)) | (User.email.ilike(s_term)))
            count_stmt = count_stmt.where((User.username.ilike(s_term)) | (User.email.ilike(s_term)))

        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * limit
        query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        users = res.scalars().all()

        return ReaderListResponse(
            items=[ReaderUserItem.model_validate(u) for u in users],
            total=total,
            page=page,
            limit=limit
        )

    @staticmethod
    async def update_reader(db: AsyncSession, user_id: int, data):
        from app.modules.users.models import User
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        if data.is_active is not None:
            user.is_active = data.is_active
            if not data.is_active:
                from app.modules.auth.recovery import revoke_user_sessions
                await revoke_user_sessions(db, user.id)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession):
        from sqlalchemy import func
        from app.modules.users.models import User
        from app.modules.webtoons.models import Webtoon, Chapter
        from app.modules.creator_requests.models import CreatorRequest
        from app.modules.comments.models import Comment
        from app.modules.staff.schemas import DashboardStatsResponse

        r_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        w_count = (await db.execute(select(func.count(Webtoon.id)))).scalar() or 0
        ch_count = (await db.execute(select(func.count(Chapter.id)))).scalar() or 0
        pending_ch = (await db.execute(select(func.count(Chapter.id)).where(Chapter.status == "pending"))).scalar() or 0
        pending_req = (await db.execute(select(func.count(CreatorRequest.id)).where(CreatorRequest.status == "pending"))).scalar() or 0
        comm_count = (await db.execute(select(func.count(Comment.id)))).scalar() or 0
        coins_circ = (await db.execute(select(func.coalesce(func.sum(User.lightning_coins), 0)))).scalar() or 0

        return DashboardStatsResponse(
            total_readers=r_count,
            total_webtoons=w_count,
            total_chapters=ch_count,
            published_chapters=await db.scalar(select(func.count(Chapter.id)).where(Chapter.status == "published")),
            pending_chapters=pending_ch,
            pending_creator_requests=pending_req,
            total_comments=comm_count,
            total_coins_in_circulation=coins_circ
        )

    @staticmethod
    async def get_settings(db: AsyncSession):
        from app.modules.staff.models import SystemSetting
        stmt = select(SystemSetting).order_by(SystemSetting.key.asc())
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def update_settings(db: AsyncSession, settings_data):
        from app.modules.staff.models import SystemSetting
        from app.core.economy import ALIASES, DEFAULTS
        for entry in settings_data:
            canonical = ALIASES.get(entry.key, entry.key)
            if canonical in DEFAULTS or entry.key == "clan_creation_cost":
                if not entry.value.isdigit() or int(entry.value) > 1000000:
                    raise HTTPException(422, "Economy settings must be nonnegative integers")
                entry.key = canonical
            stmt = select(SystemSetting).where(SystemSetting.key == entry.key)
            res = await db.execute(stmt)
            obj = res.scalar_one_or_none()
            if obj:
                obj.value = entry.value
            else:
                obj = SystemSetting(key=entry.key, value=entry.value)
                db.add(obj)

        await db.commit()
        stmt = select(SystemSetting).order_by(SystemSetting.key.asc())
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def update_role(db: AsyncSession, role_id: int, data):
        from app.modules.staff.models import Role, Permission
        stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
        res = await db.execute(stmt)
        role = res.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol topilmadi")

        if data.name is not None and data.name.strip():
            if data.name.strip() != role.name:
                if data.name.strip().lower() in {'creator', 'superadmin'} and role.system_key != data.name.strip().lower():
                    raise HTTPException(422, 'This name is reserved for a system role')
                name_stmt = select(Role).where(Role.name == data.name.strip())
                existing = (await db.execute(name_stmt)).scalar_one_or_none()
                if existing:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bunday nomli rol allaqachon mavjud")
                role.name = data.name.strip()

        if data.description is not None:
            role.description = data.description

        if data.permission_ids is not None:
            p_stmt = select(Permission).where(Permission.id.in_(data.permission_ids))
            p_res = await db.execute(p_stmt)
            perms = p_res.scalars().all()
            role.permissions = list(perms)

        await db.commit()
        await db.refresh(role)
        return role

    @staticmethod
    async def delete_role(db: AsyncSession, role_id: int):
        from app.modules.staff.models import Role, StaffUser
        stmt = select(Role).where(Role.id == role_id)
        res = await db.execute(stmt)
        role = res.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol topilmadi")

        if role.system_key in {'superadmin', 'creator'}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Superadmin rolini o'chirib bo'lmaydi")

        st_check = select(StaffUser).where(StaffUser.role_id == role_id)
        assigned_staff = (await db.execute(st_check.limit(1))).scalar_one_or_none()
        if assigned_staff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu rolga biriktirilgan xodimlar mavjud. Avval xodimlarning rolini o'zgartiring"
            )

        await db.delete(role)
        await db.commit()

    @staticmethod
    async def update_staff_user(db: AsyncSession, staff_id: int, data):
        from app.modules.staff.models import StaffUser, Role
        from app.core.security import hash_password
        stmt = select(StaffUser).options(selectinload(StaffUser.role).selectinload(Role.permissions)).where(StaffUser.id == staff_id)
        res = await db.execute(stmt)
        staff = res.scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xodim topilmadi")

        if data.username is not None and data.username.strip():
            u_check = select(StaffUser).where(StaffUser.username == data.username.strip(), StaffUser.id != staff_id)
            if (await db.execute(u_check)).scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ushbu username boshqa xodim tomonidan band qilingan")
            staff.username = data.username.strip()

        if data.email is not None and data.email.strip():
            e_check = select(StaffUser).where(StaffUser.email == data.email.strip(), StaffUser.id != staff_id)
            if (await db.execute(e_check)).scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ushbu email boshqa xodim tomonidan band qilingan")
            staff.email = data.email.strip()

        if data.role_id is not None:
            r_check = select(Role).where(Role.id == data.role_id)
            if not (await db.execute(r_check)).scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Belgilangan rol topilmadi")
            staff.role_id = data.role_id

        if data.is_active is not None:
            staff.is_active = data.is_active

        if data.password is not None and len(data.password) >= 6:
            staff.hashed_password = await asyncio.to_thread(hash_password, data.password)
            if staff.user_id:
                from app.modules.users.models import User
                from app.modules.auth.recovery import revoke_user_sessions
                reader = await db.get(User, staff.user_id)
                reader.hashed_password = staff.hashed_password
                await revoke_user_sessions(db, reader.id)
            await db.execute(update(StaffSession).where(StaffSession.staff_id == staff.id).values(is_active=False))

        await db.commit()
        stmt = select(StaffUser).options(selectinload(StaffUser.role).selectinload(Role.permissions)).where(StaffUser.id == staff_id)
        res = await db.execute(stmt)
        return res.scalar_one()

    @staticmethod
    async def delete_staff_user(db: AsyncSession, current_staff_id: int, staff_id: int):
        from app.modules.staff.models import StaffUser
        if current_staff_id == staff_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O'zingizning hisobingizni o'chira olmaysiz")

        stmt = select(StaffUser).where(StaffUser.id == staff_id)
        res = await db.execute(stmt)
        staff = res.scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xodim topilmadi")

        await db.delete(staff)
        await db.commit()

    @staticmethod
    async def terminate_reader_sessions(db: AsyncSession, user_id: int):
        from app.modules.users.models import User, UserSession
        u_check = select(User).where(User.id == user_id)
        if not (await db.execute(u_check)).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")

        term_stmt = (
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_active.is_(True))
            .values(is_active=False)
        )
        await db.execute(term_stmt)
        await db.commit()

    @staticmethod
    async def toggle_reader_status(db: AsyncSession, user_id: int):
        from app.modules.users.models import User
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")
        user.is_active = not user.is_active
        if not user.is_active:
            from app.modules.auth.recovery import revoke_user_sessions
            await revoke_user_sessions(db, user.id)
        await db.commit()
        await db.refresh(user)
        return user

