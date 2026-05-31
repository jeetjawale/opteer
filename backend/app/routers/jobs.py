import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Header
from typing import Optional
from datetime import datetime, timezone
from firecrawl import FirecrawlApp
from tavily import TavilyClient
import ipaddress
import pypdf
import docx
import io
from urllib.parse import urlparse

from app.config import settings
from app.database import supabase_service, get_current_user
from app.schemas import ImportJobRequest, JobImportResponse
from app.llm import get_llm
from app.graphs.analysis_graph import run_analysis

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

def clean_html(html_content: str) -> str:
    import re
    import json
    import html
    
    # 1. Try to extract JobPosting from JSON-LD first (common in modern ATS like Phenom People)
    jd = ""
    json_ld_matches = re.finditer(r'<script\s+type=[\"\']application/ld\+json[\"\'][^>]*>([\s\S]*?)</script>', html_content, re.IGNORECASE)
    for match in json_ld_matches:
        try:
            data = json.loads(match.group(1).strip())
            if isinstance(data, dict):
                data = [data]
            for item in data:
                if item.get('@type') == 'JobPosting':
                    title = item.get('title', '')
                    description = item.get('description', '')
                    if description:
                        jd = f"{title}\n\n{description}"
                        break
        except Exception:
            continue
        if jd: break
        
    text_to_clean = jd if jd else html_content
    
    # Unescape HTML entities (e.g. &lt; to <)
    text_to_clean = html.unescape(text_to_clean)
    
    # Remove script and style elements
    text_to_clean = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', ' ', text_to_clean, flags=re.IGNORECASE)
    
    # Preserve block elements and line breaks
    text_to_clean = re.sub(r'<br\s*/?>', '\n', text_to_clean, flags=re.IGNORECASE)
    text_to_clean = re.sub(r'</(p|div|h[1-6]|li)>', '\n', text_to_clean, flags=re.IGNORECASE)
    text_to_clean = re.sub(r'<li>', '• ', text_to_clean, flags=re.IGNORECASE)
    
    # Strip remaining HTML tags
    text_to_clean = re.sub(r'<[^>]+>', '', text_to_clean)
    
    # Clean up spaces but preserve newlines
    text_to_clean = re.sub(r'[ \t]+', ' ', text_to_clean)
    
    # Clean up excessive newlines
    text_to_clean = re.sub(r'\n\s*\n+', '\n\n', text_to_clean).strip()
    
    return text_to_clean

from app.rate_limiter import rate_limiter

BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}

def sanitize_error(error: str, api_key: str | None) -> str:
    if api_key and len(api_key) > 8:
        return error.replace(api_key, "[REDACTED]")
    return error

