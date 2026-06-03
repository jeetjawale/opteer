import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Header, Query
from uuid import UUID
from datetime import datetime, timezone, date, timedelta
from collections import Counter

from app.database import supabase_service, get_current_user
from app.schemas import ApplicationResponse, ApplicationUpdate, ApplicationStatus
from app.graphs.analysis_graph import run_analysis
from app.llm import resolve_api_key, get_llm
from app.utils.timing import log_duration

router = APIRouter(prefix="/applications", tags=["applications"])
ACTIVE_ANALYSIS_STATUSES = {"queued", "processing"}

from app.utils.security import sanitize_error

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user = Depends(get_current_user)
):
    """
    Fetches all applications for the current user, joined with job details.
    Flattens the nested job fields into the top-level response.
    """
    async with log_duration("LIST_APPLICATIONS"):
        try:
            offset = (page - 1) * per_page
            query = supabase_service.table("applications") \
                .select("*, jobs(company, role, url, company_research, scraped_jd)") \
                .eq("user_id", str(current_user.id)) \
                .order("created_at", desc=True) \
                .range(offset, offset + per_page - 1)

            if status_filter:
                query = query.eq("status", status_filter.value)

            response = await asyncio.to_thread(query.execute)

            # Flatten the nested jobs relationship and redact user_api_key
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

from app.schemas import ApplicationStatsResponse

@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    time_window: str = Query("30"),
    current_user = Depends(get_current_user)
):
    """
    Computes analytics stats for the user's applications within the given time window.
    """
    async with log_duration("GET_APPLICATION_STATS"):
        try:
            query = supabase_service.table("applications") \
                .select("status, fit_score, created_at, jobs(company)") \
                .eq("user_id", str(current_user.id))
            
            if time_window != "all":
                try:
                    days = int(time_window)
                    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
                    query = query.gte("created_at", cutoff_date)
                except ValueError:
                    pass
            
            response = await asyncio.to_thread(query.execute)
            records = response.data or []
            
            counts = {"saved": 0, "applied": 0, "interview": 0, "offer": 0, "rejected": 0, "closed": 0}
            fit_buckets = [0, 0, 0, 0] # 0-50, 51-70, 71-85, 86-100
            timeline_counter = Counter()
            company_counter = Counter()

            for row in records:
                status_val = row.get("status")
                if status_val in counts:
                    counts[status_val] += 1
                
                score = row.get("fit_score")
                if score is not None:
                    if score <= 50:
                        fit_buckets[0] += 1
                    elif score <= 70:
                        fit_buckets[1] += 1
                    elif score <= 85:
                        fit_buckets[2] += 1
                    else:
                        fit_buckets[3] += 1
                
                created_at = row.get("created_at")
                if created_at:
                    date_str = created_at.split("T")[0]
                    timeline_counter[date_str] += 1
                
                job_data = row.get("jobs") or {}
                if isinstance(job_data, list):
                    job_data = job_data[0] if len(job_data) > 0 else {}
                company = job_data.get("company")
                if company:
                    company_counter[company] += 1
                else:
                    company_counter["Unknown"] += 1
            
            active = counts["applied"] + counts["interview"] + counts["offer"] + counts["rejected"]
            responses = counts["interview"] + counts["offer"]
            resp_rate = round((responses / active) * 100) if active > 0 else 0
            
            total_interviews = counts["interview"] + counts["offer"]
            conv_rate = round((counts["offer"] / total_interviews) * 100) if total_interviews > 0 else 0
            
            funnel_data = [
                {"name": "Saved", "value": counts["saved"]},
                {"name": "Applied", "value": counts["applied"]},
                {"name": "Interviewing", "value": counts["interview"]},
                {"name": "Offer", "value": counts["offer"]},
                {"name": "Rejected", "value": counts["rejected"]}
            ]
            
            fit_score_data = [
                {"label": "0-50", "count": fit_buckets[0]},
                {"label": "51-70", "count": fit_buckets[1]},
                {"label": "71-85", "count": fit_buckets[2]},
                {"label": "86-100", "count": fit_buckets[3]}
            ]
            
            days_to_fill = int(time_window) if time_window != "all" else 90
            timeline_data = []
            now = datetime.now(timezone.utc)
            for i in range(days_to_fill - 1, -1, -1):
                d = now - timedelta(days=i)
                ds = d.strftime("%Y-%m-%d")
                timeline_data.append({"date": ds, "count": timeline_counter[ds]})

            top_companies = [{"name": k, "value": v} for k, v in company_counter.most_common(5)]
            
            return {
                "total_active": active,
                "response_rate": resp_rate,
                "interview_conversion": conv_rate,
                "funnel_data": funnel_data,
                "fit_score_data": fit_score_data,
                "timeline_data": timeline_data,
                "top_companies_data": top_companies
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate stats: {str(e)}"
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
    async with log_duration("GET_APPLICATION"):
        try:
            response = await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .select("*, jobs(company, role, url, company_research, scraped_jd)")
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Application not found"
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
                detail=f"Error retrieving application details: {str(e)}"
            )


