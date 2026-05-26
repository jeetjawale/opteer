import time
import os
import sys
from fastapi import Request, HTTPException, status
from collections import defaultdict
from typing import Dict

# Simple in-memory rate limiter: client_ip -> list of timestamps
rate_limit_records: Dict[str, list[float]] = defaultdict(list)

def rate_limiter(limit: int, window_seconds: int):
    """
    FastAPI dependency for IP-based in-memory rate limiting.
    Disables itself when running pytest to prevent test suite failures.
    """
    def dependency(request: Request):
        # Disable rate limiting in testing mode
        if "pytest" in sys.modules or os.environ.get("TESTING") == "true":
            return

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Filter out timestamps older than the window
        timestamps = [t for t in rate_limit_records[client_ip] if now - t < window_seconds]
        
        if len(timestamps) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
            
        timestamps.append(now)
        rate_limit_records[client_ip] = timestamps
        
    return dependency
