"""Pydantic schemas for dashboard endpoints."""
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    """Headline numbers for the dashboard."""

    total_applied: int
    response_rate: float  # percent, 0-100
    status_counts: dict[str, int]
    jobs_tracked: int
    pending_reminders: int


class FunnelStage(BaseModel):
    """Count of applications in one status."""

    status: str
    count: int
