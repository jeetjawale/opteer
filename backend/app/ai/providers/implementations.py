from typing import Any, Dict, List

import httpx
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama.chat_models import ChatOllama
from langchain_openai import ChatOpenAI

from app.ai.providers.base import LLMProvider


class OpenAIProvider(LLMProvider):
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        # For base OpenAI, we force None or the default to prevent hijacking unless it's custom  # noqa: E501
        return ChatOpenAI(model=model, api_key=api_key, base_url=base_url)  # type: ignore[arg-type]

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        url = (
            f"{base_url.rstrip('/')}/models"
            if base_url
            else "https://api.openai.com/v1/models"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("data", []):
                # Only include chat models to filter out embeddings/whisper/etc
                if "gpt" in m["id"] or "o1" in m["id"]:
                    models.append({"id": m["id"], "name": m["id"]})
            return sorted(models, key=lambda x: x["name"])


class AnthropicProvider(LLMProvider):
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        return ChatAnthropic(model_name=model, api_key=api_key, base_url=base_url)  # type: ignore[arg-type,call-arg]

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        url = (
            f"{base_url.rstrip('/')}/models"
            if base_url
            else "https://api.anthropic.com/v1/models"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("data", []):
                if m.get("type") == "model":
                    models.append(
                        {"id": m["id"], "name": m.get("display_name", m["id"])}
                    )
            return sorted(models, key=lambda x: x["name"])


class GeminiProvider(LLMProvider):
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        return ChatGoogleGenerativeAI(model=model, google_api_key=api_key)  # type: ignore[arg-type]

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        url = "https://generativelanguage.googleapis.com/v1beta/models"
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{url}?key={api_key}", timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("models", []):
                # Filter to only generation models
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    model_id = m["name"].replace("models/", "")
                    models.append(
                        {"id": model_id, "name": m.get("displayName", model_id)}
                    )
            return sorted(models, key=lambda x: x["name"])


class DeepSeekProvider(OpenAIProvider):
    # DeepSeek uses OpenAI compatibility
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        return ChatOpenAI(
            model=model, api_key=api_key, base_url="https://api.deepseek.com/v1"  # type: ignore[arg-type]
        )  # type: ignore[arg-type]

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        return await super().fetch_available_models(
            api_key, base_url="https://api.deepseek.com/v1"
        )


class OpenRouterProvider(OpenAIProvider):
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        return ChatOpenAI(
            model=model, api_key=api_key, base_url="https://openrouter.ai/api/v1"  # type: ignore[arg-type]
        )  # type: ignore[arg-type]

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        url = "https://openrouter.ai/api/v1/models"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
            models = [{"id": m["id"], "name": m["name"]} for m in data.get("data", [])]
            return sorted(models, key=lambda x: x["name"])


class OllamaProvider(LLMProvider):
    def get_client(self, api_key: str, model: str, base_url: str | None = None) -> Any:
        return ChatOllama(model=model, base_url=base_url or "http://localhost:11434")

    async def fetch_available_models(
        self, api_key: str, base_url: str | None = None
    ) -> List[Dict[str, str]]:
        url = f"{(base_url or 'http://localhost:11434').rstrip('/')}/api/tags"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            models = [
                {"id": m["name"], "name": m["name"]} for m in data.get("models", [])
            ]
            return sorted(models, key=lambda x: x["name"])


class CustomProvider(OpenAIProvider):
    # Custom provider uses standard OpenAI compatibility but relies on the base_url passed in  # noqa: E501
    pass
