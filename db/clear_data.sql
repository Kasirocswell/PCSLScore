-- Practical Competition Shooting League (PCSL) Scoring Database Cleanup Script
-- Location: db/clear_data.sql
-- 
-- WARNING: This script will delete all dynamic/user-generated data from the database, including:
-- - Clubs
-- - Matches
-- - Squads
-- - Registrations
-- - Stages
-- - Targets
-- - Stage Runs (Scores)
-- - Target Scores (Breakdowns)
--
-- This script PRESERVES:
-- - auth.users (User accounts)
-- - public.profiles (Shooter and Match Director profiles)
-- - storage.buckets (Storage buckets definition)

BEGIN;

-- Disable triggers temporarily to ensure fast and error-free truncation
SET CONSTRAINTS ALL DEFERRED;

-- Truncate all user-generated and dynamic data tables
-- CASCADE ensures any dependent foreign keys are resolved
-- RESTART IDENTITY resets any auto-incrementing primary key sequences
TRUNCATE TABLE 
  public.target_scores,
  public.stage_runs,
  public.targets,
  public.stages,
  public.registrations,
  public.squads,
  public.matches,
  public.clubs
RESTART IDENTITY CASCADE;

-- Note: Direct deletion from storage.objects is blocked by Supabase's internal triggers
-- (storage.protect_delete) to prevent orphaned files.
-- To clean up storage files, use the Supabase Dashboard Storage UI or the Storage API.
-- DELETE FROM storage.objects WHERE bucket_id = 'assets';

COMMIT;
