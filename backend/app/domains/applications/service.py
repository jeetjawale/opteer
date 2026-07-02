from typing import List, Optional, Dict, Any
import uuid
from fastapi import HTTPException
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.schemas import ApplicationUpdate
from app.db.repositories.application import ApplicationRepository
from app.db.repositories.job import JobRepository
from app.db.repositories.application_history import ApplicationHistoryRepository
from app.db.models.application import Application

ACTIVE_ANALYSIS_STATUSES = {"queued", "processing"}


class ApplicationService:
    def __init__(
        self,
        app_repo: ApplicationRepository,
        job_repo: JobRepository,
        history_repo: ApplicationHistoryRepository,
        user_repo=None,
        user_configs_repo=None,
    ):
        self.app_repo = app_repo
        self.job_repo = job_repo
        self.history_repo = history_repo
        self.user_repo = user_repo
        self.user_configs_repo = user_configs_repo

    def _model_to_dict(self, app: Application) -> Dict[str, Any]:
        data = {
            "id": str(app.id),
            "user_id": str(app.user_id),
            "job_id": str(app.job_id),
            "status": app.status,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "notes": app.notes,
            "cover_letter": app.cover_letter,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "resume_text": app.resume_text,
            "resume_file_url": app.resume_file_url,
            "resume_file_name": app.resume_file_name,
            "analysis_status": app.analysis_status,
            "analysis_error": app.analysis_error,
            "fit_score": app.fit_score,
            "matched_skills": app.matched_skills,
            "missing_skills": app.missing_skills,
            "key_requirements": app.key_requirements,
            "summary": app.summary,
            "interview_prep": app.interview_prep,
            "resume_edits": app.resume_edits,
            "structured_resume": app.structured_resume,
        }

        if getattr(app, "job", None):
            data.update(
                {
                    "company": app.job.company,
                    "role": app.job.role,
                    "location": app.job.location,
                    "work_model": app.job.work_model,
                    "url": app.job.url,
                    "company_research": app.job.company_research,
                    "company_logo": getattr(app.job, "logo_url", None),
                    "scraped_jd": app.job.scraped_jd,
                }
            )
        return data

    async def list_applications(
        self,
        user_id: str | uuid.UUID,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> List[Dict]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        offset = (page - 1) * per_page

        query = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )

        if status_filter:
            query = query.where(Application.status == status_filter)

        query = query.offset(offset).limit(per_page)

        result = await self.app_repo.session.execute(query)
        apps = result.scalars().all()
        return [self._model_to_dict(a) for a in apps]

    async def get_application(
        self, user_id: str | uuid.UUID, application_id: str | uuid.UUID
    ) -> Dict:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        query = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.id == application_id, Application.user_id == user_id)
        )
        result = await self.app_repo.session.execute(query)
        app = result.scalar_one_or_none()

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        return self._model_to_dict(app)

    async def update_application(
        self,
        user_id: str | uuid.UUID,
        application_id: str | uuid.UUID,
        payload: ApplicationUpdate,
    ) -> Dict:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        query = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.id == application_id, Application.user_id == user_id)
        )
        result = await self.app_repo.session.execute(query)
        app = result.scalar_one_or_none()

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        previous_status = app.status
        update_data = payload.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("user_id", None)
        update_data.pop("job_id", None)

        if update_data.get("status") == "applied" and "applied_at" not in update_data:
            update_data["applied_at"] = date.today()

        if update_data:
            app = await self.app_repo.update(app, **update_data)
            new_status = update_data.get("status")
            if new_status and new_status != previous_status:
                await self.history_repo.create(
                    application_id=application_id,
                    previous_status=previous_status,
                    new_status=new_status,
                )

        return self._model_to_dict(app)

    async def delete_application(
        self, user_id: str | uuid.UUID, application_id: str | uuid.UUID
    ):
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        app = await self.app_repo.get(application_id)
        if not app or app.user_id != user_id:
            raise HTTPException(status_code=404, detail="Application not found")

        job_id = app.job_id
        await self.app_repo.delete(application_id)

        # delete job if orphaned
        if job_id:
            other_apps_query = (
                select(Application).where(Application.job_id == job_id).limit(1)
            )
            other_apps_result = await self.app_repo.session.execute(other_apps_query)
            if not other_apps_result.scalar_one_or_none():
                # delete the job
                await self.job_repo.delete(job_id)

    async def get_application_history(
        self, user_id: str | uuid.UUID, application_id: str | uuid.UUID
    ) -> List[Dict]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        app = await self.app_repo.get(application_id)
        if not app or app.user_id != user_id:
            raise HTTPException(status_code=404, detail="Application not found")

        history = await self.history_repo.list_by_application(application_id)
        # order by changed_at desc
        history = sorted(history, key=lambda h: h.changed_at or date.min, reverse=True)
        return [
            {
                "id": str(h.id),
                "application_id": str(h.application_id),
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            }
            for h in history
        ]

    async def queue_analysis(
        self,
        user_id: str | uuid.UUID,
        application_id: str | uuid.UUID,
        user_api_key: Optional[str] = None,
    ) -> Dict:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        app = await self.app_repo.get(application_id)
        if not app or app.user_id != user_id:
            raise HTTPException(status_code=404, detail="Application not found")

        app = await self.app_repo.update(
            app, analysis_status="queued", analysis_error=None
        )

        return {"status": "accepted", "message": "Analysis queued successfully"}

    async def rewrite_cover_letter(
        self,
        user_id: str | uuid.UUID,
        application_id: str | uuid.UUID,
        selected_text: str,
        full_context: str,
        instruction: str,
    ) -> str:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        app = await self.app_repo.get(application_id)
        if not app or app.user_id != user_id:
            raise HTTPException(status_code=404, detail="Application not found")

        provider_name = "gemini"
        model_name = None
        api_key = None
        base_url = None

        if self.user_configs_repo:
            user_config = await self.user_configs_repo.get_by_user_id(user_id)
            if user_config and user_config.active_llm_provider:
                provider_name = user_config.active_llm_provider

                # Fetch default model from task_models if specified
                task_models = (
                    user_config.task_models
                    if isinstance(user_config.task_models, dict)
                    else {}
                )
                model_name = task_models.get("cover_letter")

                if user_config.llm_keys and provider_name in user_config.llm_keys:
                    key_info = user_config.llm_keys[provider_name]

                    if isinstance(key_info, dict):
                        model_name = key_info.get("model") or model_name
                        base_url = key_info.get("base_url")

                        from app.core.encryption import decrypt_api_key

                        encrypted_key = key_info.get("api_key_encrypted")
                        if isinstance(encrypted_key, str):
                            api_key = decrypt_api_key(encrypted_key)

        from app.ai.chains.rewrite import get_rewrite_chain

        chain = get_rewrite_chain(
            provider_name=provider_name,
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
        )

        rewritten_text = await chain.ainvoke(
            {
                "selected_text": selected_text,
                "full_context": full_context,
                "instruction": instruction,
            }
        )

        return rewritten_text.strip()

    async def parse_resume(
        self,
        user_id: str | uuid.UUID,
        application_id: str | uuid.UUID,
    ) -> dict:
        """Parse the application's plain-text resume into a structured JSON object."""
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(application_id, str):
            application_id = uuid.UUID(application_id)

        app = await self.app_repo.get(application_id)
        if not app or app.user_id != user_id:
            raise HTTPException(status_code=404, detail="Application not found")

        if not app.resume_text:
            raise HTTPException(
                status_code=400, detail="No resume text found for this application"
            )

        provider_name = "gemini"
        model_name = None
        api_key = None
        base_url = None

        if self.user_configs_repo:
            user_config = await self.user_configs_repo.get_by_user_id(user_id)
            if user_config and user_config.active_llm_provider:
                provider_name = user_config.active_llm_provider
                task_models = (
                    user_config.task_models
                    if isinstance(user_config.task_models, dict)
                    else {}
                )
                model_name = task_models.get("default")
                if user_config.llm_keys and provider_name in user_config.llm_keys:
                    key_info = user_config.llm_keys[provider_name]
                    if isinstance(key_info, dict):
                        model_name = key_info.get("model") or model_name
                        base_url = key_info.get("base_url")
                        from app.core.encryption import decrypt_api_key

                        encrypted_key = key_info.get("api_key_encrypted")
                        if isinstance(encrypted_key, str):
                            api_key = decrypt_api_key(encrypted_key)

        from app.ai.chains.resume_parser import get_resume_parser_chain

        chain = get_resume_parser_chain(
            provider_name=provider_name,
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
        )

        tailoring_instructions = ""
        if app.resume_edits:
            try:
                edits = (
                    app.resume_edits.get("edits", [])
                    if isinstance(app.resume_edits, dict)
                    else app.resume_edits
                )
                if edits and isinstance(edits, list):
                    tailoring_instructions = (
                        "Tailoring Instructions (APPLY THESE STRICTLY):\n"
                    )
                    for edit in edits:
                        if isinstance(edit, dict):
                            tailoring_instructions += f"- [{edit.get('type', 'MODIFY').upper()}] Section: {edit.get('section', 'General')}. {edit.get('suggestion', '')}\n"
            except Exception:
                pass

        result = await chain.ainvoke(
            {
                "resume_text": app.resume_text,
                "tailoring_instructions": tailoring_instructions,
            }
        )

        # Save structured resume to DB
        from app.schemas import ApplicationUpdate

        await self.update_application(
            user_id, application_id, ApplicationUpdate(structured_resume=result)
        )

        return result
