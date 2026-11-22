"""Dashboard aggregates."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.reminder import Reminder
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.application import STATUSES
from app.schemas.dashboard import DashboardSummary, FunnelStage

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _status_counts(db: Session, user_id) -> dict[str, int]:
    rows = db.execute(
        select(Application.status, func.count())
        .join(Job, Application.job_id == Job.id)
        .where(Job.user_id == user_id)
        .group_by(Application.status)
    ).all()
    counts = {s: 0 for s in STATUSES}
    counts.update({status: n for status, n in rows})
    return counts


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DashboardSummary:
    """Totals, response rate (% of applications that moved past Applied), counts."""
    counts = _status_counts(db, user.id)
    total = sum(counts.values())
    responded = total - counts["Applied"]
    jobs = db.scalar(select(func.count()).select_from(Job).where(Job.user_id == user.id)) or 0
    pending = db.scalar(
        select(func.count())
        .select_from(Reminder)
        .join(Application, Reminder.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .where(Job.user_id == user.id, Reminder.is_sent.is_(False))
    ) or 0
    return DashboardSummary(
        total_applied=total,
        response_rate=round(responded / total * 100, 1) if total else 0.0,
        status_counts=counts,
        jobs_tracked=jobs,
        pending_reminders=pending,
    )


@router.get("/funnel", response_model=list[FunnelStage])
def funnel(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[FunnelStage]:
    """Application count per status, in pipeline order."""
    counts = _status_counts(db, user.id)
    return [FunnelStage(status=s, count=counts[s]) for s in STATUSES]
