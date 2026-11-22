from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.schemas import UserProfileSchema
from app.domains.courses.service import get_course_detail
from app.domains.gamification.service import (
    get_active_focus_session,
    get_leaderboard,
    list_daily_quests,
)
from app.domains.progress.schemas import (
    BadgeItemSchema,
    DashboardResponseSchema,
    ProfileOverviewSchema,
    QuizAttemptSummarySchema,
    StreakDaySchema,
)
from app.domains.quizzes.service import serialize_quiz
from app.domains.shared_helpers import user_to_profile_dict
from app.models.tables import AiDocument, Course, FocusSession, Quiz, QuizAttempt, User, UserStreak

DAY_LABELS_ID = ["S", "S", "R", "K", "J", "S", "M"]


async def get_streak_calendar(db: AsyncSession, user_id: str, days: int = 21) -> List[StreakDaySchema]:
    today = date.today()
    # Mulai kalender dari hari Senin minggu (2 minggu lalu) supaya grid 7-kolom S S R K J S M selalu rapi
    current_monday = today - timedelta(days=today.weekday())
    grid_start = current_monday - timedelta(days=14)
    rows = (
        await db.execute(
            select(UserStreak).where(
                UserStreak.user_id == user_id,
                UserStreak.activity_date >= grid_start,
            )
        )
    ).scalars().all()
    by_date: Dict[date, UserStreak] = {row.activity_date: row for row in rows}

    calendar: List[StreakDaySchema] = []
    for offset in range(days):
        day_dt = grid_start + timedelta(days=offset)
        entry = by_date.get(day_dt)
        completed = bool(
            entry and (entry.xp_earned > 0 or entry.pomodoro_sessions > 0 or entry.quizzes_completed > 0)
        )
        calendar.append(
            StreakDaySchema(
                date=day_dt.isoformat(),
                day_label=DAY_LABELS_ID[day_dt.weekday()],
                completed=completed,
                is_today=day_dt == today,
                pomodoro_sessions=entry.pomodoro_sessions if entry else 0,
                xp_earned=entry.xp_earned if entry else 0,
            )
        )
    return calendar


async def get_dashboard_aggregate(db: AsyncSession, user: User) -> DashboardResponseSchema:
    first_course = (
        await db.execute(select(Course).where(Course.is_published.is_(True)).order_by(Course.created_at).limit(1))
    ).scalar_one_or_none()
    active_course = await get_course_detail(db, first_course.id, user.id) if first_course else None

    daily_quiz_row = (
        await db.execute(
            select(Quiz).where(Quiz.quiz_type == "multiple_choice").order_by(Quiz.created_at).limit(1)
        )
    ).scalar_one_or_none()
    if daily_quiz_row is None:
        daily_quiz_row = (await db.execute(select(Quiz).limit(1))).scalar_one_or_none()

    streak_calendar = await get_streak_calendar(db, user.id, days=21)
    leaderboard = await get_leaderboard(db, user, limit=5)
    quests = await list_daily_quests(db, user.id)
    active_focus = await get_active_focus_session(db, user.id)

    return DashboardResponseSchema(
        user=UserProfileSchema(**user_to_profile_dict(user)),
        active_course=active_course,
        daily_quiz=serialize_quiz(daily_quiz_row) if daily_quiz_row else None,
        streak_calendar=streak_calendar,
        leaderboard_top=leaderboard.entries[:3],
        daily_quests=quests,
        active_focus_session=active_focus,
    )


