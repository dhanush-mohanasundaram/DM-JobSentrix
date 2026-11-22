"""User skill ORM model."""
from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserSkill(Base):
    """A skill the user already has."""

    __tablename__ = "user_skills"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    proficiency: Mapped[str] = mapped_column(String(20), default="Beginner")
    years_experience: Mapped[float] = mapped_column(Float, default=0.0)

    user = relationship("User", back_populates="skills")
