import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings

# Initialize Supabase client (anon role - for auth token validation)
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Initialize Supabase service client (service role - for server-side db operations)
supabase_service: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# HTTPBearer scheme to retrieve the authorization token
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI dependency to extract and verify the Supabase JWT token.
    Calls Supabase Auth to fetch the user details associated with the token.
    Uses asyncio.to_thread to prevent blocking the event loop on network calls.
    """
    token = credentials.credentials
    try:
        response = await asyncio.to_thread(lambda: supabase_client.auth.get_user(token))
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return response.user
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Authentication error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
