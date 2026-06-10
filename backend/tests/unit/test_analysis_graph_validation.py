import pytest

from app.ai.graphs.analysis_graph import save_results


@pytest.mark.asyncio
async def test_save_results_rejects_invalid_fit_output():
    state = {
        "application_id": "33333333-3333-3333-3333-333333333333",
        "fit_result": {
            "fit_score": 250,
            "matched_skills": [],
            "missing_skills": [],
            "key_requirements": [],
            "summary": "Invalid score should fail validation.",
        },
        "cover_letter": "Cover letter text",
        "interview_prep": {"questions": []},
    }

    result = await save_results(state)

    assert "error" in result
    assert "validation" in result["error"].lower()


@pytest.mark.asyncio
async def test_save_results_rejects_invalid_interview_prep_output():
    state = {
        "application_id": "33333333-3333-3333-3333-333333333333",
        "fit_result": {
            "fit_score": 85,
            "matched_skills": ["Python"],
            "missing_skills": [],
            "key_requirements": ["Build APIs"],
            "summary": "Strong fit.",
        },
        "cover_letter": "Cover letter text",
        "interview_prep": {"questions": [{"question": "Tell me about APIs."}]},
    }

    result = await save_results(state)

    assert "error" in result
    assert "validation" in result["error"].lower()
