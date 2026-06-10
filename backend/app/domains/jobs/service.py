import asyncio
from typing import Optional, Any
from uuid import UUID
from fastapi import HTTPException, status
from app.schemas import JobCreate, JobUpdate, ImportJobRequest, JobImportResponse
from app.ai.llm import get_llm, sanitize_llm_input
from app.utils.text import extract_text_content, clean_html
import httpx
from urllib.parse import urlparse
import ipaddress
import socket
from firecrawl import FirecrawlApp
from tavily import TavilyClient
from app.utils.timing import log_duration
from app.utils.security import sanitize_error
from datetime import date
from sqlalchemy import select, or_

from app.db.repositories.job import JobRepository
from app.db.repositories.application import ApplicationRepository
from app.db.repositories.user import UserRepository
from app.db.repositories.user_configs import UserConfigsRepository
from app.db.models.job import Job

BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}


def validate_public_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Job URL must use http or https.")
    if not parsed.hostname:
        raise HTTPException(
            status_code=400, detail="Job URL must include a valid hostname."
        )
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".localhost"):
        raise HTTPException(status_code=400, detail="Job URL host is not allowed.")
    try:
        ip = ipaddress.ip_address(hostname)
        ips_to_check = [ip]
    except ValueError:
        try:
            resolved = socket.getaddrinfo(hostname, None)
            ips_to_check = [ipaddress.ip_address(info[4][0]) for info in resolved]
        except socket.gaierror:
            raise HTTPException(
                status_code=400, detail="Job URL host could not be resolved."
            )
    for ip in ips_to_check:
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise HTTPException(
                status_code=400,
                detail="Job URL host resolves to a disallowed IP address.",
            )
    return url


