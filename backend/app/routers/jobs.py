"""CRUD for tracked jobs."""
import logging
import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500, get_owned
from app.schemas.job import JobCreate, JobRead, JobUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobRead])
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Job]:
    """List the user's jobs, newest first."""
    return list(
        db.scalars(select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc()))
    )


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Job:
    """Create a job."""
    job = Job(user_id=user.id, **payload.model_dump())
    db.add(job)
    commit_or_500(db, logger, "create job")
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Job:
    """Get one job."""
    return get_owned(db, Job, job_id, user.id)


@router.put("/{job_id}", response_model=JobRead)
def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Job:
    """Update a job."""
    job = get_owned(db, Job, job_id, user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, key, value)
    commit_or_500(db, logger, "update job")
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    """Delete a job and its applications."""
    db.delete(get_owned(db, Job, job_id, user.id))
    commit_or_500(db, logger, "delete job")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
