from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import get_current_user
from app.domains.jobs.router import router as jobs_router
from app.domains.applications.router import router as applications_router
from app.domains.resumes.router import router as resumes_router
from app.domains.settings.router import router as settings_router
from app.domains.dashboard.router import router as dashboard_router

# Initialize the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Opteer Backend",
    version="1.0.0",
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# Setup Proxy Headers Middleware (resolves real IP behind reverse proxies)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.TRUSTED_PROXIES)

# CORS Middleware setup
# Allowed origins are loaded from the validated pydantic settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

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

from app.ai.llm import get_models_config

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



