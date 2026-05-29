from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import List, Optional, Any
from enum import Enum

# ============================================
# ENUMS
# ============================================

class ApplicationStatus(str, Enum):
    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    CLOSED = "closed"
    REJECTED = "rejected"

class AnalysisStatus(str, Enum):
    IDLE = "idle"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ReminderType(str, Enum):
    FOLLOW_UP = "follow-up"
    INTERVIEW = "interview"
    DEADLINE = "deadline"

# ============================================
# AI OUTPUT PARSING SCHEMAS
# ============================================

class FitScoreResult(BaseModel):
    fit_score: Optional[int] = Field(None, ge=0, le=100, description="Fit score from 0 to 100")
    matched_skills: List[str] = Field(..., description="List of user skills matching the job description")
    missing_skills: List[str] = Field(..., description="List of critical skills/requirements missing from user profile")
    key_requirements: List[str] = Field(..., description="List of primary job requirements identified")
    summary: str = Field(..., description="Brief 2-3 sentence overview highlighting user suitability and fit reasons")

class InterviewQuestion(BaseModel):
    question: str = Field(..., description="Potential interview question based on the role and resume gaps")
    suggested_answer: str = Field(..., description="Tailored guide/points on how the user should answer this question")

class InterviewPrepResult(BaseModel):
    questions: List[InterviewQuestion] = Field(..., description="List of custom-generated interview prep questions")

class ResumeEdit(BaseModel):
    section: str = Field(..., description="The section of the resume (e.g., 'Summary', 'Experience', 'Skills')")
    suggestion: str = Field(..., description="The specific, actionable edit to make")
    reasoning: str = Field(..., description="Why this edit will improve the match against the job description")
    type: str = Field(..., description="The type of edit: 'add', 'remove', or 'modify'")

class ResumeEditsResult(BaseModel):
    edits: List[ResumeEdit] = Field(..., description="List of tailored resume edits")

# ============================================
# JOB SCHEMAS
# ============================================

class JobBase(BaseModel):
    url: str = Field(..., description="Job posting URL")
    company: Optional[str] = Field(None, description="Company name")
    role: Optional[str] = Field(None, description="Job title/role name")
    scraped_jd: Optional[str] = Field(None, description="Scraped raw job description text")
    company_research: Optional[str] = Field(None, description="AI research notes on the company")

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ImportJobRequest(BaseModel):
    url: str = Field(..., description="The URL of the job posting to import")
    resume_text: str = Field(..., description="The candidate's resume text to associate with this application")
    scraped_jd: Optional[str] = Field(None, description="Optional manually pasted job description text to bypass scraping")


class JobImportResponse(BaseModel):
    application_id: UUID = Field(..., description="ID of the newly created application")
    job_id: UUID = Field(..., description="ID of the newly created job posting")
    company: Optional[str] = Field(None, description="The company name extracted from the job posting")
    status: str = Field(..., description="Status of the application (e.g. 'saved')")
    analysis_status: AnalysisStatus = Field(AnalysisStatus.IDLE, description="Durable AI analysis state")
    analysis_error: Optional[str] = Field(None, description="Last analysis error, when analysis failed")

# ============================================
# APPLICATION SCHEMAS
# ============================================

class ApplicationBase(BaseModel):
    status: ApplicationStatus = ApplicationStatus.SAVED
    applied_at: Optional[date] = None

class ApplicationCreate(BaseModel):
    job_id: UUID
    resume_text: Optional[str] = None
    resume_file_url: Optional[str] = None
    resume_file_name: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    applied_at: Optional[date] = None
    resume_text: Optional[str] = None
    resume_file_url: Optional[str] = None
    resume_file_name: Optional[str] = None
    
    # Allow updating AI fields during analysis workflow
    fit_score: Optional[int] = Field(None, ge=0, le=100)
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    key_requirements: Optional[List[str]] = None
    summary: Optional[str] = None
    cover_letter: Optional[str] = None
    interview_prep: Optional[InterviewPrepResult] = None
    resume_edits: Optional[ResumeEditsResult] = None
    notes: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    user_id: UUID
    job_id: UUID
    resume_text: Optional[str] = None
    resume_file_url: Optional[str] = None
    resume_file_name: Optional[str] = None
    
    # AI analysis fields
    fit_score: Optional[int] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    key_requirements: Optional[List[str]] = None
    summary: Optional[str] = None
    cover_letter: Optional[str] = None
    interview_prep: Optional[Any] = None  # Stored as jsonb in DB (matches InterviewPrepResult structure)
    resume_edits: Optional[Any] = None    # Stored as jsonb in DB (matches ResumeEditsResult structure)
    notes: Optional[str] = None
    
    # Flat-mapped job fields from join
    company: Optional[str] = None
    role: Optional[str] = None
    url: Optional[str] = None
    company_research: Optional[str] = None
    scraped_jd: Optional[str] = None
    
    analyzed_at: Optional[datetime] = None
    analysis_status: AnalysisStatus = AnalysisStatus.IDLE
    analysis_started_at: Optional[datetime] = None
    analysis_error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================
# REMINDER SCHEMAS
# ============================================

class ReminderBase(BaseModel):
    application_id: UUID
    type: ReminderType
    due_at: datetime
    note: Optional[str] = None

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    type: Optional[ReminderType] = None
    due_at: Optional[datetime] = None
    note: Optional[str] = None
    is_sent: Optional[bool] = None
    is_completed: Optional[bool] = None

class ReminderResponse(ReminderBase):
    id: UUID
    user_id: UUID
    is_sent: bool
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================
# ANALYSIS OPERATION SCHEMAS
# ============================================

class JobAnalysisRequest(BaseModel):
    url: str = Field(..., description="The URL of the job description to parse")
    resume_text: Optional[str] = Field(None, description="The plain text of the user's resume")
    resume_file_url: Optional[str] = Field(None, description="Optional pre-uploaded resume file URL")
    resume_file_name: Optional[str] = Field(None, description="Optional resume file name")

class JobAnalysisResponse(BaseModel):
    job: JobResponse
    application: ApplicationResponse
    fit_score_result: FitScoreResult
    cover_letter: str
    interview_prep_result: InterviewPrepResult
    resume_edits_result: ResumeEditsResult

# ============================================
# RESUME SCHEMAS
# ============================================

class ResumeBase(BaseModel):
    name: str = Field(..., min_length=1, description="User-visible label for the resume")
    content: str = Field(..., min_length=50, description="Full parsed resume text content")

class ResumeCreate(ResumeBase):
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class ResumeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    content: Optional[str] = Field(None, min_length=50)
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class ResumeListResponse(BaseModel):
    id: UUID
    name: str
    preview: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeResponse(ResumeBase):
    id: UUID
    user_id: UUID
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================
# SETTINGS SCHEMAS
# ============================================

class UserSettingsUpdate(BaseModel):
    model_default: Optional[str] = None
    model_fit: Optional[str] = None
    model_letter: Optional[str] = None
    model_prep: Optional[str] = None

class UserSettingsResponse(UserSettingsUpdate):
    id: UUID
    user_id: UUID
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
