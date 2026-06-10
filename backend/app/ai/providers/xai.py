from langchain_openai import ChatOpenAI
from app.core.config import settings
from .base import AIProvider


class XAIProvider(AIProvider):
    def get_model(self, model_name: str, **kwargs) -> ChatOpenAI:
        return ChatOpenAI(
            model=model_name,
            api_key=settings.XAI_API_KEY,
            base_url="https://api.x.ai/v1",
            **kwargs
        )
