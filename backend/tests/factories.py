import uuid
from datetime import datetime, timezone
from app.schemas import JobResponse, ApplicationResponse, ResumeResponse, UserSettingsResponse, ApplicationStatus, AnalysisStatus

def generate_uuid() -> str:
    return str(uuid.uuid4())

class UserFactory:
    @staticmethod
    def build(user_id=None, email="test@example.com", full_name="Test User"):
        return {
            "id": user_id or generate_uuid(),
            "email": email,
            "full_name": full_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

class JobFactory:
    @staticmethod
    def build(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "url": kwargs.get("url", "https://example.com/job"),
            "company": kwargs.get("company", "Test Company"),
            "role": kwargs.get("role", "Software Engineer"),
            "scraped_jd": kwargs.get("scraped_jd", "We are looking for a great engineer."),
            "company_research": kwargs.get("company_research", "Test company makes testing tools."),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc))
        }
        return JobResponse(**data)
    
    @staticmethod
    def build_dict(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "url": kwargs.get("url", "https://example.com/job"),
            "company": kwargs.get("company", "Test Company"),
            "role": kwargs.get("role", "Software Engineer"),
            "scraped_jd": kwargs.get("scraped_jd", "We are looking for a great engineer."),
            "company_research": kwargs.get("company_research", "Test company makes testing tools."),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc).isoformat())
        }
        return data

class ApplicationFactory:
    @staticmethod
    def build(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "user_id": kwargs.get("user_id", generate_uuid()),
            "job_id": kwargs.get("job_id", generate_uuid()),
            "status": kwargs.get("status", ApplicationStatus.SAVED),
            "analysis_status": kwargs.get("analysis_status", AnalysisStatus.IDLE),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc))
        }
        data.update({k: v for k, v in kwargs.items() if k not in data})
        return ApplicationResponse(**data)
    
    @staticmethod
    def build_dict(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "user_id": kwargs.get("user_id", generate_uuid()),
            "job_id": kwargs.get("job_id", generate_uuid()),
            "status": kwargs.get("status", ApplicationStatus.SAVED.value),
            "analysis_status": kwargs.get("analysis_status", AnalysisStatus.IDLE.value),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc).isoformat())
        }
        data.update({k: v for k, v in kwargs.items() if k not in data})
        return data

class ResumeFactory:
    @staticmethod
    def build(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "user_id": kwargs.get("user_id", generate_uuid()),
            "name": kwargs.get("name", "Test Resume"),
            "content": kwargs.get("content", "I am a software engineer with 10 years of experience."),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc)),
            "updated_at": kwargs.get("updated_at", datetime.now(timezone.utc))
        }
        data.update({k: v for k, v in kwargs.items() if k not in data})
        return ResumeResponse(**data)
    
    @staticmethod
    def build_dict(**kwargs):
        data = {
            "id": kwargs.get("id", generate_uuid()),
            "user_id": kwargs.get("user_id", generate_uuid()),
            "name": kwargs.get("name", "Test Resume"),
            "content": kwargs.get("content", "I am a software engineer with 10 years of experience."),
            "created_at": kwargs.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": kwargs.get("updated_at", datetime.now(timezone.utc).isoformat())
        }
        data.update({k: v for k, v in kwargs.items() if k not in data})
        return data
