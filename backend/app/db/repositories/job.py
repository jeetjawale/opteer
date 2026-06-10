import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.job import Job
from app.db.repositories.base import BaseRepository

class JobRepository(BaseRepository[Job]):
    def __init__(self, session: AsyncSession):
        super().__init__(Job, session)

    async def get_by_url(self, url: str) -> Job | None:
        result = await self.session.execute(
            select(Job).where(Job.url == url)
        )
        return result.scalar_one_or_none()
