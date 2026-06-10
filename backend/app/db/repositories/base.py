from typing import Generic, TypeVar, Type, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: Any) -> ModelType | None:
        result = await self.session.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def list(self, skip: int = 0, limit: int = 100) -> list[ModelType]:
        result = await self.session.execute(select(self.model).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ModelType:
        db_obj = self.model(**kwargs)
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update(self, db_obj: ModelType, **kwargs) -> ModelType:
        for key, value in kwargs.items():
            setattr(db_obj, key, value)
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def delete(self, id: Any) -> bool:
        result = await self.session.execute(delete(self.model).where(self.model.id == id))
        await self.session.flush()
        return result.rowcount > 0
