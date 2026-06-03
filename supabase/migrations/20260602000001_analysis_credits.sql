-- Add daily quota columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN daily_analysis_credits INTEGER DEFAULT 50,
ADD COLUMN max_daily_credits INTEGER DEFAULT 50,
ADD COLUMN last_credit_reset TIMESTAMPTZ DEFAULT now();

-- Atomic function to check and consume a credit
CREATE OR REPLACE FUNCTION consume_analysis_credit(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    max_credits INTEGER;
    last_reset TIMESTAMPTZ;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT daily_analysis_credits, max_daily_credits, last_credit_reset
    INTO current_credits, max_credits, last_reset
    FROM public.user_settings
    WHERE user_id = target_user_id
    FOR UPDATE;

    -- If no settings row exists yet, create one with defaults
    IF NOT FOUND THEN
        INSERT INTO public.user_settings (user_id)
        VALUES (target_user_id)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT daily_analysis_credits, max_daily_credits, last_credit_reset
        INTO current_credits, max_credits, last_reset
        FROM public.user_settings
        WHERE user_id = target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Check if we need a 24-hour reset
    IF last_reset < (now() - interval '24 hours') THEN
        current_credits := max_credits;
        last_reset := now();
    END IF;

    -- Check if they have credits left
    IF current_credits > 0 THEN
        -- Consume one credit and update
        UPDATE public.user_settings
        SET daily_analysis_credits = current_credits - 1,
            last_credit_reset = last_reset
        WHERE user_id = target_user_id;
        RETURN TRUE;
    ELSE
        -- No credits left, just update the reset time if we did a reset
        UPDATE public.user_settings
        SET daily_analysis_credits = current_credits,
            last_credit_reset = last_reset
        WHERE user_id = target_user_id;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
