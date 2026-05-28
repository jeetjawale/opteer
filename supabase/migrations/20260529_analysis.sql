-- Migration: Add AI analysis tracking to applications

-- 1. Add new columns to applications
alter table applications 
  add column if not exists analysis_status text default 'idle'
  check (analysis_status in ('idle','queued','processing','completed','failed'));

alter table applications 
  add column if not exists analysis_started_at timestamptz;

alter table applications 
  add column if not exists analysis_error text;

alter table applications 
  add column if not exists analyzed_at timestamptz;

-- 2. Create index for analysis_status
create index if not exists applications_analysis_status_idx on applications(analysis_status);

-- 3. Storage policy cleanups for resumes
-- (Ensuring old policies are dropped before recreating if needed, though schema.sql does this.
-- If we just need to drop existing loose policies to apply the new ones, here it is.)
drop policy if exists "users can upload own resumes" on storage.objects;
drop policy if exists "users can read own resumes" on storage.objects;
drop policy if exists "users can delete own resumes" on storage.objects;

-- Recreate storage policies to ensure they are up to date
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

-- Reload schema cache for PostgREST
notify pgrst, 'reload schema';
