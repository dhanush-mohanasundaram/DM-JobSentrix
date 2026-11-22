"""Stored result of a job-description analysis."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import JSONType


class JDParse(Base):
    """Skills extracted from a JD plus the match score for the user."""

    __tablename__ = "jd_parses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, index=True
    )
    required_skills: Mapped[list] = mapped_column(JSONType, default=list)
    seniority: Mapped[Optional[str]] = mapped_column(String(30))
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    skill_gaps: Mapped[list] = mapped_column(JSONType, default=list)
    parsed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    job = relationship("Job", back_populates="jd_parse")
