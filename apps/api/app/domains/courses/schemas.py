from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class LessonCheckpointSchema(BaseModel):
    id: str
    at_seconds: int
    title: str
    quiz_id: str


class CreateCourseRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=2000)
    category: str = Field(min_length=2, max_length=80)
    difficulty: str = Field(default="Menengah", min_length=2, max_length=50)
    estimated_minutes: int = Field(default=15, ge=1, le=240)
    is_published: bool = True


class LessonSummarySchema(BaseModel):
    id: str
    course_id: str
    order_index: int
    title: str
    summary: str
    transcript: str
    video_url: Optional[str] = None
    duration_seconds: int
    checkpoints: List[LessonCheckpointSchema]
    watched_seconds: int = 0
    cleared_checkpoints: List[str] = []
    is_completed: bool = False


class CourseSummarySchema(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    category: str
    difficulty: str
    estimated_minutes: int
    lesson_count: int
    completed_lessons: int = 0


class CourseDetailSchema(CourseSummarySchema):
    lessons: List[LessonSummarySchema]
