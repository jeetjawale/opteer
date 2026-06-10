from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.repositories.user import UserRepository
from app.domains.auth.service import AuthService, InternalUser

async def get_current_user(
    session: AsyncSession = Depends(get_db)
) -> InternalUser:
    """
    Returns the default local user. 
    Bypasses any authorization headers for local-first mode.
    """
    user_repo = UserRepository(session)
    auth_service = AuthService(user_repo)
    return await auth_service.get_local_user()
