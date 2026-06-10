import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.resume import Resume
from app.db.repositories.base import BaseRepository


class ResumeRepository(BaseRepository[Resume]):
    def __init__(self, session: AsyncSession):
        super().__init__(Resume, session)

    async def list_by_user(self, user_id: uuid.UUID) -> list[Resume]:
        result = await self.session.execute(
            select(Resume).where(Resume.user_id == user_id)
        )
        return list(result.scalars().all())
