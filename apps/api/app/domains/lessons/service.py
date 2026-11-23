from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.courses.schemas import LessonSummarySchema
from app.domains.courses.service import serialize_lesson
from app.domains.lessons.schemas import (
    AiDocumentSchema,
    AiTutorRequest,
    AiTutorResponse,
    CreateLessonRequest,
    FlashcardItemSchema,
    LessonProgressResponse,
    LessonProgressUpdateRequest,
)
from app.domains.shared_helpers import (
    advance_quest_progress,
    award_xp_to_user,
    record_today_streak,
)
from app.models.tables import AiDocument, Course, Lesson, LessonProgress, User
from app.services.ai_service import (
    extract_text_from_pdf_bytes,
    generate_study_pack,
    generate_tutor_reply,
)


async def create_lesson(db: AsyncSession, payload: CreateLessonRequest) -> LessonSummarySchema:
    course = (
        await db.execute(select(Course).where(Course.id == payload.course_id))
    ).scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kursus tidak ditemukan.")

    lesson = Lesson(
        id=str(uuid4()),
        course_id=payload.course_id,
        order_index=payload.order_index,
        title=payload.title.strip(),
        summary=payload.summary.strip(),
        transcript=payload.transcript.strip(),
        video_url=payload.video_url,
        duration_seconds=payload.duration_seconds,
        checkpoints=[cp.model_dump() for cp in payload.checkpoints],
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return serialize_lesson(lesson, None)


async def get_lesson_detail(
    db: AsyncSession, lesson_id: str, user_id: Optional[str] = None
) -> LessonSummarySchema:
    lesson = (await db.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelajaran tidak ditemukan.")

    progress = None
    if user_id:
        progress = (
            await db.execute(
                select(LessonProgress).where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.lesson_id == lesson_id,
                )
            )
        ).scalar_one_or_none()
    return serialize_lesson(lesson, progress)


async def update_lesson_progress(
    db: AsyncSession,
    lesson_id: str,
    user: User,
    payload: LessonProgressUpdateRequest,
) -> LessonProgressResponse:
    lesson = (await db.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelajaran tidak ditemukan.")

    progress = (
        await db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user.id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none()

    if progress is None:
        progress = LessonProgress(
            id=str(uuid4()),
            user_id=user.id,
            lesson_id=lesson_id,
            watched_seconds=payload.watched_seconds,
            cleared_checkpoints=[],
            is_completed=False,
        )
        db.add(progress)
    else:
        progress.watched_seconds = max(progress.watched_seconds, payload.watched_seconds)

    cleared = list(progress.cleared_checkpoints or [])
    if payload.cleared_checkpoint_id and payload.cleared_checkpoint_id not in cleared:
        cleared.append(payload.cleared_checkpoint_id)
    progress.cleared_checkpoints = cleared

    xp_awarded = 0
    if payload.mark_completed and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)
        xp_awarded = 25
        await award_xp_to_user(db, user, xp_awarded)
        await record_today_streak(db, user, xp_delta=xp_awarded, lesson_delta=1)
        await advance_quest_progress(db, user.id, "micro_video_finish", 1)

    await db.commit()
    await db.refresh(progress)

    return LessonProgressResponse(
        lesson_id=lesson_id,
        watched_seconds=progress.watched_seconds,
        cleared_checkpoints=list(progress.cleared_checkpoints or []),
        is_completed=progress.is_completed,
        xp_awarded=xp_awarded,
    )


def _serialize_ai_document(doc: AiDocument) -> AiDocumentSchema:
    return AiDocumentSchema(
        id=doc.id,
        source_filename=doc.source_filename,
        source_type="pdf" if doc.source_type == "pdf" else "text",
        title=doc.title,
        raw_text_excerpt=doc.raw_text_excerpt,
        summary_bullets=[str(b) for b in (doc.summary_bullets or [])],
        flashcards=[FlashcardItemSchema(**fc) for fc in (doc.flashcards or [])],
        generated_quizzes=list(doc.generated_quizzes or []),
        created_at=doc.created_at.isoformat(),
    )


async def list_ai_documents(
    db: AsyncSession, user_id: str, limit: int = 20
) -> List[AiDocumentSchema]:
    stmt = (
        select(AiDocument)
        .where(AiDocument.user_id == user_id)
        .order_by(AiDocument.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize_ai_document(row) for row in rows]


async def create_ai_document(
    db: AsyncSession,
    user: User,
    *,
    title: Optional[str],
    raw_text: Optional[str],
    filename: Optional[str],
    file_bytes: Optional[bytes],
) -> AiDocumentSchema:
    source_type = "text"
    extracted_text = (raw_text or "").strip()

    if file_bytes is not None and len(file_bytes) > 0:
        source_type = "pdf"
        if filename and filename.lower().endswith(".txt"):
            extracted_text = file_bytes.decode("utf-8", errors="ignore").strip()
            source_type = "text"
        else:
            try:
                extracted_text = extract_text_from_pdf_bytes(file_bytes)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Gagal membaca berkas PDF. Pastikan PDF tidak terenkripsi. ({exc})",
                ) from exc

    if len(extracted_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Materi teks atau isi PDF terlalu singkat (minimal 20 karakter).",
        )

    doc_title = (title or "").strip() or (
        filename.rsplit(".", 1)[0] if filename else "Catatan Belajar FokusSprints"
    )
    study_pack = await generate_study_pack(doc_title, extracted_text)

    doc = AiDocument(
        id=str(uuid4()),
        user_id=user.id,
        source_filename=filename,
        source_type=source_type,
        title=doc_title,
        raw_text_excerpt=extracted_text[:500],
        summary_bullets=list(study_pack.get("summary_bullets", [])),
        flashcards=list(study_pack.get("flashcards", [])),
        generated_quizzes=list(study_pack.get("generated_quizzes", [])),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _serialize_ai_document(doc)


async def ask_ai_tutor(
    db: AsyncSession, payload: AiTutorRequest
) -> AiTutorResponse:
    resolved_context = (payload.lesson_context or "").strip()

    if not resolved_context and payload.lesson_id:
        lesson = (
            await db.execute(select(Lesson).where(Lesson.id == payload.lesson_id))
        ).scalar_one_or_none()
        if lesson is not None:
            resolved_context = f"{lesson.title}\n{lesson.summary}\n{lesson.transcript}"

    history_dicts = [{"role": item.role, "content": item.content} for item in payload.history]
    answer, followups, provider = await generate_tutor_reply(
        message=payload.message,
        history=history_dicts,
        lesson_context=resolved_context or None,
    )
    return AiTutorResponse(
        answer=answer,
        suggested_followups=followups,
        provider=provider,  # type: ignore[arg-type]
    )
