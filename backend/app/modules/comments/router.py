import uuid
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.auth.dependencies import get_current_user
from app.modules.comments.schemas import CommentCreate, CommentStaffUpdateRequest
from app.modules.comments.service import CommentsService
from app.modules.staff.dependencies import require_permission
from app.modules.staff.models import Role, StaffSession, StaffUser
from app.modules.users.models import User, UserSession

router = APIRouter(tags=["Comments"])
security_bearer = HTTPBearer(auto_error=False)


async def get_current_actor(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> Tuple[str, int, List[str]]:
    """
    Returns (actor_role, actor_id, permissions).
    Supports either regular users or staff members.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiyadan o'tilmagan"
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token yaroqsiz yoki muddati o'tgan"
        )

    role = payload.get("role")
    sub = payload.get("sub")
    session_id_str = payload.get("session_id")
    if not sub or not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ma'lumotlari to'liq emas"
        )

    try:
        actor_id = int(sub)
        session_id = uuid.UUID(session_id_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token identifikatorlari xato")

    if role == "user":
        # Validate user session
        s_stmt = select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == actor_id,
            UserSession.is_active.is_(True)
        )
        s_res = await db.execute(s_stmt)
        if not s_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ushbu seans bekor qilingan yoki muddati tugagan"
            )

        u_stmt = select(User).where(User.id == actor_id, User.is_active.is_(True))
        u_res = await db.execute(u_stmt)
        if not u_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi yoki bloklangan")

        return "user", actor_id, []

    elif role == "staff":
        # Validate staff session
        s_stmt = select(StaffSession).where(
            StaffSession.id == session_id,
            StaffSession.staff_id == actor_id,
            StaffSession.is_active.is_(True)
        )
        s_res = await db.execute(s_stmt)
        if not s_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ushbu xodim seansi bekor qilingan yoki muddati tugagan"
            )

        st_stmt = (
            select(StaffUser)
            .options(selectinload(StaffUser.role).selectinload(Role.permissions))
            .where(StaffUser.id == actor_id, StaffUser.is_active.is_(True))
        )
        st_res = await db.execute(st_stmt)
        staff = st_res.scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Xodim topilmadi yoki bloklangan")

        perms = [p.code for p in staff.role.permissions] if staff.role else []
        if staff.role and staff.role.name == "superadmin":
            perms.append("superadmin")

        return "staff", actor_id, perms

    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Noma'lum rol turi"
        )


@router.get("/chapters/{id}/comments")
async def list_comments(id: int, db: AsyncSession = Depends(get_db)):
    comments = await CommentsService.list_comments(db, chapter_id=id)
    return {
        "success": True,
        "data": comments
    }


@router.post("/chapters/{id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    comment_data = await CommentsService.create_comment(
        db=db,
        user_id=current_user.id,
        chapter_id=id,
        data=data
    )
    return {
        "success": True,
        "data": comment_data,
        "message": "Sharhingiz muvaffaqiyatli chop etildi"
    }


@router.delete("/comments/{id}")
async def delete_comment(
    id: int,
    actor_data: Tuple[str, int, List[str]] = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db)
):
    role, actor_id, perms = actor_data
    await CommentsService.delete_comment(
        db=db,
        comment_id=id,
        actor_role=role,
        actor_id=actor_id,
        permissions=perms
    )
    return {
        "success": True,
        "data": None,
        "message": "Sharh muvaffaqiyatli o'chirildi"
    }


# Staff Comments Moderation
@router.get("/staff/comments", status_code=status.HTTP_200_OK)
async def list_staff_comments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _staff: StaffUser = Depends(require_permission("comments:moderate")),
    db: AsyncSession = Depends(get_db)
):
    res = await CommentsService.list_all_comments_for_staff(db, page=page, limit=limit)
    return {
        "success": True,
        "data": res
    }


@router.patch("/staff/comments/{id}", status_code=status.HTTP_200_OK)
async def update_staff_comment(
    id: int,
    data: CommentStaffUpdateRequest,
    _staff: StaffUser = Depends(require_permission("comments:moderate")),
    db: AsyncSession = Depends(get_db)
):
    comment = await CommentsService.update_comment(db, comment_id=id, content=data.content)
    return {
        "success": True,
        "data": {
            "id": comment.id,
            "content": comment.content
        },
        "message": "Sharh muvaffaqiyatli tahrirlandi"
    }


@router.delete("/staff/comments/{id}", status_code=status.HTTP_200_OK)
async def delete_staff_comment(
    id: int,
    staff: StaffUser = Depends(require_permission("comments:moderate")),
    db: AsyncSession = Depends(get_db)
):
    await CommentsService.delete_comment(
        db=db,
        comment_id=id,
        actor_role="staff",
        actor_id=staff.id,
        permissions=["comments:moderate"]
    )
    return {
        "success": True,
        "data": None,
        "message": "Sharh muvaffaqiyatli o'chirildi"
    }

