import os
import sys
import asyncio
from dotenv import load_dotenv

def verify_environment():
    print("\n--- 1. Environment Variable Validation ---")
    load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
    
    keys_to_check = {
        "DATABASE_URL": "Required for database",
        "OPENAI_API_KEY": "Optional (Alternative LLM)",
        "ANTHROPIC_API_KEY": "Optional (Alternative LLM)",
        "GOOGLE_API_KEY": "Optional (Alternative LLM)",
        "TAVILY_API_KEY": "Required for web research",
        "FIRECRAWL_API_KEY": "Required for job scraping"
    }
    
    results = {}
    for key, desc in keys_to_check.items():
        val = os.getenv(key, "").strip()
        if val:
            status = "Configured"
        else:
            status = "Optional" if "Optional" in desc else "Missing"
            
        print(f"{key.ljust(35)} : {status.ljust(12)} - {desc}")
        results[key] = status
        
    return results

async def verify_database():
    print("\n--- 2. Database Connectivity & Validation ---")
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("SKIP: Missing DATABASE_URL")
        return False
        
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        engine = create_async_engine(database_url)
        async with engine.connect() as conn:
            print("[OK] Connected to PostgreSQL")
            
        await engine.dispose()
        return True
    except Exception as e:
        print(f"[ERROR] Database validation failed: {e}")
        return False

async def verify_backend_connectivity():
    print("\n--- 3. Backend Connectivity Validation ---")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))
        from app.main import app
        from httpx import AsyncClient, ASGITransport
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            endpoints = [
                "/dashboard/overview",
                "/applications",
                "/jobs",
                "/resumes",
                "/settings/profile"
            ]
            
            for endpoint in endpoints:
                # We expect a 200 OK because authentication is bypassed for local-first operations.
                response = await client.get(endpoint)
                if response.status_code == 200:
                    print(f"[OK] GET {endpoint} -> 200 OK (Wired Up & Local Auth Bypass Active)")
                else:
                    print(f"[ERROR] GET {endpoint} -> {response.status_code}")
                    
        return True
    except Exception as e:
        print(f"[ERROR] Backend connectivity validation failed: {e}")
        return False

async def main():
    verify_environment()
    await verify_database()
    await verify_backend_connectivity()
    print("\nValidation scripts completed.")

if __name__ == "__main__":
    asyncio.run(main())
