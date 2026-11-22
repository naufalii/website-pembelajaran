from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import get_current_user
from app.domains.progress.schemas import DashboardResponseSchema, ProfileOverviewSchema, StreakDaySchema
from app.domains.progress.service import (
    get_dashboard_aggregate,
    get_profile_overview,
    get_streak_calendar,
)
from app.models.tables import User

router = APIRouter(prefix="/progress", tags=["5. Progress"])


@router.get("/dashboard", response_model=DashboardResponseSchema, summary="Data lengkap Bento Dashboard Beranda")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponseSchema:
    return await get_dashboard_aggregate(db, current_user)


@router.get("/streaks", response_model=List[StreakDaySchema], summary="Kalender streak mingguan pengguna")
async def streaks(
    days: int = Query(default=21, ge=7, le=35),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[StreakDaySchema]:
    return await get_streak_calendar(db, current_user.id, days=days)


@router.get("/profile", response_model=ProfileOverviewSchema, summary="Statistik fokus, lencana, & histori kuis")
async def profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOverviewSchema:
    return await get_profile_overview(db, current_user)
