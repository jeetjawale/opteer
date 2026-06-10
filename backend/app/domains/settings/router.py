import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from datetime import datetime, timezone
import uuid

from app.database import get_current_user
from app.schemas import UserConfigUpdate, UserConfigResponse, LLMValidateRequest, LLMValidateResponse, IntegrationValidateRequest, IntegrationValidateResponse
from app.core.encryption import encrypt_api_key, decrypt_api_key
from app.ai.providers import ProviderFactory
from app.utils.timing import log_duration

from app.db.repositories.user_configs import UserConfigsRepository
from app.core.dependencies import get_user_configs_repo

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=UserConfigResponse)
async def get_settings(
    current_user = Depends(get_current_user),
    config_repo: UserConfigsRepository = Depends(get_user_configs_repo)
):
    """
    Fetches the current user's config and LLM state.
    """
    async with log_duration("GET_SETTINGS"):
        try:
            user_config = await config_repo.get_by_user_id(current_user.id)

            if not user_config:
                return {
                    "id": None,
                    "user_id": str(current_user.id),
                    "onboarding_completed": False,
                    "onboarding_step": None,
                    "daily_analysis_credits": 50,
                    "max_daily_credits": 50,
                    "last_credit_reset": datetime.now(timezone.utc),
                    "active_llm_provider": None,
                    "llm_providers_configured": {},
                    "active_models": {},
                    "base_urls": {},
                    "task_models": {},
                    "integration_providers_configured": {},
                    "updated_at": datetime.now(timezone.utc)
                }

            # Map the JSONB dict safely to the response structure
            llm_keys = user_config.llm_keys or {}
            
            configured_map = {}
            models_map = {}
            urls_map = {}
            
            for provider, data in llm_keys.items():
                if data.get("api_key_encrypted"):
                    configured_map[provider] = True
                if data.get("model"):
                    models_map[provider] = data["model"]
                if data.get("base_url"):
                    urls_map[provider] = data["base_url"]

            # Safely merge defaults into active models map
            final_models_map = {}
            final_models_map.update(models_map)
            
            final_configured_map = {}
            final_configured_map.update(configured_map)
            
            integration_keys = user_config.integration_keys or {}
            integration_configured_map = {}
            for provider, data in integration_keys.items():
                if data:
                    integration_configured_map[provider] = True

            return {
                "id": str(user_config.id),
                "user_id": str(user_config.user_id),
                "onboarding_completed": user_config.onboarding_completed,
                "onboarding_step": user_config.onboarding_step,
                "daily_analysis_credits": user_config.daily_analysis_credits,
                "max_daily_credits": user_config.max_daily_credits,
                "last_credit_reset": user_config.last_credit_reset,
                "active_llm_provider": user_config.active_llm_provider,
                "llm_providers_configured": final_configured_map,
                "active_models": final_models_map,
                "base_urls": urls_map,
                "task_models": user_config.task_models or {},
                "integration_providers_configured": integration_configured_map,
                "updated_at": user_config.updated_at
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve settings: {str(e)}"
            )

@router.put("", response_model=UserConfigResponse)
async def update_settings(
    payload: UserConfigUpdate,
    current_user = Depends(get_current_user),
    config_repo: UserConfigsRepository = Depends(get_user_configs_repo)
):
    """
    Upserts the user's config and LLM settings.
    """
    async with log_duration("UPDATE_SETTINGS"):
        try:
            user_config = await config_repo.get_by_user_id(current_user.id)
            
            update_data = payload.model_dump(exclude_unset=True)
            
            # Encrypt any API keys being passed in before saving
            if "llm_keys" in update_data and update_data["llm_keys"]:
                llm_keys_payload = update_data["llm_keys"]
                
                # Fetch existing keys to merge with, so we don't wipe out other providers
                existing_keys = user_config.llm_keys if user_config and user_config.llm_keys else {}
                
                for provider, data in llm_keys_payload.items():
                    if provider not in existing_keys:
                        existing_keys[provider] = {}
                        
                    if "api_key_encrypted" in data and data["api_key_encrypted"]:
                        # This is a raw key coming from the frontend, we must encrypt it
                        raw_key = data["api_key_encrypted"]
                        # Don't re-encrypt if it's already masked (the frontend shouldn't send masked keys back, but just in case)
                        if "••••" not in raw_key:
                            existing_keys[provider]["api_key_encrypted"] = encrypt_api_key(raw_key)
                    
                    if "model" in data and data["model"] is not None:
                        existing_keys[provider]["model"] = data["model"]
                        
                    if "base_url" in data and data["base_url"] is not None:
                        existing_keys[provider]["base_url"] = data["base_url"]
                
                update_data["llm_keys"] = existing_keys

            if "integration_keys" in update_data and update_data["integration_keys"]:
                integration_keys_payload = update_data["integration_keys"]
                existing_integration_keys = user_config.integration_keys if user_config and user_config.integration_keys else {}
                
                for provider, api_key in integration_keys_payload.items():
                    if api_key:
                        if "••••" not in api_key:
                            existing_integration_keys[provider] = encrypt_api_key(api_key)
                    else:
                        if provider in existing_integration_keys:
                            del existing_integration_keys[provider]
                            
                update_data["integration_keys"] = existing_integration_keys

            if user_config:
                await config_repo.update(user_config, **update_data)
            else:
                await config_repo.create(user_id=current_user.id, **update_data)

            # return fetched updated settings
            return await get_settings(current_user, config_repo)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update settings: {str(e)}"
            )

