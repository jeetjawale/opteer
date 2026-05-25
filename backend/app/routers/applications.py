from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from uuid import UUID

from app.database import supabase_service, get_current_user
from app.schemas import ApplicationResponse, ApplicationUpdate, ApplicationStatus
from app.graphs.analysis_graph import run_analysis

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status: Optional[ApplicationStatus] = None,
    current_user = Depends(get_current_user)
):
    """
    Fetches all applications for the current user, joined with job details.
    Flattens the nested job fields into the top-level response.
    """
    try:
        query = supabase_service.table("applications") \
            .select("*, jobs(company, role, url)") \
            .eq("user_id", current_user.id)
            
        if status:
            query = query.eq("status", status)
            
        response = query.execute()
        
        # Flatten the nested jobs relationship directly using pop and update
        records = response.data or []
        for row in records:
            job_data = row.pop("jobs", {}) or {}
            if isinstance(job_data, list):
                job_data = job_data[0] if len(job_data) > 0 else {}
            row.update(job_data)
            
        return records
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve applications: {str(e)}"
        )


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Retrieves detailed info for a single application.
    Returns 404 if not found or if the application belongs to another user.
    """
    try:
        response = supabase_service.table("applications") \
            .select("*, jobs(company, role, url)") \
            .eq("id", str(application_id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        row = response.data[0]
        # Strict ownership verification
        if str(row.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        job_data = row.pop("jobs", {}) or {}
        if isinstance(job_data, list):
            job_data = job_data[0] if len(job_data) > 0 else {}
        row.update(job_data)
        
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving application details: {str(e)}"
        )


@router.post("/{application_id}/analyze", response_model=ApplicationResponse)
async def analyze_application(
    application_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Runs the stateful LangGraph AI analysis for the application (fit score, cover letter, prep).
    Updates the database with the results.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("applications") \
            .select("user_id") \
            .eq("id", str(application_id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        if str(check_response.data[0].get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {str(e)}"
        )
        
    # 2. Run the async graph analysis
    final_state = await run_analysis(str(application_id))
    if final_state.get("error") is not None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis pipeline failed: {final_state['error']}"
        )
        
    # 3. Retrieve the updated application payload
    try:
        response = supabase_service.table("applications") \
            .select("*, jobs(company, role, url)") \
            .eq("id", str(application_id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found after analysis update"
            )
            
        row = response.data[0]
        job_data = row.pop("jobs", {}) or {}
        if isinstance(job_data, list):
            job_data = job_data[0] if len(job_data) > 0 else {}
        row.update(job_data)
        
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch updated application details: {str(e)}"
        )


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    current_user = Depends(get_current_user)
):
    """
    Updates the mutable application fields (e.g. status or notes) in Supabase.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("applications") \
            .select("user_id") \
            .eq("id", str(application_id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        if str(check_response.data[0].get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
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
    
    # Remove keys that shouldn't be manually modified via this endpoint
    update_data.pop("id", None)
    update_data.pop("user_id", None)
    update_data.pop("job_id", None)
    
    # Automatically set applied_at to today's date when status is changed to 'applied'
    if update_data.get("status") == "applied" and "applied_at" not in update_data:
        from datetime import date
        update_data["applied_at"] = date.today().isoformat()
        
    try:
        if update_data:
            # Pydantic automatic conversion from InterviewPrepResult to dict is handled
            supabase_service.table("applications") \
                .update(update_data) \
                .eq("id", str(application_id)) \
                .execute()
                
        # 3. Retrieve and return the updated application record
        response = supabase_service.table("applications") \
            .select("*, jobs(company, role, url)") \
            .eq("id", str(application_id)) \
            .execute()
            
        row = response.data[0]
        job_data = row.pop("jobs", {}) or {}
        if isinstance(job_data, list):
            job_data = job_data[0] if len(job_data) > 0 else {}
        row.update(job_data)
        
        return row
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Deletes the application record.
    Returns 204 No Content upon success.
    """
    # 1. Verify existence and ownership
    try:
        check_response = supabase_service.table("applications") \
            .select("user_id") \
            .eq("id", str(application_id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        if str(check_response.data[0].get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {str(e)}"
        )
        
    # 2. Perform the deletion
    try:
        supabase_service.table("applications") \
            .delete() \
            .eq("id", str(application_id)) \
            .execute()
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete application: {str(e)}"
        )
