from langchain_anthropic import ChatAnthropic
from .base import AIProvider  # type: ignore[attr-defined]


class AnthropicProvider(AIProvider):
    def get_model(self, model_name: str, **kwargs) -> ChatAnthropic:
        return ChatAnthropic(model_name=model_name, **kwargs)
