from app.config import settings
from langchain_core.language_models.chat_models import BaseChatModel
import re

KEY_PATTERNS = {
    "anthropic": re.compile(r"^sk-ant-[a-zA-Z0-9\-_]{20,}$"),
    "minimax":   re.compile(r"^eyJ[a-zA-Z0-9._-]{20,}$"),
    "openai":    re.compile(r"^sk-[a-zA-Z0-9]{20,}$"),
    "xai":       re.compile(r"^xai-[a-zA-Z0-9\-_]{20,}$"),
    "gemini":    re.compile(r"^[A-Za-z0-9\-_]{30,}$"),
}

def detect_provider(api_key: str | None) -> str:
    """
    Detects the AI provider based on the format/prefix of the API key.
    Handles edge cases safely and defaults to "gemini".
    """
    if not api_key or not isinstance(api_key, str) or len(api_key) < 4:
        return "gemini"
    
    if api_key.startswith("sk-ant-"):
        return "anthropic"
    elif api_key.startswith("eyJ"):
        return "minimax"
    elif api_key.startswith("xai-"):
        return "xai"
    elif api_key.startswith("sk-"):
        return "openai"
    else:
        return "gemini"

def validate_api_key_format(key: str | None) -> bool:
    """
    Validates API key formats based on standard provider prefixes and length constraints.
    Returns True if valid, False otherwise.
    """
    if not key:
        return False
    provider = detect_provider(key)
    pattern = KEY_PATTERNS.get(provider)
    return bool(pattern and pattern.match(key))

def sanitize_llm_input(text: str | None, max_chars: int = 15000) -> str:
    """
    Sanitizes LLM prompt inputs by truncating, stripping null bytes, and normalizing spaces.
    """
    if not text:
        return ""
    # Truncate to prevent token stuffing/exceeding contexts
    text = text[:max_chars]
    # Strip null bytes
    text = text.replace("\x00", "")
    # Normalize horizontal whitespace but preserve newlines for structure
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def resolve_api_key(user_id: str | None, user_api_key: str | None = None) -> str | None:
    """
    Attempts to retrieve the user's encrypted API key from the database.
    Falls back to the provided `user_api_key` (e.g. from an HTTP header).
    """
    db_api_key = None
    if user_id:
        from app.database import supabase_service
        from app.encryption import decrypt_api_key
        try:
            resp = supabase_service.table("user_api_keys").select("encrypted_api_key").eq("user_id", user_id).execute()
            if resp.data and len(resp.data) > 0:
                db_api_key = decrypt_api_key(resp.data[0].get("encrypted_api_key"))
        except Exception:
            # Explicitly do NOT log key-related errors to prevent leaks in backend logs.
            pass
            
    return db_api_key or user_api_key

