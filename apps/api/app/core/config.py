from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "fokussprints-dev-secret-key-ganti-di-production-minimal-32-karakter"
MIN_ACCESS_TOKEN_MINUTES = 10080  # 7 hari


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    APP_NAME: str = "FokusSprints API"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./fokussprints_dev.db"
    REDIS_URL: str = ""
    # Konsisten membaca dari env var (JWT_SECRET / JWT_SECRET_KEY / SECRET_KEY)
    # tanpa pernah meng-generate secret acak saat cold start serverless.
    JWT_SECRET: str = Field(
        default=DEFAULT_JWT_SECRET,
        validation_alias=AliasChoices("JWT_SECRET", "JWT_SECRET_KEY", "SECRET_KEY"),
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = MIN_ACCESS_TOKEN_MINUTES
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://fokussprints.vercel.app"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    @field_validator("JWT_SECRET", mode="before")
    @classmethod
    def ensure_non_empty_jwt_secret(cls, value: object) -> str:
        if isinstance(value, str) and value.strip():
            return value.strip()
        return DEFAULT_JWT_SECRET

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES", mode="after")
    @classmethod
    def ensure_minimum_access_ttl(cls, value: int) -> int:
        return max(value, MIN_ACCESS_TOKEN_MINUTES)

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
