-- Seed script for PCSL Scoring, Registration, and Management platform
-- File: /Users/gregory.reeves/.gemini/antigravity/brain/91a583de-e496-440b-85d5-4bee56473931/scratch/seed.sql

-- Clear existing test data first to ensure clean state
truncate table public.target_scores cascade;
truncate table public.stage_runs cascade;
truncate table public.targets cascade;
truncate table public.stages cascade;
truncate table public.registrations cascade;
truncate table public.squads cascade;
truncate table public.matches cascade;
truncate table public.clubs cascade;
delete from public.profiles;
delete from auth.users where email in ('director@pcsl.com', 'shooter@pcsl.com');

-- 1. Create Auth Users with stable UUIDs and standard encrypted passwords
-- Password bcrypt hash is for 'password123'
insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
) values (
    'd1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'director@pcsl.com',
    '$2a$10$7Zub89m/CbeS7e0XfIidI.N4Y/R8VbHqjQ9L7yHqfH6y0.5s93F9W',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Dave Director", "role": "director"}'::jsonb,
    false,
    now(),
    now(),
    false,
    false
), (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'shooter@pcsl.com',
    '$2a$10$7Zub89m/CbeS7e0XfIidI.N4Y/R8VbHqjQ9L7yHqfH6y0.5s93F9W',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Sammy Shooter", "role": "shooter"}'::jsonb,
    false,
    now(),
    now(),
    false,
    false
);

-- Note: The trigger handle_new_user should have inserted into public.profiles automatically.
-- Let's update profiles just in case, making Dave Director subscribed and roles matching perfectly.
update public.profiles 
set role = 'director', subscription_active = true, full_name = 'Dave Director'
where id = 'd1111111-1111-1111-1111-111111111111';

update public.profiles 
set role = 'shooter', subscription_active = false, full_name = 'Sammy Shooter'
where id = '22222222-2222-2222-2222-222222222222';

-- 2. Create Shooting Club
insert into public.clubs (id, name, location, description, created_by)
values (
    'c3333333-3333-3333-3333-333333333333',
    'Utah Practical Shooting Club',
    'Salt Lake City, UT',
    'Premier mountain range hosting standard PCSL matches, 2-gun challenges, and multi-gun championships.',
    'd1111111-1111-1111-1111-111111111111'
);

-- 3. Create Matches
-- Match 1: PCSL Spring Championship (Pistol Caliber 2-Gun)
insert into public.matches (id, club_id, name, description, date, location, match_type, payment_required, price, is_published, created_by)
values (
    '34444444-4444-4444-4444-444444444444',
    'c3333333-3333-3333-3333-333333333333',
    'PCSL Spring Championship 2026',
    'Get ready for the first major league challenge of the year! Bring your rifle/pistol and test your limits across 2 complex stages.',
    '2026-04-10',
    'Salt Lake City, UT',
    '2-Gun',
    true,
    45.00,
    true,
    'd1111111-1111-1111-1111-111111111111'
);

-- Match 2: PCSL Summer Blast (Pistol)
insert into public.matches (id, club_id, name, description, date, location, match_type, payment_required, price, is_published, created_by)
values (
    '35555555-5555-5555-5555-555555555555',
    'c3333333-3333-3333-3333-333333333333',
    'PCSL Summer Blast 2026',
    'Fast-paced pistol-only tier-1 event. 1 steel speed stage designed to push your draw and target transitions.',
    '2026-06-15',
    'Salt Lake City, UT',
    'Pistol',
    false,
    0.00,
    true,
    'd1111111-1111-1111-1111-111111111111'
);

-- 4. Create Squads
insert into public.squads (id, match_id, name, max_capacity)
values (
    '41111111-1111-1111-1111-111111111111',
    '34444444-4444-4444-4444-444444444444',
    'Squad 1 - Morning Crew',
    10
), (
    '42222222-2222-2222-2222-222222222222',
    '35555555-5555-5555-5555-555555555555',
    'Squad A - Speed Demons',
    15
);

-- 5. Create Registrations for Sammy Shooter
insert into public.registrations (id, match_id, profile_id, division, squad_id, payment_status, payment_intent_id)
values (
    '51111111-1111-1111-1111-111111111111',
    '34444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Practical',
    '41111111-1111-1111-1111-111111111111',
    'paid',
    'pi_test_spring_payment_ok'
), (
    '52222222-2222-2222-2222-222222222222',
    '35555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'Competition',
    '42222222-2222-2222-2222-222222222222',
    'free',
    null
);

