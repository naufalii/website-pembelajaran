from __future__ import annotations

from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.courses.schemas import (
    CourseDetailSchema,
    CourseSummarySchema,
    CreateCourseRequest,
    LessonCheckpointSchema,
    LessonSummarySchema,
)
from app.models.tables import Course, Lesson, LessonProgress


async def _get_progress_map(db: AsyncSession, user_id: Optional[str]) -> Dict[str, LessonProgress]:
    if not user_id:
        return {}
    rows = (
        await db.execute(select(LessonProgress).where(LessonProgress.user_id == user_id))
    ).scalars().all()
    return {row.lesson_id: row for row in rows}


def serialize_lesson(lesson: Lesson, progress: LessonProgress | None) -> LessonSummarySchema:
    checkpoints = [LessonCheckpointSchema(**cp) for cp in (lesson.checkpoints or [])]
    return LessonSummarySchema(
        id=lesson.id,
        course_id=lesson.course_id,
        order_index=lesson.order_index,
        title=lesson.title,
        summary=lesson.summary,
        transcript=lesson.transcript,
        video_url=lesson.video_url,
        duration_seconds=lesson.duration_seconds,
        checkpoints=checkpoints,
        watched_seconds=progress.watched_seconds if progress else 0,
        cleared_checkpoints=list(progress.cleared_checkpoints or []) if progress else [],
        is_completed=progress.is_completed if progress else False,
    )


async def list_courses(db: AsyncSession, user_id: Optional[str] = None) -> List[CourseSummarySchema]:
    stmt = (
        select(Course)
        .where(Course.is_published.is_(True))
        .options(selectinload(Course.lessons))
        .order_by(Course.created_at)
    )
    courses = (await db.execute(stmt)).scalars().all()
    progress_map = await _get_progress_map(db, user_id)

    results: List[CourseSummarySchema] = []
    for course in courses:
        completed = sum(
            1
            for lesson in course.lessons
            if progress_map.get(lesson.id) and progress_map[lesson.id].is_completed
        )
        results.append(
            CourseSummarySchema(
                id=course.id,
                slug=course.slug,
                title=course.title,
                description=course.description,
                category=course.category,
                difficulty=course.difficulty,
                estimated_minutes=course.estimated_minutes,
                lesson_count=len(course.lessons),
                completed_lessons=completed,
            )
        )
    return results


async def get_course_detail(
    db: AsyncSession, course_id: str, user_id: Optional[str] = None
) -> CourseDetailSchema:
    stmt = (
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.lessons))
    )
    course = (await db.execute(stmt)).scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kursus tidak ditemukan.")

    progress_map = await _get_progress_map(db, user_id)
    sorted_lessons = sorted(course.lessons, key=lambda l: l.order_index)
    lessons_out = [serialize_lesson(lesson, progress_map.get(lesson.id)) for lesson in sorted_lessons]
    completed = sum(1 for item in lessons_out if item.is_completed)

    return CourseDetailSchema(
        id=course.id,
        slug=course.slug,
        title=course.title,
        description=course.description,
        category=course.category,
        difficulty=course.difficulty,
        estimated_minutes=course.estimated_minutes,
        lesson_count=len(lessons_out),
        completed_lessons=completed,
        lessons=lessons_out,
    )


async def create_course(db: AsyncSession, payload: CreateCourseRequest) -> CourseSummarySchema:
    existing = (
        await db.execute(select(Course).where(Course.slug == payload.slug.strip()))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slug kursus sudah dipakai. Gunakan slug yang unik.",
        )

    course = Course(
        id=str(uuid4()),
        slug=payload.slug.strip(),
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category.strip(),
        difficulty=payload.difficulty.strip(),
        estimated_minutes=payload.estimated_minutes,
        is_published=payload.is_published,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return CourseSummarySchema(
        id=course.id,
        slug=course.slug,
        title=course.title,
        description=course.description,
        category=course.category,
        difficulty=course.difficulty,
        estimated_minutes=course.estimated_minutes,
        lesson_count=0,
        completed_lessons=0,
    )
