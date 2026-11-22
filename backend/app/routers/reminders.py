"""Reminders and in-app notifications."""
import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.reminder import Notification, Reminder
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500
from app.schemas.reminder import NotificationRead, ReminderRead

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reminders"])


def _to_read(reminder: Reminder, job: Job, today: date) -> ReminderRead:
    return ReminderRead(
        id=reminder.id,
        application_id=reminder.application_id,
        reminder_type=reminder.reminder_type,
        due_date=reminder.due_date,
        is_sent=reminder.is_sent,
        company=job.company,
        role_title=job.role_title,
        is_due=reminder.due_date <= today,
    )


@router.get("/reminders", response_model=list[ReminderRead])
def list_reminders(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ReminderRead]:
    """List reminders that are not yet marked done, soonest first."""
    rows = db.execute(
        select(Reminder, Job)
        .join(Application, Reminder.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .where(Job.user_id == user.id, Reminder.is_sent.is_(False))
        .order_by(Reminder.due_date)
    ).all()
    today = date.today()
    return [_to_read(r, j, today) for r, j in rows]


@router.patch("/reminders/{reminder_id}/sent", response_model=ReminderRead)
def mark_sent(
    reminder_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ReminderRead:
    """Mark a reminder as done."""
    reminder = db.get(Reminder, reminder_id)
    if reminder is None or reminder.application.job.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reminder not found")
    reminder.is_sent = True
    commit_or_500(db, logger, "update reminder")
    db.refresh(reminder)
    return _to_read(reminder, reminder.application.job, date.today())


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Notification]:
    """Latest 50 notifications, newest first."""
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    )


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def read_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    """Mark every notification as read."""
    db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    commit_or_500(db, logger, "update notifications")
