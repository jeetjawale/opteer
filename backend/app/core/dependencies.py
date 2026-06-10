from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

from app.db.repositories.job import JobRepository
from app.db.repositories.application import ApplicationRepository
from app.db.repositories.application_history import ApplicationHistoryRepository
from app.db.repositories.user import UserRepository
from app.db.repositories.user_configs import UserConfigsRepository
from app.db.repositories.resume import ResumeRepository

from app.domains.jobs.service import JobService
from app.domains.applications.service import ApplicationService
from app.domains.resumes.service import ResumeService
from app.domains.auth.service import AuthService
from app.infrastructure.storage.local import LocalStorageProvider

def get_job_service(session: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(
        job_repo=JobRepository(session),
        app_repo=ApplicationRepository(session),
        user_repo=UserRepository(session),
        user_configs_repo=UserConfigsRepository(session)
    )

def get_application_service(session: AsyncSession = Depends(get_db)) -> ApplicationService:
    return ApplicationService(
        app_repo=ApplicationRepository(session),
        job_repo=JobRepository(session),
        history_repo=ApplicationHistoryRepository(session),
        user_repo=UserRepository(session),
        user_configs_repo=UserConfigsRepository(session)
    )

def get_resume_service(session: AsyncSession = Depends(get_db)) -> ResumeService:
    return ResumeService(
        resume_repo=ResumeRepository(session),
        storage=LocalStorageProvider()
    )

def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(
        user_repo=UserRepository(session)
    )



def get_user_configs_repo(session: AsyncSession = Depends(get_db)) -> UserConfigsRepository:
    return UserConfigsRepository(session)
