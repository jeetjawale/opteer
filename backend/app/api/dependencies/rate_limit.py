import time

from fastapi import HTTPException, Request, status


class SimpleRateLimiter:
    """
    A very basic in-memory rate limiter for local single-user tools.
    Addresses S-06 (No Rate Limiting) without needing Redis or slowapi.
    """

    def __init__(self, calls: int, period: int):
        self.calls = calls
        self.period = period
        self.access_times = {}  # type: ignore[var-annotated]

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean up old access times
        if client_ip in self.access_times:
            self.access_times[client_ip] = [
                t for t in self.access_times[client_ip] if now - t < self.period
            ]
        else:
            self.access_times[client_ip] = []

        if len(self.access_times[client_ip]) >= self.calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
            )

        self.access_times[client_ip].append(now)
