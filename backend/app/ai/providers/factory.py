from typing import Dict, Type

from app.ai.providers.base import LLMProvider
from app.ai.providers.implementations import (
    AnthropicProvider,
    CustomProvider,
    DeepSeekProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
    OpenRouterProvider,
)


class ProviderFactory:
    _providers: Dict[str, Type[LLMProvider]] = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "gemini": GeminiProvider,
        "deepseek": DeepSeekProvider,
        "openrouter": OpenRouterProvider,
        "ollama": OllamaProvider,
        "custom": CustomProvider,
    }

    @classmethod
    def get_provider(cls, provider_name: str) -> LLMProvider:
        provider_class = cls._providers.get(provider_name.lower())
        if not provider_class:
            raise ValueError(f"Unknown LLM provider: {provider_name}")
        return provider_class()
