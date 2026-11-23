from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import IS_VERCEL
from app.domains.auth.router import router as auth_router
from app.domains.courses.router import router as courses_router
from app.domains.gamification.router import router as gamification_router
from app.domains.lessons.router import router as lessons_router
from app.domains.progress.router import router as progress_router
from app.domains.quizzes.router import router as quizzes_router
from app.seed import init_db_and_seed
from app.services.redis_service import redis_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = app
    await redis_service.connect()
    if not IS_VERCEL:
        # Di lokal/dev, pastikan tabel & akun awal tersedia; di Vercel serverless,
        # hindari DDL create_all() + full-table scan pada setiap cold start.
        await init_db_and_seed()
    yield
    await redis_service.close()


app = FastAPI(
    title="FokusSprints API",
    version="1.0.0",
    description=(
        "Backend REST API modular (6 Domain) untuk FokusSprints — Platform Gamified Micro-Learning "
        "& Deep-Focus dengan PostgreSQL JSONB, Redis Sorted Sets, dan AI Study Converter."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"], summary="Root status FokusSprints API")
async def root_status() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "FokusSprints API",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"], summary="Status kesehatan API & koneksi Redis/Database")
async def health_check() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "leaderboard_backend": redis_service.source_name,
    }


API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(courses_router, prefix=API_PREFIX)
app.include_router(lessons_router, prefix=API_PREFIX)
app.include_router(quizzes_router, prefix=API_PREFIX)
app.include_router(progress_router, prefix=API_PREFIX)
app.include_router(gamification_router, prefix=API_PREFIX)
