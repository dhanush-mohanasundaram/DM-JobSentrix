"""Import all models here so Alembic autogenerate can see them."""
from app.models.application import Application  # noqa: F401
from app.models.jd_parse import JDParse  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.reminder import Notification, Reminder  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.skill import UserSkill  # noqa: F401
from app.models.user import User  # noqa: F401
