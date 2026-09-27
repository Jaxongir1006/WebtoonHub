import uuid
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.staff.dependencies import get_current_staff_and_session, require_permission
from app.modules.staff.models import StaffUser
from app.modules.staff.schemas import (
    DashboardStatsResponse,
    PermissionItem,
    ReaderListResponse,
    ReaderUpdateRequest,
    RoleCreateRequest,
    RoleItem,
    StaffLoginRequest,
    StaffRoleUpdateRequest,
    StaffSessionItem,
    StaffSummary,
    StaffTokenResponse,
    StaffUserCreate,
    StaffUserResponse
)
from app.modules.staff.service import StaffService

router = APIRouter(prefix="/staff", tags=["Staff & RBAC"])


# 1. Staff Login
@router.post("/auth/login", status_code=status.HTTP_200_OK)
async def staff_login(
    request: Request,
    data: StaffLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    token_data = await StaffService.login(
        db=db,
        email=data.email,
        password=data.password,
        ip_address=client_ip,
        user_agent=user_agent
    )
    return {
        "success": True,
        "data": token_data,
        "message": "Boshqaruv paneliga xush kelibsiz"
    }


# 2. Staff Profile & Permissions
@router.get("/auth/me", status_code=status.HTTP_200_OK)
async def get_my_staff_profile(
    auth_data: Tuple[StaffUser, str] = Depends(get_current_staff_and_session),
    db: AsyncSession = Depends(get_db)
):
    staff, _ = auth_data
    profile = await StaffService.get_profile(db, staff.id)
    return {
        "success": True,
        "data": profile
    }


# 3. Staff Sessions
@router.get("/auth/sessions", status_code=status.HTTP_200_OK)
async def list_staff_sessions(
    auth_data: Tuple[StaffUser, str] = Depends(get_current_staff_and_session),
    db: AsyncSession = Depends(get_db)
):
    staff, session_id = auth_data
    sessions = await StaffService.list_sessions(db, staff.id, session_id)
    return {
        "success": True,
        "data": sessions
    }


@router.delete("/auth/sessions/{id}", status_code=status.HTTP_200_OK)
async def revoke_staff_session(
    id: uuid.UUID,
    auth_data: Tuple[StaffUser, str] = Depends(get_current_staff_and_session),
    db: AsyncSession = Depends(get_db)
):
    staff, _ = auth_data
    await StaffService.revoke_session(db, staff.id, id)
    return {
        "success": True,
        "data": None,
        "message": "Seans muvaffaqiyatli yakunlandi"
    }


# 4. Roles Management
@router.get("/roles", status_code=status.HTTP_200_OK)
async def list_roles(
    _staff: StaffUser = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_db)
):
    roles = await StaffService.list_roles(db)
    return {
        "success": True,
        "data": roles
    }


@router.post("/roles", status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreateRequest,
    _staff: StaffUser = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_db)
):
    new_role = await StaffService.create_role(db, data)
    return {
        "success": True,
        "data": new_role,
        "message": "Yangi rol muvaffaqiyatli yaratildi"
    }


# 5. Permissions Catalog
@router.get("/permissions", status_code=status.HTTP_200_OK)
async def list_permissions(
    _staff: StaffUser = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_db)
):
    permissions = await StaffService.list_permissions(db)
    return {
        "success": True,
        "data": permissions
    }


# 6. Update Staff User Role
@router.patch("/users/{id}/role", status_code=status.HTTP_200_OK)
async def update_staff_role(
    id: int,
    data: StaffRoleUpdateRequest,
    _staff: StaffUser = Depends(require_permission("staff:manage")),
    db: AsyncSession = Depends(get_db)
):
    await StaffService.update_staff_role(db, id, data.role_id)
    return {
        "success": True,
        "data": None,
        "message": "Xodim roli muvaffaqiyatli yangilandi"
    }


