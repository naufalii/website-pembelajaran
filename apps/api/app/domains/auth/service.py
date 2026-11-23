from __future__ import annotations

from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.domains.auth.schemas import AuthTokenResponse, LoginRequest, RegisterRequest, UserProfileSchema
from app.domains.shared_helpers import (
    user_to_profile_dict,
)
from app.models.tables import User
from app.services.redis_service import redis_service

bearer_scheme = HTTPBearer(auto_error=False)


async def register_user(db: AsyncSession, payload: RegisterRequest) -> AuthTokenResponse:
    existing = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar. Silakan masuk dengan akun tersebut.",
        )

    user = User(
        id=str(uuid4()),
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        avatar_seed=payload.full_name.strip().split(" ")[0].lower() or "fokus",
        xp=0,
        level=1,
        current_streak=0,
        longest_streak=0,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return AuthTokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfileSchema(**user_to_profile_dict(user)),
    )


async def login_user(db: AsyncSession, payload: LoginRequest) -> AuthTokenResponse:
    user = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak sesuai.",
        )
    if user.xp > 0:
        await redis_service.set_leaderboard_score(user.id, user.xp)

    return AuthTokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfileSchema(**user_to_profile_dict(user)),
    )


async def refresh_user_token(db: AsyncSession, refresh_token: str) -> AuthTokenResponse:
    decoded = decode_token(refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid atau kedaluwarsa.",
        )
    user_id = str(decoded.get("sub", ""))
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pengguna tidak ditemukan.")

    return AuthTokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfileSchema(**user_to_profile_dict(user)),
    )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Autentikasi opsional untuk endpoint katalog publik (Courses, Lessons, Quizzes).
    Jika Bearer token valid, kembalikan pengguna agar progres personal ikut ditampilkan.
    Jika tidak ada token atau token kedaluwarsa/tidak valid, kembalikan None tanpa 401.
    """
    if credentials is None or not credentials.credentials:
        return None
    decoded = decode_token(credentials.credentials)
    if not decoded or decoded.get("type") != "access":
        return None
    user_id = str(decoded.get("sub", ""))
    if not user_id:
        return None
    return (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Ambil pengguna aktif dari JWT Bearer token.
    Endpoint personal wajib menyertakan token valid dan mengembalikan 401 jika belum masuk
    atau sesi sudah kedaluwarsa.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kamu belum masuk akun. Silakan masuk terlebih dahulu.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    decoded = decode_token(credentials.credentials)
    if not decoded or decoded.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi masuk telah berakhir atau token tidak valid. Silakan masuk kembali.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(decoded.get("sub", ""))
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna tidak ditemukan. Silakan masuk kembali.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
