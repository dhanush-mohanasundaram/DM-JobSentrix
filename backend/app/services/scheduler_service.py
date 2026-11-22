"""Background reminder engine (APScheduler).

Every hour it finds reminders that are due and not yet marked done, and creates
one in-app Notification per reminder (idempotent: never duplicates).
The job store lives in the same database, so schedules survive restarts
without Redis or Celery.
"""
import logging
from datetime import date

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import SessionLocal
from app.models.reminder import Notification, Reminder

from typing import Optional

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None

_LABELS = {"follow_up_7d": "7-day", "follow_up_14d": "14-day"}


def process_due_reminders(db: Session, today: date | None = None) -> int:
    """Create notifications for due reminders. Returns how many were created."""
    today = today or date.today()
    due = db.scalars(
        select(Reminder).where(Reminder.due_date <= today, Reminder.is_sent.is_(False))
    ).all()
    already = set(
        db.scalars(
            select(Notification.reminder_id).where(
                Notification.reminder_id.in_([r.id for r in due])
            )
        ).all()
    ) if due else set()

    created = 0
    for reminder in due:
        if reminder.id in already:
            continue
        job = reminder.application.job
        label = _LABELS.get(reminder.reminder_type, "follow-up")
        db.add(
            Notification(
                user_id=job.user_id,
                reminder_id=reminder.id,
                message=f"Time for a {label} follow-up with {job.company} ({job.role_title}).",
            )
        )
        created += 1
    db.commit()
    return created


def run_reminder_job() -> None:
    """Scheduler entry point (module-level so APScheduler can persist it)."""
    db = SessionLocal()
    try:
        count = process_due_reminders(db)
        logger.info("Reminder job finished: %d new notification(s)", count)
    except Exception:  # noqa: BLE001 - a failing job must not kill the scheduler
        db.rollback()
        logger.exception("Reminder job failed")
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the hourly reminder job (no-op if disabled or already running)."""
    global _scheduler
    if not settings.ENABLE_SCHEDULER or _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(
        jobstores={"default": SQLAlchemyJobStore(url=settings.DATABASE_URL)},
        timezone="UTC",
    )
    _scheduler.add_job(
        "app.services.scheduler_service:run_reminder_job",
        trigger="interval",
        minutes=settings.REMINDER_CHECK_INTERVAL_MINUTES,
        id="reminder_check",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler() -> None:
    """Shut the scheduler down cleanly."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
