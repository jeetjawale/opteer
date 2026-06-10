import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ApplicationHistory(Base):
    __tablename__ = "application_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String, nullable=True)
    new_status: Mapped[str] = mapped_column(String, nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
