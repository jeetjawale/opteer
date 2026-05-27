import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

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

def test_import_job_endpoint():
    # 1. Setup mock Firecrawl response
    mock_scrape_res = MagicMock()
    mock_scrape_res.markdown = "Work at a Startup Job Description. Company: Work at a Startup. " * 10
    
    mock_firecrawl_inst = MagicMock()
    mock_firecrawl_inst.scrape_url.return_value = mock_scrape_res
    
    # 2. Setup mock LLM for extracting company name and job title/role (JSON mode)
    mock_llm_res = MagicMock()
    mock_llm_res.content = '{"company_name": "Work at a Startup", "role_name": "Software Engineer"}'
    
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = mock_llm_res
    
    # 3. Setup mock Tavily response
    mock_tavily_inst = MagicMock()
    mock_tavily_inst.search.return_value = {
        "results": [{"content": "Work at a Startup is YC's hiring platform."}]
    }
    
    # 4. Setup mock Supabase response
    mock_job_response = MagicMock()
    mock_job_response.data = [{"id": "22222222-2222-2222-2222-222222222222"}]
    
    mock_app_response = MagicMock()
    mock_app_response.data = [{"id": "33333333-3333-3333-3333-333333333333", "status": "saved"}]
    
    mock_select_res = MagicMock()
    mock_select_res.data = []  # No existing job found
    
    # Setup mock query chain
    mock_select = MagicMock()
    # Handle single .eq (jobs url check) and double .eq (application duplicate check)
    mock_select.eq.return_value.execute.return_value = mock_select_res
    mock_select.eq.return_value.eq.return_value.execute.return_value = mock_select_res
    
    mock_insert = MagicMock()
    mock_insert.execute.side_effect = [mock_job_response, mock_app_response]
    
    # Create database chain mock
    mock_table = MagicMock()
    mock_table.select.return_value = mock_select
    mock_table.insert.return_value = mock_insert
    
    # 5. Patch integrations inside routers.jobs module
    with patch("app.routers.jobs.FirecrawlApp", return_value=mock_firecrawl_inst), \
         patch("app.routers.jobs.get_llm", return_value=mock_llm), \
         patch("app.routers.jobs.TavilyClient", return_value=mock_tavily_inst), \
         patch("app.routers.jobs.supabase_service.table", return_value=mock_table):
         
        # Execute API request
        response = client.post(
            "/jobs/import",
            json={
                "url": "https://www.workatastartup.com/jobs/64551",
                "resume_text": "BS in CS, 3 years React experience."
            }
        )
        
        # Verify outputs
        if response.status_code != 201:
            print("FAILED WITH 422:", response.json())
        assert response.status_code == 201
        data = response.json()
        assert data["company"] == "Work at a Startup"
        assert data["application_id"] == "33333333-3333-3333-3333-333333333333"
        assert data["job_id"] == "22222222-2222-2222-2222-222222222222"
        assert data["status"] == "saved"
