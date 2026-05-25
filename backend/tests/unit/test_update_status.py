import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import date

from app.main import app
from app.database import get_current_user

client = TestClient(app)

class MockUser:
    id = "11111111-1111-1111-1111-111111111111"
    email = "test@jobpilot.com"

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()

def test_update_application_status_to_applied():
    mock_check_res = MagicMock()
    mock_check_res.data = [{"user_id": "11111111-1111-1111-1111-111111111111"}]
    
    mock_update_res = MagicMock()
    mock_update_res.data = [{
        "id": "22222222-2222-2222-2222-222222222222",
        "user_id": "11111111-1111-1111-1111-111111111111",
        "job_id": "33333333-3333-3333-3333-333333333333",
        "status": "applied",
        "applied_at": date.today().isoformat(),
        "fit_score": 85,
        "created_at": "2026-05-25T19:00:00Z",
        "jobs": {
            "company": "Test Company",
            "role": "Test Role",
            "url": "https://test.com"
        }
    }]
    
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_update = MagicMock()
    
    mock_select.eq.return_value = mock_select
    mock_select.execute.side_effect = [mock_check_res, mock_update_res]
    
    mock_update.eq.return_value = mock_update
    mock_update.execute.return_value = mock_update_res
    
    mock_table.select.return_value = mock_select
    mock_table.update.return_value = mock_update
    
    with patch("app.routers.applications.supabase_service.table", return_value=mock_table):
        response = client.patch(
            "/applications/22222222-2222-2222-2222-222222222222",
            json={"status": "applied"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "applied"
        assert data["applied_at"] == date.today().isoformat()
        
        mock_table.update.assert_called_once()
        update_call_args = mock_table.update.call_args[0][0]
        assert update_call_args["status"] == "applied"
        assert update_call_args["applied_at"] == date.today().isoformat()
