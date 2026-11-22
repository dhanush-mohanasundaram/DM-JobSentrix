"""AI job-description analyzer."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.jd_parse import JDParse
from app.models.job import Job
from app.models.skill import UserSkill
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500, get_owned
from app.schemas.jd_parse import JDAnalyzeRequest, JDAnalyzeResponse, JDParseRead
from app.services import llm_service, matcher_service, rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jd", tags=["jd-analyzer"])


@router.post("/analyze", response_model=JDAnalyzeResponse)
def analyze(
    payload: JDAnalyzeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JDAnalyzeResponse:
    """Extract skills from a JD, score it against the user's skills, store the parse."""
    job = get_owned(db, Job, payload.job_id, user.id)
    jd_text = (payload.jd_text or job.jd_text or "").strip()
    if not jd_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Job description is empty")

    rate_limit.check(user.id)
    used_fallback = False
    try:
        extracted = llm_service.extract_jd(jd_text)
    except llm_service.LLMError as exc:
        logger.warning("JD analysis falling back to keyword matching: %s", exc)
        extracted = llm_service.fallback_extract(jd_text)
        used_fallback = True

    user_skills = list(
        db.scalars(select(UserSkill.skill_name).where(UserSkill.user_id == user.id))
    )
    score, matched, gaps = matcher_service.compute_match(
        extracted["required_skills"], user_skills
    )

    if payload.jd_text:
        job.jd_text = jd_text
    parse = db.scalar(select(JDParse).where(JDParse.job_id == job.id))
    if parse is None:
        parse = JDParse(job_id=job.id)
        db.add(parse)
    parse.required_skills = extracted["required_skills"]
    parse.seniority = extracted["seniority"]
    parse.match_score = score
    parse.skill_gaps = gaps
    commit_or_500(db, logger, "save JD analysis")
    db.refresh(parse)

    return JDAnalyzeResponse(
        job_id=job.id,
        required_skills=parse.required_skills,
        seniority=parse.seniority,
        match_score=parse.match_score,
        skill_gaps=parse.skill_gaps,
        parsed_at=parse.parsed_at,
        keywords=extracted.get("keywords", []),
        matched_skills=matched,
        roadmap=matcher_service.build_roadmap(gaps),
        used_fallback=used_fallback,
    )


@router.get("/parse/{job_id}", response_model=JDParseRead)
def get_parse(
    job_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> JDParse:
    """Return the stored parse for a job."""
    job = get_owned(db, Job, job_id, user.id)
    parse = db.scalar(select(JDParse).where(JDParse.job_id == job.id))
    if parse is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No analysis for this job yet")
    return parse
