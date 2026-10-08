import asyncio
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, ForeignKey, String, DateTime, select, update
from app.core.database import Base, BigIntId, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.core.mailer import send_email
from app.modules.users.models import User, UserSession
from app.modules.staff.models import StaffUser, StaffSession
from app.modules.auth.dependencies import security_bearer
from app.core.logout import LogoutRequest, revoke_captured_session

class PasswordReset(Base):
    __tablename__ = 'password_resets'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    user_id = Column(BigIntId, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

class ForgotRequest(BaseModel):
    email: EmailStr

class ResetRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=8, max_length=100)

async def revoke_user_sessions(db, user_id, except_session=None):
    stmt = update(UserSession).where(UserSession.user_id == user_id)
    if except_session:
        stmt = stmt.where(UserSession.id != uuid.UUID(str(except_session)))
    await db.execute(stmt.values(is_active=False))
    staff_ids = select(StaffUser.id).where(StaffUser.user_id == user_id)
    await db.execute(update(StaffSession).where(StaffSession.staff_id.in_(staff_ids)).values(is_active=False))

router = APIRouter(prefix='/auth', tags=['Account recovery'])

@router.post('/logout')
async def logout(data: LogoutRequest | None = Body(None), credentials=Depends(security_bearer), db=Depends(get_db)):
    session_id = await revoke_captured_session(db, 'user', credentials, data)
    from app.modules.clans.connection_manager import clan_ws_manager
    await clan_ws_manager.close_session(session_id)
    return {'success': True, 'data': None}

@router.post('/password/forgot', status_code=202)
async def forgot_password(data: ForgotRequest, tasks: BackgroundTasks, db=Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == str(data.email).lower(), User.is_active.is_(True)))).scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        # Existing reset links are invalidated without exposing whether an account exists.
        await db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))
                         .values(used_at=datetime.now(timezone.utc)))
        db.add(PasswordReset(user_id=user.id, token_hash=hashlib.sha256(token.encode()).hexdigest(),
                             expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)))
        await db.commit()
        link = settings.FRONTEND_URL.rstrip('/') + '/reset-password?token=' + token
        tasks.add_task(send_email, user.email, 'Reset your WebtoonHub password',
                       '<p>A password reset was requested. The link expires in 30 minutes.</p><p><a href="' + link + '">Reset password</a></p>')
    return {'success': True, 'data': None, 'message': 'If an active account exists, a reset link will be emailed.'}

@router.post('/password/reset')
async def reset_password(data: ResetRequest, db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    reset = (await db.execute(select(PasswordReset).where(PasswordReset.token_hash == hashlib.sha256(data.token.encode()).hexdigest(),
            PasswordReset.used_at.is_(None), PasswordReset.expires_at > now).with_for_update())).scalar_one_or_none()
    if reset is None:
        raise HTTPException(400, 'Reset link has expired or was already used')
    user = await db.get(User, reset.user_id)
    if user is None or not user.is_active:
        raise HTTPException(400, 'Reset link is unavailable')
    claimed = await db.execute(update(PasswordReset).where(PasswordReset.id == reset.id, PasswordReset.used_at.is_(None)).values(used_at=now))
    if claimed.rowcount != 1:
        raise HTTPException(400, "Reset link was already used")
    user.hashed_password = await asyncio.to_thread(hash_password, data.new_password)
    reset.used_at = now
    await revoke_user_sessions(db, user.id)
    await db.commit()
    return {'success': True, 'data': None, 'message': 'Password changed. Sign in again on your devices.'}
