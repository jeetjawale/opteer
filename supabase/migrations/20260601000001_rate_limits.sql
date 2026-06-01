CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    points INT NOT NULL DEFAULT 1,
    expire_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access on rate_limits" ON public.rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RPC for atomic rate limiting
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    rate_key TEXT,
    limit_count INT,
    window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_points INT;
    now_ts TIMESTAMPTZ := now();
BEGIN
    INSERT INTO public.rate_limits (key, points, expire_at)
    VALUES (rate_key, 1, now_ts + (window_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (key) DO UPDATE
    SET 
        points = CASE WHEN public.rate_limits.expire_at < now_ts THEN 1 ELSE public.rate_limits.points + 1 END,
        expire_at = CASE WHEN public.rate_limits.expire_at < now_ts THEN now_ts + (window_seconds || ' seconds')::INTERVAL ELSE public.rate_limits.expire_at END
    RETURNING points INTO current_points;

    IF current_points > limit_count THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;
