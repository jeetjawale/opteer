import asyncio
import logging
from typing import TypedDict, Optional
from datetime import datetime, timezone
import uuid
from langgraph.graph import StateGraph, END, START
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload


from app.ai.chains.fit_scoring import get_fit_scoring_chain

# import get_fit_scoring_chain
from app.ai.chains.cover_letter import get_cover_letter_chain

# import get_cover_letter_chain
from app.ai.chains.interview_prep import get_interview_prep_chain

# import get_interview_prep_chain
from app.ai.chains.resume_tailor import get_resume_tailoring_chain

# import get_resume_tailoring_chain
from app.db.session import async_session
from app.db.models.application import Application
from app.schemas import (
    FitScoreResult,
    InterviewPrepResult,
    ResumeEditsResult,
)

# , InterviewPrepResult, ResumeEditsResult

logger = logging.getLogger(__name__)

# ============================================
# STATE SCHEMA DEFINITION
logger = logging.getLogger(__name__)

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
    provider_name: str
    model_name: Optional[str]
    api_key: Optional[str]
    base_url: Optional[str]
    task_models: dict
    auto_draft_cover_letters: bool
    generate_interview_prep: bool
    error: Optional[str]


logger = logging.getLogger(__name__)

# ============================================
# NODES
logger = logging.getLogger(__name__)

# ============================================


async def fetch_context(state: AnalysisState) -> dict:
    """
    Fetches the resume text, job description, and company research from PostgreSQL.
    """
    app_id = state.get("application_id")
    try:
        app_uuid = uuid.UUID(app_id)
        async with async_session() as session:
            query = (
                select(Application)
                .options(joinedload(Application.job))
                .where(Application.id == app_uuid)
            )
            result = await session.execute(query)
            app = result.scalar_one_or_none()

            if not app:
                return {"error": f"Application with ID {app_id} was not found."}

            from app.ai.llm import sanitize_llm_input

            resume_text = sanitize_llm_input(app.resume_text or "", max_chars=15000)

            job_data = app.job
            if job_data:
                scraped_jd = sanitize_llm_input(
                    job_data.scraped_jd or "", max_chars=20000
                )
                company_research = sanitize_llm_input(
                    job_data.company_research or "", max_chars=20000
                )
            else:
                scraped_jd = ""
                company_research = ""

            if not resume_text:
                return {"error": "Application is missing resume text."}
            if not scraped_jd:
                return {"error": "Associated job is missing a scraped job description."}

            return {
                "resume_text": resume_text,
                "scraped_jd": scraped_jd,
                "company_research": company_research,
            }
    except Exception as e:
        return {"error": f"fetch_context failed: {str(e)}"}


async def run_all_analyses(state: AnalysisState) -> dict:
    """
    Invokes all analysis chains (fit, cover letter, prep, tailoring) in parallel.
    """

    async def _fit():
        try:
            model = state.get("task_models", {}).get("fit") or state["model_name"]
            fit_chain = get_fit_scoring_chain(
                state["provider_name"], model, state["api_key"], state["base_url"]
            )
            result = await fit_chain.ainvoke(
                {"resume_text": state["resume_text"], "scraped_jd": state["scraped_jd"]}
            )
            return {"fit_result": result}
        except Exception as e:
            logger.error("fit_scoring failed: %s", str(e))
            return {"fit_result": {}}

    async def _letter():
        try:
            model = state.get("task_models", {}).get("letter") or state["model_name"]
            cover_letter_chain = get_cover_letter_chain(
                state["provider_name"], model, state["api_key"], state["base_url"]
            )
            result = await cover_letter_chain.ainvoke(
                {
                    "resume_text": state["resume_text"],
                    "scraped_jd": state["scraped_jd"],
                    "company_research": state["company_research"],
                }
            )
            return {"cover_letter": result if isinstance(result, str) else result.get("cover_letter", "")}
        except Exception as e:
            logger.error("cover_letter failed: %s", str(e))
            return {"cover_letter": ""}

    async def _prep():
        try:
            model = state.get("task_models", {}).get("prep") or state["model_name"]
            interview_prep_chain = get_interview_prep_chain(
                state["provider_name"], model, state["api_key"], state["base_url"]
            )
            result = await interview_prep_chain.ainvoke(
                {
                    "resume_text": state["resume_text"],
                    "scraped_jd": state["scraped_jd"],
                    "company_research": state["company_research"],
                }
            )
            return {"interview_prep": result}
        except Exception as e:
            logger.error("interview_prep failed: %s", str(e))
            return {"interview_prep": {}}

    async def _tailor():
        try:
            model = state.get("task_models", {}).get("tailor") or state["model_name"]
            resume_tailor_chain = get_resume_tailoring_chain(
                state["provider_name"], model, state["api_key"], state["base_url"]
            )
            result = await resume_tailor_chain.ainvoke(
                {
                    "resume_text": state["resume_text"],
                    "scraped_jd": state["scraped_jd"],
                }
            )
            return {"resume_edits": result}
        except Exception as e:
            logger.error("resume_tailor failed: %s", str(e))
            return {"resume_edits": {}}

    try:
        tasks = [_fit(), _tailor()]
        if state.get("auto_draft_cover_letters"):
            tasks.append(_letter())
        if state.get("generate_interview_prep"):
            tasks.append(_prep())

        results = await asyncio.gather(*tasks)
        merged = {}
        for res in results:
            merged.update(res)
        return merged
    except Exception as e:
        logger.error("run_all_analyses failed unexpectedly: %s", str(e))
        return {
            "error": f"Failed to run parallel analyses: {str(e)}",
            "fit_result": {},
            "cover_letter": None,
            "interview_prep": {},
            "resume_edits": {},
        }


