import uuid
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
        StaffSession.is_active.is_(True)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ushbu xodim seansi bekor qilingan yoki muddati tugagan"
        )

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
        if staff.role.name == "superadmin":
            return staff

        staff_permissions = [p.code for p in staff.role.permissions]
        if permission_code not in staff_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu amalni bajarish uchun '{permission_code}' huquqi mavjud emas"
            )
        return staff

    return permission_checker
