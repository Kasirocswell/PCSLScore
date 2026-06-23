-- Add zip_code column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS zip_code text;
