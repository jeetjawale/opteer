from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase_service, get_current_user
from app.schemas import UserSettingsUpdate, UserSettingsResponse
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=UserSettingsResponse)
async def get_settings(current_user = Depends(get_current_user)):
    """
    Fetches the current user's AI model settings.
    If no settings exist, returns a default empty configuration.
    """
    try:
        response = supabase_service.table("user_settings") \
            .select("*") \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            return {
                "id": str(uuid.uuid4()),
                "user_id": str(current_user.id),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "model_fit": None,
                "model_letter": None,
                "model_prep": None
            }
            
        return response.data[0]
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
