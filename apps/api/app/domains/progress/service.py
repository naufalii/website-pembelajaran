from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domains.auth.schemas import UserProfileSchema
from app.domains.courses.schemas import CourseDetailSchema
from app.domains.courses.service import serialize_lesson
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
from app.models.tables import (
    AiDocument,
    Course,
    FocusSession,
    LessonProgress,
    Quiz,
    QuizAttempt,
    User,
    UserStreak,
)

DAY_LABELS_ID = ["S", "S", "R", "K", "J", "S", "M"]
RECENT_ATTEMPTS_LIMIT = 15


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
    # Muat kursus aktif + seluruh pelajarannya dalam 1 round-trip SQL tunggal (LEFT JOIN)
    first_course_id_sq = (
        select(Course.id)
        .where(Course.is_published.is_(True))
        .order_by(Course.created_at)
        .limit(1)
        .scalar_subquery()
    )
    first_course = (
        await db.execute(
            select(Course)
            .where(Course.id == first_course_id_sq)
            .options(joinedload(Course.lessons))
        )
    ).unique().scalar_one_or_none()

    active_course: Optional[CourseDetailSchema] = None
    if first_course is not None:
        sorted_lessons = sorted(first_course.lessons, key=lambda l: l.order_index)
        lesson_ids = [l.id for l in sorted_lessons]
        progress_map: Dict[str, LessonProgress] = {}
        if lesson_ids:
            progress_rows = (
                await db.execute(
                    select(LessonProgress).where(
                        LessonProgress.user_id == user.id,
                        LessonProgress.lesson_id.in_(lesson_ids),
                    )
                )
            ).scalars().all()
            progress_map = {row.lesson_id: row for row in progress_rows}

        lessons_out = [serialize_lesson(lesson, progress_map.get(lesson.id)) for lesson in sorted_lessons]
        completed_lessons = sum(1 for item in lessons_out if item.is_completed)
        active_course = CourseDetailSchema(
            id=first_course.id,
            slug=first_course.slug,
            title=first_course.title,
            description=first_course.description,
            category=first_course.category,
            difficulty=first_course.difficulty,
            estimated_minutes=first_course.estimated_minutes,
            lesson_count=len(lessons_out),
            completed_lessons=completed_lessons,
            lessons=lessons_out,
        )

    # Ambil 1 kuis harian (prioritas multiple_choice, fallback tipe lain dalam 1 query terurut)
    daily_quiz_row = (
        await db.execute(
            select(Quiz)
            .order_by(
                case((Quiz.quiz_type == "multiple_choice", 0), else_=1),
                Quiz.created_at,
            )
            .limit(1)
        )
    ).scalar_one_or_none()

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
    """
    Optimasi 2 round-trip SQL (tanpa full-table scan Python dan tanpa N+1 query):
    1. Satu query agregat gabungan (FocusSession + QuizAttempt + AiDocument) langsung di SQL.
    2. Satu query LEFT OUTER JOIN (QuizAttempt + Quiz.title) terbatas LIMIT 15 terbaru.
    """
    completed_sessions_sq = (
        select(func.count(FocusSession.id))
        .where(FocusSession.user_id == user.id, FocusSession.status == "completed")
        .scalar_subquery()
    )
    focus_minutes_sq = (
        select(func.coalesce(func.sum(FocusSession.duration_minutes), 0))
        .where(FocusSession.user_id == user.id, FocusSession.status == "completed")
        .scalar_subquery()
    )
    tab_violations_sq = (
        select(func.coalesce(func.sum(FocusSession.tab_violations), 0))
        .where(FocusSession.user_id == user.id)
        .scalar_subquery()
    )
    clean_deep_focus_sq = (
        select(func.count(FocusSession.id))
        .where(
            FocusSession.user_id == user.id,
            FocusSession.status == "completed",
            FocusSession.tab_violations == 0,
        )
        .scalar_subquery()
    )
    total_quizzes_sq = (
        select(func.count(QuizAttempt.id))
        .where(QuizAttempt.user_id == user.id)
        .scalar_subquery()
    )
    correct_quizzes_sq = (
        select(func.count(QuizAttempt.id))
        .where(QuizAttempt.user_id == user.id, QuizAttempt.is_correct.is_(True))
        .scalar_subquery()
    )
    ai_doc_count_sq = (
        select(func.count(AiDocument.id))
        .where(AiDocument.user_id == user.id)
        .scalar_subquery()
    )

    # Round-trip 1: seluruh statistik numerik dalam 1 query SQL
    agg_row = (
        await db.execute(
            select(
                completed_sessions_sq.label("total_pomodoro"),
                focus_minutes_sq.label("total_focus_minutes"),
                tab_violations_sq.label("total_violations"),
                clean_deep_focus_sq.label("clean_focus_count"),
                total_quizzes_sq.label("total_quizzes"),
                correct_quizzes_sq.label("correct_quizzes"),
                ai_doc_count_sq.label("ai_doc_count"),
            )
        )
    ).one()

    total_pomodoro = int(agg_row.total_pomodoro or 0)
    total_focus_minutes = int(agg_row.total_focus_minutes or 0)
    total_violations = int(agg_row.total_violations or 0)
    has_clean_focus = int(agg_row.clean_focus_count or 0) > 0
    total_quizzes = int(agg_row.total_quizzes or 0)
    correct_quizzes = int(agg_row.correct_quizzes or 0)
    ai_doc_count = int(agg_row.ai_doc_count or 0)
    accuracy = int(round((correct_quizzes / total_quizzes) * 100)) if total_quizzes > 0 else 0

    # Round-trip 2: 15 riwayat kuis terbaru dengan LEFT JOIN judul kuis (tanpa N+1 & tanpa JSONB)
    recent_rows = (
        await db.execute(
            select(
                QuizAttempt.id,
                QuizAttempt.is_correct,
                QuizAttempt.xp_earned,
                QuizAttempt.multiplier_applied,
                QuizAttempt.attempted_at,
                Quiz.title.label("quiz_title"),
            )
            .outerjoin(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(QuizAttempt.user_id == user.id)
            .order_by(QuizAttempt.attempted_at.desc())
            .limit(RECENT_ATTEMPTS_LIMIT)
        )
    ).all()

    recent_attempts = [
        QuizAttemptSummarySchema(
            id=row.id,
            quiz_title=row.quiz_title or "Kuis Kilat",
            is_correct=bool(row.is_correct),
            xp_earned=int(row.xp_earned),
            multiplier_applied=int(row.multiplier_applied),
            attempted_at=row.attempted_at.isoformat(),
        )
        for row in recent_rows
    ]

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
            unlocked=has_clean_focus,
            progress_label="Aktif" if has_clean_focus else "0/1 Sesi",
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
