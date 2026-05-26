from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.jobs import router as jobs_router
from app.routers.applications import router as applications_router
from app.routers.reminders import router as reminders_router

# Initialize the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="JobPilot Backend — AI-powered job application helper",
    version="1.0.0",
)

# CORS Middleware setup
# Allowed origins are loaded from the validated pydantic settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include resource routers
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(reminders_router)

@app.get("/health", tags=["health"])
async def health_check():
    """
    Service health check endpoint returning status and configuration metadata.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "ai_provider": settings.AI_PROVIDER,
        "ai_model": settings.AI_MODEL,
    }
