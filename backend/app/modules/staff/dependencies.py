import uuid
from datetime import datetime, timezone, timedelta
from typing import Callable, List, Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.staff.models import Role, StaffSession, StaffUser

security_bearer = HTTPBearer(auto_error=False)


def is_superadmin(staff: StaffUser) -> bool:
    return staff.role.system_key == 'superadmin'


def owns_content_only(staff: StaffUser) -> bool:
    return staff.role.scope == 'own_content'


def can_approve_chapters(staff: StaffUser) -> bool:
    return is_superadmin(staff) or any(permission.code == 'chapters:approve' for permission in staff.role.permissions)


async def get_current_staff_and_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> Tuple[StaffUser, str]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Xodim autentifikatsiyasidan o'tilmagan"
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access" or payload.get("role") != "staff":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Xodim tokeni yaroqsiz yoki muddati o'tgan"
        )

    staff_id_str = payload.get("sub")
    session_id_str = payload.get("session_id")
    if not staff_id_str or not session_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ma'lumotlari to'liq emas")

    try:
        staff_id = int(staff_id_str)
        session_id = uuid.UUID(session_id_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token identifikatorlari xato")

    # Check if session is active
    stmt = select(StaffSession).where(
        StaffSession.id == session_id,
        StaffSession.staff_id == staff_id,
        StaffSession.is_active.is_(True),
        StaffSession.expires_at > datetime.now(timezone.utc)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ushbu xodim seansi bekor qilingan yoki muddati tugagan"
        )

    last = session.last_active_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - last > timedelta(minutes=5):
        session.last_active_at = datetime.now(timezone.utc)
        await db.commit()

    # Fetch staff with role and permissions
    s_stmt = (
        select(StaffUser)
        .options(
            selectinload(StaffUser.role).selectinload(Role.permissions)
        )
        .where(StaffUser.id == staff_id, StaffUser.is_active.is_(True))
    )
    s_res = await db.execute(s_stmt)
    staff = s_res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Xodim topilmadi yoki bloklangan")

    if staff.user_id:
        from app.modules.users.models import User
        reader = await db.get(User, staff.user_id)
        if not reader or not reader.is_active:
            raise HTTPException(401, "Linked reader account is unavailable")
    staff._authenticated_session_id = session_id_str
    return staff, session_id_str


async def get_current_staff(
    auth_data: Tuple[StaffUser, str] = Depends(get_current_staff_and_session)
) -> StaffUser:
    return auth_data[0]


def require_permission(permission_code: str) -> Callable:
    async def permission_checker(
        staff: StaffUser = Depends(get_current_staff)
    ) -> StaffUser:
        # Superadmin bypasses all permission checks
        if is_superadmin(staff):
            return staff

        staff_permissions = [p.code for p in staff.role.permissions]
        if permission_code not in staff_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu amalni bajarish uchun '{permission_code}' huquqi mavjud emas"
            )
        return staff

    return permission_checker


def require_any_permission(*permission_codes: str) -> Callable:
    async def permission_checker(
        staff: StaffUser = Depends(get_current_staff)
    ) -> StaffUser:
        if is_superadmin(staff):
            return staff

        staff_permissions = [p.code for p in staff.role.permissions]
        if not any(code in staff_permissions for code in permission_codes):
            codes_str = ", ".join(permission_codes)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu amalni bajarish uchun ruxsat mavjud emas ({codes_str})"
            )
        return staff

    return permission_checker

