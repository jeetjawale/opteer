from langchain_openai import ChatOpenAI
from .base import AIProvider

class OpenAIProvider(AIProvider):
    def get_model(self, model_name: str, **kwargs) -> ChatOpenAI:
        return ChatOpenAI(model=model_name, **kwargs)
