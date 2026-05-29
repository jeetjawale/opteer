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

drop policy if exists "users can upload own resumes" on storage.objects;
drop policy if exists "users can read own resumes" on storage.objects;
drop policy if exists "users can delete own resumes" on storage.objects;

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
