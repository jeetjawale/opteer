import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime, timezone
import io

from app.main import app
from app.database import get_current_user
from app.core.dependencies import get_resume_service

client = TestClient(app)


class MockUser:
    id = str(uuid4())


@pytest.fixture
def mock_resume_service():
    service = AsyncMock()
    app.dependency_overrides[get_resume_service] = lambda: service
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield service
    app.dependency_overrides.clear()


def test_upload_resume(mock_resume_service):
    resume_id = str(uuid4())
    mock_resume_service.upload_resume_file.return_value = {
        "id": resume_id,
        "user_id": MockUser.id,
        "name": "test_resume.pdf",
        "content": "This is a very long extracted text that is definitely more than fifty characters long to pass the validation check.",
        "has_file": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    file_content = b"%PDF-1.4 dummy pdf content"
    files = {"file": ("test_resume.pdf", io.BytesIO(file_content), "application/pdf")}

    response = client.post("/resumes/upload", files=files)
    assert response.status_code == 201
    assert response.json()["id"] == resume_id
    assert response.json()["name"] == "test_resume.pdf"
    mock_resume_service.upload_resume_file.assert_called_once()