def get_llm(
    temperature: float = 0.0,
    max_tokens: int | None = None,
    frequency_penalty: float = 0.0,
    model_override: str | None = None,
    user_api_key: str | None = None
) -> BaseChatModel:
    """
    Factory function that returns an initialized LangChain chat model.
    If user_api_key is provided, it detects the provider and maps to its default model.
    Otherwise, it defaults to the global settings AI provider and model.
    
    Default models when user_api_key is provided:
      - anthropic -> claude-sonnet-4-5
      - openai    -> gpt-4o-mini
      - xai       -> grok-3
      - gemini    -> gemini-2.5-flash
    """
    if user_api_key:
        provider = detect_provider(user_api_key)
        if provider != "local" and not validate_api_key_format(user_api_key):
            raise ValueError(f"Invalid API key format for provider: {provider}")
            
        # Use model_override if provided
        if model_override:
            model_name = model_override
        # If the custom key's provider matches the global .env provider, respect the .env default model
        elif provider == settings.AI_PROVIDER.lower():
            model_name = settings.AI_MODEL
        # Otherwise fall back to sensible defaults per provider
        else:
            if provider == "anthropic":
                model_name = "claude-sonnet-4-5"
            elif provider == "openai":
                model_name = "gpt-4o-mini"
            elif provider == "xai":
                model_name = "grok-3-beta"
            elif provider == "minimax":
                model_name = "minimax/m2-7-highspeed"
            elif provider == "moonshot":
                model_name = "moonshot/kimi-k2-6"
            else:
                model_name = "gemini-2.5-flash"
        api_key = user_api_key
    else:
        provider = settings.AI_PROVIDER.lower()
        model_name = model_override or settings.AI_MODEL
        api_key = None

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        key = api_key or settings.GOOGLE_API_KEY
        if not key:
            raise ValueError("GOOGLE_API_KEY is not configured in the environment.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_output_tokens"] = max_tokens
        model = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=key,
            **kwargs
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        key = api_key or settings.ANTHROPIC_API_KEY
        if not key:
            raise ValueError("ANTHROPIC_API_KEY is not configured in the environment.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        model = ChatAnthropic(
            model=model_name,
            temperature=temperature,
            api_key=key,
            **kwargs
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        key = api_key or settings.OPENAI_API_KEY
        if not key:
            raise ValueError("OPENAI_API_KEY is not configured in the environment.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        if frequency_penalty > 0.0:
            kwargs["frequency_penalty"] = frequency_penalty
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=key,
            **kwargs
        )

    elif provider == "xai":
        from langchain_openai import ChatOpenAI
        key = api_key or settings.XAI_API_KEY
        if not key:
            raise ValueError("XAI_API_KEY is not configured.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=key,
            base_url="https://api.x.ai/v1",
            **kwargs
        )

    elif provider == "minimax":
        from langchain_openai import ChatOpenAI
        key = api_key or settings.MINIMAX_API_KEY or ""
        if not key:
            raise ValueError("MINIMAX_API_KEY is not configured.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=key,
            base_url="https://api.minimax.chat/v1",
            **kwargs
        )

    elif provider == "moonshot":
        from langchain_openai import ChatOpenAI
        key = api_key or settings.MOONSHOT_API_KEY or ""
        if not key:
            raise ValueError("MOONSHOT_API_KEY is not configured.")
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=key,
            base_url="https://api.moonshot.cn/v1",
            **kwargs
        )

    elif provider == "local":
        from langchain_openai import ChatOpenAI
        base_url = settings.LOCAL_LLM_BASE_URL
        if not base_url:
            raise ValueError("LOCAL_LLM_BASE_URL is not configured in the environment.")
        key = api_key or settings.OPENAI_API_KEY or "local-no-key-required"
        kwargs = {}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        if frequency_penalty > 0.0:
            kwargs["frequency_penalty"] = frequency_penalty
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=key,
            base_url=base_url,
            **kwargs
        )

    elif provider == "mock":
        from langchain_core.language_models.chat_models import SimpleChatModel
        from langchain_core.messages import BaseMessage
        from typing import List, Any, Optional
        from langchain_core.callbacks.manager import CallbackManagerForLLMRun

        class MockChatModel(SimpleChatModel):
            def _call(
                self,
                messages: List[BaseMessage],
                stop: Optional[List[str]] = None,
                run_manager: Optional[CallbackManagerForLLMRun] = None,
                **kwargs: Any,
            ) -> str:
                # Concatenate message contents to inspect prompt context
                prompt_text = ""
                for m in messages:
                    if isinstance(m.content, str):
                        prompt_text += " " + m.content
                    elif isinstance(m.content, list):
                        for part in m.content:
                            if isinstance(part, dict) and "text" in part:
                                  prompt_text += " " + part["text"]

                prompt_lower = prompt_text.lower()
                if "fit" in prompt_lower or "score" in prompt_lower or "skills" in prompt_lower:
                    return '{"fit_score": 88, "matched_skills": ["Python", "FastAPI"], "missing_skills": ["Kubernetes"], "key_requirements": ["Python Backend Development"], "summary": "Strong backend developer fit with minimal infrastructure gaps."}'
                elif "cover letter" in prompt_lower:
                    return "Dear Hiring Manager,\n\nI am extremely excited to apply for this position. My experience aligns perfectly with your requirements.\n\nSincerely,\nJohn Doe"
                elif "interview" in prompt_lower or "prep" in prompt_lower or "questions" in prompt_lower:
                    return '{"questions": [{"question": "How do you handle background tasks in FastAPI?", "suggested_answer": "I use BackgroundTasks or Celery for long-running processes."}]}'
                else:
                    return "Mock response"

            @property
            def _llm_type(self) -> str:
                return "mock-chat-model"

        model = MockChatModel()

    else:
        raise ValueError(f"Unsupported AI_PROVIDER: {settings.AI_PROVIDER}")

    return model.with_retry(stop_after_attempt=3)
