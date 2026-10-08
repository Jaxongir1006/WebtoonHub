"""Revoke a captured session without requiring an unexpired access JWT."""
import hashlib
import uuid
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from app.core.config import settings
from app.core.security import decode_token
from app.modules.users.models import UserSession
from app.modules.staff.models import StaffSession


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(None, min_length=1, max_length=512)
    model_config = {'extra': 'forbid'}


def logout_claims(credentials, role, *, allow_expired=False):
    if credentials is None:
        return None
    if allow_expired:
        try:
            # Signature and all other time/claim validation still apply. Only the
            # exact matching valid refresh token permits ignoring access expiry.
            claims = jwt.decode(credentials.credentials, settings.SECRET_KEY,
                                algorithms=['HS256'], options={'verify_exp': False, 'require': ['exp', 'sub']})
        except jwt.PyJWTError:
            raise HTTPException(401, 'Logout credentials are unavailable')
    else:
        claims = decode_token(credentials.credentials)
    if not claims or claims.get('type') != 'access' or claims.get('role') != role:
        raise HTTPException(401, 'Logout credentials are unavailable')
    try:
        return int(claims['sub']), uuid.UUID(str(claims['session_id']))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(401, 'Logout credentials are unavailable')


async def revoke_captured_session(db, role, credentials=None, data=None):
    session_model = UserSession if role == 'user' else StaffSession
    owner_column = session_model.user_id if role == 'user' else session_model.staff_id
    now = datetime.now(timezone.utc)
    refresh_token = data.refresh_token if data else None
    claims = logout_claims(credentials, role, allow_expired=refresh_token is not None)
    valid_access = credentials is not None and decode_token(credentials.credentials) is not None
    conditions = [session_model.is_active.is_(True), session_model.expires_at > now]
    if valid_access and claims:
        # An in-flight refresh may rotate after the client captures credentials.
        # The still-valid access JWT independently authorizes only its own session.
        conditions.extend([owner_column == claims[0], session_model.id == claims[1]])
        if refresh_token is not None:
            digest = hashlib.sha256(refresh_token.encode()).hexdigest()
            for known_role, model in [('user', UserSession), ('staff', StaffSession)]:
                known = (await db.execute(select(model.id).where(model.refresh_token_hash == digest).limit(2))).scalars().all()
                if any(known_role != role or session_id != claims[1] for session_id in known):
                    raise HTTPException(401, 'Logout credentials do not identify the same session')
    elif refresh_token is not None:
        conditions.append(session_model.refresh_token_hash == hashlib.sha256(refresh_token.encode()).hexdigest())
    else:
        raise HTTPException(401, 'Logout credentials are unavailable')

    rows = (await db.execute(select(session_model).where(*conditions).limit(2).with_for_update())).scalars().all()
    if len(rows) != 1:
        raise HTTPException(401, 'Logout credentials are unavailable')
    session = rows[0]
    owner_id = session.user_id if role == 'user' else session.staff_id
    if claims and (claims[0] != owner_id or claims[1] != session.id):
        raise HTTPException(401, 'Logout credentials do not identify the same session')
    changed = await db.execute(update(session_model).where(session_model.id == session.id,
                              owner_column == owner_id, *conditions).values(is_active=False)
                              .execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        raise HTTPException(401, 'Logout credentials are unavailable')
    await db.commit()
    return str(session.id)
