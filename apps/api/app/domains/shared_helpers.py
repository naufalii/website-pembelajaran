from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Dict, List
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import compute_level_bounds
from app.models.tables import DailyQuest, User, UserStreak
from app.services.redis_service import redis_service

DEFAULT_DEMO_EMAIL = "akun@fokussprints.id"

DAILY_QUEST_TEMPLATES: List[Dict[str, object]] = [
    {
        "quest_code": "micro_video_finish",
        "title": "Tuntaskan 1 Video Mikro",
        "description": "Selesaikan 1 pelajaran video mikro hingga tuntas untuk meraih bonus XP.",
        "xp_reward": 50,
        "target_count": 1,
    },
    {
        "quest_code": "perfect_quiz",
        "title": "Selesaikan 3 Soal Kuis Kilat",
        "description": "Jawab tepat 3 soal dari Kuis Kilat atau checkpoint video hari ini.",
        "xp_reward": 75,
        "target_count": 3,
    },
    {
        "quest_code": "pomodoro_1",
        "title": "Selesaikan 1 Sesi Fokus Pomodoro",
        "description": "Jalankan timer fokus Pomodoro sampai selesai agar ritme belajar terjaga.",
        "xp_reward": 100,
        "target_count": 1,
    },
]


def user_to_profile_dict(user: User) -> Dict[str, object]:
    level, floor_xp, next_xp = compute_level_bounds(user.xp)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_seed": user.avatar_seed,
        "xp": user.xp,
        "level": level,
        "xp_current_level_floor": floor_xp,
        "xp_next_level_target": next_xp,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
    }


async def ensure_daily_quests_for_today(db: AsyncSession, user_id: str) -> List[DailyQuest]:
    today = date.today()
    stmt = select(DailyQuest).where(
        DailyQuest.user_id == user_id,
        DailyQuest.quest_date == today,
    )
    existing = list((await db.execute(stmt)).scalars().all())
    if existing:
        return existing

    created: List[DailyQuest] = []
    for tpl in DAILY_QUEST_TEMPLATES:
        quest = DailyQuest(
            id=str(uuid4()),
            user_id=user_id,
            quest_code=str(tpl["quest_code"]),
            title=str(tpl["title"]),
            description=str(tpl["description"]),
            xp_reward=int(tpl["xp_reward"]),  # type: ignore[arg-type]
            target_count=int(tpl["target_count"]),  # type: ignore[arg-type]
            current_count=0,
            is_completed=False,
            is_claimed=False,
            quest_date=today,
        )
        db.add(quest)
        created.append(quest)
    await db.flush()
    return created


async def advance_quest_progress(
    db: AsyncSession, user_id: str, quest_code: str, increment: int = 1
) -> None:
    today = date.today()
    stmt = select(DailyQuest).where(
        DailyQuest.user_id == user_id,
        DailyQuest.quest_date == today,
        DailyQuest.quest_code == quest_code,
    )
    quests = list((await db.execute(stmt)).scalars().all())
    if not quests:
        has_any_quests = (await db.execute(select(DailyQuest.id).limit(1))).scalar_one_or_none()
        if has_any_quests is not None:
            ensured = await ensure_daily_quests_for_today(db, user_id)
            quests = [q for q in ensured if q.quest_code == quest_code]
    for quest in quests:
        if not quest.is_completed:
            quest.current_count = min(quest.target_count, quest.current_count + increment)
            if quest.current_count >= quest.target_count:
                quest.is_completed = True


async def record_today_streak(
    db: AsyncSession,
    user: User,
    xp_delta: int = 0,
    pomodoro_delta: int = 0,
    quiz_delta: int = 0,
    lesson_delta: int = 0,
) -> None:
    today = date.today()
    stmt = select(UserStreak).where(
        UserStreak.user_id == user.id,
        UserStreak.activity_date == today,
    )
    streak_row = (await db.execute(stmt)).scalar_one_or_none()
    if streak_row is None:
        streak_row = UserStreak(
            id=str(uuid4()),
            user_id=user.id,
            activity_date=today,
            pomodoro_sessions=pomodoro_delta,
            quizzes_completed=quiz_delta,
            lessons_completed=lesson_delta,
            xp_earned=xp_delta,
        )
        db.add(streak_row)
        if user.current_streak == 0:
            user.current_streak = 1
        user.longest_streak = max(user.longest_streak, user.current_streak)
    else:
        streak_row.pomodoro_sessions += pomodoro_delta
        streak_row.quizzes_completed += quiz_delta
        streak_row.lessons_completed += lesson_delta
        streak_row.xp_earned += xp_delta


async def award_xp_to_user(db: AsyncSession, user: User, xp_delta: int) -> tuple[int, int, bool]:
    """Tambah XP ke user, hitung naik level, sinkronkan ke Redis ZSET."""
    old_level = user.level
    user.xp += xp_delta
    new_level, _, _ = compute_level_bounds(user.xp)
    user.level = new_level
    user.updated_at = datetime.now(timezone.utc)
    await redis_service.set_leaderboard_score(user.id, user.xp)
    return user.xp, new_level, new_level > old_level
