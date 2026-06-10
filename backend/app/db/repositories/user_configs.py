import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user_configs import UserConfig
from app.db.repositories.base import BaseRepository


class UserConfigsRepository(BaseRepository[UserConfig]):
    def __init__(self, session: AsyncSession):
        super().__init__(UserConfig, session)

    async def get_by_user_id(self, user_id: uuid.UUID) -> UserConfig | None:
        result = await self.session.execute(
            select(UserConfig).where(UserConfig.user_id == user_id)
        )
        return result.scalar_one_or_none()
