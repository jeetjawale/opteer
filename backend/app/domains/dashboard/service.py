import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import (
    DashboardOverviewResponse,
    DashboardStats,
    RecentActivityItem,
    ApplicationResponse,
)
from app.db.models.application import Application

logger = logging.getLogger(__name__)


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_overview(self, user_id: str) -> DashboardOverviewResponse:
        # 1. Fetch Stats
        stats_query = select(Application.status, Application.fit_score).where(
            Application.user_id == user_id
        )
        stats_result = await self.session.execute(stats_query)
        stats_data = stats_result.all()

        # 2. Fetch Top Recommendations
        recs_query = (
            select(Application)
            .options(joinedload(Application.job))
            .where(
                Application.user_id == user_id,
                Application.status == "saved",
            )
            .order_by(Application.fit_score.desc().nullslast())
            .limit(6)
        )
        recs_result = await self.session.execute(recs_query)
        recs_data = recs_result.scalars().all()

        # 3. Fetch Recent Activity
        activity_query = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
            .limit(5)
        )
        activity_result = await self.session.execute(activity_query)
        activity_data = activity_result.scalars().all()

        # Process Stats
        total_applications = len(stats_data)
        active_interviews = sum(1 for app in stats_data if app.status == "interview")
        offers_received = sum(1 for app in stats_data if app.status == "offer")

        fit_scores = [app.fit_score for app in stats_data if app.fit_score is not None]
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
                "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                "fit_score": app.fit_score,
                "analysis_status": app.analysis_status,
                "created_at": app.created_at.isoformat() if app.created_at else None,
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

        # Process Recent Activity
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
        )
