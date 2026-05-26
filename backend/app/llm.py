from app.config import settings
from langchain_core.language_models.chat_models import BaseChatModel

def get_llm(temperature: float = 0.0, model_override: str | None = None) -> BaseChatModel:
    """
    Factory function that returns an initialized LangChain chat model based on the configured AI_PROVIDER.
    Supports 'gemini', 'anthropic', 'openai', and 'groq'.
    
    Default temperature is set to 0.0 for consistent and analytical outputs.
    """
    provider = settings.AI_PROVIDER.lower()
    model_name = model_override or settings.AI_MODEL

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is not configured in the environment.")
        model = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=settings.GOOGLE_API_KEY
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not configured in the environment.")
        model = ChatAnthropic(
            model=model_name,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured in the environment.")
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY
        )

    elif provider == "groq":
        from langchain_groq import ChatGroq
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured in the environment.")
        model = ChatGroq(
            model=model_name,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY
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
