from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class CreateLessonCheckpointInput(BaseModel):
    id: str = Field(min_length=1)
    at_seconds: int = Field(ge=0)
    title: str = Field(min_length=1)
    quiz_id: str = Field(min_length=1)


class CreateLessonRequest(BaseModel):
    course_id: str
    order_index: int = Field(default=1, ge=1)
    title: str = Field(min_length=3, max_length=200)
    summary: str = Field(min_length=5)
    transcript: str = Field(min_length=10)
    video_url: Optional[str] = None
    duration_seconds: int = Field(default=240, ge=30, le=3600)
    checkpoints: List[CreateLessonCheckpointInput] = Field(default_factory=list)


class LessonProgressUpdateRequest(BaseModel):
    watched_seconds: int = Field(ge=0)
    cleared_checkpoint_id: Optional[str] = None
    mark_completed: bool = False


class LessonProgressResponse(BaseModel):
    lesson_id: str
    watched_seconds: int
    cleared_checkpoints: List[str]
    is_completed: bool
    xp_awarded: int = 0


class FlashcardItemSchema(BaseModel):
    id: str
    front: str
    back: str
    tag: str


class AiDocumentSchema(BaseModel):
    id: str
    source_filename: Optional[str] = None
    source_type: Literal["pdf", "text"]
    title: str
    raw_text_excerpt: str
    summary_bullets: List[str]
    flashcards: List[FlashcardItemSchema]
    generated_quizzes: List[Dict[str, Any]]
    created_at: str


class TutorHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class AiTutorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[TutorHistoryItem] = Field(default_factory=list)
    lesson_context: Optional[str] = None
    lesson_id: Optional[str] = None


class AiTutorResponse(BaseModel):
    answer: str
    suggested_followups: List[str]
    provider: Literal["gemini", "openai", "fallback"]