async def get_profile_overview(db: AsyncSession, user: User) -> ProfileOverviewSchema:
    sessions = (
        await db.execute(select(FocusSession).where(FocusSession.user_id == user.id))
    ).scalars().all()
    completed_sessions = [s for s in sessions if s.status == "completed"]
    total_pomodoro = len(completed_sessions)
    total_focus_minutes = sum(s.duration_minutes for s in completed_sessions)
    total_violations = sum(s.tab_violations for s in sessions)

    attempts = (
        await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user.id)
            .order_by(QuizAttempt.attempted_at.desc())
        )
    ).scalars().all()
    total_quizzes = len(attempts)
    correct_quizzes = sum(1 for a in attempts if a.is_correct)
    accuracy = int(round((correct_quizzes / total_quizzes) * 100)) if total_quizzes > 0 else 0

    quiz_ids = [a.quiz_id for a in attempts[:10]]
    quizzes_map: Dict[str, Quiz] = {}
    if quiz_ids:
        quiz_rows = (await db.execute(select(Quiz).where(Quiz.id.in_(quiz_ids)))).scalars().all()
        quizzes_map = {q.id: q for q in quiz_rows}

    recent_attempts = [
        QuizAttemptSummarySchema(
            id=a.id,
            quiz_title=quizzes_map[a.quiz_id].title if a.quiz_id in quizzes_map else "Kuis Kilat",
            is_correct=a.is_correct,
            xp_earned=a.xp_earned,
            multiplier_applied=a.multiplier_applied,
            attempted_at=a.attempted_at.isoformat(),
        )
        for a in attempts[:8]
    ]

    ai_doc_count = len(
        (await db.execute(select(AiDocument.id).where(AiDocument.user_id == user.id))).scalars().all()
    )

    badges = [
        BadgeItemSchema(
            code="streak_7",
            title="Penjaga Api 7 Hari",
            description="Pertahankan streak belajar minimal 7 hari berturut-turut.",
            unlocked=user.current_streak >= 7 or user.longest_streak >= 7,
            progress_label=f"{min(7, user.current_streak)}/7 Hari",
            tier="gold",
        ),
        BadgeItemSchema(
            code="deep_focus_master",
            title="Arsitek Deep Focus",
            description="Selesaikan sesi Focus Mode 25 menit dengan multiplier 2x aktif.",
            unlocked=any(s.status == "completed" and s.tab_violations == 0 for s in sessions),
            progress_label="Aktif" if any(s.status == "completed" and s.tab_violations == 0 for s in sessions) else "0/1 Sesi",
            tier="mint",
        ),
        BadgeItemSchema(
            code="xp_1000",
            title="Kolektor Seribu XP",
            description="Kumpulkan total 1.000 XP dari video mikro, kuis, dan misi.",
            unlocked=user.xp >= 1000,
            progress_label=f"{min(1000, user.xp)}/1.000 XP",
            tier="gold",
        ),
        BadgeItemSchema(
            code="quiz_sprinter",
            title="Sprinter Kuis Kilat",
            description="Selesaikan minimal 5 kuis interaktif lintas tipe.",
            unlocked=total_quizzes >= 5,
            progress_label=f"{min(5, total_quizzes)}/5 Kuis",
            tier="cream",
        ),
        BadgeItemSchema(
            code="ai_alchemist",
            title="Alkemis Catatan AI",
            description="Konversi catatan atau PDF menjadi dek 3D Flashcard.",
            unlocked=ai_doc_count >= 1,
            progress_label=f"{min(1, ai_doc_count)}/1 Dokumen",
            tier="mint",
        ),
        BadgeItemSchema(
            code="level_6_trailblazer",
            title="Pelopor Level 6",
            description="Capai ambang 2.000 XP untuk menembus Level 6.",
            unlocked=user.xp >= 2000,
            progress_label=f"{min(2000, user.xp)}/2.000 XP",
            tier="gold",
        ),
    ]

    return ProfileOverviewSchema(
        user=UserProfileSchema(**user_to_profile_dict(user)),
        total_pomodoro_completed=total_pomodoro,
        total_focus_minutes=total_focus_minutes,
        total_quizzes_answered=total_quizzes,
        quiz_accuracy_percent=accuracy,
        total_tab_violations=total_violations,
        badges=badges,
        recent_attempts=recent_attempts,
    )
