import uuid
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.users.models import User, UserSession

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user_and_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> Tuple[User, str]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiyadan o'tilmagan"
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access" or payload.get("role") != "user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token yaroqsiz yoki muddati o'tgan"
        )

    user_id_str = payload.get("sub")
    session_id_str = payload.get("session_id")
    if not user_id_str or not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ma'lumotlari to'liq emas"
        )

    try:
        user_id = int(user_id_str)
        session_id = uuid.UUID(session_id_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token identifikatorlari xato")

    # Check if session is still active in database
    stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == user_id,
        UserSession.is_active.is_(True)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ushbu seans bekor qilingan yoki muddati tugagan"
        )

    # Fetch User
    u_stmt = select(User).where(User.id == user_id, User.is_active.is_(True))
    u_res = await db.execute(u_stmt)
    user = u_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi yoki bloklangan")

    return user, session_id_str


async def get_current_user(
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session)
) -> User:
    return auth_data[0]


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        user, _ = await get_current_user_and_session(credentials, db)
        return user
    except Exception:
        return None
