from langchain_google_genai import ChatGoogleGenerativeAI
from .base import AIProvider


class GeminiProvider(AIProvider):
    def get_model(self, model_name: str, **kwargs) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(model=model_name, **kwargs)
