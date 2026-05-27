import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.main import app
from app.database import get_current_user
from app.config import settings

client = TestClient(app)

class MockUser:
    id = "11111111-1111-1111-1111-111111111111"

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()

def test_upsert_settings():
    db_state = {}

    def mock_table_routing(table_name):
        mock_table = MagicMock()
        if table_name == "user_settings":
            def mock_select(*args, **kwargs):
                mock_chain = MagicMock()
                def mock_eq(col, val):
                    mock_chain_exec = MagicMock()
                    def mock_execute():
                        data = [db_state[val]] if val in db_state else []
                        return MagicMock(data=data)
                    mock_chain_exec.execute = mock_execute
                    return mock_chain_exec
                mock_chain.eq = mock_eq
                return mock_chain
            
            def mock_upsert(data, on_conflict=None):
                mock_chain = MagicMock()
                def mock_select2(*args, **kwargs):
                    mock_chain_exec = MagicMock()
                    def mock_execute():
                        # simulate upsert
                        user_id = data["user_id"]
                        if user_id in db_state:
                            db_state[user_id].update(data)
                        else:
                            data["id"] = str(uuid4())
                            db_state[user_id] = data
                        return MagicMock(data=[db_state[user_id]])
                    mock_chain_exec.execute = mock_execute
                    return mock_chain_exec
                mock_chain.select = mock_select2
                return mock_chain

            mock_table.select = mock_select
            mock_table.upsert = mock_upsert
        return mock_table

    with patch("app.routers.settings.supabase_service.table", side_effect=mock_table_routing):
        # GET initial settings (should be empty/defaults)
        response = client.get("/settings")
        assert response.status_code == 200
        data = response.json()
        # Empty DB state — should return resolved .env defaults, not None
        expected_fit = settings.AI_MODEL_FIT or settings.AI_MODEL
        assert data["model_fit"] == expected_fit
        
        # PUT first time
        payload1 = {
            "model_fit": "gpt-4o-mini",
            "model_letter": "claude-haiku-4-5-20251001",
            "model_prep": "gemini-2.5-flash"
        }
        response1 = client.put("/settings", json=payload1)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["model_fit"] == "gpt-4o-mini"
        assert len(db_state) == 1
        
        # PUT second time (overwrite)
        payload2 = {
            "model_fit": "gpt-4o",
            "model_letter": "claude-sonnet-4-5",
            "model_prep": "gemini-2.5-pro"
        }
        response2 = client.put("/settings", json=payload2)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["model_fit"] == "gpt-4o"
        assert data2["id"] == data1["id"]  # Must update the same row
        
        # Verify no duplicate rows
        assert len(db_state) == 1
        assert db_state[MockUser.id]["model_fit"] == "gpt-4o"