-- 6. Create Stages
-- Match 1, Stage 1: Speed Trap (Paper-only stage)
insert into public.stages (id, match_id, name, stage_number, description, required_hits_per_paper_target, required_hits_per_steel_target, max_points)
values (
    '61111111-1111-1111-1111-111111111111',
    '34444444-4444-4444-4444-444444444444',
    'Speed Trap',
    1,
    'Shooter starts in Box A, loaded carbine held at low ready. On signal, engage paper targets T1-T4 with 2 hits each from within the shooting box. Beware of No-Shoot NS1.',
    2,
    1,
    40 -- 4 paper targets * 10 max points per target (T-Zone)
);

-- Match 1, Stage 2: The Maze (Mixed Paper and Steel)
insert into public.stages (id, match_id, name, stage_number, description, required_hits_per_paper_target, required_hits_per_steel_target, max_points)
values (
    '62222222-2222-2222-2222-222222222222',
    '34444444-4444-4444-4444-444444444444',
    'The Maze',
    2,
    'Shooter starts facing down range, hands flat on wall. On signal engage paper T1-T5 and steel S1-S2 as they become visible. Move through the maze corridor safely.',
    2,
    1,
    60 -- 5 paper * 10 max points + 2 steel * 5 points = 60 max points
);

-- Match 2, Stage 1: Steel Rain (Steel only)
insert into public.stages (id, match_id, name, stage_number, description, required_hits_per_paper_target, required_hits_per_steel_target, max_points)
values (
    '63333333-3333-3333-3333-333333333333',
    '35555555-5555-5555-5555-555555555555',
    'Steel Rain',
    1,
    'Engage steel plates S1-S5 in any order. Hits must fall to score.',
    2,
    1,
    25 -- 5 steel * 5 points
);

-- 7. Create Targets for the Stages
-- Match 1, Stage 1 Targets
insert into public.targets (id, stage_id, target_name, target_type, required_hits)
values 
('71111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', 'T1', 'paper', 2),
('71111111-2222-2222-2222-222222222222', '61111111-1111-1111-1111-111111111111', 'T2', 'paper', 2),
('71111111-3333-3333-3333-333333333333', '61111111-1111-1111-1111-111111111111', 'T3', 'paper', 2),
('71111111-4444-4444-4444-444444444444', '61111111-1111-1111-1111-111111111111', 'T4', 'paper', 2),
('71111111-5555-5555-5555-555555555555', '61111111-1111-1111-1111-111111111111', 'NS1', 'no-shoot', 0);

-- Match 1, Stage 2 Targets
insert into public.targets (id, stage_id, target_name, target_type, required_hits)
values 
('72222222-1111-1111-1111-111111111111', '62222222-2222-2222-2222-222222222222', 'T1', 'paper', 2),
('72222222-2222-2222-2222-222222222222', '62222222-2222-2222-2222-222222222222', 'T2', 'paper', 2),
('72222222-3333-3333-3333-333333333333', '62222222-2222-2222-2222-222222222222', 'T3', 'paper', 2),
('72222222-4444-4444-4444-444444444444', '62222222-2222-2222-2222-222222222222', 'T4', 'paper', 2),
('72222222-5555-5555-5555-555555555555', '62222222-2222-2222-2222-222222222222', 'T5', 'paper', 2),
('72222222-6666-6666-6666-666666666666', '62222222-2222-2222-2222-222222222222', 'S1', 'steel', 1),
('72222222-7777-7777-7777-777733333333', '62222222-2222-2222-2222-222222222222', 'S2', 'steel', 1);

-- Match 2, Stage 1 Targets
insert into public.targets (id, stage_id, target_name, target_type, required_hits)
values 
('73333333-1111-1111-1111-111111111111', '63333333-3333-3333-3333-333333333333', 'S1', 'steel', 1),
('73333333-2222-2222-2222-222222222222', '63333333-3333-3333-3333-333333333333', 'S2', 'steel', 1),
('73333333-3333-3333-3333-333333333333', '63333333-3333-3333-3333-333333333333', 'S3', 'steel', 1),
('73333333-4444-4444-4444-444444444444', '63333333-3333-3333-3333-333333333333', 'S4', 'steel', 1),
('73333333-5555-5555-5555-555555555555', '63333333-3333-3333-3333-333333333333', 'S5', 'steel', 1);

-- 8. Create Stage Runs for Sammy Shooter
-- Match 1, Stage 1 Run: Speedy Clean Run!
insert into public.stage_runs (id, registration_id, stage_id, time, procedural_penalties, is_dq, is_dnf, scorekeeper_id)
values (
    '81111111-1111-1111-1111-111111111111',
    '51111111-1111-1111-1111-111111111111',
    '61111111-1111-1111-1111-111111111111',
    12.5400,
    0,
    false,
    false,
    'd1111111-1111-1111-1111-111111111111'
);

