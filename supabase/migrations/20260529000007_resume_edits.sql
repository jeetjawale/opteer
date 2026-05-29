-- ============================================
-- Add resume_edits column to applications
-- ============================================
alter table applications add column if not exists resume_edits jsonb;
