from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel

from app.domains.auth.schemas import UserProfileSchema
from app.domains.courses.schemas import CourseDetailSchema
from app.domains.gamification.schemas import (
    DailyQuestSchema,
    FocusSessionSchema,
    LeaderboardEntrySchema,
)
from app.domains.quizzes.schemas import QuizItemSchema


class StreakDaySchema(BaseModel):
    date: str
    day_label: str
    completed: bool
    is_today: bool
    pomodoro_sessions: int
    xp_earned: int


class DashboardResponseSchema(BaseModel):
    user: UserProfileSchema
    active_course: Optional[CourseDetailSchema] = None
    daily_quiz: Optional[QuizItemSchema] = None
    streak_calendar: List[StreakDaySchema]
    leaderboard_top: List[LeaderboardEntrySchema]
    daily_quests: List[DailyQuestSchema]
    active_focus_session: Optional[FocusSessionSchema] = None


class BadgeItemSchema(BaseModel):
    code: str
    title: str
    description: str
    unlocked: bool
    progress_label: str
    tier: Literal["gold", "mint", "cream"]


class QuizAttemptSummarySchema(BaseModel):
    id: str
    quiz_title: str
    is_correct: bool
    xp_earned: int
    multiplier_applied: int
    attempted_at: str


class ProfileOverviewSchema(BaseModel):
    user: UserProfileSchema
    total_pomodoro_completed: int
    total_focus_minutes: int
    total_quizzes_answered: int
    quiz_accuracy_percent: int
    total_tab_violations: int
    badges: List[BadgeItemSchema]
    recent_attempts: List[QuizAttemptSummarySchema]
