-- ============================================
-- TABLE 1: jobs
-- Stores scraped job data. One row per job URL.
-- Shared across applications (no user_id here).
-- ============================================
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,
  company       text,
  role          text,
  scraped_jd    text,
  company_research text,
  created_at    timestamptz default now()
);

-- ============================================
-- TABLE 2: applications
-- One row per user per job.
-- Holds resume, status, and all AI output.
-- ============================================
create table applications (
  id              uuid primary key default gen_random_uuid(),

  -- ownership
  user_id         uuid references auth.users(id) on delete cascade not null,
  job_id          uuid references jobs(id) on delete cascade not null,

  -- resume (per-application, uploaded at import)
  resume_text     text,
  resume_file_url text,
  resume_file_name text,

  -- kanban/pipeline state
  status          text default 'saved'
                  check (status in ('saved','applied','interview','offer','closed','rejected')),
  applied_at      date,

  -- ai analysis results (populated by /analyze)
  fit_score       integer check (fit_score >= 0 and fit_score <= 100),
  matched_skills  jsonb,
  missing_skills  jsonb,
  key_requirements jsonb,
  summary         text,
  cover_letter    text,
  interview_prep  jsonb,
  notes           text,

  -- durable AI analysis state
  analysis_status text default 'idle'
                  check (analysis_status in ('idle','queued','processing','completed','failed')),
  analysis_started_at timestamptz,
  analysis_error  text,
  
  -- user_api_key: reserved for future cross-device key persistence.
  user_api_key    text,

  analyzed_at     timestamptz,
  created_at      timestamptz default now(),
  
  UNIQUE(user_id, job_id)
);

-- ============================================
-- TABLE 3: reminders
-- ============================================
create table reminders (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references applications(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  type            text check (type in ('follow-up', 'interview', 'deadline')),
  due_at          timestamptz not null,
  note            text,
  is_sent         boolean default false,
  is_completed    boolean default false,
  created_at      timestamptz default now()
);

-- ============================================
-- TABLE 4: resumes
-- ============================================
create table resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  content         text not null,
  file_url        text,
  file_name       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================
-- TABLE 5: user_settings
-- ============================================
create table user_settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  model_default   text,
  model_fit       text,
  model_letter    text,
  model_prep      text,
  updated_at      timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table jobs enable row level security;
comment on table jobs is 'Backend-managed shared job cache. RLS intentionally enabled with no policies. Accessible only through service_role.';
alter table applications enable row level security;
alter table reminders enable row level security;
alter table resumes enable row level security;
alter table user_settings enable row level security;

-- applications
create policy "users can insert own applications"
  on applications for insert to authenticated with check (auth.uid() = user_id);

create policy "users can read own applications"
  on applications for select to authenticated using (auth.uid() = user_id);

create policy "users can update own applications"
  on applications for update to authenticated using (auth.uid() = user_id);

create policy "users can delete own applications"
  on applications for delete to authenticated using (auth.uid() = user_id);

-- reminders
create policy "users can manage own reminders"
  on reminders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- resumes
create policy "users can manage own resumes"
  on resumes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_settings
create policy "users can manage own settings"
  on user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
