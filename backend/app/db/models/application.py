import uuid
from datetime import datetime, date
from sqlalchemy import (
    String,
    DateTime,
    Date,
    Integer,
    Boolean,
    text,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.db.models.job import Job
class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    job: Mapped["Job"] = relationship("Job")  # noqa: F821

    resume_text: Mapped[str | None] = mapped_column(String, nullable=True)
    resume_file_url: Mapped[str | None] = mapped_column(String, nullable=True)
    resume_file_name: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, server_default="saved")
    applied_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    matched_skills: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    missing_skills: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    key_requirements: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_letter: Mapped[str | None] = mapped_column(String, nullable=True)
    interview_prep: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    resume_edits: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    structured_resume: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)

    analysis_status: Mapped[str] = mapped_column(String, server_default="idle")
    analysis_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    analysis_error: Mapped[str | None] = mapped_column(String, nullable=True)

    # Quality Gate
    is_quality_gated: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("false")
    )
    quality_gate_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="applications_user_id_job_id_key"),
        Index("ix_applications_status", "status"),
        Index("ix_applications_analysis_status", "analysis_status"),
    )
