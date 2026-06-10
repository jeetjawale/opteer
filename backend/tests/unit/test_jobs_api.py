import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app
from app.domains.auth.service import InternalUser
from app.database import get_current_user
from app.domains.jobs.router import get_job_service

client = TestClient(app)

@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: InternalUser(id="12345678-1234-5678-1234-567812345678", email="test@test.com")
    yield
    app.dependency_overrides = {}

@pytest.fixture(autouse=True)
def override_job_service():
    mock_service = AsyncMock()
    app.dependency_overrides[get_job_service] = lambda: mock_service
    yield mock_service
    if get_job_service in app.dependency_overrides:
        del app.dependency_overrides[get_job_service]

def test_get_jobs_api(override_auth, override_job_service):
    override_job_service.get_jobs.return_value = [{"id": "11111111-1111-1111-1111-111111111111", "url": "https://test.com", "company": "Test Corp", "role": "Dev", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}]
    
    res = client.get("/jobs")
    assert res.status_code == 200
    assert res.json()[0]["company"] == "Test Corp"

def test_create_job_api(override_auth, override_job_service):
    override_job_service.create_job.return_value = {"id": "11111111-1111-1111-1111-111111111111", "url": "https://test.com", "company": "Test Corp", "role": "Dev", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}
    
    res = client.post("/jobs", json={"url": "https://test.com", "company": "Test Corp", "role": "Dev"})
    assert res.status_code == 201

def test_get_job_api(override_auth, override_job_service):
    override_job_service.get_job.return_value = {"id": "11111111-1111-1111-1111-111111111111", "url": "https://test.com", "company": "Test Corp", "role": "Dev", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}
    
    res = client.get("/jobs/11111111-1111-1111-1111-111111111111")
    assert res.status_code == 200

def test_update_job_api(override_auth, override_job_service):
    override_job_service.update_job.return_value = {"id": "11111111-1111-1111-1111-111111111111", "url": "https://test.com", "company": "New Corp", "role": "Dev", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}
    
    res = client.patch("/jobs/11111111-1111-1111-1111-111111111111", json={"company": "New Corp"})
    assert res.status_code == 200

def test_delete_job_api(override_auth, override_job_service):
    override_job_service.delete_job.return_value = None
    
    res = client.delete("/jobs/11111111-1111-1111-1111-111111111111")
    assert res.status_code == 204
