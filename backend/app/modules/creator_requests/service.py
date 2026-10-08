from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.creator_requests.models import CreatorRequest
from app.modules.creator_requests.schemas import CreatorRequestCreate, CreatorRequestItem
from app.modules.staff.models import Role, StaffUser
from app.modules.users.models import User


class CreatorRequestService:
    @staticmethod
    async def submit_request(db: AsyncSession, user_id: int, data: CreatorRequestCreate) -> CreatorRequest:
        stmt = select(CreatorRequest).where(CreatorRequest.user_id == user_id)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.status == "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Sizning arizangiz allaqachon moderatorlar tekshiruvida turibdi"
                )
            elif existing.status == "approved":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Siz allaqachon Creator sifatida tasdiqlangansiz"
                )
            else:
                # Update previously rejected request with new message and reset to pending
                existing.message = data.message
                existing.status = "pending"
                existing.created_at = datetime.now(timezone.utc)
                existing.reviewed_at = None
                existing.reviewed_by = None
                await db.commit()
                await db.refresh(existing)
                return existing

        new_req = CreatorRequest(
            user_id=user_id,
            message=data.message,
            status="pending"
        )
        db.add(new_req)
        await db.commit()
        await db.refresh(new_req)
        return new_req

    @staticmethod
    async def get_my_request(db: AsyncSession, user_id: int) -> CreatorRequestItem:
        stmt = select(CreatorRequest).where(CreatorRequest.user_id == user_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Siz hali Creatorlik arizasini topshirmagansiz"
            )
        return CreatorRequestItem.model_validate(req)

    @staticmethod
    async def list_requests(db: AsyncSession, status_filter: Optional[str] = None) -> List[CreatorRequestItem]:
        query = select(CreatorRequest).options(selectinload(CreatorRequest.user))
        if status_filter:
            query = query.where(CreatorRequest.status == status_filter)
        query = query.order_by(CreatorRequest.created_at.desc())

        result = await db.execute(query)
        requests = result.scalars().all()
        return [CreatorRequestItem.model_validate(r) for r in requests]

    @staticmethod
    async def review_request(
        db: AsyncSession,
        request_id: int,
        reviewer_id: int,
        new_status: str,
        admin_feedback: Optional[str] = None
    ) -> CreatorRequest:
        stmt = (
            select(CreatorRequest)
            .options(selectinload(CreatorRequest.user))
            .where(CreatorRequest.id == request_id)
        )
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ariza topilmadi")

        req.status = new_status
        req.reviewed_by = reviewer_id
        req.reviewed_at = datetime.now(timezone.utc)
        if admin_feedback is not None:
            req.admin_feedback = admin_feedback

        # If approved, grant Creator role in staff_users table
        if new_status == "approved" and req.user:
            # Find creator role
            r_stmt = select(Role).where(Role.system_key == "creator")
            r_res = await db.execute(r_stmt)
            creator_role = r_res.scalar_one_or_none()
            if not creator_role:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="'creator' roli topilmadi")

            # Check if staff user already exists with this email
            s_stmt = select(StaffUser).options(selectinload(StaffUser.role)).where(StaffUser.email == req.user.email)
            s_res = await db.execute(s_stmt)
            staff_user = s_res.scalar_one_or_none()

            if not staff_user:
                duplicate_username = await db.scalar(select(StaffUser.id).where(StaffUser.username == req.user.username))
                if duplicate_username:
                    raise HTTPException(409, "This username is already used by an independent staff account")
                staff_user = StaffUser(
                    user_id=req.user.id,
                    username=req.user.username,
                    email=req.user.email,
                    hashed_password=req.user.hashed_password,
                    role_id=creator_role.id,
                    is_active=True
                )
                db.add(staff_user)
            else:
                if staff_user.user_id not in (None, req.user.id):
                    raise HTTPException(409, 'This studio identity is already linked')
                if staff_user.role.system_key != 'creator':
                    raise HTTPException(409, 'Existing staff account cannot be replaced by creator approval')
                staff_user.user_id = req.user.id
                staff_user.is_active = True

        await db.commit()
        await db.refresh(req)
        return req
