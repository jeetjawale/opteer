from langchain_google_genai import ChatGoogleGenerativeAI

from .base import AIProvider  # type: ignore[attr-defined]


class GeminiProvider(AIProvider):
    def get_model(self, model_name: str, **kwargs) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(model=model_name, **kwargs)
