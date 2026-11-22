"""Application ORM model."""
from __future__ import annotations

import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Application(Base):
    """A submitted application for a job."""

    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True
    )
    resume_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(30), default="Applied", index=True)
    applied_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    job = relationship("Job", back_populates="applications")
    resume = relationship("Resume")
    reminders = relationship(
        "Reminder", cascade="all, delete-orphan", back_populates="application"
    )
