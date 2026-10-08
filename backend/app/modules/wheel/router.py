from typing import Optional
from pydantic import BaseModel, Field
from typing import Literal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.staff.dependencies import require_any_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User
from app.modules.wheel.schemas import (
    WheelCreateRequest,
    WheelItemCreateRequest,
    WheelItemUpdateRequest,
    WheelUpdateRequest,
)
from app.modules.wheel.service import WheelService

class SpinIntent(BaseModel):
    expected_mode: Literal["free", "paid"]
    expected_cost: int = Field(ge=0)
    operation_key: str = Field(min_length=8, max_length=128, pattern=r'^[A-Za-z0-9_-]+$')

client_router = APIRouter(prefix="/wheels", tags=["Lucky Wheel (User)"])
staff_router = APIRouter(prefix="/staff/wheels", tags=["Lucky Wheel Management (Staff)"])


# ====================================================
# Client Endpoints (User Portal)
# ====================================================

@client_router.get("", status_code=status.HTTP_200_OK)
async def list_active_wheels(
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """List all active wheels with daily free spin status for the user"""
    user_id = user.id if user else None
    wheels = await WheelService.list_wheels(db, user_id=user_id)
    return {
        "success": True,
        "data": wheels
    }


@client_router.get("/{wheel_id}", status_code=status.HTTP_200_OK)
async def get_wheel_details(
    wheel_id: int,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get wheel sectors, probabilities and user free spin eligibility"""
    user_id = user.id if user else None
    wheel = await WheelService.get_wheel(db, wheel_id, user_id=user_id)
    return {
        "success": True,
        "data": wheel
    }


@client_router.post("/{wheel_id}/spin", status_code=status.HTTP_200_OK)
async def spin_wheel(
    wheel_id: int,
    intent: SpinIntent,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Spin the wheel: awards guaranteed prize, deducts coins or consumes free daily spin"""
    result = await WheelService.spin_wheel(db, user_id=user.id, wheel_id=wheel_id, expected_mode=intent.expected_mode, expected_cost=intent.expected_cost, operation_key=intent.operation_key)
    return {
        "success": True,
        "data": result,
        "message": result.message
    }


@client_router.get("/{wheel_id:int}/history", status_code=status.HTTP_200_OK)
async def get_wheel_history(
    wheel_id: int,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get public recent winners for this wheel"""
    history = await WheelService.get_recent_spins(db, wheel_id=wheel_id, limit=limit)
    return {
        "success": True,
        "data": history
    }


@client_router.get("/user/history", status_code=status.HTTP_200_OK)
async def get_my_spin_history(
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's personal spin history"""
    history = await WheelService.get_recent_spins(db, user_id=user.id, limit=limit)
    return {
        "success": True,
        "data": history
    }


# ====================================================
# Staff Management Endpoints (Admin Panel)
# ====================================================

wheel_permission = require_any_permission("wheel:manage", "settings:manage", "shop:manage")


@staff_router.get("", status_code=status.HTTP_200_OK)
async def list_staff_wheels(
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """List all wheels (active and inactive) for admin studio"""
    wheels = await WheelService.list_staff_wheels(db)
    return {
        "success": True,
        "data": wheels
    }


@staff_router.post("", status_code=status.HTTP_201_CREATED)
async def create_wheel(
    data: WheelCreateRequest,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Create a new wheel configuration"""
    wheel = await WheelService.create_wheel(db, data)
    return {
        "success": True,
        "data": wheel,
        "message": f"'{wheel.title}' charxi muvaffaqiyatli yaratildi"
    }


@staff_router.patch("/{wheel_id}", status_code=status.HTTP_200_OK)
async def update_wheel(
    wheel_id: int,
    data: WheelUpdateRequest,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Update wheel properties (title, cost, free spin, active status)"""
    wheel = await WheelService.update_wheel(db, wheel_id, data)
    return {
        "success": True,
        "data": wheel,
        "message": "Charx ma'lumotlari muvaffaqiyatli yangilandi"
    }


@staff_router.delete("/{wheel_id}", status_code=status.HTTP_200_OK)
async def delete_wheel(
    wheel_id: int,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Delete a wheel and all its items and spin logs"""
    await WheelService.delete_wheel(db, wheel_id)
    return {
        "success": True,
        "data": None,
        "message": "Charx tizimdan o'chirildi"
    }


@staff_router.post("/{wheel_id}/items", status_code=status.HTTP_201_CREATED)
async def create_wheel_item(
    wheel_id: int,
    data: WheelItemCreateRequest,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Add a slice (item) to a wheel"""
    item = await WheelService.create_wheel_item(db, wheel_id, data)
    return {
        "success": True,
        "data": item,
        "message": f"'{item.label}' sektori charxga qo'shildi"
    }


@staff_router.post("/{wheel_id}/preset-items", status_code=status.HTTP_201_CREATED)
async def populate_preset_items(
    wheel_id: int,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Populate default balanced 8 sectors for this wheel"""
    items = await WheelService.populate_preset_sectors(db, wheel_id)
    return {
        "success": True,
        "data": items,
        "message": f"Charxga {len(items)} ta standart sektor muvaffaqiyatli qo'shildi"
    }


@staff_router.patch("/items/{item_id}", status_code=status.HTTP_200_OK)
async def update_wheel_item(
    item_id: int,
    data: WheelItemUpdateRequest,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Update a slice properties (label, reward, weight, color)"""
    item = await WheelService.update_wheel_item(db, item_id, data)
    return {
        "success": True,
        "data": item,
        "message": "Sektor muvaffaqiyatli yangilandi"
    }


@staff_router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
async def delete_wheel_item(
    item_id: int,
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Remove a slice from a wheel"""
    await WheelService.delete_wheel_item(db, item_id)
    return {
        "success": True,
        "data": None,
        "message": "Sektor muvaffaqiyatli o'chirildi"
    }


@staff_router.get("/{wheel_id}/spins", status_code=status.HTTP_200_OK)
async def get_staff_wheel_spins(
    wheel_id: int,
    limit: int = Query(50, ge=1, le=100),
    _staff: StaffUser = Depends(wheel_permission),
    db: AsyncSession = Depends(get_db)
):
    """Get spin history audit log for staff"""
    history = await WheelService.get_recent_spins(db, wheel_id=wheel_id, limit=limit)
    return {
        "success": True,
        "data": history
    }
