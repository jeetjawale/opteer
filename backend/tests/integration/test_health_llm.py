from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from app.main import app
from app.database import get_current_user


client = TestClient(app)


class MockUser:
    id = "11111111-1111-1111-1111-111111111111"
    email = "test@jobpilot.com"


def test_health_llm_requires_authentication():
    app.dependency_overrides.clear()
    response = client.post("/health/llm", headers={"X-User-Api-Key": "sk-test-key-12345678901234567890"})

    assert response.status_code in (401, 403)


def test_health_llm_requires_user_supplied_key():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    try:
        response = client.post("/health/llm")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "user api key" in response.json()["detail"].lower()


def test_health_llm_uses_user_key_when_authenticated():
    fake_key = "sk-test-key-12345678901234567890"
    mock_llm = MagicMock()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    try:
        with patch("app.main.get_llm", return_value=mock_llm) as mock_get_llm:
            response = client.post("/health/llm", headers={"X-User-Api-Key": fake_key})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    mock_get_llm.assert_called_once()
    assert mock_get_llm.call_args.kwargs["user_api_key"] == fake_key
