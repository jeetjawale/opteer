-- Explicitly deny all client access to jobs table, enforcing service-role only access
-- This documents intent and prevents confusion around missing RLS policies
CREATE POLICY "service only" ON public.jobs FOR ALL USING (false);
