import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import UUID

from app.main import app
from app.database import get_current_user

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

def test_list_resumes():
    mock_resume = {
        "id": "55555555-5555-5555-5555-555555555555",
        "user_id": MockUser.id,
        "name": "SWE Profile",
        "content": "This is my resume. I have skills in python, fastify, nextjs.",
        "created_at": "2026-05-26T00:00:00+00:00",
        "updated_at": "2026-05-26T00:00:00+00:00"
    }

    mock_execute = MagicMock()
    mock_execute.execute.return_value = MagicMock(data=[mock_resume])
    mock_execute.eq.return_value = mock_execute
    mock_execute.order.return_value = mock_execute

    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_execute

    with patch("app.routers.resumes.supabase_service.table", return_value=mock_table):
        response = client.get("/resumes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "55555555-5555-5555-5555-555555555555"
        assert data[0]["name"] == "SWE Profile"
        assert "preview" in data[0]
        assert data[0]["preview"] == "This is my resume. I have skills in python, fastify, nextjs."

def test_create_resume():
    mock_resume_data = {
        "id": "55555555-5555-5555-5555-555555555555",
        "user_id": MockUser.id,
        "name": "SWE Profile",
        "content": "This is my resume. I have skills in python, fastify, nextjs.",
        "created_at": "2026-05-26T00:00:00Z",
        "updated_at": "2026-05-26T00:00:00Z"
    }

    mock_insert_execute = MagicMock()
    mock_insert_execute.execute.return_value = MagicMock(data=[mock_resume_data])
    mock_insert_select = MagicMock()
    mock_insert_select.insert.return_value = mock_insert_execute

    with patch("app.routers.resumes.supabase_service.table", return_value=mock_insert_select):
        response = client.post(
            "/resumes",
            json={
                "name": "SWE Profile",
                "content": "This is my resume. I have skills in python, fastify, nextjs."
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "55555555-5555-5555-5555-555555555555"
        assert data["name"] == "SWE Profile"

def test_get_resume_by_id():
    mock_resume = {
        "id": "55555555-5555-5555-5555-555555555555",
        "user_id": MockUser.id,
        "name": "SWE Profile",
        "content": "This is my resume. I have skills in python, fastify, nextjs.",
        "created_at": "2026-05-26T00:00:00+00:00",
        "updated_at": "2026-05-26T00:00:00+00:00"
    }

    mock_execute = MagicMock()
    mock_execute.execute.return_value = MagicMock(data=[mock_resume])
    mock_execute.eq.return_value = mock_execute

    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_execute

    with patch("app.routers.resumes.supabase_service.table", return_value=mock_table):
        response = client.get("/resumes/55555555-5555-5555-5555-555555555555")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "55555555-5555-5555-5555-555555555555"
        assert data["content"] == "This is my resume. I have skills in python, fastify, nextjs."

def test_update_resume():
    mock_resume = {
        "id": "55555555-5555-5555-5555-555555555555",
        "user_id": MockUser.id,
        "name": "SWE Profile Updated",
        "content": "Updated content text representing the resume profile details.",
        "created_at": "2026-05-26T00:00:00+00:00",
        "updated_at": "2026-05-26T01:00:00+00:00"
    }

    # Mock owner check
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_table = MagicMock()
    mock_check_table.select.return_value = mock_check_table
    mock_check_table.eq.return_value = mock_check_execute

    # Mock update + select updated row
    mock_update_execute = MagicMock()
    mock_update_execute.execute.return_value = MagicMock(data=[mock_resume])
    mock_update_table = MagicMock()
    mock_update_table.update.return_value = mock_update_table
    mock_update_table.select.return_value = mock_update_table
    mock_update_table.eq.return_value = mock_update_execute

    # Custom side effect for table mock
    def mock_table_routing(table_name):
        if table_name == "resumes":
            mock_table = MagicMock()
            
            def mock_select(fields):
                if fields == "user_id":
                    return mock_check_table
                else: # "*"
                    return mock_update_table
            
            mock_table.select.side_effect = mock_select
            mock_table.update.return_value = mock_update_table
            return mock_table

    with patch("app.routers.resumes.supabase_service.table", side_effect=mock_table_routing):
        response = client.patch(
            "/resumes/55555555-5555-5555-5555-555555555555",
            json={
                "name": "SWE Profile Updated",
                "content": "Updated content text representing the resume profile details."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "SWE Profile Updated"
        assert data["content"] == "Updated content text representing the resume profile details."

def test_delete_resume():
    # Mock owner check
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_table = MagicMock()
    mock_check_table.select.return_value = mock_check_table
    mock_check_table.eq.return_value = mock_check_execute

    # Mock delete
    mock_delete_execute = MagicMock()
    mock_delete_execute.execute.return_value = MagicMock(data=[])
    mock_delete_table = MagicMock()
    mock_delete_table.delete.return_value = mock_delete_table
    mock_delete_table.eq.return_value = mock_delete_execute

    def mock_table_routing(table_name):
        if table_name == "resumes":
            mock_table = MagicMock()
            mock_table.select.return_value = mock_check_table
            mock_table.delete.return_value = mock_delete_table
            return mock_table

    with patch("app.routers.resumes.supabase_service.table", side_effect=mock_table_routing):
        response = client.delete("/resumes/55555555-5555-5555-5555-555555555555")
        assert response.status_code == 204
