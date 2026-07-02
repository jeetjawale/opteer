import os
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

logger = logging.getLogger(__name__)
from pydantic import field_validator, model_validator, ValidationInfo  # noqa: E402


class Settings(BaseSettings):
    PROJECT_NAME: str = "Opteer"
    LOG_LEVEL: str = "INFO"

    FRONTEND_URL: str = "http://localhost:3000"

    # Database (PostgreSQL)
    DATABASE_URL: str

    SENTRY_DSN: str | None = None

    # Security
    API_KEY_ENCRYPTION_KEY: str

    # Network
    API_URL: str = "http://localhost:8080"
    TRUSTED_PROXIES: str = "127.0.0.1"

    # CORS Origins (contains http://localhost:3000 by default)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors(cls, v: list[str], info: ValidationInfo) -> list[str]:
        env = info.data.get("ENVIRONMENT", "development") if info.data else "development"
        if env == "production":
            if len(v) == 1 and v[0] == "http://localhost:3000":
                raise ValueError(
                    "CORS_ORIGINS must be configured for production (cannot be just localhost:3000)"
                )
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg://") and not v.startswith(
            "postgresql://"
        ):
            raise ValueError(
                "DATABASE_URL must be a valid PostgreSQL connection string"
            )
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://")
        return v

    @model_validator(mode="after")
    def validate_encryption_key(self) -> "Settings":
        if not self.API_KEY_ENCRYPTION_KEY:
            raise ValueError(
                "API_KEY_ENCRYPTION_KEY is required. Must be a 32 url-safe base64-encoded string."
            )

        return self


settings = Settings()  # type: ignore[call-arg]

# Startup Config Banner
logger.info("Initializing configuration...")
logger.debug(f"project_name={settings.PROJECT_NAME}")
logger.debug(f"environment={settings.ENVIRONMENT}")
