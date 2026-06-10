from langchain_core.language_models.chat_models import BaseChatModel
from app.ai.providers import ProviderFactory
from app.core.config import settings
import json
from pathlib import Path

def get_llm(
    provider_name: str,
    model_name: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.0,
    max_tokens: int | None = None
) -> BaseChatModel:
    """
    Creates and returns a LangChain chat model based on the active provider.
    Falls back to global settings if model or api_key are missing and provider matches default.
    """
    # If no model is specified, we rely on the provider's default model fallback
    if not model_name:
        if provider_name == "openai":
            model_name = "gpt-4o-mini"
        elif provider_name == "anthropic":
            model_name = "claude-3-5-haiku-latest"
        elif provider_name == "gemini":
            model_name = "gemini-3.1-flash-lite"
            
    # We no longer fall back to system defaults because keys must be explicitly
    # provided via the DB from the user's settings.
    if not api_key and provider_name != "ollama" and provider_name != "mock":
        pass  # Provider will likely throw an auth error later which is expected

    provider = ProviderFactory.get_provider(provider_name)
    client = provider.get_client(api_key=api_key or "", model=model_name, base_url=base_url)
    
    # We can inject temperature/max_tokens directly to the client via its attributes or initialization parameters
    # Note: langchain clients often let you modify these after creation if they are pydantic fields,
    # but for safety we will rely on the underlying implementation to use default temperature if not specified
    # For now, most LangChain classes default to temp 0.7. We could update the get_client signature to pass temp, 
    # but since it's just Fit Scoring, we can do it post-init if supported.
    if hasattr(client, "temperature"):
        client.temperature = temperature
    if max_tokens and hasattr(client, "max_tokens"):
        client.max_tokens = max_tokens

    return client.with_retry(stop_after_attempt=3)

def sanitize_llm_input(text: str | None, max_chars: int = 15000) -> str:
    """
    Sanitizes LLM prompt inputs by truncating, stripping null bytes, and normalizing spaces.
    """
    import re
    if not text:
        return ""
    text = text[:max_chars]
    text = text.replace("\x00", "")
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def get_models_config() -> dict:
    """Reads models.json and returns its contents."""
    models_path = Path(__file__).parent / "models.json"
    if models_path.exists():
        with open(models_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}
