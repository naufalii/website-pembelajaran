from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import get_current_user, get_optional_user
from app.domains.quizzes.schemas import (
    CreateQuizRequest,
    QuizItemSchema,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.domains.quizzes.service import (
    create_quiz,
    get_quiz_detail,
    list_quizzes,
    submit_quiz_answer,
)
from app.models.tables import User

router = APIRouter(prefix="/quizzes", tags=["4. Quizzes"])


@router.get("", response_model=List[QuizItemSchema], summary="Daftar kuis interaktif publik")
async def get_quizzes(
    lesson_id: Optional[str] = Query(default=None),
    quiz_type: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> List[QuizItemSchema]:
    _ = current_user
    return await list_quizzes(db, lesson_id=lesson_id, quiz_type=quiz_type)


@router.post("", response_model=QuizItemSchema, status_code=201, summary="Tambah kuis JSONB baru")
async def post_quiz(
    payload: CreateQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizItemSchema:
    _ = current_user
    return await create_quiz(db, payload)


@router.get("/{quiz_id}", response_model=QuizItemSchema, summary="Detail soal kuis berdasarkan ID")
async def get_quiz(
    quiz_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> QuizItemSchema:
    _ = current_user
    return await get_quiz_detail(db, quiz_id)


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse, summary="Kirim jawaban kuis & hitung XP")
async def post_quiz_submit(
    quiz_id: str,
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizSubmitResponse:
    return await submit_quiz_answer(db, quiz_id, current_user, payload)
