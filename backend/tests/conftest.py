import os
import pytest

# Set env variables before any other import to satisfy config validation
os.environ["GOOGLE_API_KEY"] = "mock-google-key"
os.environ["AI_PROVIDER"] = "gemini"
os.environ["AI_MODEL"] = "gemini-2.5-flash"
os.environ["FIRECRAWL_API_KEY"] = "mock-firecrawl-key"
os.environ["TAVILY_API_KEY"] = "mock-tavily-key"

os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/opteer_test"
os.environ["API_KEY_ENCRYPTION_KEY"] = "mock-32-byte-encryption-key-for-tests-only!!"

@pytest.fixture(autouse=True)
def mock_settings_env(monkeypatch):
    """Automatically mock environments to make sure no real calls bypass settings."""

    monkeypatch.setenv("GOOGLE_API_KEY", "mock-google-key")
