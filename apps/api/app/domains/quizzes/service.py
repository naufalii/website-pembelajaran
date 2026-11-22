from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.quizzes.schemas import (
    CreateQuizRequest,
    QuestionPayloadUnion,
    QuizItemSchema,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.domains.shared_helpers import (
    advance_quest_progress,
    award_xp_to_user,
    record_today_streak,
)
from app.models.tables import FocusSession, Lesson, Quiz, QuizAttempt, User
from app.services.redis_service import redis_service

_payload_adapter = TypeAdapter(QuestionPayloadUnion)


def serialize_quiz(quiz: Quiz) -> QuizItemSchema:
    validated_payload = _payload_adapter.validate_python(quiz.question_payload)
    return QuizItemSchema(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        title=quiz.title,
        quiz_type=validated_payload.type,
        xp_reward=quiz.xp_reward,
        checkpoint_seconds=quiz.checkpoint_seconds,
        question_payload=validated_payload,
    )


async def list_quizzes(
    db: AsyncSession,
    lesson_id: Optional[str] = None,
    quiz_type: Optional[str] = None,
) -> List[QuizItemSchema]:
    stmt = select(Quiz).order_by(Quiz.created_at)
    if lesson_id:
        stmt = stmt.where(Quiz.lesson_id == lesson_id)
    if quiz_type:
        stmt = stmt.where(Quiz.quiz_type == quiz_type)
    rows = (await db.execute(stmt)).scalars().all()
    return [serialize_quiz(row) for row in rows]


async def get_quiz_detail(db: AsyncSession, quiz_id: str) -> QuizItemSchema:
    quiz = (await db.execute(select(Quiz).where(Quiz.id == quiz_id))).scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kuis tidak ditemukan.")
    return serialize_quiz(quiz)


async def create_quiz(db: AsyncSession, payload: CreateQuizRequest) -> QuizItemSchema:
    if payload.lesson_id:
        lesson = (
            await db.execute(select(Lesson).where(Lesson.id == payload.lesson_id))
        ).scalar_one_or_none()
        if lesson is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelajaran tidak ditemukan.")

    quiz = Quiz(
        id=str(uuid4()),
        lesson_id=payload.lesson_id,
        title=payload.title.strip(),
        quiz_type=payload.question_payload.type,
        xp_reward=payload.xp_reward,
        checkpoint_seconds=payload.checkpoint_seconds,
        question_payload=payload.question_payload.model_dump(),
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return serialize_quiz(quiz)


async def _resolve_active_multiplier(
    db: AsyncSession, user_id: str, focus_session_id: Optional[str]
) -> int:
    redis_session = await redis_service.get_focus_session(user_id)
    if redis_session and redis_session.get("status") == "active":
        return int(redis_session.get("multiplier_active", 1))

    if focus_session_id:
        db_session = (
            await db.execute(
                select(FocusSession).where(
                    FocusSession.id == focus_session_id,
                    FocusSession.user_id == user_id,
                    FocusSession.status == "active",
                )
            )
        ).scalar_one_or_none()
        if db_session is not None:
            return db_session.multiplier_active
    return 1


async def submit_quiz_answer(
    db: AsyncSession,
    quiz_id: str,
    user: User,
    payload: QuizSubmitRequest,
) -> QuizSubmitResponse:
    quiz = (await db.execute(select(Quiz).where(Quiz.id == quiz_id))).scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kuis tidak ditemukan.")

    parsed = _payload_adapter.validate_python(quiz.question_payload)
    is_correct = False
    explanation = ""
    selected_answer_record: Dict[str, Any] = {}

    if parsed.type == "multiple_choice":
        if not payload.selected_option_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Pilih salah satu opsi jawaban terlebih dahulu.",
            )
        is_correct = payload.selected_option_id == parsed.correct_option_id
        explanation = parsed.explanation
        selected_answer_record = {"selected_option_id": payload.selected_option_id}
    elif parsed.type == "true_false":
        if payload.selected_boolean is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Pilih Benar atau Salah terlebih dahulu.",
            )
        is_correct = payload.selected_boolean == parsed.is_true
        explanation = parsed.explanation
        selected_answer_record = {"selected_boolean": payload.selected_boolean}
    else:
        is_correct = bool(payload.self_recalled)
        explanation = parsed.back_answer
        selected_answer_record = {"self_recalled": is_correct}

    multiplier = await _resolve_active_multiplier(db, user.id, payload.focus_session_id)
    xp_earned = quiz.xp_reward * multiplier if is_correct else 0

    attempt = QuizAttempt(
        id=str(uuid4()),
        user_id=user.id,
        quiz_id=quiz.id,
        selected_answer=selected_answer_record,
        is_correct=is_correct,
        xp_earned=xp_earned,
        multiplier_applied=multiplier,
        focus_session_id=payload.focus_session_id,
    )
    db.add(attempt)

    updated_xp = user.xp
    updated_level = user.level
    leveled_up = False
    if xp_earned > 0:
        updated_xp, updated_level, leveled_up = await award_xp_to_user(db, user, xp_earned)
        await record_today_streak(db, user, xp_delta=xp_earned, quiz_delta=1)
        await advance_quest_progress(db, user.id, "perfect_quiz", 1)
    else:
        await record_today_streak(db, user, xp_delta=0, quiz_delta=1)

    await redis_service.set_quiz_state(
        user.id,
        {
            "last_quiz_id": quiz.id,
            "last_correct": is_correct,
            "last_xp": xp_earned,
        },
    )

    await db.commit()
    rank = await redis_service.get_user_rank(user.id)
    return QuizSubmitResponse(
        quiz_id=quiz.id,
        is_correct=is_correct,
        xp_earned=xp_earned,
        multiplier_applied=multiplier,
        explanation=explanation,
        updated_xp=updated_xp,
        updated_level=updated_level,
        leveled_up=leveled_up,
        leaderboard_rank=rank or 1,
    )
