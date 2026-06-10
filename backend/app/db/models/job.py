import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    url: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str | None] = mapped_column(String, nullable=True)
    scraped_jd: Mapped[str | None] = mapped_column(String, nullable=True)
    company_research: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    work_model: Mapped[str | None] = mapped_column(String, nullable=True)