async def save_results(state: AnalysisState) -> dict:
    """
    Saves the aggregated analysis outputs back to the application record.
    """
    app_id = state.get("application_id")
    raw_fit = state.get("fit_result") or {}
    raw_prep = state.get("interview_prep") or {}
    raw_edits = state.get("resume_edits") or {}

    try:
        # Validate payloads against Pydantic schemas
        fit_validated = FitScoreResult(**raw_fit)
        prep_validated = InterviewPrepResult(**raw_prep)
        edits_validated = ResumeEditsResult(**raw_edits)

        app_uuid = uuid.UUID(app_id)
        update_data = {
            "fit_score": fit_validated.fit_score,
            "matched_skills": fit_validated.matched_skills,
            "missing_skills": fit_validated.missing_skills,
            "key_requirements": fit_validated.key_requirements,
            "summary": fit_validated.summary,
            "cover_letter": state.get("cover_letter"),
            "interview_prep": prep_validated.model_dump(),
            "resume_edits": edits_validated.model_dump(),
            "analyzed_at": datetime.now(timezone.utc),
        }

        async with async_session() as session:
            stmt = (
                update(Application)
                .where(Application.id == app_uuid)
                .values(**update_data)
            )
            await session.execute(stmt)
            await session.commit()

        return {}
    except Exception as e:
        logger.error(
            f"save_results validation or database update failed for {app_id}: {str(e)}"
        )
        return {"error": f"save_results validation or database update failed: {str(e)}"}


logger = logging.getLogger(__name__)

# ============================================
# GRAPH WIRING & ROUTING
logger = logging.getLogger(__name__)

# ============================================


def route_after_node(state: AnalysisState, next_node: str) -> str:
    if state.get("error") is not None:
        return END
    return next_node


workflow = StateGraph(AnalysisState)

workflow.add_node("fetch_context", fetch_context)
workflow.add_node("run_all_analyses", run_all_analyses)
workflow.add_node("save_results", save_results)

workflow.add_edge(START, "fetch_context")

workflow.add_conditional_edges(
    "fetch_context",
    lambda state: route_after_node(state, "run_all_analyses"),
    {"run_all_analyses": "run_all_analyses", END: END},
)

workflow.add_conditional_edges(
    "run_all_analyses",
    lambda state: route_after_node(state, "save_results"),
    {"save_results": "save_results", END: END},
)

workflow.add_edge("save_results", END)

graph = workflow.compile()

logger = logging.getLogger(__name__)

# ============================================
# PUBLIC INTERFACE
logger = logging.getLogger(__name__)

# ============================================


async def run_analysis(
    application_id: str,
    provider_name: str,
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    task_models: Optional[dict] = None,
    auto_draft_cover_letters: bool = False,
    generate_interview_prep: bool = False,
) -> dict:
    initial_state = {
        "application_id": application_id,
        "resume_text": "",
        "scraped_jd": "",
        "company_research": "",
        "fit_result": {},
        "cover_letter": "",
        "interview_prep": {},
        "resume_edits": {},
        "provider_name": provider_name,
        "model_name": model_name,
        "api_key": api_key,
        "base_url": base_url,
        "task_models": task_models or {},
        "auto_draft_cover_letters": auto_draft_cover_letters,
        "generate_interview_prep": generate_interview_prep,
        "error": None,
    }

    try:
        final_state = await graph.ainvoke(initial_state)
        return final_state
    except Exception as e:
        logger.error("Error invoking analysis graph: %s", str(e))
        return {**initial_state, "error": str(e)}
