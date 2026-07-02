import uuid
from typing import List

from sqlalchemy import select

from app.db.models.application_history import ApplicationHistory

from .base import BaseRepository


class ApplicationHistoryRepository(BaseRepository[ApplicationHistory]):
    def __init__(self, session):
        super().__init__(ApplicationHistory, session)

    async def list_by_application(
        self, application_id: uuid.UUID
    ) -> List[ApplicationHistory]:
        query = (
            select(self.model)
            .where(self.model.application_id == application_id)
            .order_by(self.model.changed_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
