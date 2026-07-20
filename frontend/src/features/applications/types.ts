export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
}

export interface ExperienceEntry {
  role: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface ProjectEntry {
  name: string;
  tech_stack?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface CertificationEntry {
  name: string;
  issuer?: string;
  date?: string;
  notes?: string;
}

export interface ResumeStructured {
  contact: ContactInfo;
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillCategory[];
  certifications: CertificationEntry[];
}

export interface InterviewQuestion {
  question: string;
  suggested_answer: string;
}

export interface InterviewPrepResult {
  questions: InterviewQuestion[];
}

export interface ResumeEdit {
  section: string;
  suggestion: string;
  reasoning: string;
  type: 'add' | 'remove' | 'modify';
}

export interface ResumeEditsResult {
  edits: ResumeEdit[];
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  location?: string;
  work_model?: string;
  
  // AI Analysis Fields
  fit_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  key_requirements?: string[];
  summary?: string;
  cover_letter?: string;
  interview_prep?: InterviewPrepResult;
  resume_edits?: ResumeEditsResult;
  structured_resume?: ResumeStructured;
  
  // Flat-mapped Job Fields
  company?: string;
  company_logo?: string;
  role?: string;
  url?: string;
  company_research?: string;
  scraped_jd?: string;
  
  // Analysis Metadata
  analyzed_at?: string;
  analysis_status?: string;
  analysis_error?: string;
  
  // Quality Gate
  is_quality_gated?: boolean;
  quality_gate_reason?: string | null;
  
  // Job Input
  resume_text?: string;
  resume_file_name?: string;
  resume_file_url?: string;
}

export interface ImportJobRequest {
  url: string;
  resume_text: string;
  resume_file_name?: string;
  scraped_jd?: string;
  logo_url?: string;
  auto_analyze?: boolean;
}

export interface ImportJobResponse {
  application_id: string;
  job_id: string;
  company?: string | null;
  status: string;
  analysis_status: string;
  analysis_error?: string | null;
  auto_analyze: boolean;
}
