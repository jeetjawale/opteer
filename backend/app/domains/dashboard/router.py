from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
import httpx
from urllib.parse import urlparse
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.database import get_current_user
from app.schemas import DashboardOverviewResponse, DashboardStats, RecentActivityItem
from app.utils.timing import log_duration
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.application import Application

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user=Depends(get_current_user), session: AsyncSession = Depends(get_db)
):
    """
    Fetches aggregated dashboard data: Stats, Top Recommendations, Upcoming Events, and Recent Activity.
    """
    async with log_duration("GET_DASHBOARD_OVERVIEW"):
        try:
            # 1. Fetch Stats
            stats_query = select(Application.status, Application.fit_score).where(
                Application.user_id == current_user.id
            )
            stats_result = await session.execute(stats_query)
            stats_data = stats_result.all()

            # 2. Fetch Top Recommendations
            recs_query = (
                select(Application)
                .options(joinedload(Application.job))
                .where(
                    Application.user_id == current_user.id,
                    Application.status == "saved",
                )
                .order_by(Application.fit_score.desc().nullslast())
                .limit(3)
            )
            recs_result = await session.execute(recs_query)
            recs_data = recs_result.scalars().all()

            # 3. Fetch Upcoming Events (Disabled/Removed)
            events_data = []

            # 4. Fetch Recent Activity
            activity_query = (
                select(Application)
                .options(joinedload(Application.job))
                .where(Application.user_id == current_user.id)
                .order_by(Application.created_at.desc())
                .limit(5)
            )
            activity_result = await session.execute(activity_query)
            activity_data = activity_result.scalars().all()

            # Process Stats
            total_applications = len(stats_data)
            active_interviews = sum(
                1 for app in stats_data if app.status == "interview"
            )
            offers_received = sum(1 for app in stats_data if app.status == "offer")

            fit_scores = [
                app.fit_score for app in stats_data if app.fit_score is not None
            ]
            avg_fit_score = sum(fit_scores) // len(fit_scores) if fit_scores else 0

            stats = DashboardStats(
                total_applications=total_applications,
                active_interviews=active_interviews,
                avg_fit_score=avg_fit_score,
                offers_received=offers_received,
            )

            # Process Top Recommendations
            recommendations = []
            for app in recs_data:
                app_dict = {
                    "id": str(app.id),
                    "user_id": str(app.user_id),
                    "job_id": str(app.job_id),
                    "status": app.status,
                    "applied_at": (
                        app.applied_at.isoformat() if app.applied_at else None
                    ),
                    "fit_score": app.fit_score,
                    "analysis_status": app.analysis_status,
                    "created_at": (
                        app.created_at.isoformat() if app.created_at else None
                    ),
                }
                if app.job:
                    app_dict.update(
                        {
                            "company": app.job.company,
                            "role": app.job.role,
                            "location": app.job.location,
                            "work_model": app.job.work_model,
                            "url": app.job.url,
                            "company_research": app.job.company_research,
                            "scraped_jd": app.job.scraped_jd,
                        }
                    )
                recommendations.append(app_dict)

            upcoming_events = []
            for r in events_data:
                upcoming_events.append(
                    {
                        "id": str(r.id),
                        "application_id": str(r.application_id),
                        "type": r.type,
                        "due_at": r.due_at.isoformat() if r.due_at else None,
                        "note": r.note,
                        "is_completed": r.is_completed,
                        "is_sent": r.is_sent,
                    }
                )

            recent_activity = []
            for act in activity_data:
                company = act.job.company if act.job else "Unknown Company"
                role = act.job.role if act.job else "Unknown Role"
                app_status = act.status or "saved"

                if app_status == "applied":
                    title = "Application sent"
                elif app_status == "interview":
                    title = "Application moved to Interview"
                elif app_status == "offer":
                    title = "Offer received!"
                elif app_status == "rejected":
                    title = "Application rejected"
                else:
                    title = "Job saved"

                recent_activity.append(
                    RecentActivityItem(
                        id=str(act.id),
                        type="application_update",
                        title=title,
                        subtitle=f"{company} - {role}",
                        timestamp=(
                            act.created_at.isoformat()
                            if act.created_at
                            else datetime.now(timezone.utc).isoformat()
                        ),
                    )
                )

            return DashboardOverviewResponse(
                stats=stats,
                recent_activity=recent_activity,
                top_recommendations=recommendations,
                upcoming_events=upcoming_events,
            )
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
