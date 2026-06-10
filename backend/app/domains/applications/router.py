import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Header, Query
from uuid import UUID

from app.database import get_current_user
from app.schemas import ApplicationResponse, ApplicationUpdate, ApplicationStatus, ApplicationHistoryResponse, ApplicationStatsResponse
from app.utils.timing import log_duration
from app.core.dependencies import get_application_service
from app.domains.applications.service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Fetches all applications for the current user, joined with job details.
    Flattens the nested job fields into the top-level response.
    """
    status_str = status_filter.value if status_filter else None
    return await service.list_applications(str(current_user.id), status_filter=status_str, page=page, per_page=per_page)

@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    time_window: str = Query("30"),
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Computes analytics stats for the user's applications within the given time window.
    """
    async with log_duration("GET_APPLICATION_STATS"):
        return await service.get_application_stats(str(current_user.id), time_window)

@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: UUID,
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Retrieves detailed info for a single application.
    Returns 404 if not found or if the application belongs to another user.
    """
    return await service.get_application(str(current_user.id), application_id)

@router.post("/{application_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_application(
    application_id: UUID,
    current_user = Depends(get_current_user),
    x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key"),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Runs the stateful LangGraph AI analysis for the application (fit score, cover letter, prep).
    Updates the database with the results.
    """
    async with log_duration("ANALYZE_APPLICATION"):
        return await service.queue_analysis(str(current_user.id), application_id, x_user_api_key)

@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Updates the mutable application fields.
    """
    return await service.update_application(str(current_user.id), application_id, payload)

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: UUID,
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Deletes the application record.
    Returns 204 No Content upon success.
    """
    await service.delete_application(str(current_user.id), application_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{application_id}/history", response_model=List[ApplicationHistoryResponse])
async def get_application_history(
    application_id: UUID,
    current_user = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    """
    Retrieves the status history for an application.
    """
    return await service.get_application_history(str(current_user.id), application_id)
