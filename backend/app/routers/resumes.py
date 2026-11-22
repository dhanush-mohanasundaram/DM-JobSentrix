"""Resume versions and the AI resume tailor."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500, get_owned
from app.schemas.resume import (
    ResumeCreate,
    ResumeRead,
    ResumeTailorRequest,
    ResumeTailorResponse,
)
from app.services import llm_service, rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("", response_model=list[ResumeRead])
def list_resumes(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Resume]:
    """List resume versions, newest first."""
    return list(
        db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc()))
    )


@router.post("", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
def create_resume(
    payload: ResumeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Resume:
    """Create a resume version."""
    resume = Resume(user_id=user.id, **payload.model_dump())
    db.add(resume)
    commit_or_500(db, logger, "create resume")
    db.refresh(resume)
    return resume


@router.post("/tailor", response_model=ResumeTailorResponse)
def tailor(
    payload: ResumeTailorRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeTailorResponse:
    """Suggest tailored bullets and missing ATS keywords for a JD."""
    resume_md = payload.resume_md
    if payload.resume_id:
        resume_md = get_owned(db, Resume, payload.resume_id, user.id).content_md
    jd_text = payload.jd_text
    if not jd_text and payload.job_id:
        jd_text = get_owned(db, Job, payload.job_id, user.id).jd_text
    if not resume_md or not resume_md.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Resume content is empty")
    if not jd_text or not jd_text.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Job description is empty")

    rate_limit.check(user.id)
    try:
        result = llm_service.tailor_resume(resume_md, jd_text)
        return ResumeTailorResponse(**result, used_fallback=False)
    except llm_service.LLMError as exc:
        logger.warning("Resume tailor falling back: %s", exc)
        wanted = llm_service.fallback_extract(jd_text)["required_skills"]
        have = resume_md.lower()
        missing = [k for k in wanted if k.lower() not in have]
        return ResumeTailorResponse(
            suggested_bullets=[],
            missing_keywords=missing,
            summary="AI is unavailable right now. These JD keywords do not appear in your resume.",
            used_fallback=True,
        )


@router.get("/{resume_id}", response_model=ResumeRead)
def get_resume(
    resume_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Resume:
    """Get one resume version."""
    return get_owned(db, Resume, resume_id, user.id)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    """Delete a resume version (applications keep working; the link is cleared)."""
    db.delete(get_owned(db, Resume, resume_id, user.id))
    commit_or_500(db, logger, "delete resume")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
