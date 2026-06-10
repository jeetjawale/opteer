import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import date

from app.main import app
from app.database import get_current_user

client = TestClient(app)

class MockUser:
    id = "11111111-1111-1111-1111-111111111111"
    email = "test@opteer.com"

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()

def test_update_application_status_to_applied():
    mock_app = {
        "id": "22222222-2222-2222-2222-222222222222",
        "user_id": "11111111-1111-1111-1111-111111111111",
        "job_id": "33333333-3333-3333-3333-333333333333",
        "status": "applied",
        "applied_at": date.today().isoformat(),
        "fit_score": 85,
        "created_at": "2026-05-25T19:00:00Z",
    }

    with patch("app.domains.applications.service.ApplicationService.update_application", new_callable=AsyncMock) as mock_update:
        mock_update.return_value = mock_app
        response = client.patch(
            "/applications/22222222-2222-2222-2222-222222222222",
            json={"status": "applied"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "applied"
        assert data["applied_at"] == date.today().isoformat()
