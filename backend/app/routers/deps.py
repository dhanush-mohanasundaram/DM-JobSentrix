"""Shared router helpers."""
import uuid
from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

T = TypeVar("T")


def get_owned(db: Session, model: type[T], obj_id: uuid.UUID, user_id: uuid.UUID) -> T:
    """Fetch a row that has a `user_id` column and belongs to the user, or 404."""
    obj = db.get(model, obj_id)
    if obj is None or getattr(obj, "user_id") != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return obj


def commit_or_500(db: Session, logger, what: str) -> None:
    """Commit; on DB error roll back and raise a 500."""
    from sqlalchemy.exc import SQLAlchemyError

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("DB error while %s", what)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Could not {what}")
