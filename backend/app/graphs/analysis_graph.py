import asyncio
from typing import TypedDict, Optional
from datetime import datetime, timezone
from langgraph.graph import StateGraph, END, START

from app.chains.fit_scoring import get_fit_scoring_chain
from app.chains.cover_letter import get_cover_letter_chain
from app.chains.interview_prep import get_interview_prep_chain
from app.chains.resume_tailor import get_resume_tailoring_chain
from app.database import supabase_service
from app.schemas import FitScoreResult, InterviewPrepResult, ResumeEditsResult

# ============================================
# STATE SCHEMA DEFINITION
# ============================================

class AnalysisState(TypedDict):
    application_id: str
    resume_text: str
    scraped_jd: str
    company_research: str
    fit_result: dict
    cover_letter: str
    interview_prep: dict
    resume_edits: dict
    user_api_key: Optional[str]
    model_default: Optional[str]
    model_fit: Optional[str]
    model_letter: Optional[str]
    model_prep: Optional[str]
    error: Optional[str]

# ============================================
# NODES
# ============================================

async def fetch_context(state: AnalysisState) -> dict:
    """
    Fetches the resume text, job description, and company research from Supabase.
    Performs a join between the applications and jobs tables.
    """
    app_id = state.get("application_id")
    try:
        response = await asyncio.to_thread(
            lambda: supabase_service.table("applications")
                .select("resume_text, jobs(scraped_jd, company_research)")
                .eq("id", app_id)
                .execute()
        )
            
        if not response.data or len(response.data) == 0:
            return {"error": f"Application with ID {app_id} was not found."}
            
        record = response.data[0]
        jobs_rel = record.get("jobs")
        
        # Handle list vs dict response in relation join
        if isinstance(jobs_rel, list):
            job_data = jobs_rel[0] if len(jobs_rel) > 0 else {}
        else:
            job_data = jobs_rel or {}
            
        from app.llm import sanitize_llm_input
        resume_text = sanitize_llm_input(record.get("resume_text") or "", max_chars=15000)
        scraped_jd = sanitize_llm_input(job_data.get("scraped_jd") or "", max_chars=20000)
        company_research = sanitize_llm_input(job_data.get("company_research") or "", max_chars=20000)
        
        # Guard rails: validate that we have enough context to run the chains
        if not resume_text:
            return {"error": "Application is missing resume text."}
        if not scraped_jd:
            return {"error": "Associated job is missing a scraped job description."}
            
        return {
            "resume_text": resume_text,
            "scraped_jd": scraped_jd,
            "company_research": company_research
        }
    except Exception as e:
        return {"error": f"fetch_context failed: {str(e)}"}


async def run_fit_scoring(state: AnalysisState) -> dict:
    """
    Invokes the Fit Scoring Chain using candidate's resume and job description.
    """
    try:
        model_override = state.get("model_fit") or state.get("model_default") or None
        fit_chain = get_fit_scoring_chain(
            user_api_key=state.get("user_api_key"),
            model_override=model_override
        )
        result = await fit_chain.ainvoke({
            "resume_text": state["resume_text"],
            "scraped_jd": state["scraped_jd"]
        })
        return {"fit_result": result}
    except Exception as e:
        return {"error": f"fit_scoring failed: {str(e)}"}


async def run_cover_letter(state: AnalysisState) -> dict:
    """
    Invokes the Cover Letter Chain using resume, job description, and company research.
    """
    try:
        model_override = state.get("model_letter") or state.get("model_default") or None
        cover_letter_chain = get_cover_letter_chain(
            user_api_key=state.get("user_api_key"),
            model_override=model_override
        )
        result = await cover_letter_chain.ainvoke({
            "resume_text": state["resume_text"],
            "scraped_jd": state["scraped_jd"],
            "company_research": state["company_research"]
        })
        return {"cover_letter": result}
    except Exception as e:
        return {"error": f"cover_letter failed: {str(e)}"}


async def run_interview_prep(state: AnalysisState) -> dict:
    """
    Invokes the Interview Prep Chain using resume and job description.
    """
    try:
        model_override = state.get("model_prep") or state.get("model_default") or None
        prep_chain = get_interview_prep_chain(
            user_api_key=state.get("user_api_key"),
            model_override=model_override
        )
        result = await prep_chain.ainvoke({
            "resume_text": state["resume_text"],
            "scraped_jd": state["scraped_jd"]
        })
        return {"interview_prep": result}
    except Exception as e:
        return {"error": f"interview_prep failed: {str(e)}"}


