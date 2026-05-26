-- ============================================
-- CLEANUP (Run these to reset database)
-- ============================================
drop table if exists reminders cascade;
drop table if exists applications cascade;
drop table if exists jobs cascade;

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";


-- ============================================
-- TABLE 1: jobs
-- Stores scraped job data. One row per job URL.
-- Shared across applications (no user_id here).
-- ============================================
create table jobs (
  id            uuid primary key default uuid_generate_v4(),
  url           text not null,
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
  id              uuid primary key default uuid_generate_v4(),

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

  analyzed_at     timestamptz,
  created_at      timestamptz default now()
);

-- ============================================
-- TABLE 3: reminders
-- Optional — build last, after June 1
-- ============================================
create table reminders (
  id              uuid primary key default uuid_generate_v4(),
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
-- INDEXES
-- Speed up the most common queries
-- ============================================
create index on applications(user_id);
create index on applications(status);
create index on applications(fit_score desc);
create index on applications(job_id);
create index on reminders(user_id);
create index on reminders(due_at);

-- Deduplicate existing duplicate URLs (keeping only the most recently created one per URL)
DELETE FROM jobs
WHERE id NOT IN (
  SELECT DISTINCT ON (url) id
  FROM jobs
  ORDER BY url, created_at DESC
);

-- Add unique constraint on jobs(url)
alter table jobs add constraint jobs_url_key unique (url);

-- Remove user_api_key column from applications
alter table applications drop column if exists user_api_key;

-- ============================================
-- ROW LEVEL SECURITY
-- Every user only sees their own data
-- ============================================
alter table jobs enable row level security;
alter table applications enable row level security;
alter table reminders enable row level security;

-- jobs: anyone authenticated can read + insert
-- (jobs are shared, not user-specific)
create policy "authenticated users can insert jobs"
  on jobs for insert
  to authenticated
  with check (true);

create policy "authenticated users can read jobs"
  on jobs for select
  to authenticated
  using (true);

-- applications: users only see their own rows
create policy "users can insert own applications"
  on applications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can read own applications"
  on applications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can update own applications"
  on applications for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete own applications"
  on applications for delete
  to authenticated
  using (auth.uid() = user_id);

-- reminders: users only see their own
create policy "users can manage own reminders"
  on reminders for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- PRIVILEGES & SCHEMA CACHE RELOAD
-- Ensures Supabase api roles can access tables
-- ============================================
grant usage on schema public to postgres, service_role, authenticated, anon;
grant all privileges on all tables in schema public to postgres, service_role, authenticated, anon;
grant all privileges on all sequences in schema public to postgres, service_role, authenticated, anon;
grant all privileges on all functions in schema public to postgres, service_role, authenticated, anon;

-- Force PostgREST to reload the schema cache
notify pgrst, 'reload schema';