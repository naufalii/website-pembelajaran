from __future__ import annotations

from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class MultipleChoiceOptionSchema(BaseModel):
    id: str
    text: str


class MultipleChoicePayloadSchema(BaseModel):
    type: Literal["multiple_choice"]
    prompt: str
    options: List[MultipleChoiceOptionSchema] = Field(min_length=4, max_length=4)
    correct_option_id: str
    explanation: str


class FlashcardRecallPayloadSchema(BaseModel):
    type: Literal["flashcard_recall"]
    front_prompt: str
    back_answer: str
    hint: Optional[str] = None
    key_terms: List[str] = Field(default_factory=list)


class TrueFalsePayloadSchema(BaseModel):
    type: Literal["true_false"]
    statement: str
    is_true: bool
    explanation: str


QuestionPayloadUnion = Annotated[
    Union[
        MultipleChoicePayloadSchema,
        FlashcardRecallPayloadSchema,
        TrueFalsePayloadSchema,
    ],
    Field(discriminator="type"),
]


class QuizItemSchema(BaseModel):
    id: str
    lesson_id: Optional[str] = None
    title: str
    quiz_type: Literal["multiple_choice", "flashcard_recall", "true_false"]
    xp_reward: int
    checkpoint_seconds: Optional[int] = None
    question_payload: QuestionPayloadUnion


class CreateQuizRequest(BaseModel):
    lesson_id: Optional[str] = None
    title: str = Field(min_length=3, max_length=200)
    xp_reward: int = Field(default=15, ge=5, le=500)
    checkpoint_seconds: Optional[int] = Field(default=None, ge=0)
    question_payload: QuestionPayloadUnion


class QuizSubmitRequest(BaseModel):
    selected_option_id: Optional[str] = None
    selected_boolean: Optional[bool] = None
    self_recalled: Optional[bool] = None
    focus_session_id: Optional[str] = None


class QuizSubmitResponse(BaseModel):
    quiz_id: str
    is_correct: bool
    xp_earned: int
    multiplier_applied: int
    explanation: str
    updated_xp: int
    updated_level: int
    leveled_up: bool
    leaderboard_rank: int
