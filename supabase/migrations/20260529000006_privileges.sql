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
