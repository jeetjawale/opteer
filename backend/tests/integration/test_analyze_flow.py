import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.main import app
from app.database import get_current_user

# Initialize test client
client = TestClient(app)

class MockUser:
    id = "11111111-1111-1111-1111-111111111111"
    email = "test@jobpilot.com"

@pytest.fixture(autouse=True)
def override_dependencies():
    """Override current user dependency to return a static mock user."""
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()

def test_analyze_application_success():
    application_id = uuid4()
    job_id = uuid4()
    
    # 1. Mock verify application ownership select
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_select = MagicMock()
    mock_check_select.eq.return_value = mock_check_execute
    
    # 2. Mock retrieve updated application
    mock_retrieve_execute = MagicMock()
    mock_retrieve_execute.execute.return_value = MagicMock(data=[{
        "id": str(application_id),
        "user_id": MockUser.id,
        "job_id": str(job_id),
        "created_at": "2026-05-26T00:00:00Z",
        "fit_score": 88,
        "matched_skills": ["Python", "FastAPI"],
        "missing_skills": ["Docker"],
        "key_requirements": ["Python development"],
        "summary": "Strong backend developer fit.",
        "cover_letter": "Dear Hiring Manager, I am writing to apply...",
        "interview_prep": {"questions": []},
        "jobs": {
            "company": "FastAPI Corp",
            "role": "Backend Engineer",
            "url": "https://fastapi.org"
        }
    }])
    mock_retrieve_select = MagicMock()
    mock_retrieve_select.eq.return_value = mock_retrieve_execute
    
    # Route checks vs updates
    call_count = 0
    def mock_table_routing(table_name):
        nonlocal call_count
        if table_name == "applications":
            mock_table = MagicMock()
            if call_count == 0:
                call_count += 1
                mock_table.select.return_value = mock_check_select
            else:
                mock_table.select.return_value = mock_retrieve_select
            return mock_table
            
    with patch("app.routers.applications.supabase_service.table", side_effect=mock_table_routing), \
         patch("app.routers.applications.run_analysis", return_value={"error": None}) as mock_run_analysis:
         
        response = client.post(f"/applications/{application_id}/analyze")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(application_id)
        assert data["job_id"] == str(job_id)
        assert data["created_at"].startswith("2026-05-26T00:00:00")
        assert data["fit_score"] == 88
        assert data["company"] == "FastAPI Corp"
        assert data["role"] == "Backend Engineer"
        assert data["url"] == "https://fastapi.org"
        assert "Python" in data["matched_skills"]
        mock_run_analysis.assert_called_once_with(str(application_id))

def test_analyze_application_pipeline_failure():
    application_id = uuid4()
    
    # 1. Mock verify application ownership select
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_select = MagicMock()
    mock_check_select.eq.return_value = mock_check_execute
    
    def mock_table_routing(table_name):
        if table_name == "applications":
            mock_table = MagicMock()
            mock_table.select.return_value = mock_check_select
            return mock_table
            
    # Mock run_analysis returning a state with an error
    with patch("app.routers.applications.supabase_service.table", side_effect=mock_table_routing), \
         patch("app.routers.applications.run_analysis", return_value={"error": "Rate limit exceeded"}) as mock_run_analysis:
         
        response = client.post(f"/applications/{application_id}/analyze")
        
        assert response.status_code == 500
        data = response.json()
        assert "pipeline failed" in data["detail"]
        assert "Rate limit exceeded" in data["detail"]
        mock_run_analysis.assert_called_once_with(str(application_id))
