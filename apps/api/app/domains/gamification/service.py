from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.gamification.schemas import (
    CreateDailyQuestRequest,
    DailyQuestSchema,
    FocusCompleteResponseSchema,
    FocusSessionSchema,
    LeaderboardEntrySchema,
    LeaderboardResponseSchema,
    QuestClaimResponseSchema,
)
from app.domains.shared_helpers import (
    advance_quest_progress,
    award_xp_to_user,
    ensure_daily_quests_for_today,
    record_today_streak,
)
from app.models.tables import DailyQuest, FocusSession, User
from app.services.redis_service import redis_service


def serialize_quest(quest: DailyQuest) -> DailyQuestSchema:
    return DailyQuestSchema(
        id=quest.id,
        quest_code=quest.quest_code,
        title=quest.title,
        description=quest.description,
        xp_reward=quest.xp_reward,
        target_count=quest.target_count,
        current_count=quest.current_count,
        is_completed=quest.is_completed,
        is_claimed=quest.is_claimed,
    )


def serialize_focus_session(session: FocusSession) -> FocusSessionSchema:
    return FocusSessionSchema(
        id=session.id,
        duration_minutes=session.duration_minutes,
        tab_violations=session.tab_violations,
        multiplier_active=session.multiplier_active,
        status=session.status,  # type: ignore[arg-type]
        started_at=session.started_at.isoformat(),
        completed_at=session.completed_at.isoformat() if session.completed_at else None,
    )


async def sync_leaderboard_from_db(db: AsyncSession) -> None:
    users = (
        await db.execute(select(User.id, User.xp).where(User.xp > 0).order_by(User.xp.desc()).limit(100))
    ).all()
    if users:
        await redis_service.set_leaderboard_scores_bulk({uid: int(xp) for uid, xp in users})


async def get_leaderboard(
    db: AsyncSession, current_user: User, limit: int = 20
) -> LeaderboardResponseSchema:
    ranked_pairs = await redis_service.get_leaderboard_top(limit=limit)
    entries: List[LeaderboardEntrySchema] = []
    source = "database"

    if ranked_pairs:
        user_ids = [uid for uid, score in ranked_pairs if score > 0]
        users_list = (
            await db.execute(select(User).where(User.id.in_(user_ids)))
        ).scalars().all() if user_ids else []
        users_by_id: Dict[str, User] = {u.id: u for u in users_list}

        for uid, score in ranked_pairs:
            user_row = users_by_id.get(uid)
            if user_row is None or max(score, user_row.xp) <= 0:
                continue
            entries.append(
                LeaderboardEntrySchema(
                    rank=len(entries) + 1,
                    user_id=user_row.id,
                    full_name=user_row.full_name,
                    avatar_seed=user_row.avatar_seed,
                    level=user_row.level,
                    xp=max(score, user_row.xp),
                    current_streak=user_row.current_streak,
                    is_current_user=user_row.id == current_user.id,
                )
            )
        if entries:
            source = redis_service.source_name

    # Cold-start atau Redis kosong: cukup 1 query DB langsung + bulk warm cache tanpa round-trip ganda
    if not entries:
        top_users = (
            await db.execute(
                select(User).where(User.xp > 0).order_by(User.xp.desc()).limit(limit)
            )
        ).scalars().all()
        if top_users:
            await redis_service.set_leaderboard_scores_bulk({u.id: u.xp for u in top_users})
        for idx, u in enumerate(top_users, start=1):
            entries.append(
                LeaderboardEntrySchema(
                    rank=idx,
                    user_id=u.id,
                    full_name=u.full_name,
                    avatar_seed=u.avatar_seed,
                    level=u.level,
                    xp=u.xp,
                    current_streak=u.current_streak,
                    is_current_user=u.id == current_user.id,
                )
            )

    current_rank = next((e.rank for e in entries if e.user_id == current_user.id), None)
    if current_rank is None:
        if current_user.xp > 0:
            current_rank = (await redis_service.get_user_rank(current_user.id)) or (len(entries) + 1)
        else:
            current_rank = 0

    return LeaderboardResponseSchema(
        entries=entries,
        current_user_rank=current_rank,
        current_user_xp=current_user.xp,
        source=source,  # type: ignore[arg-type]
    )


async def list_daily_quests(db: AsyncSession, user_id: str) -> List[DailyQuestSchema]:
    today = date.today()
    stmt = (
        select(DailyQuest)
        .where(DailyQuest.user_id == user_id, DailyQuest.quest_date == today)
        .order_by(DailyQuest.quest_code)
    )
    quests = list((await db.execute(stmt)).scalars().all())
    if not quests:
        has_any_quests = (await db.execute(select(DailyQuest.id).limit(1))).scalar_one_or_none()
        if has_any_quests is not None:
            quests = await ensure_daily_quests_for_today(db, user_id)
            await db.commit()
            quests.sort(key=lambda q: q.quest_code)
    return [serialize_quest(q) for q in quests]


