from datetime import datetime, timezone
import asyncio

from fastapi import HTTPException, status
from app.schemas import (
    UserConfigUpdate,
    LLMValidateRequest,
    IntegrationValidateRequest,
)
from app.core.encryption import encrypt_api_key, decrypt_api_key
from app.ai.providers import ProviderFactory
from app.db.repositories.user_configs import UserConfigsRepository


class SettingsService:
    def __init__(self, config_repo: UserConfigsRepository):
        self.config_repo = config_repo

    async def get_settings(self, user_id: str) -> dict:
        user_config = await self.config_repo.get_by_user_id(user_id)  # type: ignore[arg-type]

        if not user_config:
            return {
                "id": None,
                "user_id": str(user_id),
                "onboarding_completed": False,
                "onboarding_step": None,
                "active_llm_provider": None,
                "llm_providers_configured": {},
                "active_models": {},
                "base_urls": {},
                "task_models": {},
                "integration_providers_configured": {},
                "auto_analyze_on_import": True,
                "generate_interview_prep": True,
                "auto_draft_cover_letters": True,
                "auto_tailor_resume": True,
                "updated_at": datetime.now(timezone.utc),
            }

        llm_keys = user_config.llm_keys or {}

        configured_map = {}
        models_map = {}
        urls_map = {}

        for provider, data in llm_keys.items():  # type: ignore[union-attr]
            if data.get("api_key_encrypted"):
                configured_map[provider] = True
            if data.get("model"):
                models_map[provider] = data["model"]
            if data.get("base_url"):
                urls_map[provider] = data["base_url"]

        final_models_map = {}
        final_models_map.update(models_map)

        final_configured_map = {}
        final_configured_map.update(configured_map)

        integration_keys = user_config.integration_keys or {}
        integration_configured_map = {}
        for provider, data in integration_keys.items():  # type: ignore[union-attr]
            if data:
                integration_configured_map[provider] = True

        return {
            "id": str(user_config.id),
            "user_id": str(user_config.user_id),
            "onboarding_completed": user_config.onboarding_completed,
            "onboarding_step": user_config.onboarding_step,
            "active_llm_provider": user_config.active_llm_provider,
            "llm_providers_configured": final_configured_map,
            "active_models": final_models_map,
            "base_urls": urls_map,
            "task_models": user_config.task_models or {},
            "integration_providers_configured": integration_configured_map,
            "auto_analyze_on_import": (
                user_config.auto_analyze_on_import
                if user_config.auto_analyze_on_import is not None
                else True
            ),
            "generate_interview_prep": (
                user_config.generate_interview_prep
                if user_config.generate_interview_prep is not None
                else True
            ),
            "auto_draft_cover_letters": (
                user_config.auto_draft_cover_letters
                if user_config.auto_draft_cover_letters is not None
                else True
            ),
            "auto_tailor_resume": (
                user_config.auto_tailor_resume
                if user_config.auto_tailor_resume is not None
                else True
            ),
            "updated_at": user_config.updated_at,
        }

    async def update_settings(self, user_id: str, payload: UserConfigUpdate) -> dict:
        user_config = await self.config_repo.get_by_user_id(user_id)  # type: ignore[arg-type]

        update_data = payload.model_dump(exclude_unset=True)

        import copy

        if "llm_keys" in update_data and update_data["llm_keys"]:
            llm_keys_payload = update_data["llm_keys"]

            existing_keys = (
                copy.deepcopy(user_config.llm_keys)
                if user_config and user_config.llm_keys
                else {}
            )

            for provider, data in llm_keys_payload.items():
                if provider not in existing_keys:
                    existing_keys[provider] = {}

                if "api_key_encrypted" in data and data["api_key_encrypted"]:
                    raw_key = data["api_key_encrypted"]
                    if "••••" not in raw_key:
                        existing_keys[provider]["api_key_encrypted"] = encrypt_api_key(
                            raw_key
                        )

                if "model" in data and data["model"] is not None:
                    existing_keys[provider]["model"] = data["model"]

                if "base_url" in data and data["base_url"] is not None:
                    existing_keys[provider]["base_url"] = data["base_url"]

            update_data["llm_keys"] = existing_keys

        if "integration_keys" in update_data and update_data["integration_keys"]:
            integration_keys_payload = update_data["integration_keys"]
            existing_integration_keys = (
                copy.deepcopy(user_config.integration_keys)
                if user_config and user_config.integration_keys
                else {}
            )

            for provider, api_key in integration_keys_payload.items():
                if api_key:
                    if "••••" not in api_key:
                        existing_integration_keys[provider] = encrypt_api_key(api_key)
                else:
                    if provider in existing_integration_keys:
                        del existing_integration_keys[provider]

            update_data["integration_keys"] = existing_integration_keys

        if user_config:
            await self.config_repo.update(user_config, **update_data)
        else:
            await self.config_repo.create(user_id=user_id, **update_data)

        return await self.get_settings(user_id)

    async def validate_llm_key(self, payload: LLMValidateRequest) -> dict:
        try:
            provider = ProviderFactory.get_provider(payload.provider)
            models = await provider.fetch_available_models(
                api_key=payload.api_key, base_url=payload.base_url
            )
            return {"valid": True, "models": models, "error": None}
        except Exception as e:
            return {"valid": False, "models": [], "error": str(e)}

    async def get_llm_models(self, user_id: str, provider: str) -> dict:
        api_key = None
        base_url = None

        user_config = await self.config_repo.get_by_user_id(user_id)  # type: ignore[arg-type]
        if user_config and user_config.llm_keys and provider in user_config.llm_keys:
            provider_data = user_config.llm_keys[provider]  # type: ignore[call-overload]
            encrypted_key = provider_data.get("api_key_encrypted")
            if encrypted_key:
                api_key = decrypt_api_key(encrypted_key)
            base_url = provider_data.get("base_url")

        if not api_key and provider != "ollama":
            return {"models": []}

        try:
            llm_provider = ProviderFactory.get_provider(provider)
            models = await llm_provider.fetch_available_models(
                api_key=api_key, base_url=base_url  # type: ignore[arg-type]
            )
            return {"models": models}
        except Exception as e:
            return {"models": []}

    async def validate_integration_key(
        self, payload: IntegrationValidateRequest
    ) -> dict:
        try:
            if payload.provider == "firecrawl":
                from firecrawl import FirecrawlApp  # type: ignore[import-untyped]

                FirecrawlApp(api_key=payload.api_key)

                if not payload.api_key.startswith("fc-"):
                    return {
                        "valid": False,
                        "error": "Invalid Firecrawl API Key format (must start with fc-)",
                    }

                return {"valid": True, "error": None}

            elif payload.provider == "tavily":
                from tavily import TavilyClient  # type: ignore[import-untyped]

                def _test_tavily():
                    client = TavilyClient(api_key=payload.api_key)
                    client.search("test", max_results=1)

                await asyncio.to_thread(_test_tavily)
                return {"valid": True, "error": None}

            else:
                return {
                    "valid": False,
                    "error": f"Unknown integration provider: {payload.provider}",
                }

        except Exception as e:
            return {"valid": False, "error": str(e)}
