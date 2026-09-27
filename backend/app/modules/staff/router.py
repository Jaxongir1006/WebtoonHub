import uuid
from typing import List, Tuple
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.staff.dependencies import get_current_staff_and_session, require_permission
from app.modules.staff.models import StaffUser
from app.modules.staff.schemas import (
    PermissionItem,
    RoleCreateRequest,
    RoleItem,
    StaffLoginRequest,
    StaffRoleUpdateRequest,
    StaffSessionItem,
    StaffSummary,
    StaffTokenResponse
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
