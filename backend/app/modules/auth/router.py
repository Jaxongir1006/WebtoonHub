import uuid
from typing import List, Tuple
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user_and_session
from app.modules.auth.schemas import (
    RefreshTokenRequest,
    TokenResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserLoginRequest,
    UserSessionItem,
    UserSummary
)
from app.modules.auth.service import AuthService
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.register(db, data)
    return {
        "success": True,
        "data": {
            "user": UserSummary.model_validate(user)
        },
        "message": "Ro'yxatdan muvaffaqiyatli o'tdingiz. Hisobingizga 50 Chaqmoq qo'shildi!"
    }


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    request: Request,
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    token_data = await AuthService.login(
        db=db,
        email=data.email,
        password=data.password,
        ip_address=client_ip,
        user_agent=user_agent
    )
    return {
        "success": True,
        "data": token_data,
        "message": "Tizimga xush kelibsiz"
    }


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    new_access_token = await AuthService.refresh_access_token(db, data.refresh_token)
    return {
        "success": True,
        "data": {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": 3600
        },
        "message": "Token muvaffaqiyatli yangilandi"
    }


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_my_profile(
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, _ = auth_data
    profile = await AuthService.get_profile(db, user.id)
    return {
        "success": True,
        "data": profile
    }


@router.get("/sessions", status_code=status.HTTP_200_OK)
async def list_sessions(
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session_id = auth_data
    sessions = await AuthService.list_sessions(db, user.id, session_id)
    return {
        "success": True,
        "data": sessions
    }


@router.delete("/sessions/other", status_code=status.HTTP_200_OK)
async def revoke_other_sessions(
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session_id = auth_data
    await AuthService.revoke_other_sessions(db, user.id, session_id)
    return {
        "success": True,
        "data": None,
        "message": "Boshqa barcha qurilmalardagi seanslar bekor qilindi"
    }


@router.delete("/sessions/{id}", status_code=status.HTTP_200_OK)
async def revoke_session(
    id: uuid.UUID,
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, _ = auth_data
    await AuthService.revoke_session(db, user.id, id)
    return {
        "success": True,
        "data": None,
        "message": "Seans muvaffaqiyatli yakunlandi"
    }


@router.patch("/profile", status_code=status.HTTP_200_OK)
async def update_profile(
    data: UserProfileUpdateRequest,
    auth_data: Tuple[User, str] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, _ = auth_data
    updated_user = await AuthService.update_profile(db, user.id, data)
    return {
        "success": True,
        "data": {
            "id": updated_user.id,
            "username": updated_user.username,
            "email": updated_user.email
        },
        "message": "Profil ma'lumotlari muvaffaqiyatli yangilandi"
    }
