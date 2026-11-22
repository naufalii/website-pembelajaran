from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import get_current_user
from app.domains.gamification.schemas import (
    CreateDailyQuestRequest,
    DailyQuestSchema,
    FocusCompleteResponseSchema,
    FocusSessionSchema,
    FocusStartRequest,
    LeaderboardResponseSchema,
    QuestClaimResponseSchema,
)
from app.domains.gamification.service import (
    claim_daily_quest,
    complete_focus_session,
    create_daily_quest,
    get_leaderboard,
    list_daily_quests,
    report_focus_violation,
    start_focus_session,
)
from app.models.tables import User

router = APIRouter(prefix="/gamification", tags=["6. Gamification"])


@router.get("/leaderboard", response_model=LeaderboardResponseSchema, summary="Papan peringkat XP real-time (Redis ZSET)")
async def leaderboard(
    limit: int = Query(default=20, ge=3, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LeaderboardResponseSchema:
    return await get_leaderboard(db, current_user, limit=limit)


@router.get("/quests", response_model=List[DailyQuestSchema], summary="Daftar Misi Harian pengguna")
async def quests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DailyQuestSchema]:
    return await list_daily_quests(db, current_user.id)


@router.post("/quests", response_model=DailyQuestSchema, status_code=201, summary="Tambah Misi Harian baru untuk pengguna aktif")
async def post_quest(
    payload: CreateDailyQuestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyQuestSchema:
    return await create_daily_quest(db, current_user.id, payload)


@router.post("/quests/{quest_id}/claim", response_model=QuestClaimResponseSchema, summary="Klaim hadiah XP dari Misi Harian")
async def claim_quest(
    quest_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuestClaimResponseSchema:
    return await claim_daily_quest(db, quest_id, current_user)


@router.post("/focus/start", response_model=FocusSessionSchema, summary="Mulai sesi Focus Mode Pomodoro (aktif 2x XP)")
async def focus_start(
    payload: FocusStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FocusSessionSchema:
    return await start_focus_session(db, current_user, payload.duration_minutes)


@router.post("/focus/{session_id}/violation", response_model=FocusSessionSchema, summary="Catat pelanggaran pindah tab & nonaktifkan 2x XP")
async def focus_violation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FocusSessionSchema:
    return await report_focus_violation(db, session_id, current_user)


@router.post("/focus/{session_id}/complete", response_model=FocusCompleteResponseSchema, summary="Selesaikan sesi Pomodoro & perbarui Streak/Misi")
async def focus_complete(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FocusCompleteResponseSchema:
    return await complete_focus_session(db, session_id, current_user)
