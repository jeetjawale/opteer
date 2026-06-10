import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app
from app.domains.auth.service import InternalUser
from app.database import get_current_user
from app.domains.applications.router import get_application_service

client = TestClient(app)

@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: InternalUser(id="12345678-1234-5678-1234-567812345678", email="test@test.com")
    yield
    app.dependency_overrides = {}

@pytest.fixture(autouse=True)
def override_app_service():
    mock_service = AsyncMock()
    app.dependency_overrides[get_application_service] = lambda: mock_service
    yield mock_service
    if get_application_service in app.dependency_overrides:
        del app.dependency_overrides[get_application_service]

def test_get_applications_api(override_auth, override_app_service):
    override_app_service.list_applications.return_value = [{"id": "22222222-2222-2222-2222-222222222222", "user_id": "12345678-1234-5678-1234-567812345678", "job_id": "11111111-1111-1111-1111-111111111111", "status": "applied", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}]
    
    res = client.get("/applications")
    assert res.status_code == 200
    assert res.json()[0]["status"] == "applied"

def test_update_application_api(override_auth, override_app_service):
    override_app_service.update_application.return_value = {"id": "22222222-2222-2222-2222-222222222222", "user_id": "12345678-1234-5678-1234-567812345678", "job_id": "11111111-1111-1111-1111-111111111111", "status": "interview", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}
    
    res = client.patch("/applications/22222222-2222-2222-2222-222222222222", json={"status": "interview"})
    assert res.status_code == 200

def test_delete_application_api(override_auth, override_app_service):
    override_app_service.delete_application.return_value = None
    
    res = client.delete("/applications/22222222-2222-2222-2222-222222222222")
    assert res.status_code == 204
