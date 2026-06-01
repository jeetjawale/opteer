-- Drop unused user_api_key column from applications
ALTER TABLE public.applications DROP COLUMN IF EXISTS user_api_key;

-- Function to safely delete a job if it has no associated applications (Fixes TOCTOU)
CREATE OR REPLACE FUNCTION delete_job_if_orphaned(target_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the job only if no applications are currently referencing it
    DELETE FROM public.jobs
    WHERE id = target_job_id
    AND NOT EXISTS (
        SELECT 1 FROM public.applications WHERE job_id = target_job_id
    );
END;
$$;
