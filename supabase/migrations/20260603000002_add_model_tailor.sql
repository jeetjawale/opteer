-- Add model_tailor to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS model_tailor text;