class JobService:
    def __init__(
        self,
        job_repo: JobRepository,
        app_repo: ApplicationRepository,
        user_repo: UserRepository,
        user_configs_repo: UserConfigsRepository,
    ):
        self.job_repo = job_repo
        self.app_repo = app_repo
        self.user_repo = user_repo
        self.user_configs_repo = user_configs_repo

    def _model_to_dict(self, job: Job) -> dict:
        return {
            "id": str(job.id),
            "company": job.company,
            "role": job.role,
            "location": job.location,
            "work_model": job.work_model,
            "url": job.url,
            "company_research": job.company_research,
            "scraped_jd": job.scraped_jd,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }

    async def get_jobs(
        self,
        search: Optional[str] = None,
        company: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        per_page: int = 50,
    ):
        offset = (page - 1) * per_page
        query = select(Job)
        if search:
            query = query.where(
                or_(Job.role.ilike(f"%{search}%"), Job.company.ilike(f"%{search}%"))
            )
        if company:
            query = query.where(Job.company.ilike(f"%{company}%"))

        allowed_sort = {"created_at", "company", "role"}
        if sort_by not in allowed_sort:
            sort_by = "created_at"

        sort_column = getattr(Job, sort_by)
        is_desc = sort_order.lower() == "desc"
        if is_desc:
            sort_column = sort_column.desc()

        query = query.order_by(sort_column).offset(offset).limit(per_page)

        result = await self.job_repo.session.execute(query)
        jobs = result.scalars().all()
        return [self._model_to_dict(job) for job in jobs]

    async def create_job(self, payload: JobCreate):
        job_payload = payload.model_dump()
        job = await self.job_repo.create(**job_payload)
        return self._model_to_dict(job)

    async def get_job(self, job_id: UUID):
        job = await self.job_repo.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return self._model_to_dict(job)

    async def update_job(self, job_id: UUID, payload: JobUpdate):
        job = await self.job_repo.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return self._model_to_dict(job)
        updated = await self.job_repo.update(job, **update_data)
        return self._model_to_dict(updated)

    async def delete_job(self, job_id: UUID):
        await self.job_repo.delete(job_id)

    async def import_job(
        self,
        payload: ImportJobRequest,
        user_id: str | UUID,
        x_user_api_key: Optional[str] = None,
        background_tasks: Optional[Any] = None,
    ):
        if isinstance(user_id, str):
            user_id = UUID(user_id)

        async with log_duration("IMPORT_URL_VALIDATION"):
            url = await asyncio.to_thread(validate_public_http_url, payload.url.strip())
            resume_text = sanitize_llm_input(payload.resume_text, max_chars=15000)

            try:
                user = await self.user_repo.get(user_id)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
                    )

                # Fetch user configs
                user_configs = await self.user_configs_repo.get_by_user_id(user_id)
                if not user_configs:
                    user_configs = await self.user_configs_repo.create(user_id=user.id)

                firecrawl_key = None
                tavily_key = None
                if user_configs.integration_keys:
                    from app.core.encryption import decrypt_api_key

                    enc_firecrawl = user_configs.integration_keys.get("firecrawl")
                    if enc_firecrawl:
                        firecrawl_key = decrypt_api_key(enc_firecrawl)
                    enc_tavily = user_configs.integration_keys.get("tavily")
                    if enc_tavily:
                        tavily_key = decrypt_api_key(enc_tavily)

            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to load user config: {str(e)}",
                )

            # Quota logic removed for local-first deployment
            scraped_jd = payload.scraped_jd
            direct_scraped = None

            if not scraped_jd:
                # Try Firecrawl first if API key is present
                if firecrawl_key:
                    try:

                        def _scrape_firecrawl():
                            app = FirecrawlApp(api_key=firecrawl_key)
                            return app.scrape_url(url, formats=["markdown"])

                        scrape_result = await asyncio.to_thread(_scrape_firecrawl)
                        md = (
                            scrape_result.markdown
                            if hasattr(scrape_result, "markdown")
                            else scrape_result.get("markdown", "")
                        )
                        if (
                            md
                            and len(md.strip()) >= 100
                            and not ("uses cookies" in md.lower() and len(md) < 1500)
                        ):
                            scraped_jd = md
                    except Exception as e:
                        print(f"Firecrawl scrape failed: {e}")
                        pass

                # Fallback to direct HTTP scraping if Firecrawl failed or is not configured
                if not scraped_jd:
                    try:
                        import urllib.parse

                        headers = {
                            "User-Agent": (
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            ),
                            "Accept": "application/json, text/html",
                        }

                        def is_safe_domain(
                            hostname: str | None, base_domain: str
                        ) -> bool:
                            if not hostname:
                                return False
                            hostname = hostname.lower()
                            return hostname == base_domain or hostname.endswith(
                                f".{base_domain}"
                            )

                        async with httpx.AsyncClient(
                            follow_redirects=False, headers=headers, timeout=10.0
                        ) as client:
                            parsed_url = urllib.parse.urlparse(url)
                            if is_safe_domain(parsed_url.hostname, "myworkdayjobs.com"):
                                tenant = parsed_url.hostname.split(".")[0]
                                api_url = await asyncio.to_thread(
                                    validate_public_http_url,
                                    f"{parsed_url.scheme}://{parsed_url.netloc}/wday/cxs/{tenant}{parsed_url.path}",
                                )
                                api_resp = await client.get(api_url)
                                if api_resp.status_code == 200:
                                    job_data = api_resp.json()
                                    raw_html = job_data.get("jobPostingInfo", {}).get(
                                        "jobDescription", ""
                                    )
                                    if raw_html:
                                        direct_scraped = await asyncio.to_thread(
                                            clean_html, raw_html
                                        )

                            if not direct_scraped:
                                resp = await client.get(url)
                                if resp.status_code == 200:
                                    direct_scraped = await asyncio.to_thread(
                                        clean_html, resp.text
                                    )

                            if (
                                direct_scraped
                                and len(direct_scraped) > 500
                                and not (
                                    "uses cookies" in direct_scraped.lower()
                                    and len(direct_scraped) < 1500
                                )
                                and "enable javascript" not in direct_scraped.lower()
                                and not (
                                    "{{" in direct_scraped and "}}" in direct_scraped
                                )
                            ):
                                scraped_jd = direct_scraped
                    except Exception as e:
                        print(f"Fast path extraction failed: {e}")
                        pass

                if not scraped_jd:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Failed to extract job description from the provided URL. Please try pasting the text manually.",
                    )

            user_settings = {}
            try:
                settings_rec = await self.user_settings_repo.get_by_user_id(user_id)
                if settings_rec:
                    user_settings = {
                        "model_default": settings_rec.model_default,
                        "model_fit": settings_rec.model_fit,
                        "model_letter": settings_rec.model_letter,
                        "model_prep": settings_rec.model_prep,
                    }
            except Exception as e:
                print(f"Warning: Failed to fetch user settings during import: {e}")

            scraped_jd = sanitize_llm_input(scraped_jd, max_chars=20000)

            effective_api_key = x_user_api_key
            provider_name = user_settings.get("preferred_ai_provider", "gemini")
            model_name = user_settings.get("model_default")
            base_url = None

            if not effective_api_key:
                if (
                    user_configs
                    and user_configs.active_llm_provider
                    and user_configs.llm_keys
                ):
                    provider_name = user_configs.active_llm_provider
                    provider_data = user_configs.llm_keys.get(provider_name, {})
                    model_name = provider_data.get("model") or model_name
                    base_url = provider_data.get("base_url")
                    encrypted_key = provider_data.get("api_key_encrypted")

                    if encrypted_key:
                        from app.core.encryption import decrypt_api_key

                        effective_api_key = decrypt_api_key(encrypted_key)

            if not effective_api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No LLM API key configured. Please go to Settings and add an API key.",
                )

            llm = get_llm(
                provider_name=provider_name,
                model_name=model_name,
                api_key=effective_api_key,
                base_url=base_url,
                temperature=0.0,
                max_tokens=4000,
            )
            company_name = None
            role_name = None
            location = None
            work_model = None
            try:
                prompt = (
                    f"Analyze this job description (Source URL: {url}) and extract the company name, the job title/role, the job location, the work model (Remote/Hybrid/On-site), and a cleaned version of the job description.\n"
                    "If the company name or role is not explicitly stated in the job description text, infer it from the Source URL if possible.\n"
                    "The cleaned job description should preserve the core job details (responsibilities, requirements, qualifications) in clean markdown, but MUST strip away all website navigation text, 'similar jobs' links, cookie notices, header/footer boilerplate, and excessively long legal/diversity footers.\n"
                    "Return ONLY a JSON object with the keys 'company_name', 'role_name', 'location', 'work_model', and 'cleaned_jd'. "
                    "Do not include markdown code block formatting (like ```json).\n\n"
                    f"Job Description:\n{scraped_jd}"
                )
                llm_response = await asyncio.to_thread(llm.invoke, prompt)
                raw_text = extract_text_content(llm_response.content)

                import re
                import json

                match = re.search(r"\{[\s\S]*\}", raw_text)
                if match:
                    raw_text = match.group(0)

                extracted_data = json.loads(raw_text)
                company_name = extracted_data.get("company_name", "").strip()
                role_name = extracted_data.get("role_name", "").strip()
                location = extracted_data.get("location", "").strip()
                work_model = extracted_data.get("work_model", "").strip()
                cleaned_jd = extracted_data.get("cleaned_jd", "").strip()

                if cleaned_jd and len(cleaned_jd) > 100:
                    scraped_jd = cleaned_jd

                if company_name.lower() in {
                    "n/a",
                    "unknown",
                    "none",
                    "null",
                    "not found",
                    "not specified",
                    "not provided",
                    "unspecified",
                }:
                    company_name = None
                if role_name.lower() in {
                    "n/a",
                    "unknown",
                    "none",
                    "null",
                    "not found",
                    "job description",
                }:
                    role_name = None
                if location and location.lower() in {
                    "n/a",
                    "unknown",
                    "none",
                    "null",
                    "not found",
                }:
                    location = None
                if work_model and work_model.lower() in {
                    "n/a",
                    "unknown",
                    "none",
                    "null",
                    "not found",
                }:
                    work_model = None
            except Exception as e:
                print(
                    "Failed to extract company and role via single LLM JSON call:",
                    str(e),
                )

            if not company_name:
                parsed = urlparse(url)
                path = parsed.path.lower()
                import re

                at_match = re.search(r"-at-([a-z0-9\-]+)", path)
                if at_match:
                    company_name = at_match.group(1).replace("-", " ").title()
                    # Remove common location suffixes if any (like -mumbai, -bangalore)
                    common_cities = [
                        " Mumbai",
                        " Bangalore",
                        " Bengaluru",
                        " Pune",
                        " Hyderabad",
                        " Chennai",
                        " Delhi",
                        " Noida",
                        " Gurgaon",
                    ]
                    for city in common_cities:
                        if company_name.endswith(city):
                            company_name = company_name[: -len(city)]
                else:
                    parts = parsed.netloc.replace("www.", "").split(".")
                    skip_prefixes = {
                        "jobs",
                        "careers",
                        "apply",
                        "work",
                        "hire",
                        "talent",
                        "jobsearch",
                        "portal",
                        "career",
                    }
                    company_part = (
                        parts[0]
                        if parts[0].lower() not in skip_prefixes
                        else (parts[1] if len(parts) > 1 else parts[0])
                    )
                    company_name = company_part.capitalize()

            if not role_name:
                _parsed = urlparse(url)
                path_parts = [p for p in _parsed.path.split("/") if p]
                role_from_path = None
                for part in path_parts:
                    if part.isdigit() or len(part) < 5:
                        continue
                    if part.count("-") >= 2:
                        role_from_path = part.replace("-", " ").title()
                        break
                role_name = role_from_path or "Job Description"

            try:

                def _search_tavily():
                    client = TavilyClient(api_key=tavily_key)
                    return client.search(
                        query=f"{company_name} company overview website industry founded",
                        max_results=3,
                    )

                if tavily_key:
                    results = await asyncio.to_thread(_search_tavily)
                    raw_results = results.get("results", [])
                else:
                    raw_results = []

                raw_research = " ".join([r.get("content", "") for r in raw_results])

                if raw_research.strip() and company_name:
                    research_prompt = (
                        f"You are a helpful assistant. Based on the following raw web search results for the company '{company_name}', "
                        "extract and format a concise company profile. You may also use your own general knowledge to fill in any missing details (Website, Industry, Founded) if the company is well-known.\n\n"
                        "Provide EXACTLY this format and nothing else:\n\n"
                        "Overview: [Quick overview of company (not too big nor too small)]\n"
                        "Website: [Website URL if available or known, else N/A]\n"
                        "Headquarters: [Headquarters location if available or known, else N/A]\n"
                        "Company Size: [Company size if available or known, else N/A]\n"
                        "Industry: [Industry if available or known, else N/A]\n"
                        "Work Model: [Work model (e.g. Remote, Hybrid, On-site) if available or known, else N/A]\n\n"
                        f"Raw search results:\n{raw_research[:3000]}"
                    )
                    llm_research_resp = await asyncio.to_thread(
                        llm.invoke, research_prompt
                    )
                    company_research = extract_text_content(
                        llm_research_resp.content
                    ).strip()
                else:
                    company_research = "No additional research available."
            except Exception as e:
                company_research = (
                    f"No additional research available. Search failed: {str(e)}"
                )

            # --- 3. Quality Gate (Noise Out) ---
            is_quality_gated = False
            quality_gate_reason = None

            if payload.auto_analyze:
                try:
                    qg_prompt = (
                        "You are a strict Quality Gate for a job applicant. Analyze this Job Description "
                        "and immediately reject it if it falls into any of these categories (Red Flags): "
                        "1) Unpaid / Commission-only / Equity-only\n"
                        "2) Fake, Spam, or MLM\n"
                        "3) Requires an active Top Secret clearance or citizenship the user likely lacks (be conservative, reject if heavily emphasized).\n"
                        "Output EXACTLY a JSON object with two keys: 'passes_gate' (boolean) and 'reason' (string explaining why it failed, or 'Passed' if it passed).\n\n"
                        f"Job Description:\n{scraped_jd[:4000]}"
                    )
                    qg_resp = await asyncio.to_thread(llm.invoke, qg_prompt)
                    qg_text = extract_text_content(qg_resp.content)
                    import re
                    import json

                    match = re.search(r"\{[\s\S]*\}", qg_text)
                    if match:
                        qg_json = json.loads(match.group(0))
                        if str(qg_json.get("passes_gate")).lower() == "false":
                            is_quality_gated = True
                            quality_gate_reason = qg_json.get(
                                "reason", "Failed quality gate."
                            )
                except Exception as e:
                    print(f"Quality gate failed to run: {e}")

            try:
                existing_job_res = await self.job_repo.session.execute(
                    select(Job).where(Job.url == url)
                )
                existing_job = existing_job_res.scalar_one_or_none()

                if existing_job:
                    job_id = existing_job.id
                else:
                    new_job = await self.job_repo.create(
                        url=url,
                        company=company_name,
                        role=role_name,
                        location=location,
                        work_model=work_model,
                        scraped_jd=scraped_jd,
                        company_research=company_research,
                    )
                    job_id = new_job.id
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save job details: {str(e)}",
                )

            from app.db.models.application import Application

            existing_app_res = await self.app_repo.session.execute(
                select(Application).where(
                    Application.user_id == user_id, Application.job_id == job_id
                )
            )
            existing_app = existing_app_res.scalar_one_or_none()

            if existing_app:
                existing_id = existing_app.id
                existing_status = existing_app.status
                current_analysis_status = existing_app.analysis_status or "idle"

                final_analysis_status = current_analysis_status
                update_kwargs = {}
                if resume_text and existing_app.resume_text != resume_text:
                    update_kwargs["resume_text"] = resume_text

                if payload.auto_analyze and current_analysis_status in [
                    "idle",
                    "failed",
                ]:
                    update_kwargs["analysis_status"] = "queued"
                    update_kwargs["analysis_error"] = None
                    final_analysis_status = "queued"

                if update_kwargs:
                    await self.app_repo.update(existing_app, **update_kwargs)

                return JobImportResponse(
                    application_id=existing_id,
                    job_id=job_id,
                    company=company_name,
                    status=existing_status,
                    analysis_status=final_analysis_status,
                    analysis_error=(
                        existing_app.analysis_error
                        if final_analysis_status != "queued"
                        else None
                    ),
                    auto_analyze=(
                        payload.auto_analyze
                        if final_analysis_status == "queued"
                        else False
                    ),
                )

            try:
                new_app = await self.app_repo.create(
                    user_id=user_id,
                    job_id=job_id,
                    resume_text=resume_text,
                    status="rejected" if is_quality_gated else "saved",
                    analysis_status=(
                        "idle"
                        if is_quality_gated
                        else ("queued" if payload.auto_analyze else "idle")
                    ),
                    analysis_error=None,
                    is_quality_gated=is_quality_gated,
                    quality_gate_reason=quality_gate_reason,
                )
                application_id = new_app.id
                status_val = new_app.status
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create application record: {str(e)}",
                )

            return JobImportResponse(
                application_id=application_id,
                job_id=job_id,
                company=company_name,
                status=status_val,
                analysis_status=(
                    "idle"
                    if is_quality_gated
                    else ("queued" if payload.auto_analyze else "idle")
                ),
                analysis_error=None,
                auto_analyze=payload.auto_analyze if not is_quality_gated else False,
            )
