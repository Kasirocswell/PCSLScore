-- Add payment_method column to matches table to support 'online' (Stripe) vs 'cash' (cash in person)
alter table public.matches 
add column payment_method text not null default 'online' 
check (payment_method in ('online', 'cash'));
