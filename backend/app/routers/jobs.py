from fastapi import APIRouter, Depends, HTTPException, status
from firecrawl import FirecrawlApp
from tavily import TavilyClient

from app.config import settings
from app.database import supabase_service, get_current_user
from app.schemas import ImportJobRequest, JobImportResponse
from app.llm import get_llm

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/import", response_model=JobImportResponse, status_code=status.HTTP_201_CREATED)
async def import_job(payload: ImportJobRequest, current_user = Depends(get_current_user)):
    """
    Scrapes a job posting URL, extracts the company name via LLM, performs Tavily 
    background research, and registers the job and application records in Supabase.
    """
    url = payload.url
    resume_text = payload.resume_text
    
    # 1. Scrape URL using Firecrawl
    try:
        firecrawl_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
        scrape_result = firecrawl_app.scrape_url(url, formats=["markdown"])
        scraped_jd = (
            scrape_result.markdown 
            if hasattr(scrape_result, "markdown") 
            else scrape_result.get("markdown", "")
        )
        if not scraped_jd:
            raise ValueError("Firecrawl returned empty markdown content.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Firecrawl scraping failed: {str(e)}"
        )
        
    # 2. Extract company name using a simple LLM call (one-shot, temperature=0.0)
    try:
        llm = get_llm(temperature=0.0)
        prompt = (
            "Extract just the company name from this job description. "
            "Return only the company name, nothing else.\n\n"
            f"Job Description:\n{scraped_jd}"
        )
        llm_response = llm.invoke(prompt)
        company_name = llm_response.content.strip()
    except Exception as e:
        # Fallback to domain netloc if LLM fails, ensuring resilience
        from urllib.parse import urlparse
        parsed = urlparse(url)
        company_name = parsed.netloc.replace("www.", "").split(".")[0].capitalize()
        
    # 3. Research company using Tavily
    try:
        tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        search_query = f"{company_name} company overview"
        results = tavily_client.search(query=search_query, max_results=3)
        raw_results = results.get("results", [])
        company_research = " ".join([r.get("content", "") for r in raw_results])
    except Exception as e:
        company_research = f"No additional research available. Search failed: {str(e)}"
        
    # 4. Insert into jobs table using supabase_service
    try:
        job_payload = {
            "url": url,
            "company": company_name,
            "scraped_jd": scraped_jd,
            "company_research": company_research
        }
        job_response = supabase_service.table("jobs").insert(job_payload).execute()
        if not job_response.data or len(job_response.data) == 0:
            raise ValueError("Failed to create job record in database.")
        job_id = job_response.data[0]["id"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save job details: {str(e)}"
        )
        
    # 5. Insert into applications table using supabase_service
    try:
        app_payload = {
            "user_id": current_user.id,
            "job_id": job_id,
            "resume_text": resume_text,
            "status": "saved"
        }
        app_response = supabase_service.table("applications").insert(app_payload).execute()
        if not app_response.data or len(app_response.data) == 0:
            raise ValueError("Failed to create application record in database.")
        application_id = app_response.data[0]["id"]
        status_val = app_response.data[0]["status"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create application record: {str(e)}"
        )
        
    # 6. Return JobImportResponse
    return JobImportResponse(
        application_id=application_id,
        job_id=job_id,
        company=company_name,
        status=status_val
    )