async def create_daily_quest(
    db: AsyncSession, user_id: str, payload: CreateDailyQuestRequest
) -> DailyQuestSchema:
    quest = DailyQuest(
        id=str(uuid4()),
        user_id=user_id,
        quest_code=payload.quest_code.strip(),
        title=payload.title.strip(),
        description=payload.description.strip(),
        xp_reward=payload.xp_reward,
        target_count=payload.target_count,
        current_count=0,
        is_completed=False,
        is_claimed=False,
        quest_date=date.today(),
    )
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    return serialize_quest(quest)


async def claim_daily_quest(
    db: AsyncSession, quest_id: str, user: User
) -> QuestClaimResponseSchema:
    quest = (
        await db.execute(
            select(DailyQuest).where(DailyQuest.id == quest_id, DailyQuest.user_id == user.id)
        )
    ).scalar_one_or_none()
    if quest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Misi harian tidak ditemukan.")
    if not quest.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Misi harian ini belum memenuhi target penyelesaian.",
        )
    if quest.is_claimed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hadiah XP untuk misi ini sudah diklaim.",
        )

    quest.is_claimed = True
    updated_xp, updated_level, _ = await award_xp_to_user(db, user, quest.xp_reward)
    await record_today_streak(db, user, xp_delta=quest.xp_reward)
    await db.commit()
    await db.refresh(quest)

    return QuestClaimResponseSchema(
        quest_id=quest.id,
        xp_earned=quest.xp_reward,
        updated_xp=updated_xp,
        updated_level=updated_level,
        quest=serialize_quest(quest),
    )


async def start_focus_session(
    db: AsyncSession, user: User, duration_minutes: int
) -> FocusSessionSchema:
    active_sessions = (
        await db.execute(
            select(FocusSession).where(
                FocusSession.user_id == user.id,
                FocusSession.status == "active",
            )
        )
    ).scalars().all()
    for prev in active_sessions:
        prev.status = "cancelled"
        prev.completed_at = datetime.now(timezone.utc)

    session = FocusSession(
        id=str(uuid4()),
        user_id=user.id,
        duration_minutes=duration_minutes,
        tab_violations=0,
        multiplier_active=2,
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    serialized = serialize_focus_session(session)
    await redis_service.set_focus_session(user.id, serialized.model_dump())
    return serialized


async def report_focus_violation(
    db: AsyncSession, session_id: str, user: User
) -> FocusSessionSchema:
    session = (
        await db.execute(
            select(FocusSession).where(
                FocusSession.id == session_id,
                FocusSession.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesi fokus tidak ditemukan.")

    session.tab_violations += 1
    session.multiplier_active = 1
    await db.commit()
    await db.refresh(session)

    serialized = serialize_focus_session(session)
    await redis_service.set_focus_session(user.id, serialized.model_dump())
    return serialized


async def complete_focus_session(
    db: AsyncSession, session_id: str, user: User
) -> FocusCompleteResponseSchema:
    session = (
        await db.execute(
            select(FocusSession).where(
                FocusSession.id == session_id,
                FocusSession.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesi fokus tidak ditemukan.")

    if session.status == "completed":
        return FocusCompleteResponseSchema(
            session=serialize_focus_session(session),
            xp_earned=0,
            updated_xp=user.xp,
            updated_level=user.level,
        )

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)

    base_xp = 35
    xp_earned = base_xp * session.multiplier_active
    updated_xp, updated_level, _ = await award_xp_to_user(db, user, xp_earned)
    await record_today_streak(db, user, xp_delta=xp_earned, pomodoro_delta=1)
    await advance_quest_progress(db, user.id, "pomodoro_1", 1)
    if session.tab_violations == 0:
        await advance_quest_progress(db, user.id, "zero_distraction", 1)

    await db.commit()
    await db.refresh(session)
    await redis_service.clear_focus_session(user.id)

    return FocusCompleteResponseSchema(
        session=serialize_focus_session(session),
        xp_earned=xp_earned,
        updated_xp=updated_xp,
        updated_level=updated_level,
    )


async def get_active_focus_session(
    db: AsyncSession, user_id: str
) -> Optional[FocusSessionSchema]:
    cached = await redis_service.get_focus_session(user_id)
    if cached and cached.get("status") == "active":
        return FocusSessionSchema(**cached)
    db_row = (
        await db.execute(
            select(FocusSession)
            .where(FocusSession.user_id == user_id, FocusSession.status == "active")
            .order_by(FocusSession.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if db_row is None:
        return None
    serialized = serialize_focus_session(db_row)
    await redis_service.set_focus_session(user_id, serialized.model_dump())
    return serialized
