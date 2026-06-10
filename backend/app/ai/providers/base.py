from abc import ABC, abstractmethod
from typing import List, Dict, Any


class LLMProvider(ABC):
    """Abstract base class for all LLM providers."""

    @abstractmethod
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        """Returns an initialized LangChain chat model."""
        pass

    @abstractmethod
    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        """
        Fetches a list of available models for the provider.
        Should return a list of dicts like: [{"id": "gpt-4o", "name": "GPT-4o"}]
        """
        pass
