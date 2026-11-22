from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import get_current_user
from app.domains.courses.schemas import (
    CourseDetailSchema,
    CourseSummarySchema,
    CreateCourseRequest,
)
from app.domains.courses.service import create_course, get_course_detail, list_courses
from app.models.tables import User

router = APIRouter(prefix="/courses", tags=["2. Courses"])


@router.get("", response_model=List[CourseSummarySchema], summary="Daftar kursus micro-learning")
async def get_courses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CourseSummarySchema]:
    return await list_courses(db, current_user.id)


@router.post("", response_model=CourseSummarySchema, status_code=201, summary="Tambah kursus micro-learning baru")
async def post_course(
    payload: CreateCourseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseSummarySchema:
    _ = current_user
    return await create_course(db, payload)


@router.get("/{course_id}", response_model=CourseDetailSchema, summary="Detail kursus beserta video mikro")
async def get_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseDetailSchema:
    return await get_course_detail(db, course_id, current_user.id)
