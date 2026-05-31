-- Migration onboarding fields
-- Add onboarding fields to user_settings table

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean default false,
  ADD COLUMN IF NOT EXISTS onboarding_step text;
