from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Header
from typing import Optional
from firecrawl import FirecrawlApp
from tavily import TavilyClient
import pypdf
import docx
import io

from app.config import settings
from app.database import supabase_service, get_current_user
from app.schemas import ImportJobRequest, JobImportResponse
from app.llm import get_llm

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/parse-resume", status_code=status.HTTP_200_OK)
async def parse_resume(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Parses an uploaded resume file (PDF, DOCX, TXT, LaTeX) and returns the extracted text.
    """
    filename = file.filename.lower()
    content = await file.read()
    extracted_text = ""
    
    try:
        if filename.endswith(".pdf"):
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            text_parts = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            extracted_text = "\n".join(text_parts)
            
        elif filename.endswith((".docx", ".doc")):
            # docx library supports reading docx streams. doc format is not directly docx, 
            # but users often name docx as doc, so we attempt to read it.
            doc = docx.Document(io.BytesIO(content))
            text_parts = [para.text for para in doc.paragraphs]
            extracted_text = "\n".join(text_parts)
            
        elif filename.endswith((".txt", ".tex", ".latex")):
            extracted_text = content.decode("utf-8", errors="ignore")
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload a PDF, DOCX, TXT, or LaTeX file."
            )
            
        if not extracted_text.strip():
            raise ValueError("Extracted text is empty. The file may be scanned or empty.")
            
        return {"text": extracted_text}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse resume file: {str(e)}"
        )

def extract_text_content(content) -> str:
    if isinstance(content, str):
        return content.strip()
    elif isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict) and "text" in part:
                text_parts.append(part["text"])
            elif isinstance(part, str):
                text_parts.append(part)
        return "".join(text_parts).strip()
    return str(content).strip()

def clean_html(html: str) -> str:
    import re
    # Remove script and style elements
    html = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', ' ', html, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    html = re.sub(r'<[^>]+>', ' ', html)
    # Collapse whitespace
    html = re.sub(r'\s+', ' ', html)
    return html.strip()

from app.rate_limiter import rate_limiter

@router.post("/import", response_model=JobImportResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limiter(limit=10, window_seconds=60))])
async def import_job(
    payload: ImportJobRequest,
    current_user = Depends(get_current_user),
    x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key")
):
    """
    Scrapes a job posting URL, extracts the company name via LLM, performs Tavily 
    background research, and registers the job and application records in Supabase.
    """
    from app.llm import sanitize_llm_input
    url = payload.url
    resume_text = sanitize_llm_input(payload.resume_text, max_chars=15000)
    scraped_jd = sanitize_llm_input(payload.scraped_jd or "", max_chars=20000) if payload.scraped_jd else None
    
    # 1. Scrape URL using Firecrawl (or use manual fallback text if provided)
    scraped_jd = payload.scraped_jd
    if not scraped_jd:
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
            # Fallback direct HTTP scraper
            try:
                import httpx
                headers = {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    )
                }
                with httpx.Client(follow_redirects=True, headers=headers, timeout=10.0) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        scraped_jd = clean_html(resp.text)
                        if not scraped_jd:
                            raise ValueError("Scraped content resulted in empty text.")
                    else:
                        raise ValueError(f"HTTP response status code: {resp.status_code}")
            except Exception as direct_err:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Scraping failed. Firecrawl: {str(e)} | Direct HTTP: {str(direct_err)}"
                )
    
    # Ensure scraped content is sanitized and truncated
    scraped_jd = sanitize_llm_input(scraped_jd, max_chars=20000)
        
    # 2. Extract company name and job title using a single JSON LLM call (one-shot, temperature=0.0, max_tokens=100)
    llm = get_llm(temperature=0.0, max_tokens=400, user_api_key=x_user_api_key)
    company_name = None
    role_name = None
    try:
        prompt = (
            "Analyze this job description and extract the company name and the job title/role.\n"
            "Return ONLY a JSON object with the keys 'company_name' and 'role_name', and nothing else. "
            "Do not include markdown code block formatting (like ```json).\n\n"
            f"Job Description:\n{scraped_jd}"
        )
        llm_response = llm.invoke(prompt)
        raw_text = extract_text_content(llm_response.content)
        
        import re
        import json
        
        # Robustly extract JSON object using regex
        match = re.search(r'\{[\s\S]*\}', raw_text)
        if match:
            raw_text = match.group(0)
            
        extracted_data = json.loads(raw_text)
        company_name = extracted_data.get("company_name", "").strip()
        role_name = extracted_data.get("role_name", "").strip()
        
        if company_name.lower() in {"n/a", "unknown", "none", "null", "not found"}:
            company_name = None
        if role_name.lower() in {"n/a", "unknown", "none", "null", "not found", "job description"}:
            role_name = None
    except Exception as e:
        print("Failed to extract company and role via single LLM JSON call:", str(e))
        
    if not company_name:
        # Fallback to domain netloc if LLM fails, ensuring resilience
        from urllib.parse import urlparse
        parsed = urlparse(url)
        # Strip common job-board subdomain prefixes (jobs., careers., apply.)
        # e.g. jobs.revvity.com → revvity, careers.google.com → google
        parts = parsed.netloc.replace("www.", "").split(".")
        skip_prefixes = {"jobs", "careers", "apply", "work", "hire", "talent", "jobsearch", "portal", "career"}
        company_part = parts[0] if parts[0].lower() not in skip_prefixes else (parts[1] if len(parts) > 1 else parts[0])
        company_name = company_part.capitalize()
        
    if not role_name:
        # Try to extract role from URL path segments (e.g. Workday, Greenhouse, Lever ATS)
        # e.g. /job/thane/ai-applications-devops-intern/20539 → "Ai Applications Devops Intern"
        from urllib.parse import urlparse
        _parsed = urlparse(url)
        path_parts = [p for p in _parsed.path.split("/") if p]
        # Find the longest hyphenated segment that looks like a job title (not a pure number or city)
        role_from_path = None
        for part in path_parts:
            # Skip numeric IDs and very short segments
            if part.isdigit() or len(part) < 5:
                continue
            # Prefer segments with multiple hyphens (likely a slugified role title)
            if part.count("-") >= 2:
                role_from_path = part.replace("-", " ").title()
                break
        role_name = role_from_path or "Job Description"
        
    # 3. Research company using Tavily
    try:
        tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        search_query = f"{company_name} company overview website industry founded"
        results = tavily_client.search(query=search_query, max_results=3)
        raw_results = results.get("results", [])
        raw_research = " ".join([r.get("content", "") for r in raw_results])
        
        if raw_research.strip() and company_name:
            research_prompt = (
                f"You are a helpful assistant. Based on the following raw web search results for the company '{company_name}', "
                "extract and format a concise company profile. "
                "Provide EXACTLY this format and nothing else:\n\n"
                "Overview: [Quick overview of company (not too big nor too small)]\n"
                "Website: [Website URL if available, else N/A]\n"
                "Industry: [Industry if available, else N/A]\n"
                "Founded: [Year founded if available, else N/A]\n\n"
                f"Raw search results:\n{raw_research[:3000]}"
            )
            llm_research_resp = llm.invoke(research_prompt)
            company_research = extract_text_content(llm_research_resp.content).strip()
        else:
            company_research = "No additional research available."
            
    except Exception as e:
        company_research = f"No additional research available. Search failed: {str(e)}"
        
    # 4. Insert into jobs table using supabase_service or reuse existing
    try:
        # Check if the job already exists by URL
        existing_job = supabase_service.table("jobs").select("id").eq("url", url).execute()
        if existing_job.data and len(existing_job.data) > 0:
            job_id = existing_job.data[0]["id"]
            # Update the existing job details with the latest scraped/manual data
            supabase_service.table("jobs").update({
                "company": company_name,
                "role": role_name,
                "scraped_jd": scraped_jd,
                "company_research": company_research
            }).eq("id", job_id).execute()
        else:
            job_payload = {
                "url": url,
                "company": company_name,
                "role": role_name,
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