async def run_resume_tailoring(state: AnalysisState) -> dict:
    """
    Invokes the Resume Tailoring Chain using resume and job description.
    """
    try:
        model_override = state.get("model_prep") or state.get("model_default") or None
        tailor_chain = get_resume_tailoring_chain(
            user_api_key=state.get("user_api_key"),
            model_override=model_override
        )
        result = await tailor_chain.ainvoke({
            "resume_text": state["resume_text"],
            "scraped_jd": state["scraped_jd"]
        })
        return {"resume_edits": result}
    except Exception as e:
        return {"error": f"resume_tailoring failed: {str(e)}"}


async def save_results(state: AnalysisState) -> dict:
    """
    Saves the aggregated analysis outputs back to the application record in Supabase.
    """
    app_id = state.get("application_id")
    fit = state.get("fit_result") or {}

    try:
        fit_result = FitScoreResult.model_validate(fit)
        interview_prep = InterviewPrepResult.model_validate(state.get("interview_prep") or {})
        resume_edits = ResumeEditsResult.model_validate(state.get("resume_edits") or {})
        cover_letter = state.get("cover_letter")
        if not isinstance(cover_letter, str) or not cover_letter.strip():
            raise ValueError("cover_letter must be a non-empty string")

        update_data = {
            "fit_score": fit_result.fit_score,
            "matched_skills": fit_result.matched_skills,
            "missing_skills": fit_result.missing_skills,
            "key_requirements": fit_result.key_requirements,
            "summary": fit_result.summary,
            "cover_letter": cover_letter,
            "interview_prep": interview_prep.model_dump(),
            "resume_edits": resume_edits.model_dump(),
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
        await asyncio.to_thread(
            lambda: supabase_service.table("applications")
                .update(update_data)
                .eq("id", app_id)
                .execute()
        )
            
        return {}
    except Exception as e:
        return {"error": f"save_results validation or database update failed: {str(e)}"}

# ============================================
# GRAPH WIRING & ROUTING
# ============================================

def route_after_node(state: AnalysisState, next_node: str) -> str:
    """
    Conditional routing helper. If 'error' is set in state,
    redirects execution immediately to the END node, skipping subsequent nodes.
    """
    if state.get("error") is not None:
        return END
    return next_node

# Define Graph Workflow
workflow = StateGraph(AnalysisState)

# Register Nodes
workflow.add_node("fetch_context", fetch_context)
workflow.add_node("run_fit_scoring", run_fit_scoring)
workflow.add_node("run_cover_letter", run_cover_letter)
workflow.add_node("run_interview_prep", run_interview_prep)
workflow.add_node("run_resume_tailoring", run_resume_tailoring)
workflow.add_node("save_results", save_results)

# Build Graph Edges with error-routing checks
workflow.add_edge(START, "fetch_context")

workflow.add_conditional_edges(
    "fetch_context",
    lambda state: route_after_node(state, "run_fit_scoring"),
    {"run_fit_scoring": "run_fit_scoring", END: END}
)

workflow.add_conditional_edges(
    "run_fit_scoring",
    lambda state: route_after_node(state, "run_cover_letter"),
    {"run_cover_letter": "run_cover_letter", END: END}
)

workflow.add_conditional_edges(
    "run_cover_letter",
    lambda state: route_after_node(state, "run_interview_prep"),
    {"run_interview_prep": "run_interview_prep", END: END}
)

workflow.add_conditional_edges(
    "run_interview_prep",
    lambda state: route_after_node(state, "run_resume_tailoring"),
    {"run_resume_tailoring": "run_resume_tailoring", END: END}
)

workflow.add_conditional_edges(
    "run_resume_tailoring",
    lambda state: route_after_node(state, "save_results"),
    {"save_results": "save_results", END: END}
)

workflow.add_edge("save_results", END)

# Compile Graph
graph = workflow.compile()

# ============================================
# PUBLIC INTERFACE
# ============================================

async def run_analysis(
    application_id: str,
    user_api_key: Optional[str] = None,
    model_default: Optional[str] = None,
    model_fit: Optional[str] = None,
    model_letter: Optional[str] = None,
    model_prep: Optional[str] = None
) -> dict:
    """
    Compiles and invokes the state graph asynchronously to run the full AI analysis 
    on the specified application, storing findings back to the database.
    
    Returns the final state dictionary.
    """
    initial_state = {
        "application_id": application_id,
        "resume_text": "",
        "scraped_jd": "",
        "company_research": "",
        "fit_result": {},
        "cover_letter": "",
        "interview_prep": {},
        "resume_edits": {},
        "user_api_key": user_api_key,
        "model_default": model_default,
        "model_fit": model_fit,
        "model_letter": model_letter,
        "model_prep": model_prep,
        "error": None
    }
    
    try:
        final_state = await graph.ainvoke(initial_state)
        return final_state
    except Exception as e:
        print("Error invoking analysis graph:", str(e))
        return {**initial_state, "error": str(e)}
