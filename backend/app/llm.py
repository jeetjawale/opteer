from app.config import settings
from langchain_core.language_models.chat_models import BaseChatModel

def get_llm(temperature: float = 0.0) -> BaseChatModel:
    """
    Factory function that returns an initialized LangChain chat model based on the configured AI_PROVIDER.
    Supports 'gemini', 'anthropic', 'openai', and 'groq'.
    
    Default temperature is set to 0.0 for consistent and analytical outputs.
    """
    provider = settings.AI_PROVIDER.lower()
    model_name = settings.AI_MODEL

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is not configured in the environment.")
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=settings.GOOGLE_API_KEY
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not configured in the environment.")
        return ChatAnthropic(
            model=model_name,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured in the environment.")
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY
        )

    elif provider == "groq":
        from langchain_groq import ChatGroq
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured in the environment.")
        return ChatGroq(
            model=model_name,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY
        )

    else:
        raise ValueError(f"Unsupported AI_PROVIDER: {settings.AI_PROVIDER}")
