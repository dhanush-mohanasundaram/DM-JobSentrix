"""Applications: create (with auto reminders), list/filter, update, delete."""
import logging
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.reminder import Reminder
from app.models.resume import Resume
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500, get_owned
from app.schemas.application import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
    Status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])


def _get_application(db: Session, app_id: uuid.UUID, user_id: uuid.UUID) -> Application:
    """Fetch an application through its job's owner, or 404."""
    application = db.get(Application, app_id)
    if application is None or application.job.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return application


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    status_filter: Status | None = Query(default=None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Application]:
    """List applications, optionally filtered by status and applied-date range."""
    stmt = (
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .where(Job.user_id == user.id)
        .order_by(Application.applied_date.desc())
    )
    if status_filter:
        stmt = stmt.where(Application.status == status_filter)
    if date_from:
        stmt = stmt.where(Application.applied_date >= date_from)
    if date_to:
        stmt = stmt.where(Application.applied_date <= date_to)
    return list(db.scalars(stmt))


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    """Create an application and auto-create the Day-7 and Day-14 reminders."""
    get_owned(db, Job, payload.job_id, user.id)
    if payload.resume_version_id:
        get_owned(db, Resume, payload.resume_version_id, user.id)
    applied = payload.applied_date or date.today()
    application = Application(
        job_id=payload.job_id,
        resume_version_id=payload.resume_version_id,
        status=payload.status,
        applied_date=applied,
        notes=payload.notes,
    )
    application.reminders = [
        Reminder(reminder_type="follow_up_7d", due_date=applied + timedelta(days=7)),
        Reminder(reminder_type="follow_up_14d", due_date=applied + timedelta(days=14)),
    ]
    db.add(application)
    commit_or_500(db, logger, "create application")
    db.refresh(application)
    return application


@router.get("/{app_id}", response_model=ApplicationRead)
def get_application(
    app_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Application:
    """Get one application."""
    return _get_application(db, app_id, user.id)


@router.patch("/{app_id}", response_model=ApplicationRead)
def update_application(
    app_id: uuid.UUID,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    """Update status, notes or the linked resume version."""
    application = _get_application(db, app_id, user.id)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("resume_version_id"):
        get_owned(db, Resume, changes["resume_version_id"], user.id)
    for key, value in changes.items():
        if key == "status" and value is None:
            continue
        setattr(application, key, value)
    commit_or_500(db, logger, "update application")
    db.refresh(application)
    return application


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    """Delete an application and its reminders."""
    db.delete(_get_application(db, app_id, user.id))
    commit_or_500(db, logger, "delete application")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
