from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_current_user
from app.schemas import (
    UserConfigUpdate,
    UserConfigResponse,
    LLMValidateRequest,
    LLMValidateResponse,
    IntegrationValidateRequest,
    IntegrationValidateResponse,
)
from app.utils.timing import log_duration

from app.db.repositories.user_configs import UserConfigsRepository
from app.core.dependencies import get_user_configs_repo
from app.api.dependencies.rate_limit import SimpleRateLimiter

from .service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


def get_settings_service(
    config_repo: UserConfigsRepository = Depends(get_user_configs_repo),
) -> SettingsService:
    return SettingsService(config_repo)


@router.get("", response_model=UserConfigResponse)
async def get_settings(
    current_user=Depends(get_current_user),
    service: SettingsService = Depends(get_settings_service),
):
    async with log_duration("GET_SETTINGS"):
        try:
            return await service.get_settings(current_user.id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve settings. Please try again later.",
            )


@router.put("", response_model=UserConfigResponse)
async def update_settings(
    payload: UserConfigUpdate,
    current_user=Depends(get_current_user),
    service: SettingsService = Depends(get_settings_service),
):
    async with log_duration("UPDATE_SETTINGS"):
        try:
            return await service.update_settings(current_user.id, payload)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update settings: {str(e)}",
            )


@router.post(
    "/llm/validate",
    response_model=LLMValidateResponse,
    dependencies=[Depends(SimpleRateLimiter(calls=10, period=60))],
)
async def validate_llm_key(
    payload: LLMValidateRequest,
    current_user=Depends(get_current_user),
    service: SettingsService = Depends(get_settings_service),
):
    async with log_duration("VALIDATE_LLM"):
        return await service.validate_llm_key(payload)


@router.get("/llm/models")
async def get_llm_models(
    provider: str,
    current_user=Depends(get_current_user),
    service: SettingsService = Depends(get_settings_service),
):
    async with log_duration("FETCH_MODELS"):
        return await service.get_llm_models(current_user.id, provider)


@router.post(
    "/integrations/validate",
    response_model=IntegrationValidateResponse,
    dependencies=[Depends(SimpleRateLimiter(calls=10, period=60))],
)
async def validate_integration_key(
    payload: IntegrationValidateRequest,
    current_user=Depends(get_current_user),
    service: SettingsService = Depends(get_settings_service),
):
    async with log_duration("VALIDATE_INTEGRATION"):
        return await service.validate_integration_key(payload)
