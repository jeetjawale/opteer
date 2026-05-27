import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import AIMessage


# ── Helpers ────────────────────────────────────────────────────────────────

from langchain_core.runnables import RunnableLambda

def make_mock_llm(return_text: str):
    """
    Returns a mock LangChain chat model whose .ainvoke() resolves to
    an AIMessage containing return_text. Compatible with LCEL pipe (|).
    """
    def fake_llm(inp):
        return AIMessage(content=return_text)
    
    mock_llm = RunnableLambda(fake_llm)
    # Ensure it works with sync or async invoke
    mock_llm.invoke = lambda inp: AIMessage(content=return_text)
    return mock_llm


FIT_SCORE_JSON = (
    '{"fit_score": 88, '
    '"matched_skills": ["Python", "FastAPI", "PostgreSQL"], '
    '"missing_skills": ["Kubernetes"], '
    '"key_requirements": ["Backend Development", "REST APIs"], '
    '"summary": "Strong fit. The candidate has solid backend experience."}'
)

COVER_LETTER_TEXT = (
    "Dear Hiring Manager,\n\n"
    "I am excited to apply for this position.\n\n"
    "My experience with Python and FastAPI aligns well.\n\n"
    "Sincerely,\nTest Candidate"
)

INTERVIEW_PREP_JSON = (
    '{"questions": ['
    '{"question": "Describe your experience with FastAPI.", '
    '"suggested_answer": "I built RESTful services using FastAPI at my previous role."}'
    ']}'
)

RESUME = "Senior Python developer, 5 years FastAPI, PostgreSQL, REST APIs."
JD     = "We need a Python backend engineer with FastAPI and REST API experience."
CO_RES = "Overview: Fast-growing fintech startup.\nWebsite: https://example.com\nIndustry: Fintech\nFounded: 2018"


# ── Fit Scoring Chain ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fit_scoring_chain_returns_valid_schema():
    """Fit scoring chain parses JSON and returns a dict with fit_score."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(FIT_SCORE_JSON)):
        from app.chains.fit_scoring import get_fit_scoring_chain
        chain = get_fit_scoring_chain()
        result = await chain.ainvoke({"resume_text": RESUME, "scraped_jd": JD})

    assert isinstance(result, dict)
    assert result["fit_score"] == 88
    assert "Python" in result["matched_skills"]
    assert "Kubernetes" in result["missing_skills"]
    assert len(result["key_requirements"]) > 0
    assert len(result["summary"]) > 10


@pytest.mark.asyncio
async def test_fit_scoring_chain_provider_agnostic():
    """Fit scoring chain mock works regardless of AI_PROVIDER env var."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(FIT_SCORE_JSON)):
        from app.chains.fit_scoring import get_fit_scoring_chain
        chain = get_fit_scoring_chain(user_api_key="sk-ant-fake-key-12345678901234")
        result = await chain.ainvoke({"resume_text": RESUME, "scraped_jd": JD})

    assert result["fit_score"] == 88


# ── Cover Letter Chain ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cover_letter_chain_returns_string():
    """Cover letter chain returns a non-empty string starting with greeting."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(COVER_LETTER_TEXT)):
        from app.chains.cover_letter import get_cover_letter_chain
        chain = get_cover_letter_chain()
        result = await chain.ainvoke({
            "resume_text": RESUME,
            "scraped_jd": JD,
            "company_research": CO_RES
        })

    assert isinstance(result, str)
    assert len(result) > 50
    assert "Dear Hiring Manager" in result


@pytest.mark.asyncio
async def test_cover_letter_chain_with_empty_research():
    """Cover letter chain handles empty company_research gracefully."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(COVER_LETTER_TEXT)):
        from app.chains.cover_letter import get_cover_letter_chain
        chain = get_cover_letter_chain()
        result = await chain.ainvoke({
            "resume_text": RESUME,
            "scraped_jd": JD,
            "company_research": ""
        })

    assert isinstance(result, str)
    assert len(result) > 10


# ── Interview Prep Chain ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_interview_prep_chain_returns_questions():
    """Interview prep chain returns a dict with a non-empty questions list."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(INTERVIEW_PREP_JSON)):
        from app.chains.interview_prep import get_interview_prep_chain
        chain = get_interview_prep_chain()
        result = await chain.ainvoke({"resume_text": RESUME, "scraped_jd": JD})

    assert isinstance(result, dict)
    assert "questions" in result
    assert len(result["questions"]) >= 1
    first_q = result["questions"][0]
    assert "question" in first_q
    assert "suggested_answer" in first_q


@pytest.mark.asyncio
async def test_interview_prep_chain_question_content():
    """Each interview prep question has non-empty question and answer."""
    with patch("app.llm.get_llm", return_value=make_mock_llm(INTERVIEW_PREP_JSON)):
        from app.chains.interview_prep import get_interview_prep_chain
        chain = get_interview_prep_chain()
        result = await chain.ainvoke({"resume_text": RESUME, "scraped_jd": JD})

    for q in result["questions"]:
        assert len(q["question"]) > 5
        assert len(q["suggested_answer"]) > 5
