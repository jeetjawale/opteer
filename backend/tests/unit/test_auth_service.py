import pytest
import uuid
from app.domains.auth.service import AuthService
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_user_repo():
    return AsyncMock()

@pytest.fixture
def auth_service(mock_user_repo):
    return AuthService(user_repo=mock_user_repo)

@pytest.mark.asyncio
async def test_get_local_user_existing(auth_service, mock_user_repo):
    mock_id = uuid.uuid4()
    
    mock_user = MagicMock()
    mock_user.id = mock_id
    mock_user.email = "local@opteer.dev"
    mock_user_repo.get_by_email.return_value = mock_user
    
    user = await auth_service.get_local_user()
    assert str(user.id) == str(mock_id)
    assert user.email == "local@opteer.dev"
    mock_user_repo.get_by_email.assert_called_once_with("local@opteer.dev")
    mock_user_repo.create.assert_not_called()

@pytest.mark.asyncio
async def test_get_local_user_new(auth_service, mock_user_repo):
    mock_user_repo.get_by_email.return_value = None
    
    mock_new_user = MagicMock()
    mock_new_user.id = uuid.uuid4()
    mock_new_user.email = "local@opteer.dev"
    mock_user_repo.create.return_value = mock_new_user
    
    user = await auth_service.get_local_user()
    assert user.email == "local@opteer.dev"
    mock_user_repo.create.assert_called_once_with(email="local@opteer.dev")
