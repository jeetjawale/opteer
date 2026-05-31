from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database import supabase_service, get_current_user
from app.schemas import UserSettingsUpdate, UserSettingsResponse
from app.config import settings
from datetime import datetime, timezone
import uuid
from app.encryption import encrypt_api_key
from app.llm import detect_provider

router = APIRouter(prefix="/settings", tags=["settings"])

def _resolve(user_val: str | None, env_val: str | None, user_default: str | None = None) -> str | None:
    """Return user's saved preference, falling back to user's saved default, then .env, then global AI_MODEL."""
    return user_val or user_default or env_val or settings.AI_MODEL

@router.get("", response_model=UserSettingsResponse)
async def get_settings(current_user = Depends(get_current_user)):
    """
    Fetches the current user's AI model settings.
    Returns *resolved* effective values — i.e. what the backend will actually use —
    so the frontend always shows the true active model.
    """
    try:
        response = supabase_service.table("user_settings") \
            .select("*") \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            # No user row yet — return the .env defaults so the UI reflects reality
            saved_default = None
            return {
                "id": str(uuid.uuid4()),
                "user_id": str(current_user.id),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "model_default": settings.AI_MODEL,
                "model_fit":    _resolve(None, settings.AI_MODEL_FIT, saved_default),
                "model_letter": _resolve(None, settings.AI_MODEL_LETTER, saved_default),
                "model_prep":   _resolve(None, settings.AI_MODEL_PREP, saved_default),
            }
        
        row = response.data[0]
        # Resolve: user saved value → user default → .env override → global AI_MODEL
        saved_default = row.get("model_default")
        row["model_default"] = saved_default or settings.AI_MODEL
        row["model_fit"]    = _resolve(row.get("model_fit"),    settings.AI_MODEL_FIT,    saved_default)
        row["model_letter"] = _resolve(row.get("model_letter"), settings.AI_MODEL_LETTER, saved_default)
        row["model_prep"]   = _resolve(row.get("model_prep"),   settings.AI_MODEL_PREP,   saved_default)
        return row
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve settings: {str(e)}"
        )

@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    payload: UserSettingsUpdate,
    current_user = Depends(get_current_user)
):
    """
    Upserts the user's AI model settings.
    """
    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("api_key", None)  # Ensure api_key is never saved to user_settings
    update_data["user_id"] = str(current_user.id)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        # Use Supabase upsert with on_conflict
        response = supabase_service.table("user_settings") \
            .upsert(update_data, on_conflict="user_id") \
            .select("*") \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Upsert succeeded but returned no data."
            )
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )

class ApiKeyUpdate(BaseModel):
    api_key: Optional[str] = None
    provider: Optional[str] = None

class ApiKeyResponse(BaseModel):
    has_saved_key: bool
    provider: Optional[str] = None

@router.get("/api-key", response_model=ApiKeyResponse)
async def get_api_key_status(current_user = Depends(get_current_user)):
    """Check if the user has an encrypted API key stored."""
    response = supabase_service.table("user_api_keys") \
        .select("provider") \
        .eq("user_id", str(current_user.id)) \
        .execute()
        
    if response.data and len(response.data) > 0:
        return {"has_saved_key": True, "provider": response.data[0].get("provider")}
    return {"has_saved_key": False, "provider": None}

@router.put("/api-key", response_model=ApiKeyResponse)
async def update_api_key(
    payload: ApiKeyUpdate,
    current_user = Depends(get_current_user)
):
    """Upsert or delete the user's encrypted API key."""
    if not payload.api_key or payload.api_key.strip() == "" or "••••" in payload.api_key:
        # Delete the key if empty or placeholder is submitted
        supabase_service.table("user_api_keys") \
            .delete() \
            .eq("user_id", str(current_user.id)) \
            .execute()
        return {"has_saved_key": False, "provider": None}
        
    # Encrypt and save
    api_key = payload.api_key.strip()
    provider = payload.provider or detect_provider(api_key)
    encrypted_key = encrypt_api_key(api_key)
    
    update_data = {
        "user_id": str(current_user.id),
        "provider": provider,
        "encrypted_api_key": encrypted_key,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase_service.table("user_api_keys") \
        .upsert(update_data, on_conflict="user_id") \
        .execute()
        
    return {"has_saved_key": True, "provider": provider}
