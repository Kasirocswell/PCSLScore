-- Practical Competition Shooting League (PCSL) Scoring Database Schema
-- Location: supabase/migrations/20260623000000_init_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Dual Account types: Shooter vs Match Director)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    full_name text,
    role text not null check (role in ('shooter', 'director')) default 'shooter',
    stripe_customer_id text,
    subscription_active boolean not null default false, -- For match directors
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Allow public read access to profiles" 
    on public.profiles for select using (true);

create policy "Allow users to update their own profile" 
    on public.profiles for update using (auth.uid() = id);

-- 2. SHOOTING CLUBS (Created by Match Director)
create table public.clubs (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    location text not null,
    zip_code text,
    description text,
    created_by uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS for Clubs
alter table public.clubs enable row level security;

create policy "Allow public read access to clubs" 
    on public.clubs for select using (true);

create policy "Allow directors to manage their own clubs" 
    on public.clubs for all using (
        auth.uid() = created_by and 
        exists (select 1 from public.profiles where id = auth.uid() and role = 'director')
    );

-- 3. MATCHES (Hosted by clubs, managed by match directors)
create table public.matches (
    id uuid primary key default gen_random_uuid(),
    club_id uuid references public.clubs(id) on delete cascade not null,
    name text not null,
    description text,
    date date not null,
    location text not null,
    match_type text not null, -- '2-Gun', 'Pistol Caliber 2-Gun', 'Rifle', 'Pistol', 'Shotgun', '3-Gun'
    payment_required boolean not null default false,
    price numeric(10, 2) not null default 0.00,
    is_published boolean not null default false,
    created_by uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS for Matches
alter table public.matches enable row level security;

create policy "Allow public read access to published matches" 
    on public.matches for select using (is_published = true or auth.uid() = created_by);

create policy "Allow directors to manage their own matches" 
    on public.matches for all using (
        auth.uid() = created_by and 
        exists (select 1 from public.profiles where id = auth.uid() and role = 'director')
    );

-- 4. SQUADS
create table public.squads (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references public.matches(id) on delete cascade not null,
    name text not null,
    max_capacity integer not null default 10,
    created_at timestamptz not null default now()
);

-- Enable RLS for Squads
alter table public.squads enable row level security;

create policy "Allow public read access to squads" 
    on public.squads for select using (true);

create policy "Allow directors to manage squads" 
    on public.squads for all using (
        exists (
            select 1 from public.matches 
            where id = match_id and created_by = auth.uid()
        )
    );

-- 5. REGISTRATIONS (Competitors signing up for matches)
create table public.registrations (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references public.matches(id) on delete cascade not null,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    division text not null, -- 'Competition', 'Practical', etc.
    squad_id uuid references public.squads(id) on delete set null,
    payment_status text not null check (payment_status in ('pending', 'paid', 'free')) default 'pending',
    payment_intent_id text,
    created_at timestamptz not null default now(),
    unique (match_id, profile_id)
);

-- Enable RLS for Registrations
alter table public.registrations enable row level security;

create policy "Allow public read access to registrations" 
    on public.registrations for select using (true);

create policy "Allow shooters to register and update their registration" 
    on public.registrations for all using (auth.uid() = profile_id);

create policy "Allow directors to manage registrations for their matches" 
    on public.registrations for all using (
        exists (
            select 1 from public.matches 
            where id = match_id and created_by = auth.uid()
        )
    );

-- 6. STAGES (Courses of fire in a match)
create table public.stages (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references public.matches(id) on delete cascade not null,
    name text not null,
    stage_number integer not null,
    description text, -- WSB brief / instructions
    stage_plan_url text, -- Storage URL for stage plan / diagram PDF or image
    required_hits_per_paper_target integer not null default 2,
    required_hits_per_steel_target integer not null default 1,
    max_points integer not null default 0, -- Summarized max points of all targets
    created_at timestamptz not null default now()
);

-- Enable RLS for Stages
alter table public.stages enable row level security;

create policy "Allow public read access to stages" 
    on public.stages for select using (true);

create policy "Allow directors to manage stages" 
    on public.stages for all using (
        exists (
            select 1 from public.matches 
            where id = match_id and created_by = auth.uid()
        )
    );

-- 7. TARGETS (Specific targets in a stage for progress aggregation)
create table public.targets (
    id uuid primary key default gen_random_uuid(),
    stage_id uuid references public.stages(id) on delete cascade not null,
    target_name text not null, -- e.g., 'T1', 'T2', 'S1'
    target_type text not null check (target_type in ('paper', 'steel', 'frangible', 'no-shoot')) default 'paper',
    required_hits integer not null default 2, -- 2 for paper, 1 for steel/frangible
    created_at timestamptz not null default now()
);

-- Enable RLS for Targets
alter table public.targets enable row level security;

create policy "Allow public read access to targets" 
    on public.targets for select using (true);

create policy "Allow directors to manage targets" 
    on public.targets for all using (
        exists (
            select 1 from public.stages s
            join public.matches m on s.match_id = m.id
            where s.id = stage_id and m.created_by = auth.uid()
        )
    );

-- 8. STAGE RUNS (A shooter's performance on a single stage)
create table public.stage_runs (
    id uuid primary key default gen_random_uuid(),
    registration_id uuid references public.registrations(id) on delete cascade not null,
    stage_id uuid references public.stages(id) on delete cascade not null,
    time numeric(10, 4) not null, -- stage run time in seconds
    procedural_penalties integer not null default 0,
    is_dq boolean not null default false,
    is_dnf boolean not null default false,
    scorekeeper_id uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (registration_id, stage_id)
);

-- Enable RLS for Stage Runs
alter table public.stage_runs enable row level security;

create policy "Allow public read access to stage runs" 
    on public.stage_runs for select using (true);

create policy "Allow directors and scorekeepers to manage stage runs" 
    on public.stage_runs for all using (
        exists (
            select 1 from public.stages s
            join public.matches m on s.match_id = m.id
            where s.id = stage_id and (m.created_by = auth.uid() or auth.uid() = scorekeeper_id)
        )
    );

-- 9. TARGET SCORES (Individual bullet/hit breakdowns on each target for a run)
create table public.target_scores (
    id uuid primary key default gen_random_uuid(),
    stage_run_id uuid references public.stage_runs(id) on delete cascade not null,
    target_id uuid references public.targets(id) on delete cascade not null,
    hits_t integer not null default 0, -- T-Zone hits (counts as 2 Alphas = 10 points)
    hits_a integer not null default 0, -- Alpha hits (5 points)
    hits_c integer not null default 0, -- Charlie hits (3 points)
    hits_d integer not null default 0, -- Delta hits (1 point)
    hits_m integer not null default 0, -- Mikes (misses, -10 points)
    hits_ns integer not null default 0, -- No-shoot hits (-10 points per hit)
    created_at timestamptz not null default now(),
    unique (stage_run_id, target_id)
);

-- Enable RLS for Target Scores
alter table public.target_scores enable row level security;

create policy "Allow public read access to target scores" 
    on public.target_scores for select using (true);

create policy "Allow directors to manage target scores" 
    on public.target_scores for all using (
        exists (
            select 1 from public.stage_runs r
            join public.stages s on r.stage_id = s.id
            join public.matches m on s.match_id = m.id
            where r.id = stage_run_id and m.created_by = auth.uid()
        )
    );

-- =========================================================================
-- DATABASE FUNCTIONS & TRIGGERS FOR DYNAMIC SCORING AND CALCULATIONS
-- =========================================================================

-- Target scoring function implementing PCSL Rule 11.3
create or replace function public.calculate_target_score(
    target_type text,
    required_hits integer,
    hits_t integer,
    hits_a integer,
    hits_c integer,
    hits_d integer,
    hits_m integer,
    hits_ns integer
) returns integer as $$
declare
    score integer := 0;
    needed integer := required_hits;
    t_avail integer := coalesce(hits_t, 0);
    a_avail integer := coalesce(hits_a, 0);
    c_avail integer := coalesce(hits_c, 0);
    d_avail integer := coalesce(hits_d, 0);
    ns_penalty integer := coalesce(hits_ns, 0) * -10;
begin
    -- No-shoots do not require hits, they only penalize per hit
    if target_type = 'no-shoot' then
        return ns_penalty;
    end if;

    -- Steel or frangible target scoring (5 points per hit, up to required_hits)
    if target_type = 'steel' or target_type = 'frangible' then
        if a_avail > 0 then
            score := 5 * least(a_avail, required_hits);
            needed := needed - least(a_avail, required_hits);
        end if;
        if needed > 0 then
            score := score - (needed * 10);
        end if;
        return score + ns_penalty;
    end if;

    -- Paper Target Scoring (PCSL Rule 11.3.2)
    -- 1. Use T-Zone hits first. Each T-Zone hit is worth 10 points and counts as 2 hits.
    while needed > 0 and t_avail > 0 loop
        if needed >= 2 then
            score := score + 10;
            needed := needed - 2;
        else
            -- If only 1 hit is needed, a T-hit still counts as 10 points (2 Alphas)
            score := score + 10;
            needed := 0;
        end if;
        t_avail := t_avail - 1;
    end loop;

    -- 2. Use Alpha hits next (5 points, 1 hit)
    while needed > 0 and a_avail > 0 loop
        score := score + 5;
        needed := needed - 1;
        a_avail := a_avail - 1;
    end loop;

    -- 3. Use Charlie hits (3 points, 1 hit)
    while needed > 0 and c_avail > 0 loop
        score := score + 3;
        needed := needed - 1;
        c_avail := c_avail - 1;
    end loop;

    -- 4. Use Delta hits (1 point, 1 hit)
    while needed > 0 and d_avail > 0 loop
        score := score + 1;
        needed := needed - 1;
        d_avail := d_avail - 1;
    end loop;

    -- 5. Remaining unsatisfied hits are counted as Mikes (-10 points per miss)
    if needed > 0 then
        score := score - (needed * 10);
    end if;

    return score + ns_penalty;
end;
$$ language plpgsql immutable;

-- Create dynamic view that computes scores, raw points, penalties, and Hit Factors for every stage run
create or replace view public.view_stage_run_scores as
with target_calculated as (
    select 
        ts.stage_run_id,
        sum(public.calculate_target_score(
            t.target_type,
            t.required_hits,
            ts.hits_t,
            ts.hits_a,
            ts.hits_c,
            ts.hits_d,
            ts.hits_m,
            ts.hits_ns
        )) as raw_points
    from public.target_scores ts
    join public.targets t on ts.target_id = t.id
    group by ts.stage_run_id
)
select 
    r.id as stage_run_id,
    r.registration_id,
    r.stage_id,
    r.time,
    r.procedural_penalties,
    r.is_dq,
    r.is_dnf,
    coalesce(tc.raw_points, 0) as raw_points,
    (r.procedural_penalties * 10) as procedural_points,
    greatest(0, coalesce(tc.raw_points, 0) - (r.procedural_penalties * 10)) as total_stage_points,
    case 
        when r.is_dq = true or r.is_dnf = true then 0.0000
        when r.time <= 0 then 0.0000
        else round(greatest(0, coalesce(tc.raw_points, 0) - (r.procedural_penalties * 10)) / r.time, 4)
    end as hit_factor
from public.stage_runs r
left join target_calculated tc on r.id = tc.stage_run_id;

-- Trigger function to automatically create a profile for new auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'role', 'shooter')
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Configure 'assets' storage bucket and RLS policies using safe text comparison to prevent UUID casting errors

-- 1. Insert 'assets' bucket if it does not exist, setting public to true
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policy to allow public select/read of files in 'assets' bucket
CREATE POLICY "Allow public read access to assets" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'assets');

-- 3. Create policy to allow Match Directors to upload/insert assets for their own matches (safe text comparison)
CREATE POLICY "Allow directors to upload assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id::text = split_part(name, '/', 2)
              AND m.created_by = auth.uid()
        )
    );

-- 4. Create policy to allow Match Directors to update assets for their own matches (safe text comparison)
CREATE POLICY "Allow directors to update assets" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id::text = split_part(name, '/', 2)
              AND m.created_by = auth.uid()
        )
    );

-- 5. Create policy to allow Match Directors to delete assets for their own matches (safe text comparison)
CREATE POLICY "Allow directors to delete assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id::text = split_part(name, '/', 2)
              AND m.created_by = auth.uid()
        )
    );
