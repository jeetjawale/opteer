import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app

client = TestClient(app)

# ── Shared Test Data ────────────────────────────────────────────────────────

USER_ID       = str(uuid4())
JOB_ID        = str(uuid4())
APPLICATION_ID = str(uuid4())

MOCK_APPLICATION = {
    "id": APPLICATION_ID,
    "user_id": USER_ID,
    "job_id": JOB_ID,
    "status": "saved",
    "applied_at": None,
    "resume_text": "Senior Python Developer with FastAPI experience.",
    "resume_file_url": None,
    "resume_file_name": None,
    "fit_score": 88,
    "matched_skills": ["Python", "FastAPI"],
    "missing_skills": ["Kubernetes"],
    "key_requirements": ["Backend Development"],
    "summary": "Strong backend fit.",
    "cover_letter": "Dear Hiring Manager,\n\nI am excited...\n\nSincerely,\nCandidate",
    "interview_prep": {
        "questions": [
            {
                "question": "Describe your FastAPI experience.",
                "suggested_answer": "I built REST APIs at my previous role."
            }
        ]
    },
    "notes": None,
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "url": "https://acme.com/jobs/123",
    "company_research": "Overview: A great company.\nWebsite: https://acme.com\nHeadquarters: San Francisco, CA\nCompany Size: 50-200\nIndustry: Tech\nWork Model: Remote",
    "scraped_jd": "We need a Python backend engineer.",
    "analyzed_at": "2026-05-25T10:00:00+00:00",
    "analysis_status": "completed",
    "analysis_started_at": "2026-05-25T09:59:00+00:00",
    "analysis_error": None,
    "created_at": "2026-05-24T09:00:00+00:00",
}

MOCK_USER = MagicMock()
MOCK_USER.id = USER_ID

SUCCESSFUL_GRAPH_STATE = {
    "application_id": APPLICATION_ID,
    "resume_text": "Senior Python Developer with FastAPI experience.",
    "scraped_jd": "We need a Python backend engineer.",
    "company_research": "Overview: A great company.",
    "fit_result": {
        "fit_score": 88,
        "matched_skills": ["Python", "FastAPI"],
        "missing_skills": ["Kubernetes"],
        "key_requirements": ["Backend Development"],
        "summary": "Strong backend fit.",
    },
    "cover_letter": "Dear Hiring Manager,\n\nI am excited...",
    "interview_prep": {
        "questions": [
            {
                "question": "Describe your FastAPI experience.",
                "suggested_answer": "I built REST APIs at my previous role."
            }
        ]
    },
    "user_api_key": None,
    "model_default": None,
    "model_fit": None,
    "model_letter": None,
    "model_prep": None,
    "error": None,
}

ERROR_GRAPH_STATE = {
    **SUCCESSFUL_GRAPH_STATE,
    "error": "fetch_context failed: Application with ID fake-id was not found.",
}

from app.database import get_current_user

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    yield
    app.dependency_overrides.clear()


def make_supabase_response(data: list):
    """Builds a mock Supabase response object with .data attribute."""
    mock = MagicMock()
    mock.data = data
    return mock


# ── Tests ───────────────────────────────────────────────────────────────────

