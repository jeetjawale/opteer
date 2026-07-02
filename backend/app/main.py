from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.domains.applications.router import router as applications_router
from app.domains.dashboard.router import router as dashboard_router
from app.domains.jobs.router import router as jobs_router
from app.domains.resumes.router import router as resumes_router
from app.domains.settings.router import router as settings_router

# Initialize the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Opteer Backend",
    version="1.0.0",
)

from app.core.logging_config import setup_logging  # noqa: E402

setup_logging(settings.LOG_LEVEL)


from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware  # noqa: E402

# import ProxyHeadersMiddleware

# Setup Proxy Headers Middleware (resolves real IP behind reverse proxies)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.TRUSTED_PROXIES)


# S-13: Basic Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Allow embedding PDFs in the frontend UI
    # response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    if request.url.path in ["/docs", "/redoc"]:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline' "
            "https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' "
            "https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com"
        )
    # else:
    #     response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,  # S-05: Mitigated CSRF risk since we use no cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# S-04: Warning for missing authentication outside development
import logging  # noqa: E402

if settings.ENVIRONMENT != "development":
    logger = logging.getLogger(__name__)
    logger.warning("=" * 60)
    logger.warning("CRITICAL SECURITY WARNING (S-04)")
    logger.warning("Opteer is running with NO AUTHENTICATION in non-dev mode!")
    logger.warning("This is acceptable ONLY for local, single-user desktop use.")
    logger.warning("Do NOT deploy this to a public network without adding auth.")
    logger.warning("=" * 60)


import os  # noqa: E402

from fastapi.staticfiles import StaticFiles  # noqa: E402

# Create local_storage directory if it doesn't exist
os.makedirs("local_storage", exist_ok=True)

# Mount local storage for serving files (like resumes)
app.mount("/api/storage", StaticFiles(directory="local_storage"), name="storage")

# Include resource routers
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(resumes_router)
app.include_router(settings_router)
app.include_router(dashboard_router)

from app.ai.llm import get_models_config  # noqa: E402


@app.get("/api/models", tags=["config"])
async def list_models():
    """Returns the dynamically configured models available in the system."""
    return get_models_config()


@app.get("/health", tags=["health"])
async def health_check():
    """
    Service health check endpoint returning status and configuration metadata.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
    }
