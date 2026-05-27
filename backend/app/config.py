import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "JobPilot"
    
    # LLM Settings
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-2.0-flash"
    LOCAL_LLM_BASE_URL: str | None = None
    
    # Modular Model Routing Overrides (fallback to AI_MODEL if None)
    AI_MODEL_FIT: str | None = None
    AI_MODEL_LETTER: str | None = None
    AI_MODEL_PREP: str | None = None
    
    # API Keys
    GOOGLE_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    XAI_API_KEY: str | None = None
    
    # Integrations
    FIRECRAWL_API_KEY: str | None = None
    TAVILY_API_KEY: str | None = None
    
    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
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
    
    @field_validator("AI_PROVIDER")
    @classmethod
    def validate_ai_provider(cls, v: str) -> str:
        allowed = {"gemini", "anthropic", "openai", "xai", "local", "mock"}
        provider = v.lower()
        if provider not in allowed:
            raise ValueError(f"AI_PROVIDER must be one of {allowed}")
        return provider

settings = Settings()
