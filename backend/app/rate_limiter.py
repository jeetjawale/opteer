import os
import sys
import asyncio
from fastapi import Request, HTTPException, status
from app.database import supabase_service

def rate_limiter(limit: int, window_seconds: int):
    """
    FastAPI dependency for IP-based rate limiting via Supabase RPC.
    Disables itself when running pytest to prevent test suite failures.
    """
    async def dependency(request: Request):
        # Disable rate limiting in testing mode
        if "pytest" in sys.modules or os.environ.get("TESTING") == "true":
            return

        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        rate_key = f"rate_limit:{client_ip}:{path}"

        try:
            response = await asyncio.to_thread(
                lambda: supabase_service.rpc(
                    "check_and_increment_rate_limit",
                    {
                        "rate_key": rate_key,
                        "limit_count": limit,
                        "window_seconds": window_seconds
                    }
                ).execute()
            )

            # The RPC returns true if allowed, false if exceeded
            allowed = response.data if response and hasattr(response, "data") else True
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later."
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            import logging
            logger = logging.getLogger(__name__)
            # Fail open if Supabase RPC fails (e.g. timeout) to avoid blocking users
            logger.error("Rate limit RPC error: %s", e)

    return dependency
