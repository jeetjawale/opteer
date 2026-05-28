from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from uuid import UUID

from app.database import supabase_service, get_current_user
from app.schemas import ReminderResponse, ReminderCreate, ReminderUpdate

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("", response_model=List[ReminderResponse])
async def list_reminders(
    application_id: Optional[UUID] = None,
    current_user = Depends(get_current_user)
):
    """
    Fetches all reminders for the authenticated user.
    Optionally filters by application_id.
    """
    try:
        query = supabase_service.table("reminders") \
            .select("*") \
            .eq("user_id", current_user.id)
            
        if application_id:
            query = query.eq("application_id", str(application_id))
            
        response = query.execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reminders: {str(e)}"
        )


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreate,
    current_user = Depends(get_current_user)
):
    """
    Creates a new reminder linked to an application.
    Verifies that the target application belongs to the authenticated user.
    """
    # 1. Verify target application ownership
    try:
        app_response = supabase_service.table("applications") \
            .select("user_id") \
            .eq("id", str(payload.application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not app_response.data or len(app_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked application not found."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed application verification check: {str(e)}"
        )
        
    # 2. Insert reminder
    try:
        reminder_data = payload.model_dump()
        reminder_data["application_id"] = str(reminder_data["application_id"])
        reminder_data["user_id"] = current_user.id
        reminder_data["is_sent"] = False
        reminder_data["is_completed"] = False
        
        response = supabase_service.table("reminders").insert(reminder_data).execute()
        if not response.data or len(response.data) == 0:
            raise ValueError("Database insertion failed.")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create reminder: {str(e)}"
        )


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: UUID,
    payload: ReminderUpdate,
    current_user = Depends(get_current_user)
):
    """
    Updates an existing reminder.
    Verifies ownership before applying the update.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("reminders") \
            .select("user_id") \
            .eq("id", str(reminder_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {str(e)}"
        )
        
    # 2. Apply updates
    try:
        update_data = payload.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("user_id", None)
        update_data.pop("application_id", None)
        
        # Serialize due_at datetime if present
        if "due_at" in update_data and update_data["due_at"]:
            update_data["due_at"] = update_data["due_at"].isoformat()
            
        if update_data:
            supabase_service.table("reminders") \
                .update(update_data) \
                .eq("id", str(reminder_id)) \
                .eq("user_id", str(current_user.id)) \
                .execute()
                
        # 3. Retrieve updated row
        response = supabase_service.table("reminders") \
            .select("*") \
            .eq("id", str(reminder_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update reminder: {str(e)}"
        )


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Deletes a reminder.
    Verifies ownership before deleting.
    """
    # 1. Verify ownership
    try:
        check_response = supabase_service.table("reminders") \
            .select("user_id") \
            .eq("id", str(reminder_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {str(e)}"
        )
        
    # 2. Perform deletion
    try:
        supabase_service.table("reminders") \
            .delete() \
            .eq("id", str(reminder_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete reminder: {str(e)}"
        )
