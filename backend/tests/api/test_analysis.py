import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from uuid import uuid4

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


def test_analyze_application(mock_app_service):
    app_id = str(uuid4())
    mock_app_service.queue_analysis.return_value = {
        "status": "queued",
        "message": "Analysis queued successfully",
    }

    response = client.post(f"/applications/{app_id}/analyze")
    assert response.status_code == 202
    assert response.json()["status"] == "queued"
    mock_app_service.queue_analysis.assert_called_once()
