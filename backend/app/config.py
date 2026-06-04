import os
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

logger = logging.getLogger(__name__)
from pydantic import field_validator, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "JobPilot"
    
    # LLM Settings
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-3.1-flash-lite"
    LOCAL_LLM_BASE_URL: str | None = None
    
    # Modular Model Routing Overrides (fallback to AI_MODEL if None)
    AI_MODEL_FIT: str | None = None
    AI_MODEL_LETTER: str | None = None
    AI_MODEL_PREP: str | None = None
    AI_MODEL_TAILOR: str | None = None
    
    # API Keys
    GOOGLE_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    XAI_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    
    # Integrations
    FIRECRAWL_API_KEY: str | None = None
    TAVILY_API_KEY: str | None = None
    
    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Security
    API_KEY_ENCRYPTION_KEY: str
    
    # Network
    TRUSTED_PROXIES: str = "127.0.0.1"
    
    # CORS Origins (contains http://localhost:3000 by default)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.env"),
            ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )
    
    
    # Environment
    ENVIRONMENT: str = "development"
    
    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors(cls, v: list[str], info: any) -> list[str]:
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production":
            if len(v) == 1 and v[0] == "http://localhost:3000":
                raise ValueError("CORS_ORIGINS must be configured for production (cannot be just localhost:3000)")
        return v
    
    @field_validator("AI_PROVIDER")
    @classmethod
    def validate_ai_provider(cls, v: str) -> str:
        allowed = {"gemini", "anthropic", "openai", "xai", "local", "mock"}
        provider = v.lower()
        if provider not in allowed:
            raise ValueError(f"AI_PROVIDER must be one of {allowed}")
        return provider

    @field_validator("SUPABASE_URL")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        if not v.startswith("http://") and not v.startswith("https://"):
            raise ValueError("SUPABASE_URL must be a valid HTTP or HTTPS URL")
        # Assume production if not explicity set to development
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production" and not v.startswith("https://"):
            raise ValueError("SUPABASE_URL must use HTTPS in production")
        return v

    @model_validator(mode="after")
    def validate_ai_keys(self) -> "Settings":
        provider = self.AI_PROVIDER.lower()
        if provider == "openai" and not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        if provider == "gemini" and not self.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is required when AI_PROVIDER=gemini")
        if provider == "anthropic" and not self.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic")
        if provider == "xai" and not self.XAI_API_KEY:
            raise ValueError("XAI_API_KEY is required when AI_PROVIDER=xai")
            
        if not self.API_KEY_ENCRYPTION_KEY:
            raise ValueError("API_KEY_ENCRYPTION_KEY is required. Must be a 32 url-safe base64-encoded string.")
            
        return self

settings = Settings()

# Startup Config Banner
logger.debug("STARTING JOBPILOT BACKEND")
logger.debug(f"provider={settings.AI_PROVIDER}")
logger.debug(f"model={settings.AI_MODEL}")
logger.debug(f"supabase_url={settings.SUPABASE_URL}")

