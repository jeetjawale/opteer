-- ============================================
-- CLEANUP (Run these to reset database)
-- ============================================
drop table if exists reminders cascade;
drop table if exists applications cascade;
drop table if exists jobs cascade;
drop table if exists resumes cascade;
drop table if exists user_settings cascade;

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
  
  -- user_api_key: reserved for future cross-device key persistence.
  -- Not written by current backend. Populated by future /settings/sync endpoint.
  user_api_key    text,

  analyzed_at     timestamptz,
  created_at      timestamptz default now(),
  
  UNIQUE(user_id, job_id)
);

-- ============================================
-- TABLE 3: reminders
-- Stores task and interview reminders for applications.
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
-- TABLE 4: resumes
-- Stores saved resumes for candidate reuse.
-- ============================================
create table resumes (
  id              uuid primary key default uuid_generate_v4(),
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
-- Stores user preferences for AI models.
-- ============================================
create table user_settings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  model_default   text,
  model_fit       text,
  model_letter    text,
  model_prep      text,
  updated_at      timestamptz default now()
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
create index on reminders(application_id);
create index on reminders(due_at);
create index on resumes(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- Every user only sees their own data
-- ============================================
alter table jobs enable row level security;
alter table applications enable row level security;
alter table reminders enable row level security;
alter table resumes enable row level security;
alter table user_settings enable row level security;

-- jobs are managed only by the backend service role.
-- Do not grant authenticated browser clients direct access because job rows can
-- include imported URLs, scraped descriptions, and company research from other users.

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

-- user deletion also deletes applications (handled by database cascade)
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

-- resumes: users only see their own
create policy "users can manage own resumes"
  on resumes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_settings: users only manage their own
create policy "users can manage own settings"
  on user_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET: resumes
-- Stores uploaded resume files
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes', 
  false,
  5242880,
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/x-tex']
)
on conflict (id) do nothing;

create policy "users can upload own resumes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can read own resumes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete own resumes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

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
