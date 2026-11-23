from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import get_current_user, get_optional_user
from app.domains.courses.schemas import LessonSummarySchema
from app.domains.lessons.schemas import (
    AiDocumentSchema,
    AiTutorRequest,
    AiTutorResponse,
    CreateLessonRequest,
    LessonProgressResponse,
    LessonProgressUpdateRequest,
)
from app.domains.lessons.service import (
    ask_ai_tutor,
    create_ai_document,
    create_lesson,
    get_lesson_detail,
    list_ai_documents,
    update_lesson_progress,
)
from app.models.tables import User

router = APIRouter(prefix="/lessons", tags=["3. Lessons & AI"])


@router.post("", response_model=LessonSummarySchema, status_code=201, summary="Tambah pelajaran video mikro baru ke kursus")
async def post_lesson(
    payload: CreateLessonRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonSummarySchema:
    _ = current_user
    return await create_lesson(db, payload)


@router.get("/ai/documents", response_model=List[AiDocumentSchema], summary="Daftar dokumen PDF/catatan AI")
async def get_ai_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AiDocumentSchema]:
    return await list_ai_documents(db, current_user.id)


@router.post(
    "/ai/documents",
    response_model=AiDocumentSchema,
    summary="Konversi PDF atau catatan teks menjadi Ringkasan + 3D Flashcards + Kuis",
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "text": {"type": "string"},
                        },
                        "required": ["text"],
                    }
                },
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "text": {"type": "string"},
                            "file": {"type": "string", "format": "binary"},
                        },
                    }
                },
            }
        }
    },
)
async def upload_ai_document(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AiDocumentSchema:
    content_type = request.headers.get("content-type", "")
    title: Optional[str] = None
    raw_text: Optional[str] = None
    filename: Optional[str] = None
    file_bytes: Optional[bytes] = None

    if "application/json" in content_type:
        body = await request.json()
        title = body.get("title")
        raw_text = body.get("text")
    else:
        form = await request.form()
        raw_title = form.get("title")
        raw_body = form.get("text")
        title = str(raw_title) if isinstance(raw_title, str) else None
        raw_text = str(raw_body) if isinstance(raw_body, str) else None
        uploaded = form.get("file")
        if isinstance(uploaded, UploadFile) or hasattr(uploaded, "read"):
            filename = getattr(uploaded, "filename", None)
            file_bytes = await uploaded.read()  # type: ignore[union-attr]

    return await create_ai_document(
        db,
        current_user,
        title=title,
        raw_text=raw_text,
        filename=filename,
        file_bytes=file_bytes,
    )


@router.post("/ai/tutor", response_model=AiTutorResponse, summary="Chat AI Tutor kontekstual sesuai pelajaran aktif")
async def chat_ai_tutor(
    payload: AiTutorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AiTutorResponse:
    _ = current_user
    return await ask_ai_tutor(db, payload)


@router.get("/{lesson_id}", response_model=LessonSummarySchema, summary="Detail pelajaran mikro & checkpoint")
async def get_lesson(
    lesson_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> LessonSummarySchema:
    return await get_lesson_detail(db, lesson_id, current_user.id if current_user else None)


@router.post("/{lesson_id}/progress", response_model=LessonProgressResponse, summary="Simpan progres tonton & checkpoint")
async def post_lesson_progress(
    lesson_id: str,
    payload: LessonProgressUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonProgressResponse:
    return await update_lesson_progress(db, lesson_id, current_user, payload)
