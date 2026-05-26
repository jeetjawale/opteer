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


from fastapi import Header
from typing import Optional
from app.llm import get_llm, detect_provider

@app.post("/health/llm", tags=["health"])
def health_check_llm(x_user_api_key: Optional[str] = Header(None, alias="X-User-Api-Key")):
    """
    Validates user-provided LLM connection and API key credentials.
    Runs get_llm(user_api_key=key).invoke("say ok") to verify connectivity.
    """
    key = x_user_api_key
    try:
        # Initialize and invoke connection test
        llm = get_llm(temperature=0.0, user_api_key=key)
        llm.invoke("say ok")
        
        # Determine provider name
        provider = detect_provider(key) if key else settings.AI_PROVIDER
        return {"status": "ok", "provider": provider}
    except Exception as e:
        error_msg = str(e)
        if key and len(key) > 8:
            error_msg = error_msg.replace(key, "[REDACTED]")
        return {"status": "error", "detail": error_msg}