def validate_public_http_url(url: str) -> str:
    """
    Rejects unsupported schemes and obvious internal network targets before the
    backend or third-party scrapers fetch a user-supplied import URL.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job URL must use http or https."
        )
    if not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job URL must include a valid hostname."
        )

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".localhost"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job URL host is not allowed."
        )

    try:
        ip = ipaddress.ip_address(hostname)
        ips_to_check = [ip]
    except ValueError:
        # Resolve hostname to IPs to prevent DNS-based SSRF
        import socket
        try:
            # getaddrinfo returns a list of tuples: (family, type, proto, canonname, sockaddr)
            # sockaddr is (IP, port) for IPv4 or (IP, port, flowinfo, scopeid) for IPv6
            resolved = socket.getaddrinfo(hostname, None)
            ips_to_check = [ipaddress.ip_address(info[4][0]) for info in resolved]
        except socket.gaierror:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job URL host could not be resolved."
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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job URL host resolves to a disallowed IP address."
            )

    return url

async def analyze_imported_application(
    application_id: str,
    user_id: str,
    user_api_key: Optional[str],
    user_settings: dict,
) -> tuple[str, Optional[str]]:
    """
    Runs analysis after import while preserving the imported application if AI fails.
    """
    try:
        check_response = await asyncio.to_thread(
            lambda: supabase_service.table("applications")
                .select("analysis_status")
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        if not check_response.data:
            return "failed", "Imported application was not found for analysis."

        current_status = check_response.data[0].get("analysis_status") or "idle"
        if current_status in {"processing", "completed"}:
            return current_status, None

        processing_response = await asyncio.to_thread(
            lambda: supabase_service.table("applications")
                .update({
                    "analysis_status": "processing",
                    "analysis_started_at": datetime.now(timezone.utc).isoformat(),
                    "analysis_error": None,
                })
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .neq("analysis_status", "processing")
                .execute()
        )
        if getattr(processing_response, "data", None) == []:
            return "processing", None

        final_state = await run_analysis(
            str(application_id),
            user_api_key=user_api_key,
            model_default=user_settings.get("model_default"),
            model_fit=user_settings.get("model_fit"),
            model_letter=user_settings.get("model_letter"),
            model_prep=user_settings.get("model_prep"),
        )

        if final_state.get("error") is not None:
            error_msg = f"AI analysis pipeline failed: {sanitize_error(final_state['error'], user_api_key)}"
            await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .update({
                        "analysis_status": "failed",
                        "analysis_error": error_msg,
                    })
                    .eq("id", str(application_id))
                    .eq("user_id", str(user_id))
                    .execute()
            )
            return "failed", error_msg

        await asyncio.to_thread(
            lambda: supabase_service.table("applications")
                .update({
                    "analysis_status": "completed",
                    "analysis_error": None,
                })
                .eq("id", str(application_id))
                .eq("user_id", str(user_id))
                .execute()
        )
        return "completed", None
    except Exception as e:
        error_msg = f"AI analysis pipeline failed: {sanitize_error(str(e), user_api_key)}"
        try:
            await asyncio.to_thread(
                lambda: supabase_service.table("applications")
                    .update({
                        "analysis_status": "failed",
                        "analysis_error": error_msg,
                    })
                    .eq("id", str(application_id))
                    .eq("user_id", str(user_id))
                    .execute()
            )
        except Exception:
            pass
        return "failed", error_msg

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
    url = await asyncio.to_thread(validate_public_http_url, payload.url.strip())
    resume_text = sanitize_llm_input(payload.resume_text, max_chars=15000)
    
    # 1. Scrape URL using direct HTTP first (best for JSON-LD), then fallback to Firecrawl
    scraped_jd = payload.scraped_jd
    if not scraped_jd:
        direct_scraped = None
        try:
            import httpx
            import urllib.parse
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json, text/html"
            }
            def is_safe_domain(hostname: str | None, base_domain: str) -> bool:
                if not hostname:
                    return False
                hostname = hostname.lower()
                return hostname == base_domain or hostname.endswith(f".{base_domain}")

            async with httpx.AsyncClient(follow_redirects=False, headers=headers, timeout=10.0) as client:
                parsed_url = urllib.parse.urlparse(url)
                
                # Workday API Fast Path (bypasses unformatted JSON-LD and cookie banners)
                if is_safe_domain(parsed_url.hostname, "myworkdayjobs.com"):
                    # Use parsed_url.hostname here to avoid credentials/ports interfering with tenant parsing
                    tenant = parsed_url.hostname.split(".")[0]
                    api_url = await asyncio.to_thread(
                        validate_public_http_url,
                        f"{parsed_url.scheme}://{parsed_url.netloc}/wday/cxs/{tenant}{parsed_url.path}"
                    )
                    api_resp = await client.get(api_url)
                    if api_resp.status_code == 200:
                        job_data = api_resp.json()
                        raw_html = job_data.get("jobPostingInfo", {}).get("jobDescription", "")
                        if raw_html:
                            direct_scraped = await asyncio.to_thread(clean_html, raw_html)
                
                # Default Fast Path
                if not direct_scraped:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        direct_scraped = await asyncio.to_thread(clean_html, resp.text)
                        
                # If it's robust and not a generic cookie/JS banner, use it immediately
                if direct_scraped and len(direct_scraped) > 500 and not ("uses cookies" in direct_scraped.lower() and len(direct_scraped) < 1500) and not "enable javascript" in direct_scraped.lower() and not ("{{" in direct_scraped and "}}" in direct_scraped):
                    scraped_jd = direct_scraped
        except Exception as e:
            print(f"Fast path extraction failed: {e}")
            pass

        if not scraped_jd:
            try:
                def _scrape_firecrawl():
                    app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
                    return app.scrape_url(url, formats=["markdown"])
                scrape_result = await asyncio.to_thread(_scrape_firecrawl)
                scraped_jd = (
                    scrape_result.markdown 
                    if hasattr(scrape_result, "markdown") 
                    else scrape_result.get("markdown", "")
                )
                # Reject if Firecrawl returns cookie banner or very short text
                if not scraped_jd or len(scraped_jd.strip()) < 100 or ("uses cookies" in scraped_jd.lower() and len(scraped_jd) < 1500):
                    raise ValueError("Firecrawl returned empty, insufficiently long, or cookie banner content.")
            except Exception as e:
                # Fallback to whatever direct HTTP got, if anything
                if direct_scraped:
                    scraped_jd = direct_scraped
                else:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Scraping failed. Firecrawl error: {str(e)}"
                    )
    
    # Fetch user settings to respect the default model override for utility tasks
    user_settings = {}
    try:
        settings_response = await asyncio.to_thread(
            lambda: supabase_service.table("user_settings")
                .select("model_default, model_fit, model_letter, model_prep")
                .eq("user_id", str(current_user.id))
                .execute()
        )
        if settings_response.data:
            user_settings = settings_response.data[0]
    except Exception as e:
        print(f"Warning: Failed to fetch user settings during import: {e}")

    # Ensure scraped content is sanitized and truncated
    scraped_jd = sanitize_llm_input(scraped_jd, max_chars=20000)
        
    # Resolve the API key from DB or headers
    from app.llm import resolve_api_key
    effective_api_key = resolve_api_key(str(current_user.id), x_user_api_key)
        
    # 2. Extract company name, job title, and a cleaned JD using a single JSON LLM call
    llm = get_llm(
        temperature=0.0, 
        max_tokens=4000, 
        user_api_key=effective_api_key,
        model_override=user_settings.get("model_default")
    )
    company_name = None
    role_name = None
    try:
        prompt = (
            "Analyze this job description and extract the company name, the job title/role, and a cleaned version of the job description.\n"
            "The cleaned job description should preserve the core job details (responsibilities, requirements, qualifications) in clean markdown, but MUST strip away all website navigation text, 'similar jobs' links, cookie notices, header/footer boilerplate, and excessively long legal/diversity footers.\n"
            "Return ONLY a JSON object with the keys 'company_name', 'role_name', and 'cleaned_jd'. "
            "Do not include markdown code block formatting (like ```json).\n\n"
            f"Job Description:\n{scraped_jd}"
        )
        llm_response = await asyncio.to_thread(llm.invoke, prompt)
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
        cleaned_jd = extracted_data.get("cleaned_jd", "").strip()
        
        if cleaned_jd and len(cleaned_jd) > 100:
            scraped_jd = cleaned_jd
            
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
        def _search_tavily():
            client = TavilyClient(api_key=settings.TAVILY_API_KEY)
            return client.search(query=f"{company_name} company overview website industry founded", max_results=3)
        results = await asyncio.to_thread(_search_tavily)
        raw_results = results.get("results", [])
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
            llm_research_resp = await asyncio.to_thread(llm.invoke, research_prompt)
            company_research = extract_text_content(llm_research_resp.content).strip()
        else:
            company_research = "No additional research available."
            
    except Exception as e:
        company_research = f"No additional research available. Search failed: {str(e)}"
        
    # 4. Insert into jobs table using supabase_service or reuse existing
    try:
        # Check if the job already exists by URL
        existing_job = await asyncio.to_thread(
            lambda: supabase_service.table("jobs").select("id").eq("url", url).execute()
        )
        if existing_job.data and len(existing_job.data) > 0:
            job_id = existing_job.data[0]["id"]
        else:
            job_payload = {
                "url": url,
                "company": company_name,
                "role": role_name,
                "scraped_jd": scraped_jd,
                "company_research": company_research
            }
            job_response = await asyncio.to_thread(
                lambda: supabase_service.table("jobs").insert(job_payload).execute()
            )
            if not job_response.data or len(job_response.data) == 0:
                raise ValueError("Failed to create job record in database.")
            job_id = job_response.data[0]["id"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save job details: {str(e)}"
        )
        
    # Check if the user already has an application for this job
    existing_app = await asyncio.to_thread(
        lambda: supabase_service.table("applications")
            .select("id, status, analysis_status, analysis_error")
            .eq("user_id", str(current_user.id))
            .eq("job_id", str(job_id))
            .execute()
    )

    if existing_app.data and len(existing_app.data) > 0:
        # Return the existing application instead of creating a duplicate
        existing_id = existing_app.data[0]["id"]
        existing_status = existing_app.data[0]["status"]
        current_analysis_status = existing_app.data[0].get("analysis_status") or "idle"
        
        # If auto-analyze is requested and it's not already processing/completed, queue it
        final_analysis_status = current_analysis_status
        if payload.auto_analyze and current_analysis_status in ["idle", "failed"]:
            await asyncio.to_thread(
                lambda: supabase_service.table("applications").update({
                    "analysis_status": "queued",
                    "analysis_error": None
                }).eq("id", existing_id).execute()
            )
            final_analysis_status = "queued"

        return JobImportResponse(
            application_id=existing_id,
            job_id=job_id,
            company=company_name,
            status=existing_status,
            analysis_status=final_analysis_status,
            analysis_error=existing_app.data[0].get("analysis_error") if final_analysis_status != "queued" else None,
            auto_analyze=payload.auto_analyze if final_analysis_status == "queued" else False,
        )
        
    # 5. Insert into applications table using supabase_service
    try:
        app_payload = {
            "user_id": current_user.id,
            "job_id": job_id,
            "resume_text": resume_text,
            "status": "saved",
            "analysis_status": "queued" if payload.auto_analyze else "idle",
            "analysis_error": None
        }
        app_response = await asyncio.to_thread(
            lambda: supabase_service.table("applications").insert(app_payload).execute()
        )
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
        status=status_val,
        analysis_status="queued" if payload.auto_analyze else "idle",
        analysis_error=None,
        auto_analyze=payload.auto_analyze,
    )