-- Match 1, Stage 2 Run: A bit slower, with a penalty
insert into public.stage_runs (id, registration_id, stage_id, time, procedural_penalties, is_dq, is_dnf, scorekeeper_id)
values (
    '82222222-2222-2222-2222-222222222222',
    '51111111-1111-1111-1111-111111111111',
    '62222222-2222-2222-2222-222222222222',
    24.1200,
    1, -- 1 procedural penalty = -10 points
    false,
    false,
    'd1111111-1111-1111-1111-111111111111'
);

-- Match 2, Stage 1 Run: Incredibly fast steel run
insert into public.stage_runs (id, registration_id, stage_id, time, procedural_penalties, is_dq, is_dnf, scorekeeper_id)
values (
    '83333333-3333-3333-3333-333333333333',
    '52222222-2222-2222-2222-222222222222',
    '63333333-3333-3333-3333-333333333333',
    8.9200,
    0,
    false,
    false,
    'd1111111-1111-1111-1111-111111111111'
);

-- 9. Create Target Scores for Sammy Shooter
-- Match 1, Stage 1 Target Scores:
-- T1: 2 T-Zones (perfect hits! - 20 pts)
-- T2: 1 Alpha, 1 Charlie (8 pts)
-- T3: 2 Alphas (10 pts)
-- T4: 2 T-Zones (20 pts)
-- NS1: 0 hits (no penalty)
insert into public.target_scores (stage_run_id, target_id, hits_t, hits_a, hits_c, hits_d, hits_m, hits_ns)
values 
('81111111-1111-1111-1111-111111111111', '71111111-1111-1111-1111-111111111111', 2, 0, 0, 0, 0, 0),
('81111111-1111-1111-1111-111111111111', '71111111-2222-2222-2222-222222222222', 0, 1, 1, 0, 0, 0),
('81111111-1111-1111-1111-111111111111', '71111111-3333-3333-3333-333333333333', 0, 2, 0, 0, 0, 0),
('81111111-1111-1111-1111-111111111111', '71111111-4444-4444-4444-444444444444', 2, 0, 0, 0, 0, 0),
('81111111-1111-1111-1111-111111111111', '71111111-5555-5555-5555-555555555555', 0, 0, 0, 0, 0, 0);

-- Match 1, Stage 2 Target Scores:
-- T1: 1 T-Zone, 1 Charlie (13 pts)
-- T2: 2 Alphas (10 pts)
-- T3: 1 Charlie, 1 Delta (4 pts)
-- T4: 1 Alpha, 1 Mike (miss! - 5 - 10 = -5 pts)
-- T5: 2 Deltas (2 pts)
-- S1: 1 Alpha (5 pts)
-- S2: 1 Alpha (5 pts)
insert into public.target_scores (stage_run_id, target_id, hits_t, hits_a, hits_c, hits_d, hits_m, hits_ns)
values 
('82222222-2222-2222-2222-222222222222', '72222222-1111-1111-1111-111111111111', 1, 0, 1, 0, 0, 0),
('82222222-2222-2222-2222-222222222222', '72222222-2222-2222-2222-222222222222', 0, 2, 0, 0, 0, 0),
('82222222-2222-2222-2222-222222222222', '72222222-3333-3333-3333-333333333333', 0, 0, 1, 1, 0, 0),
('82222222-2222-2222-2222-222222222222', '72222222-4444-4444-4444-444444444444', 0, 1, 0, 0, 1, 0),
('82222222-2222-2222-2222-222222222222', '72222222-5555-5555-5555-555555555555', 0, 0, 0, 2, 0, 0),
('82222222-2222-2222-2222-222222222222', '72222222-6666-6666-6666-666666666666', 0, 1, 0, 0, 0, 0),
('82222222-2222-2222-2222-222222222222', '72222222-7777-7777-7777-777733333333', 0, 1, 0, 0, 0, 0);

-- Match 2, Stage 1 Target Scores:
-- S1: 1 hit (5 pts)
-- S2: 1 hit (5 pts)
-- S3: 1 hit (5 pts)
-- S4: 1 hit (5 pts)
-- S5: 1 hit (5 pts)
insert into public.target_scores (stage_run_id, target_id, hits_t, hits_a, hits_c, hits_d, hits_m, hits_ns)
values 
('83333333-3333-3333-3333-333333333333', '73333333-1111-1111-1111-111111111111', 0, 1, 0, 0, 0, 0),
('83333333-3333-3333-3333-333333333333', '73333333-2222-2222-2222-222222222222', 0, 1, 0, 0, 0, 0),
('83333333-3333-3333-3333-333333333333', '73333333-3333-3333-3333-333333333333', 0, 1, 0, 0, 0, 0),
('83333333-3333-3333-3333-333333333333', '73333333-4444-4444-4444-444444444444', 0, 1, 0, 0, 0, 0),
('83333333-3333-3333-3333-333333333333', '73333333-5555-5555-5555-555555555555', 0, 1, 0, 0, 0, 0);
