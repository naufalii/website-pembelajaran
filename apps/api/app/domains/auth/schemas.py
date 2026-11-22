from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserProfileSchema(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    avatar_seed: str
    xp: int
    level: int
    xp_current_level_floor: int
    xp_next_level_target: int
    current_streak: int
    longest_streak: int


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserProfileSchema
