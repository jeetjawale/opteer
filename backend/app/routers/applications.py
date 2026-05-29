from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Header
from uuid import UUID
from datetime import datetime, timezone

from app.database import supabase_service, get_current_user
from app.schemas import ApplicationResponse, ApplicationUpdate, ApplicationStatus
from app.graphs.analysis_graph import run_analysis

router = APIRouter(prefix="/applications", tags=["applications"])
ACTIVE_ANALYSIS_STATUSES = {"queued", "processing"}

def sanitize_error(error: str, api_key: str | None) -> str:
    """
    Strips the API key pattern from error messages to prevent credential leaks.
    """
    if api_key and len(api_key) > 8:
        return error.replace(api_key, "[REDACTED]")
    return error

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[ApplicationStatus] = None,
    current_user = Depends(get_current_user)
):
    """
    Fetches all applications for the current user, joined with job details.
    Flattens the nested job fields into the top-level response.
    """
    try:
        query = supabase_service.table("applications") \
            .select("*, jobs(company, role, url, company_research, scraped_jd)") \
            .eq("user_id", current_user.id)
            
        if status_filter:
            query = query.eq("status", status_filter)
            
        response = query.execute()
        
        # Flatten the nested jobs relationship and redact user_api_key
        records = response.data or []
        for row in records:
            row.pop("user_api_key", None)  # Security rule
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
            .select("*, jobs(company, role, url, company_research, scraped_jd)") \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        row = response.data[0]
        row.pop("user_api_key", None)  # Security rule
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


from app.rate_limiter import rate_limiter

@router.post("/{application_id}/analyze", dependencies=[Depends(rate_limiter(limit=5, window_seconds=60))])
async def analyze_application(
    application_id: UUID,
    current_user = Depends(get_current_user),
    x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key")
):
    """
    Runs the stateful LangGraph AI analysis for the application (fit score, cover letter, prep).
    Updates the database with the results.
    """
    # 1. Verify existence and ownership of application
    try:
        check_response = supabase_service.table("applications") \
            .select("user_id, analysis_status") \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )

        if check_response.data[0].get("analysis_status") in ACTIVE_ANALYSIS_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Analysis is already queued or processing for this application"
            )
            
        # Fetch user settings for model overrides
        settings_response = supabase_service.table("user_settings") \
            .select("model_default, model_fit, model_letter, model_prep") \
            .eq("user_id", str(current_user.id)) \
            .execute()
        user_settings = settings_response.data[0] if settings_response.data else {}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database verification check failed: {sanitize_error(str(e), x_user_api_key)}"
        )

    try:
        processing_response = supabase_service.table("applications") \
            .update({
                "analysis_status": "processing",
                "analysis_started_at": datetime.now(timezone.utc).isoformat(),
                "analysis_error": None,
            }) \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .neq("analysis_status", "processing") \
            .execute()
        if getattr(processing_response, "data", None) == []:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Analysis is already processing for this application"
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark analysis as processing: {sanitize_error(str(e), x_user_api_key)}"
        )
        
    # 2. Run the async graph analysis using the key passed via header
    final_state = await run_analysis(
        str(application_id), 
        user_api_key=x_user_api_key,
        model_default=user_settings.get("model_default"),
        model_fit=user_settings.get("model_fit"),
        model_letter=user_settings.get("model_letter"),
        model_prep=user_settings.get("model_prep")
    )
    if final_state.get("error") is not None:
        error_msg = sanitize_error(final_state["error"], x_user_api_key)
        try:
            supabase_service.table("applications") \
                .update({
                    "analysis_status": "failed",
                    "analysis_error": f"AI analysis pipeline failed: {error_msg}",
                }) \
                .eq("id", str(application_id)) \
                .eq("user_id", str(current_user.id)) \
                .execute()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis pipeline failed: {error_msg}"
        )

    try:
        supabase_service.table("applications") \
            .update({
                "analysis_status": "completed",
                "analysis_error": None,
            }) \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark analysis as completed: {sanitize_error(str(e), x_user_api_key)}"
        )
        
    # 3. Retrieve the updated application payload
    try:
        response = supabase_service.table("applications") \
            .select("*, jobs(company, role, url)") \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found after analysis update"
            )
            
        row = response.data[0]
        row.pop("user_api_key", None)  # Security rule
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
            detail=f"Failed to fetch updated application details: {sanitize_error(str(e), x_user_api_key)}"
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
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
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
            supabase_service.table("applications") \
                .update(update_data) \
                .eq("id", str(application_id)) \
                .eq("user_id", str(current_user.id)) \
                .execute()
                
        # 3. Retrieve and return the updated application record
        response = supabase_service.table("applications") \
            .select("*, jobs(company, role, url, company_research, scraped_jd)") \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        row = response.data[0]
        row.pop("user_api_key", None)  # Security rule
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
            .select("user_id, job_id") \
            .eq("id", str(application_id)) \
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
            
        app_data = check_response.data[0]
        job_id = app_data.get("job_id")
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
            .eq("user_id", str(current_user.id)) \
            .execute()
            
        # Clean up the corresponding job if it is now orphaned
        if job_id:
            count_response = supabase_service.table("applications") \
                .select("id") \
                .eq("job_id", str(job_id)) \
                .execute()
            if not count_response.data or len(count_response.data) == 0:
                supabase_service.table("jobs") \
                    .delete() \
                    .eq("id", str(job_id)) \
                    .execute()
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete application: {str(e)}"
        )
