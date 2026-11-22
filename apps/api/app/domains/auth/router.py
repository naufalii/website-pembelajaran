from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.schemas import (
    AuthTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    UserProfileSchema,
)
from app.domains.auth.service import get_current_user, login_user, refresh_user_token, register_user
from app.domains.shared_helpers import user_to_profile_dict
from app.models.tables import User

router = APIRouter(prefix="/auth", tags=["1. Auth"])


@router.post("/register", response_model=AuthTokenResponse, summary="Registrasi akun FokusSprints baru")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    return await register_user(db, payload)


@router.post("/login", response_model=AuthTokenResponse, summary="Masuk dan dapatkan JWT token")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    return await login_user(db, payload)


@router.post("/refresh", response_model=AuthTokenResponse, summary="Perbarui access token")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    return await refresh_user_token(db, payload.refresh_token)


@router.get("/me", response_model=UserProfileSchema, summary="Profil pengguna aktif saat ini")
async def get_me(current_user: User = Depends(get_current_user)) -> UserProfileSchema:
    return UserProfileSchema(**user_to_profile_dict(current_user))