class TestAnalyzeEndpoint:

    def test_analyze_success_returns_updated_application(self):
        """
        POST /applications/{id}/analyze should return the updated application
        dict with fit_score, cover_letter, and interview_prep populated.
        """
        # Build mock response for application row (flat-mapped, no nested jobs)
        flat_app = {**MOCK_APPLICATION}

        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
            patch("app.routers.applications.run_analysis", new_callable=AsyncMock,
                  return_value=SUCCESSFUL_GRAPH_STATE),
        ):
            # First call: ownership/status check
            # Second call: user_settings fetch → returns empty
            # Third call: fetch updated application after analysis
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.side_effect = [
                make_supabase_response([{"user_id": USER_ID, "analysis_status": "idle"}]),
                make_supabase_response([]),                         # user_settings
                make_supabase_response([{**flat_app, "jobs": {    # post-analyze fetch
                    "company": "Acme Corp",
                    "role": "Backend Engineer",
                    "url": "https://acme.com/jobs/123",
                    "company_research": "Overview: A great company.\nWebsite: https://acme.com\nHeadquarters: San Francisco, CA\nCompany Size: 50-200\nIndustry: Tech\nWork Model: Remote",
                    "scraped_jd": "We need a Python backend engineer."
                }}]),
            ]

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["fit_score"] == 88
        assert "Python" in data["matched_skills"]
        assert "Dear Hiring Manager" in data["cover_letter"]
        assert len(data["interview_prep"]["questions"]) >= 1
        assert data["analysis_status"] == "completed"

    def test_analyze_returns_409_when_already_processing(self):
        """
        POST /applications/{id}/analyze should reject duplicate analysis requests
        while the same user's application is already processing.
        """
        with patch("app.routers.applications.supabase_service") as mock_supa:
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.return_value = make_supabase_response([
                {"user_id": USER_ID, "analysis_status": "processing"}
            ])

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 409
        assert "already" in response.json()["detail"].lower()

    def test_analyze_returns_409_when_already_queued(self):
        """
        POST /applications/{id}/analyze should reject duplicate analysis requests
        while the same user's application is already queued for analysis.
        """
        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
            patch("app.routers.applications.run_analysis", new_callable=AsyncMock) as mock_run,
        ):
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.return_value = make_supabase_response([
                {"user_id": USER_ID, "analysis_status": "queued"}
            ])

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 409
        assert "already" in response.json()["detail"].lower()
        mock_run.assert_not_called()

    def test_analyze_retry_from_failed_clears_previous_error(self):
        """
        POST /applications/{id}/analyze should allow retrying a failed analysis and
        clear the previous analysis_error before running the pipeline again.
        """
        flat_app = {**MOCK_APPLICATION}

        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
            patch("app.routers.applications.run_analysis", new_callable=AsyncMock,
                  return_value=SUCCESSFUL_GRAPH_STATE),
        ):
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.side_effect = [
                make_supabase_response([{"user_id": USER_ID, "analysis_status": "failed"}]),
                make_supabase_response([]),
                make_supabase_response([{**flat_app, "jobs": {
                    "company": "Acme Corp",
                    "role": "Backend Engineer",
                    "url": "https://acme.com/jobs/123",
                    "company_research": "Overview: A great company.\nWebsite: https://acme.com\nHeadquarters: San Francisco, CA\nCompany Size: 50-200\nIndustry: Tech\nWork Model: Remote",
                    "scraped_jd": "We need a Python backend engineer."
                }}]),
            ]

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 200
        update_calls = mock_supa.table.return_value.update.call_args_list
        assert any(
            call.args[0].get("analysis_status") == "processing"
            and call.args[0].get("analysis_error") is None
            for call in update_calls
        )

    def test_analyze_returns_404_for_nonexistent_application(self):
        """
        POST /applications/{fake_id}/analyze should return 404
        when the application does not exist.
        """
        fake_id = str(uuid4())

        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
        ):
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.return_value = make_supabase_response([])

            response = client.post(
                f"/applications/{fake_id}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_analyze_returns_404_for_wrong_user(self):
        """
        POST /applications/{id}/analyze should return 404
        when the application belongs to a different user (ownership check).
        """
        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
        ):
            # The user_id DB filter should hide applications owned by other users.
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.return_value = make_supabase_response([])

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 404

    def test_analyze_returns_500_when_graph_fails(self):
        """
        POST /applications/{id}/analyze should return 500
        when the LangGraph pipeline returns an error state.
        """
        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
            patch("app.routers.applications.run_analysis", new_callable=AsyncMock,
                  return_value=ERROR_GRAPH_STATE),
        ):
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.side_effect = [
                make_supabase_response([{"user_id": USER_ID, "analysis_status": "idle"}]),
                make_supabase_response([]),
            ]

            response = client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={"Authorization": "Bearer fake-jwt-token"}
            )

        assert response.status_code == 500
        assert "pipeline failed" in response.json()["detail"].lower()
        update_calls = mock_supa.table.return_value.update.call_args_list
        assert any(
            call.args[0].get("analysis_status") == "failed"
            and "pipeline failed" in call.args[0].get("analysis_error", "").lower()
            for call in update_calls
        )

    def test_analyze_passes_user_api_key_to_graph(self):
        """
        POST /applications/{id}/analyze should forward the X-User-Api-Key
        header to run_analysis as user_api_key parameter.
        """
        flat_app = {**MOCK_APPLICATION}
        fake_key = "sk-ant-fake-key-for-testing-purposes-12345"

        with (
            patch("app.routers.applications.supabase_service") as mock_supa,
            patch("app.routers.applications.run_analysis", new_callable=AsyncMock,
                  return_value=SUCCESSFUL_GRAPH_STATE) as mock_run,
        ):
            query = mock_supa.table.return_value.select.return_value
            query.eq.return_value = query
            query.execute.side_effect = [
                make_supabase_response([{"user_id": USER_ID, "analysis_status": "idle"}]),
                make_supabase_response([]),
                make_supabase_response([{**flat_app, "jobs": {
                    "company": "Acme Corp", "role": "Backend Engineer",
                    "url": "https://acme.com/jobs/123",
                    "company_research": "Overview: A great company.\nWebsite: https://acme.com\nHeadquarters: San Francisco, CA\nCompany Size: 50-200\nIndustry: Tech\nWork Model: Remote",
                    "scraped_jd": "We need a Python backend engineer."
                }}]),
            ]

            client.post(
                f"/applications/{APPLICATION_ID}/analyze",
                headers={
                    "Authorization": "Bearer fake-jwt-token",
                    "X-User-Api-Key": fake_key
                }
            )

        # Verify run_analysis was called with the user's key
        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args.kwargs
        assert call_kwargs.get("user_api_key") == fake_key

    def test_analyze_without_auth_returns_401_or_403(self):
        """
        POST /applications/{id}/analyze without Authorization header
        should be rejected by the auth dependency.
        """
        app.dependency_overrides.clear()
        response = client.post(f"/applications/{APPLICATION_ID}/analyze")
        assert response.status_code in (401, 403)