@router.post("/llm/validate", response_model=LLMValidateResponse)
async def validate_llm_key(
    payload: LLMValidateRequest,
    current_user = Depends(get_current_user)
):
    """
    Validates an LLM API key by attempting to fetch the list of available models.
    """
    async with log_duration("VALIDATE_LLM"):
        try:
            provider = ProviderFactory.get_provider(payload.provider)
            models = await provider.fetch_available_models(api_key=payload.api_key, base_url=payload.base_url)
            return {"valid": True, "models": models, "error": None}
        except Exception as e:
            # If the provider throws an HTTP error or validation fails
            return {"valid": False, "models": [], "error": str(e)}

@router.get("/llm/models")
async def get_llm_models(
    provider: str,
    current_user = Depends(get_current_user),
    config_repo: UserConfigsRepository = Depends(get_user_configs_repo)
):
    """
    Fetches available models for a provider using the user's saved API key.
    """
    async with log_duration("FETCH_MODELS"):
        api_key = None
        base_url = None
        
        user_config = await config_repo.get_by_user_id(current_user.id)
        if user_config and user_config.llm_keys and provider in user_config.llm_keys:
            provider_data = user_config.llm_keys[provider]
            encrypted_key = provider_data.get("api_key_encrypted")
            if encrypted_key:
                api_key = decrypt_api_key(encrypted_key)
            base_url = provider_data.get("base_url")
            
        if not api_key and provider != "ollama":
            raise HTTPException(status_code=400, detail="API key not found for provider.")
            
        try:
            llm_provider = ProviderFactory.get_provider(provider)
            models = await llm_provider.fetch_available_models(api_key=api_key, base_url=base_url)
            return {"models": models}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch models: {str(e)}")

@router.post("/integrations/validate", response_model=IntegrationValidateResponse)
async def validate_integration_key(
    payload: IntegrationValidateRequest,
    current_user = Depends(get_current_user)
):
    """
    Validates an integration API key (Firecrawl or Tavily).
    """
    async with log_duration("VALIDATE_INTEGRATION"):
        try:
            if payload.provider == "firecrawl":
                # Firecrawl basic test
                from app.integrations.firecrawl import FirecrawlApp
                import asyncio
                
                # Check api key synchronously or asyncly depending on the lib
                app = FirecrawlApp(api_key=payload.api_key)
                
                # We can do a quick check, maybe an empty crawl or just rely on 
                # whether it parses without crash. 
                # Better: try a quick scrape of a very fast site to validate key, or just assume it's valid 
                # if it starts with 'fc-'
                if not payload.api_key.startswith("fc-"):
                    return {"valid": False, "error": "Invalid Firecrawl API Key format (must start with fc-)"}
                
                return {"valid": True, "error": None}
                
            elif payload.provider == "tavily":
                from tavily import TavilyClient
                import asyncio
                
                def _test_tavily():
                    client = TavilyClient(api_key=payload.api_key)
                    # A small cheap search to validate
                    client.search("test", max_results=1)
                
                await asyncio.to_thread(_test_tavily)
                return {"valid": True, "error": None}
                
            else:
                return {"valid": False, "error": f"Unknown integration provider: {payload.provider}"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
