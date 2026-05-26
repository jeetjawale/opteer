from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from uuid import UUID
from datetime import datetime, timezone

from app.database import supabase_service, get_current_user
from app.schemas import ResumeResponse, ResumeCreate, ResumeUpdate, ResumeListResponse

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.get("", response_model=List[ResumeListResponse])
async def list_resumes(
    current_user = Depends(get_current_user)
):
    """
    List all resumes for the authenticated user.
    Includes a derived preview field (first 100 characters of content).
    """
    try:
        response = supabase_service.table("resumes") \
            .select("id, name, content, created_at, updated_at") \
            .eq("user_id", current_user.id) \
            .order("created_at", desc=True) \
            .execute()
            
        records = response.data or []
        resumes_list = []
        for record in records:
            content = record.get("content", "")
            preview = content[:100] + ("..." if len(content) > 100 else "")
            resumes_list.append({
                "id": record["id"],
                "name": record["name"],
                "preview": preview,
                "created_at": record["created_at"],
                "updated_at": record["updated_at"]
            })
        return resumes_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list resumes: {str(e)}"
        )

@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    payload: ResumeCreate,
    current_user = Depends(get_current_user)
):
    """
    Creates a new resume for the authenticated user.
    """
    try:
        resume_data = payload.model_dump()
        resume_data["user_id"] = current_user.id
        
        response = supabase_service.table("resumes").insert(resume_data).execute()
        if not response.data or len(response.data) == 0:
            raise ValueError("Database insertion failed.")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resume: {str(e)}"
        )

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Retrieves full details for a single resume.
    """
    try:
        response = supabase_service.table("resumes") \
            .select("*") \
            .eq("id", str(resume_id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
            
        row = response.data[0]
        if str(row.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
            
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving resume: {str(e)}"
        )

@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: UUID,
    payload: ResumeUpdate,
    current_user = Depends(get_current_user)
):
    """
    Updates the name or content of a resume.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("resumes") \
            .select("user_id") \
            .eq("id", str(resume_id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
            
        if str(check_response.data[0].get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {str(e)}"
        )
        
    # 2. Perform the update
    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("user_id", None)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        if update_data:
            supabase_service.table("resumes") \
                .update(update_data) \
                .eq("id", str(resume_id)) \
                .execute()
                
        # 3. Retrieve updated row
        response = supabase_service.table("resumes") \
            .select("*") \
            .eq("id", str(resume_id)) \
            .execute()
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update resume: {str(e)}"
        )

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Deletes the resume.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("resumes") \
            .select("user_id") \
            .eq("id", str(resume_id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
            
        if str(check_response.data[0].get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
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
        supabase_service.table("resumes") \
            .delete() \
            .eq("id", str(resume_id)) \
            .execute()
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {str(e)}"
        )
