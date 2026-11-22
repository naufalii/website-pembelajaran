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
    DEFAULT_DEMO_EMAIL,
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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Ambil user dari JWT Bearer token. Jika tidak ada header Authorization (mode eksplorasi cepat/demo),
    fallback otomatis ke akun bersih awal yang telah di-seed (`akun@fokussprints.id`).
    """
    if credentials is not None and credentials.credentials:
        decoded = decode_token(credentials.credentials)
        if not decoded or decoded.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token akses tidak valid atau sudah kedaluwarsa.",
            )
        user_id = str(decoded.get("sub", ""))
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Akun pengguna tidak ditemukan.",
            )
        return user

    demo_user = (
        await db.execute(select(User).where(User.email == DEFAULT_DEMO_EMAIL))
    ).scalar_one_or_none()
    if demo_user is None:
        demo_user = (await db.execute(select(User).limit(1))).scalar_one_or_none()
    if demo_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belum ada pengguna terdaftar. Jalankan database seeder atau daftar akun baru.",
        )
    return demo_user