# 7. Staff Users List & Create
@router.get("/users", status_code=status.HTTP_200_OK)
async def list_staff_users(
    _staff: StaffUser = Depends(require_permission("staff:manage")),
    db: AsyncSession = Depends(get_db)
):
    users = await StaffService.list_staff_users(db)
    return {
        "success": True,
        "data": users
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_staff_user(
    data: StaffUserCreate,
    _staff: StaffUser = Depends(require_permission("staff:manage")),
    db: AsyncSession = Depends(get_db)
):
    new_user = await StaffService.create_staff_user(db, data)
    return {
        "success": True,
        "data": new_user,
        "message": "Yangi xodim muvaffaqiyatli yaratildi"
    }


# 8. Readers (Users) Management
@router.get("/readers", status_code=status.HTTP_200_OK)
async def list_readers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _staff: StaffUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db)
):
    res = await StaffService.list_readers(db, search=search, page=page, limit=limit)
    return {
        "success": True,
        "data": res
    }


@router.patch("/readers/{id}", status_code=status.HTTP_200_OK)
async def update_reader(
    id: int,
    data: ReaderUpdateRequest,
    _staff: StaffUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db)
):
    user = await StaffService.update_reader(db, user_id=id, data=data)
    return {
        "success": True,
        "data": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "lightning_coins": user.lightning_coins,
            "is_active": user.is_active
        },
        "message": "Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi"
    }


# 9. Dashboard Analytics
@router.get("/analytics/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard_analytics(
    _staff: StaffUser = Depends(require_permission("analytics:view")),
    db: AsyncSession = Depends(get_db)
):
    stats = await StaffService.get_dashboard_stats(db)
    return {
        "success": True,
        "data": stats
    }


# 10. Economy & Rewards Rates Configuration
@router.get("/economy/settings", status_code=status.HTTP_200_OK)
async def get_economy_settings(
    _staff: StaffUser = Depends(require_permission("users:manage"))
):
    from app.core.config import settings
    return {
        "success": True,
        "data": {
            "chapter_read_reward": settings.CHAPTER_READ_COINS,
            "daily_checkin_reward": settings.DAILY_LOGIN_COINS,
            "welcome_bonus": settings.INITIAL_COINS,
            "creator_chapter_reward": 25,
            "comment_reward": 2,
            "daily_max_limit": 100,
            "reset_timezone": settings.TIMEZONE,
            "reset_time": "00:00",
            "anti_farming_cooldown_min": 3
        }
    }


@router.patch("/economy/settings", status_code=status.HTTP_200_OK)
async def update_economy_settings(
    data: dict,
    _staff: StaffUser = Depends(require_permission("users:manage"))
):
    from app.core.config import settings
    if "chapter_read_reward" in data:
        settings.CHAPTER_READ_COINS = int(data["chapter_read_reward"])
    if "daily_checkin_reward" in data:
        settings.DAILY_LOGIN_COINS = int(data["daily_checkin_reward"])
    if "welcome_bonus" in data:
        settings.INITIAL_COINS = int(data["welcome_bonus"])
    return {
        "success": True,
        "data": {
            "chapter_read_reward": settings.CHAPTER_READ_COINS,
            "daily_checkin_reward": settings.DAILY_LOGIN_COINS,
            "welcome_bonus": settings.INITIAL_COINS,
            "creator_chapter_reward": data.get("creator_chapter_reward", 25),
            "comment_reward": data.get("comment_reward", 2),
            "daily_max_limit": data.get("daily_max_limit", 100),
            "reset_timezone": settings.TIMEZONE,
            "reset_time": "00:00",
            "anti_farming_cooldown_min": 3
        },
        "message": "Chaqmoq berilishi va iqtisodiyot sozlamalari muvaffaqiyatli saqlandi"
    }


@router.get("/economy/transactions", status_code=status.HTTP_200_OK)
async def get_economy_transactions(
    limit: int = Query(20, ge=1, le=100),
    _staff: StaffUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db)
):
    from app.modules.rewards.models import ReadReward
    from app.modules.users.models import User
    stmt = (
        select(ReadReward, User.username)
        .join(User, ReadReward.user_id == User.id)
        .order_by(ReadReward.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    items = []
    for r, username in rows:
        items.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": username,
            "type": "chapter_reward",
            "title": f"Bob #{r.chapter_id} mutolaasi uchun mukofot",
            "amount": r.coins_earned,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return {
        "success": True,
        "data": {
            "items": items,
            "total": len(items)
        }
    }

