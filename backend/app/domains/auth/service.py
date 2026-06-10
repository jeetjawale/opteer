from uuid import UUID
from pydantic import BaseModel
from app.db.repositories.user import UserRepository

class InternalUser(BaseModel):
    id: UUID
    email: str

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_local_user(self) -> InternalUser:
        """
        Retrieves the default local user, or provisions one if it doesn't exist.
        Bypasses any external authentication for local-first deployment.
        """
        local_email = "local@opteer.dev"

        # Check local DB
        user = await self.user_repo.get_by_email(local_email)
        if user:
            return InternalUser(id=user.id, email=user.email)
        
        # Create user if not exists
        new_user = await self.user_repo.create(
            email=local_email
        )
        return InternalUser(id=new_user.id, email=new_user.email)

