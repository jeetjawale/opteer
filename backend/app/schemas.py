from pydantic import BaseModel, Field, ConfigDict, validator, field_validator
from uuid import UUID
from datetime import datetime, date
from typing import List, Optional, Any, Dict
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
    summary: str = Field(..., description="An explicit Markdown summary explaining the fit assessment.")

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

class JobUpdate(BaseModel):
    url: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    work_model: Optional[str] = None
    scraped_jd: Optional[str] = None
    company_research: Optional[str] = None

class ImportJobRequest(BaseModel):
    url: str = Field(..., description="The URL of the job posting to import")
    resume_text: Optional[str] = Field(None, description="The candidate's resume text to associate with this application")
    scraped_jd: Optional[str] = Field(None, description="Optional manually pasted job description text to bypass scraping")
    auto_analyze: bool = Field(False, description="When true, enqueue AI analysis immediately after import")


class JobImportResponse(BaseModel):
    application_id: UUID = Field(..., description="ID of the newly created application")
    job_id: UUID = Field(..., description="ID of the newly created job posting")
    company: Optional[str] = Field(None, description="The company name extracted from the job posting")
    status: str = Field(..., description="Status of the application (e.g. 'saved')")
    analysis_status: AnalysisStatus = Field(AnalysisStatus.IDLE, description="Durable AI analysis state")
    analysis_error: Optional[str] = Field(None, description="Last analysis error, when analysis failed")
    auto_analyze: bool = Field(False, description="Whether auto-analysis was requested for this import")

# ============================================
# APPLICATION HISTORY SCHEMAS
# ============================================

class ApplicationHistoryBase(BaseModel):
    application_id: UUID
    previous_status: Optional[str] = None
    new_status: str

class ApplicationHistoryResponse(ApplicationHistoryBase):
    id: UUID
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)

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
    is_quality_gated: Optional[bool] = None
    quality_gate_reason: Optional[str] = None

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
    location: Optional[str] = None
    work_model: Optional[str] = None
    company_research: Optional[str] = None
    scraped_jd: Optional[str] = None
    
    analyzed_at: Optional[datetime] = None
    analysis_status: AnalysisStatus = AnalysisStatus.IDLE
    analysis_started_at: Optional[datetime] = None
    analysis_error: Optional[str] = None
    is_quality_gated: Optional[bool] = False
    quality_gate_reason: Optional[str] = None
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

class ResumePaginatedResponse(BaseModel):
    items: List[ResumeListResponse]
    total: int
    page: int
    per_page: int

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

class LLMProviderConfig(BaseModel):
    model: Optional[str] = None
    api_key_encrypted: Optional[str] = None
    base_url: Optional[str] = None

class UserConfigUpdate(BaseModel):
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[str] = None
    active_llm_provider: Optional[str] = None
    llm_keys: Optional[Dict[str, LLMProviderConfig]] = None
    task_models: Optional[Dict[str, str]] = None
    integration_keys: Optional[Dict[str, str]] = None
    auto_analyze_on_import: Optional[bool] = None
    generate_interview_prep: Optional[bool] = None
    auto_draft_cover_letters: Optional[bool] = None

class UserConfigResponse(BaseModel):
    id: Optional[UUID] = None
    user_id: UUID
    onboarding_completed: Optional[bool] = False
    onboarding_step: Optional[str] = None
    daily_analysis_credits: int = 50
    max_daily_credits: int = 50
    last_credit_reset: Optional[datetime] = None
    active_llm_provider: Optional[str] = None
    # We shouldn't send raw encrypted keys to the frontend, just a boolean indicator if they exist
    llm_providers_configured: Dict[str, bool] = Field(default_factory=dict, description="Map of provider -> true if key is configured")
    active_models: Dict[str, str] = Field(default_factory=dict, description="Map of provider -> active model ID")
    base_urls: Dict[str, str] = Field(default_factory=dict, description="Map of provider -> custom base URL")
    task_models: Dict[str, str] = Field(default_factory=dict, description="Map of task -> model ID")
    integration_providers_configured: Dict[str, bool] = Field(default_factory=dict, description="Map of integration -> true if key is configured")
    auto_analyze_on_import: Optional[bool] = True
    generate_interview_prep: Optional[bool] = True
    auto_draft_cover_letters: Optional[bool] = False
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LLMValidateRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None

class LLMValidateResponse(BaseModel):
    valid: bool
    models: List[dict] = Field(default_factory=list)
    error: Optional[str] = None

class IntegrationValidateRequest(BaseModel):
    provider: str
    api_key: str

class IntegrationValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None

# ============================================
# STATS SCHEMAS
# ============================================

class FunnelItem(BaseModel):
    name: str
    value: int

class FitScoreBucket(BaseModel):
    label: str
    count: int

class TimelineItem(BaseModel):
    date: str  # Format: "YYYY-MM-DD"
    count: int

class TopCompanyItem(BaseModel):
    name: str
    value: int

class ApplicationStatsResponse(BaseModel):
    total_active: int
    response_rate: int
    interview_conversion: int
    funnel_data: List[FunnelItem]
    fit_score_data: List[FitScoreBucket]
    timeline_data: List[TimelineItem]
    top_companies_data: List[TopCompanyItem]

# ============================================
# DASHBOARD SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    total_applications: int
    active_interviews: int
    avg_fit_score: int
    offers_received: int

class RecentActivityItem(BaseModel):
    id: UUID
    type: str = Field(..., description="'application_update', 'reminder_due', etc.")
    title: str
    subtitle: Optional[str] = None
    timestamp: datetime
    metadata: Optional[dict] = None

class DashboardOverviewResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivityItem]
    top_recommendations: List[ApplicationResponse]
    upcoming_events: List[ReminderResponse]

