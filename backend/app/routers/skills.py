"""CRUD for the current user's skills."""
import logging
import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.skill import UserSkill
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.deps import commit_or_500, get_owned
from app.schemas.skill import SkillCreate, SkillRead, SkillUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillRead])
def list_skills(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[UserSkill]:
    """List the user's skills."""
    return list(
        db.scalars(
            select(UserSkill).where(UserSkill.user_id == user.id).order_by(UserSkill.skill_name)
        )
    )


@router.post("", response_model=SkillRead, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> UserSkill:
    """Add a skill."""
    skill = UserSkill(user_id=user.id, **payload.model_dump())
    db.add(skill)
    commit_or_500(db, logger, "create skill")
    db.refresh(skill)
    return skill


@router.put("/{skill_id}", response_model=SkillRead)
def update_skill(
    skill_id: uuid.UUID,
    payload: SkillUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserSkill:
    """Update a skill."""
    skill = get_owned(db, UserSkill, skill_id, user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(skill, key, value)
    commit_or_500(db, logger, "update skill")
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    """Delete a skill."""
    db.delete(get_owned(db, UserSkill, skill_id, user.id))
    commit_or_500(db, logger, "delete skill")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
