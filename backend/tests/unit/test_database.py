import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import patch, MagicMock

from app.database import get_current_user

@pytest.mark.asyncio
async def test_get_current_user_hides_sdk_errors():
    """
    Test that when Supabase SDK throws an exception with internal details,
    the application catches it and raises a generic 401 HTTPException
    without leaking the original error string to the client.
    """
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token")
    
    mock_supabase_client = MagicMock()
    # Simulate an SDK failure leaking internal details (e.g., token fragments, connection details)
    mock_supabase_client.auth.get_user.side_effect = Exception("AuthSessionMissingError: JWT fragment expired xyz123")
    
    with patch("app.database.supabase_client", mock_supabase_client):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials)
            
        # Verify the exception is an HTTP 401
        assert exc_info.value.status_code == 401
        
        # Verify the exception detail is the generic sanitized message
        assert exc_info.value.detail == "Invalid or expired authentication token"
        
        # Verify the raw SDK error string did NOT leak into the detail message
        assert "AuthSessionMissingError" not in exc_info.value.detail
        assert "xyz123" not in exc_info.value.detail
