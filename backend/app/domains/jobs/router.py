import asyncio
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Header,
    Query,
    Response,
    BackgroundTasks,
)
from typing import Optional, List
from uuid import UUID
import pypdf
import docx
import io

from app.database import get_current_user
from app.schemas import (
    ImportJobRequest,
    JobImportResponse,
    JobResponse,
    JobCreate,
    JobUpdate,
)
from app.utils.timing import log_duration
from app.core.dependencies import get_job_service
from app.domains.jobs.service import JobService
import math
from jobspy import scrape_jobs  # type: ignore[import-not-found]
from pydantic import BaseModel

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobSearchResponse(BaseModel):
    id: str
    title: str
    company: str
    company_url: Optional[str] = None
    job_url: str
    location: str
    description: Optional[str] = None
    job_type: Optional[str] = None
    interval: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    date_posted: Optional[str] = None
    company_logo: Optional[str] = None
    site: Optional[str] = None


@router.get("/search", response_model=List[JobSearchResponse])
async def search_jobs(
    q: str = Query(..., description="Search term"),
    location: str = Query(..., description="Location"),
    results: int = Query(20, description="Results wanted per site"),
    remote: bool = Query(False, description="Is remote"),
    hours_old: Optional[int] = Query(None, description="Hours old"),
    country: str = Query("USA", description="Country for Indeed"),
    job_type: Optional[str] = Query(
        None, description="Job type (fulltime, parttime, etc)"
    ),
    experience_level: Optional[str] = Query(
        None, description="Experience level (entry, mid, senior)"
    ),
    sites: Optional[str] = Query(
        None,
        description="Comma separated list of sites (indeed, linkedin, glassdoor, zip_recruiter, google, naukri)",
    ),
    current_user=Depends(get_current_user),
):
    try:
        site_list = ["indeed", "linkedin"]
        if sites:
            valid_sites = {
                "linkedin",
                "indeed",
                "glassdoor",
                "zip_recruiter",
                "google",
                "naukri",
            }
            site_list = [
                s.strip() for s in sites.split(",") if s.strip() in valid_sites
            ]
            if not site_list:
                site_list = ["indeed", "linkedin"]

        # Append experience level to search query since JobSpy doesn't have an explicit param for it
        search_query = q
        if experience_level:
            search_query = f"{q} {experience_level}"

        def _run_scraper():
            return scrape_jobs(
                site_name=site_list,
                search_term=search_query,
                location=location,
                results_wanted=results,
                is_remote=remote,
                hours_old=hours_old,
                country_indeed=country,
                job_type=job_type,
                linkedin_fetch_description=True,
            )

        jobs_df = await asyncio.to_thread(_run_scraper)
        jobs_list = jobs_df.to_dict("records")

        results_formatted = []
        for job in jobs_list:

            def safe_get(key):
                val = job.get(key)
                if val is None:
                    return None
                if isinstance(val, float) and math.isnan(val):
                    return None
                return str(val)

            loc_string = safe_get("location") or "Unknown Location"

            min_amt = job.get("min_amount")
            if isinstance(min_amt, float) and math.isnan(min_amt):
                min_amt = None

            max_amt = job.get("max_amount")
            if isinstance(max_amt, float) and math.isnan(max_amt):
                max_amt = None

            job_url = safe_get("job_url") or ""
            unique_id = str(hash(job_url))

            results_formatted.append(
                JobSearchResponse(
                    id=unique_id,
                    title=safe_get("title") or "Unknown Title",
                    company=safe_get("company") or "Unknown Company",
                    company_url=safe_get("company_url"),
                    job_url=job_url,
                    location=loc_string,
                    description=safe_get("description"),
                    job_type=safe_get("job_type"),
                    interval=safe_get("interval"),
                    min_amount=min_amt,
                    max_amount=max_amt,
                    date_posted=safe_get("date_posted"),
                    company_logo=safe_get("company_logo"),
                    site=safe_get("site"),
                )
            )

        return results_formatted
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="JobSpy search failed. Please try again later."
        )


@router.post("/parse-resume", status_code=status.HTTP_200_OK)
async def parse_resume(
    file: UploadFile = File(...), current_user=Depends(get_current_user)
):
    """
    Parses an uploaded resume file (PDF, DOCX, TXT, LaTeX) and returns the extracted text.
    """
    async with log_duration("PARSE_RESUME"):
        filename = file.filename.lower()  # type: ignore[union-attr]
        content = await file.read()

        MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB
        if len(content) > MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=413, detail="File too large. Maximum size is 5MB."
            )

        extracted_text = ""

        try:
            if filename.endswith(".pdf"):

                def _parse_pdf():
                    pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                    text_parts = []
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                    return "\n".join(text_parts)

                extracted_text = await asyncio.to_thread(_parse_pdf)

            elif filename.endswith((".docx", ".doc")):

                def _parse_docx():
                    doc = docx.Document(io.BytesIO(content))
                    text_parts = [para.text for para in doc.paragraphs]
                    return "\n".join(text_parts)

                extracted_text = await asyncio.to_thread(_parse_docx)

            elif filename.endswith((".txt", ".tex", ".latex")):
                extracted_text = content.decode("utf-8", errors="ignore")

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file format. Please upload a PDF, DOCX, TXT, or LaTeX file.",
                )

            if not extracted_text.strip():
                raise ValueError(
                    "Extracted text is empty. The file may be scanned or empty."
                )

            return {"text": extracted_text}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse resume file: {str(e)}",
            )


@router.post(
    "/import", response_model=JobImportResponse, status_code=status.HTTP_201_CREATED
)
async def import_job(
    payload: ImportJobRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key"),
    service: JobService = Depends(get_job_service),
):
    """
    Scrapes a job posting URL, extracts the company name via LLM, performs Tavily
    background research, and registers the job and application records.
    """
    async with log_duration("IMPORT_JOB"):
        return await service.import_job(
            payload, str(current_user.id), x_user_api_key, background_tasks
        )


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    search: Optional[str] = Query(None, description="Search term for role or company"),
    company: Optional[str] = Query(None, description="Filter by company"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
    service: JobService = Depends(get_job_service),
):
    """
    List jobs with optional search, filtering, pagination, and sorting.
    """
    return await service.get_jobs(
        search=search,
        company=company,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    current_user=Depends(get_current_user),
    service: JobService = Depends(get_job_service),
):
    """
    Create a new job posting directly.
    """
    return await service.create_job(payload)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    current_user=Depends(get_current_user),
    service: JobService = Depends(get_job_service),
):
    """
    Retrieve a specific job by ID.
    """
    return await service.get_job(job_id)


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: UUID,
    payload: JobUpdate,
    current_user=Depends(get_current_user),
    service: JobService = Depends(get_job_service),
):
    """
    Update a specific job by ID.
    """
    return await service.update_job(job_id, payload)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: UUID,
    current_user=Depends(get_current_user),
    service: JobService = Depends(get_job_service),
):
    """
    Delete a specific job by ID.
    """
    await service.delete_job(job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
