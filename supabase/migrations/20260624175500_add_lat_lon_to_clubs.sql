-- Add latitude and longitude columns to public.clubs table
ALTER TABLE public.clubs 
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;
