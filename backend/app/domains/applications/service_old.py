import asyncio
from typing import List, Optional, Dict
from uuid import UUID
from fastapi import HTTPException
from datetime import date
from app.schemas import ApplicationUpdate

ACTIVE_ANALYSIS_STATUSES = {"queued", "processing"}

class ApplicationService:
    def __init__(self, db_client):
        self.db = db_client

    async def list_applications(self, user_id: str, status_filter: Optional[str] = None, page: int = 1, per_page: int = 50) -> List[Dict]:
        offset = (page - 1) * per_page
        query = self.db.table("applications") \
            .select("*, jobs(company, role, location, work_model, url, company_research, scraped_jd)") \
            .eq("user_id", str(user_id)) \
            .order("created_at", desc=True) \
            .range(offset, offset + per_page - 1)

        if status_filter:
            query = query.eq("status", status_filter)

        response = await asyncio.to_thread(query.execute)
        records = response.data or []
        for row in records:
            job_data = row.pop("jobs", {}) or {}
            if isinstance(job_data, list):
                job_data = job_data[0] if len(job_data) > 0 else {}
            row.update(job_data)

        return records

    async def get_application(self, user_id: str, application_id: UUID) -> Dict:
        response = await asyncio.to_thread(
            lambda: self.db.table("applications")
                .select("*, jobs(company, role, location, work_model, url, company_research, scraped_jd)")
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        row = response.data[0]
        job_data = row.pop("jobs", {}) or {}
        if isinstance(job_data, list):
            job_data = job_data[0] if len(job_data) > 0 else {}
        row.update(job_data)
        return row

    async def update_application(self, user_id: str, application_id: UUID, payload: ApplicationUpdate) -> Dict:
        check_response = await asyncio.to_thread(
            lambda: self.db.table("applications")
                .select("user_id, status")
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        previous_status = check_response.data[0].get("status")
        update_data = payload.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("user_id", None)
        update_data.pop("job_id", None)

        if update_data.get("status") == "applied" and "applied_at" not in update_data:
            update_data["applied_at"] = date.today().isoformat()

        if update_data:
            await asyncio.to_thread(
                lambda: self.db.table("applications")
                    .update(update_data)
                    .eq("id", str(application_id))
                    .eq("user_id", str(user_id))
                    .execute()
            )

            new_status = update_data.get("status")
            if new_status and new_status != previous_status:
                await asyncio.to_thread(
                    lambda: self.db.table("application_history")
                        .insert({
                            "application_id": str(application_id),
                            "previous_status": previous_status,
                            "new_status": new_status
                        }).execute()
                )

        return await self.get_application(user_id, application_id)

    async def delete_application(self, user_id: str, application_id: UUID):
        check_response = await asyncio.to_thread(
            lambda: self.db.table("applications")
                .select("user_id, job_id")
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        job_id = check_response.data[0].get("job_id")

        await asyncio.to_thread(
            lambda: self.db.table("applications")
                .delete()
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )

        if job_id:
            try:
                await asyncio.to_thread(
                    lambda: self.db.rpc("delete_job_if_orphaned", {"target_job_id": str(job_id)}).execute()
                )
            except Exception:
                pass

    async def get_application_history(self, user_id: str, application_id: UUID) -> List[Dict]:
        check_response = await asyncio.to_thread(
            lambda: self.db.table("applications")
                .select("id")
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Application not found")

        response = await asyncio.to_thread(
            lambda: self.db.table("application_history")
                .select("*")
                .eq("application_id", str(application_id))
                .order("changed_at", desc=True)
                .execute()
        )
        return response.data or []
