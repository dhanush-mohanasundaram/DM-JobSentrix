"""Pydantic schemas for applications."""
import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.job import JobBrief

Status = Literal["Applied", "Screening", "Interview", "Offer", "Reject"]
STATUSES: list[str] = ["Applied", "Screening", "Interview", "Offer", "Reject"]


class ApplicationCreate(BaseModel):
    """Payload to create an application (also creates 7d/14d reminders)."""

    job_id: uuid.UUID
    resume_version_id: uuid.UUID | None = None
    status: Status = "Applied"
    applied_date: date | None = None
    notes: str | None = None


class ApplicationUpdate(BaseModel):
    """Payload to update status, notes or linked resume."""

    status: Status | None = None
    notes: str | None = None
    resume_version_id: uuid.UUID | None = None


class ApplicationRead(BaseModel):
    """Application as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    resume_version_id: uuid.UUID | None
    status: str
    applied_date: date
    notes: str | None
    job: JobBrief
