import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserConfig(Base):
    __tablename__ = "user_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Onboarding State
    onboarding_completed: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("false")
    )
    onboarding_step: Mapped[str | None] = mapped_column(String, nullable=True)

    # (Rate limits and quotas removed for local deploy)

    # Multi-Provider BYOK Configuration
    # Example format:
    # {
    #    "openai": {"model": "gpt-4o", "api_key_encrypted": "...", "base_url": null},
    #    "custom": {"model": "llama3", "api_key_encrypted": "...", "base_url": "http://localhost:11434/v1"}
    # }
    llm_keys: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    active_llm_provider: Mapped[str | None] = mapped_column(String, nullable=True)
    task_models: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)

    # Non-LLM Integrations (Firecrawl, Tavily, etc.)
    # Example format: {"firecrawl": "enc_key", "tavily": "enc_key"}
    integration_keys: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)

    # Pipeline Automations
    auto_analyze_on_import: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("true")
    )
    generate_interview_prep: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("true")
    )
    auto_draft_cover_letters: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("true")
    )
    auto_tailor_resume: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("true")
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), onupdate=text("now()")
    )
