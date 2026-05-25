import os
import pytest

# Set env variables before any other import to satisfy config validation
os.environ["SUPABASE_URL"] = "https://mockdb.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-key-anon"
os.environ["SUPABASE_SERVICE_KEY"] = "mock-key-service"
os.environ["GOOGLE_API_KEY"] = "mock-google-key"
os.environ["AI_PROVIDER"] = "gemini"
os.environ["AI_MODEL"] = "gemini-2.5-flash"
os.environ["FIRECRAWL_API_KEY"] = "mock-firecrawl-key"
os.environ["TAVILY_API_KEY"] = "mock-tavily-key"

@pytest.fixture(autouse=True)
def mock_settings_env(monkeypatch):
    """Automatically mock environments to make sure no real calls bypass settings."""
    monkeypatch.setenv("SUPABASE_URL", "https://mockdb.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "mock-key-anon")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "mock-key-service")
    monkeypatch.setenv("GOOGLE_API_KEY", "mock-google-key")
