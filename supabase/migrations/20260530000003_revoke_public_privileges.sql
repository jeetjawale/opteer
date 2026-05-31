-- ====================================================================
-- MIGRATION: Remediate C3 (Overpermissive Grants)
-- Revokes dangerous broad grants given to anon and authenticated roles
-- ====================================================================

-- 1. Revoke excessive privileges on the entire public schema
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 2. Provide the absolute minimum privileges required
-- Because our frontend exclusively uses Supabase for Auth and Storage,
-- and all public schema database queries are routed through the FastAPI backend
-- (which uses the service_role key), anon and authenticated roles require 
-- strictly ZERO privileges on public tables.

-- We leave basic schema USAGE intact as a baseline for Supabase infrastructure.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Force PostgREST to reload the schema cache so changes take immediate effect
notify pgrst, 'reload schema';
