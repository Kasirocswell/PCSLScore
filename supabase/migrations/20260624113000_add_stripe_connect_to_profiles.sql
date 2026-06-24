-- Add stripe_connect_id column to profiles table to support Stripe Connect onboarding for Match Directors
alter table public.profiles 
add column stripe_connect_id text;
