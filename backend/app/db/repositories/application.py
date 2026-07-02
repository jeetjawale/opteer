import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.application import Application
from app.db.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self, session: AsyncSession):
        super().__init__(Application, session)

    async def get_by_user_and_job(
        self, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> Application | None:
        result = await self.session.execute(
            select(Application).where(
                Application.user_id == user_id, Application.job_id == job_id
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[Application]:
        result = await self.session.execute(
            select(Application).where(Application.user_id == user_id)
        )
        return list(result.scalars().all())
