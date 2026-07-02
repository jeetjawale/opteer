from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_current_user
from app.db.session import get_db
from app.schemas import DashboardOverviewResponse
from app.utils.timing import log_duration

from .service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user=Depends(get_current_user), session: AsyncSession = Depends(get_db)
):
    """
    Fetches aggregated dashboard data: Stats, Top Recommendations, Upcoming Events, and Recent Activity.
    """  # noqa: E501
    async with log_duration("GET_DASHBOARD_OVERVIEW"):
        try:
            service = DashboardService(session)
            return await service.get_overview(current_user.id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate dashboard overview: {str(e)}",
            )


@router.get("/external-status")
async def get_external_status(url: str, current_user=Depends(get_current_user)):
    """
    Proxy for external status pages to bypass CORS issues on the frontend.
    """
    allowed_domains = [
        "status.openai.com",
        "status.claude.com",
        "status.firecrawl.dev",
        "status.tavily.com",
        "status.cloud.google.com",
    ]
    parsed = urlparse(url)
    if parsed.netloc not in allowed_domains:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domain not allowed for proxying",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch external status: {str(e)}",
            )
