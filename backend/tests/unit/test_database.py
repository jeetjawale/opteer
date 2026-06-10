import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import patch, AsyncMock

from app.database import get_current_user

@pytest.mark.asyncio
async def test_get_current_user_hides_sdk_errors():
    """
    Test that when AuthService throws an exception with internal details,
    the application catches it and raises a generic 401 HTTPException
    without leaking the original error string to the client.
    """
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token")
    
    with patch("app.domains.auth.service.AuthService.get_local_user", new_callable=AsyncMock) as mock_get_local_user:
        mock_get_local_user.side_effect = Exception("AuthSessionMissingError: JWT fragment expired xyz123")
        
        # We also need to mock Depends(get_db) since get_current_user takes a session
        from sqlalchemy.ext.asyncio import AsyncSession
        mock_session = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_session)
            
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired authentication token"
        assert "AuthSessionMissingError" not in exc_info.value.detail
        assert "xyz123" not in exc_info.value.detail