from app.rate_limiter import rate_limiter

@router.post("/{application_id}/analyze", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(rate_limiter(limit=5, window_seconds=60))])
async def analyze_application(
    application_id: UUID,
    current_user = Depends(get_current_user),
    x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key")
):
    """
    Runs the stateful LangGraph AI analysis for the application (fit score, cover letter, prep).
    Updates the database with the results.
    """
    async with log_duration("ANALYZE_APPLICATION"):
        # 1. Verify existence and ownership of application
        try:
            check_response = await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .select("user_id, analysis_status")
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

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
            settings_response = await asyncio.to_thread(
                lambda: supabase_service.table("user_settings")
                    .select("model_default, model_fit, model_letter, model_prep")
                    .eq("user_id", str(current_user.id))
                    .execute()
            )
            user_settings = settings_response.data[0] if settings_response.data else {}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database verification check failed: {sanitize_error(str(e), x_user_api_key)}"
            )


        try:
            quota_response = await asyncio.to_thread(
                lambda: supabase_service.rpc("consume_analysis_credit", {"target_user_id": str(current_user.id)}).execute()
            )
            if not quota_response.data:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Daily analysis quota exceeded."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to verify quota: {str(e)}"
            )

        try:
            queue_response = await asyncio.to_thread(

                lambda: supabase_service.table("applications")
                    .update({
                        "analysis_status": "queued",
                        "analysis_error": None,
                    })
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .neq("analysis_status", "queued")
                    .neq("analysis_status", "processing")
                    .execute()
            )
            if getattr(queue_response, "data", None) == []:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Analysis is already processing or queued for this application"
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to queue analysis: {sanitize_error(str(e), x_user_api_key)}"
            )

        return {"message": "Analysis queued", "analysis_status": "queued"}


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    current_user = Depends(get_current_user)
):
    """
    Updates the mutable application fields (e.g. status or notes) in Supabase.
    """
    async with log_duration("UPDATE_APPLICATION"):
        # 1. Verify existence and ownership
        try:
            check_response = await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .select("user_id")
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

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
            update_data["applied_at"] = date.today().isoformat()

        try:
            if update_data:
                await asyncio.to_thread(
                    lambda: supabase_service.table("applications")
                        .update(update_data)
                        .eq("id", str(application_id))
                        .eq("user_id", str(current_user.id))
                        .execute()
                )

            # 3. Retrieve and return the updated application record
            response = await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .select("*, jobs(company, role, url, company_research, scraped_jd)")
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

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
    async with log_duration("DELETE_APPLICATION"):
        # 1. Verify existence and ownership
        try:
            check_response = await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .select("user_id, job_id")
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

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
            await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .delete()
                    .eq("id", str(application_id))
                    .eq("user_id", str(current_user.id))
                    .execute()
            )

            # Clean up the corresponding job if it is now orphaned (Fixed TOCTOU)
            if job_id:
                await asyncio.to_thread(
                    lambda: supabase_service.rpc("delete_job_if_orphaned", {"target_job_id": str(job_id)}).execute()
                )

            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete application: {str(e)}"
            )
