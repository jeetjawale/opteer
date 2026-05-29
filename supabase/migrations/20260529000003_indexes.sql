-- ============================================
-- INDEXES
-- Speed up the most common queries
-- ============================================
create index on applications(user_id);
create index on applications(status);
create index on applications(analysis_status);
create index on applications(fit_score desc);
create index on applications(job_id);

create index on reminders(user_id);
create index on reminders(application_id);
create index on reminders(due_at);

create index on resumes(user_id);
