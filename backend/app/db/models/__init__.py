from app.db.base import Base
from app.db.models.application import Application
from app.db.models.application_history import ApplicationHistory
from app.db.models.job import Job
from app.db.models.resume import Resume
from app.db.models.user import User
from app.db.models.user_configs import UserConfig

# This __init__.py makes all models available from a single import path
# and ensures Alembic can discover them.
__all__ = [
    "Base",
    "User",
    "Job",
    "Application",
    "ApplicationHistory",
    "Resume",
    "UserConfig",
]
