from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class LeaderboardEntrySchema(BaseModel):
    rank: int
    user_id: str
    full_name: str
    avatar_seed: str
    level: int
    xp: int
    current_streak: int
    is_current_user: bool = False


class LeaderboardResponseSchema(BaseModel):
    entries: List[LeaderboardEntrySchema]
    current_user_rank: int
    current_user_xp: int
    source: Literal["redis_zset", "memory_zset", "database"]


class DailyQuestSchema(BaseModel):
    id: str
    quest_code: str
    title: str
    description: str
    xp_reward: int
    target_count: int
    current_count: int
    is_completed: bool
    is_claimed: bool


class CreateDailyQuestRequest(BaseModel):
    quest_code: str = Field(min_length=2, max_length=64)
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=5, max_length=500)
    xp_reward: int = Field(default=50, ge=5, le=1000)
    target_count: int = Field(default=1, ge=1, le=20)


class QuestClaimResponseSchema(BaseModel):
    quest_id: str
    xp_earned: int
    updated_xp: int
    updated_level: int
    quest: DailyQuestSchema


class FocusStartRequest(BaseModel):
    duration_minutes: int = Field(default=25, ge=1, le=120)


class FocusSessionSchema(BaseModel):
    id: str
    duration_minutes: int
    tab_violations: int
    multiplier_active: int
    status: Literal["active", "completed", "cancelled"]
    started_at: str
    completed_at: Optional[str] = None


class FocusCompleteResponseSchema(BaseModel):
    session: FocusSessionSchema
    xp_earned: int
    updated_xp: int
    updated_level: int
