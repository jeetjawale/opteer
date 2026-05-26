import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import UUID

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

def test_list_reminders():
    mock_reminder = {
        "id": "44444444-4444-4444-4444-444444444444",
        "application_id": "33333333-3333-3333-3333-333333333333",
        "user_id": MockUser.id,
        "type": "interview",
        "due_at": "2026-06-01T10:00:00+00:00",
        "note": "Prep for technical round",
        "is_sent": False,
        "is_completed": False,
        "created_at": "2026-05-26T00:00:00+00:00"
    }
    
    mock_execute = MagicMock()
    mock_execute.execute.return_value = MagicMock(data=[mock_reminder])
    mock_execute.eq.return_value = mock_execute
    
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_execute
    
    with patch("app.routers.reminders.supabase_service.table", return_value=mock_table):
        response = client.get("/reminders?application_id=33333333-3333-3333-3333-333333333333")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "44444444-4444-4444-4444-444444444444"
        assert data[0]["note"] == "Prep for technical round"

def test_create_reminder_success():
    # 1. Mock application select (check ownership)
    mock_app_execute = MagicMock()
    mock_app_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    
    mock_app_select = MagicMock()
    mock_app_select.eq.return_value = mock_app_execute
    
    # 2. Mock reminder insert
    mock_reminder_data = {
        "id": "44444444-4444-4444-4444-444444444444",
        "application_id": "33333333-3333-3333-3333-333333333333",
        "user_id": MockUser.id,
        "type": "follow-up",
        "due_at": "2026-06-02T09:00:00Z",
        "note": "Send thank you note",
        "is_sent": False,
        "is_completed": False,
        "created_at": "2026-05-26T00:00:00Z"
    }
    mock_insert_execute = MagicMock()
    mock_insert_execute.execute.return_value = MagicMock(data=[mock_reminder_data])
    mock_insert_select = MagicMock()
    mock_insert_select.insert.return_value = mock_insert_execute
    
    # Custom side effect for table mock
    def mock_table_routing(table_name):
        if table_name == "applications":
            mock_table = MagicMock()
            mock_table.select.return_value = mock_app_select
            return mock_table
        elif table_name == "reminders":
            return mock_insert_select
            
    with patch("app.routers.reminders.supabase_service.table", side_effect=mock_table_routing):
        response = client.post(
            "/reminders",
            json={
                "application_id": "33333333-3333-3333-3333-333333333333",
                "type": "follow-up",
                "due_at": "2026-06-02T09:00:00Z",
                "note": "Send thank you note"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "44444444-4444-4444-4444-444444444444"
        assert data["type"] == "follow-up"

def test_create_reminder_unowned_application():
    # Mock application check returning another user's ID
    mock_app_execute = MagicMock()
    mock_app_execute.execute.return_value = MagicMock(data=[{"user_id": "someone-else-uuid"}])
    mock_app_select = MagicMock()
    mock_app_select.eq.return_value = mock_app_execute
    
    def mock_table_routing(table_name):
        if table_name == "applications":
            mock_table = MagicMock()
            mock_table.select.return_value = mock_app_select
            return mock_table
            
    with patch("app.routers.reminders.supabase_service.table", side_effect=mock_table_routing):
        response = client.post(
            "/reminders",
            json={
                "application_id": "33333333-3333-3333-3333-333333333333",
                "type": "follow-up",
                "due_at": "2026-06-02T09:00:00Z",
                "note": "Send thank you note"
            }
        )
        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()

def test_update_reminder():
    # 1. Mock verify reminder ownership
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_select = MagicMock()
    mock_check_select.eq.return_value = mock_check_execute
    
    # 2. Mock update result
    mock_reminder_data = {
        "id": "44444444-4444-4444-4444-444444444444",
        "application_id": "33333333-3333-3333-3333-333333333333",
        "user_id": MockUser.id,
        "type": "deadline",
        "due_at": "2026-06-02T09:00:00Z",
        "note": "Send thank you note",
        "is_sent": False,
        "is_completed": True,
        "created_at": "2026-05-26T00:00:00Z"
    }
    mock_update_execute = MagicMock()
    mock_update_execute.execute.side_effect = [MagicMock(data=[]), MagicMock(data=[mock_reminder_data])]
    
    mock_update_select = MagicMock()
    mock_update_select.update.return_value = mock_update_execute
    mock_update_select.eq.return_value = mock_update_execute
    
    # Route checks vs updates
    call_count = 0
    def mock_table_routing(table_name):
        nonlocal call_count
        if call_count == 0:
            call_count += 1
            mock_table = MagicMock()
            mock_table.select.return_value = mock_check_select
            return mock_table
        else:
            mock_table = MagicMock()
            mock_table.update.return_value = mock_table
            mock_table.eq.return_value = mock_update_execute
            mock_table.select.return_value = mock_table
            return mock_table

    with patch("app.routers.reminders.supabase_service.table", side_effect=mock_table_routing):
        response = client.patch(
            "/reminders/44444444-4444-4444-4444-444444444444",
            json={
                "is_completed": True,
                "type": "deadline"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_completed"] is True
        assert data["type"] == "deadline"

def test_delete_reminder():
    # 1. Mock verify reminder ownership
    mock_check_execute = MagicMock()
    mock_check_execute.execute.return_value = MagicMock(data=[{"user_id": MockUser.id}])
    mock_check_select = MagicMock()
    mock_check_select.eq.return_value = mock_check_execute
    
    # Mock delete execution
    mock_delete_table = MagicMock()
    mock_delete_table.delete.return_value = mock_delete_table
    mock_delete_table.eq.return_value = MagicMock(execute=lambda: MagicMock())
    
    call_count = 0
    def mock_table_routing(table_name):
        nonlocal call_count
        if call_count == 0:
            call_count += 1
            mock_table = MagicMock()
            mock_table.select.return_value = mock_check_select
            return mock_table
        else:
            return mock_delete_table

    with patch("app.routers.reminders.supabase_service.table", side_effect=mock_table_routing):
        response = client.delete("/reminders/44444444-4444-4444-4444-444444444444")
        assert response.status_code == 204
