from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.creator_requests.schemas import CreatorRequestCreate, CreatorRequestItem, CreatorRequestReview
from app.modules.creator_requests.service import CreatorRequestService
from app.modules.staff.dependencies import get_current_staff, require_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User

# Client Router for regular users
client_router = APIRouter(prefix="/creator-requests", tags=["Creator Requests (User)"])

# Staff Router for admin moderation
staff_router = APIRouter(prefix="/staff/creator-requests", tags=["Creator Requests (Staff)"])


# 1. User submits application
@client_router.post("", status_code=status.HTTP_201_CREATED)
async def submit_request(
    data: CreatorRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    req = await CreatorRequestService.submit_request(db, user.id, data)
    return {
        "success": True,
        "data": {
            "id": req.id,
            "status": req.status,
            "created_at": req.created_at
        },
        "message": "Arizangiz qabul qilindi va moderatorlar tekshiruviga yuborildi!"
    }


# 2. User checks own application
@client_router.get("/my", status_code=status.HTTP_200_OK)
async def get_my_request(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    req = await CreatorRequestService.get_my_request(db, user.id)
    return {
        "success": True,
        "data": req
    }


# 3. Staff lists applications
@staff_router.get("", status_code=status.HTTP_200_OK)
async def list_requests(
    status: Optional[str] = Query(None, pattern=r"^(pending|approved|rejected)$"),
    _staff: StaffUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db)
):
    requests = await CreatorRequestService.list_requests(db, status)
    return {
        "success": True,
        "data": requests
    }


# 4. Staff reviews application
@staff_router.patch("/{id}", status_code=status.HTTP_200_OK)
async def review_request(
    id: int,
    data: CreatorRequestReview,
    staff: StaffUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db)
):
    req = await CreatorRequestService.review_request(
        db=db,
        request_id=id,
        reviewer_id=staff.id,
        new_status=data.status,
        admin_feedback=data.admin_feedback
    )
    msg = "Foydalanuvchi muvaffaqiyatli Creator etib tayinlandi!" if data.status == "approved" else "Ariza rad etildi"
    return {
        "success": True,
        "data": {
            "id": id,
            "status": req.status,
            "admin_feedback": req.admin_feedback
        },
        "message": msg
    }
