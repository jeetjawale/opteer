import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime, timezone

from app.main import app
from app.database import get_current_user
from app.core.dependencies import get_application_service

client = TestClient(app)


class MockUser:
    id = str(uuid4())


@pytest.fixture
def mock_app_service():
    service = AsyncMock()
    app.dependency_overrides[get_application_service] = lambda: service
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield service
    app.dependency_overrides.clear()


def test_list_applications(mock_app_service):
    # Setup mock return value matching ApplicationResponse
    mock_app_service.list_applications.return_value = []

    response = client.get("/applications")
    assert response.status_code == 200
    assert response.json() == []
    mock_app_service.list_applications.assert_called_once()


def test_get_application(mock_app_service):
    app_id = str(uuid4())
    mock_app_service.get_application.return_value = {
        "id": app_id,
        "job_id": str(uuid4()),
        "user_id": MockUser.id,
        "status": "saved",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = client.get(f"/applications/{app_id}")
    assert response.status_code == 200
    assert response.json()["id"] == app_id


def test_delete_application(mock_app_service):
    app_id = str(uuid4())
    response = client.delete(f"/applications/{app_id}")
    assert response.status_code == 204
    mock_app_service.delete_application.assert_called_once()
