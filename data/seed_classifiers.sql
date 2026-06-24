-- Seeding Script: Populate 10 matches with 8 classifier stages each
-- For user: kasirocswell@rocketmail.com in the Practical division.
-- File: /Users/gregory.reeves/projects/pcslscore/data/seed_classifiers.sql

DO $$
DECLARE
    v_club_id uuid;
    v_director_id uuid;
    v_shooter_id uuid;
    v_match_id uuid;
    v_squad_id uuid;
    v_registration_id uuid;
    v_stage_id uuid;
    v_target_id uuid;
    v_stage_run_id uuid;
    v_match_date date;
    v_match_index integer;
    v_stage_index integer;
    v_pct numeric;
    v_time numeric;
    v_match_name text;
    v_stage_name text;
BEGIN
    -- 1. Find or fallback the shooter profile for kasirocswell@rocketmail.com
    SELECT id INTO v_shooter_id FROM public.profiles WHERE email = 'kasirocswell@rocketmail.com';
    IF v_shooter_id IS NULL THEN
        RAISE EXCEPTION 'User kasirocswell@rocketmail.com not found in profiles.';
    END IF;

    -- 2. Find or fallback a director profile
    SELECT id INTO v_director_id FROM public.profiles WHERE role = 'director' AND subscription_active = true LIMIT 1;
    IF v_director_id IS NULL THEN
        SELECT id INTO v_director_id FROM public.profiles WHERE role = 'director' LIMIT 1;
    END IF;
    IF v_director_id IS NULL THEN
        SELECT id INTO v_director_id FROM public.profiles LIMIT 1;
    END IF;
    IF v_director_id IS NULL THEN
        RAISE EXCEPTION 'No profiles found in the database.';
    END IF;

    -- 3. Find or fallback a club
    SELECT id INTO v_club_id FROM public.clubs WHERE created_by = v_director_id LIMIT 1;
    IF v_club_id IS NULL THEN
        SELECT id INTO v_club_id FROM public.clubs LIMIT 1;
    END IF;
    IF v_club_id IS NULL THEN
        -- Create a temporary club
        INSERT INTO public.clubs (id, name, location, created_by)
        VALUES ('c1111111-1111-1111-1111-111111111111', 'Gulf Coast Championships', 'Alvin, TX', v_director_id)
        RETURNING id INTO v_club_id;
    END IF;

    RAISE NOTICE 'Using Shooter ID: %, Director ID: %, Club ID: %', v_shooter_id, v_director_id, v_club_id;

    -- 4. Clean up any previous test matches we created to avoid duplicates
    DELETE FROM public.matches WHERE name LIKE 'PCSL 1 Gun - Test Match %';

    -- 5. Loop to create 10 matches
    FOR v_match_index IN 1..10 LOOP
        v_match_name := 'PCSL 1 Gun - Test Match ' || v_match_index;
        -- Match date going back week by week
        -- Match 10 is today, Match 9 is 7 days ago, etc.
        v_match_date := CURRENT_DATE - ((10 - v_match_index) * 7);

        -- Insert Match
        INSERT INTO public.matches (
            name,
            club_id,
            description,
            date,
            location,
            match_type,
            payment_required,
            price,
            is_published,
            created_by
        ) VALUES (
            v_match_name,
            v_club_id,
            'Automated classifier test match ' || v_match_index || ' for kasirocswell@rocketmail.com',
            v_match_date,
            'Alvin, TX',
            'Pistol',
            false,
            0.00,
            true,
            v_director_id
        ) RETURNING id INTO v_match_id;

        -- Create a Squad for this match
        INSERT INTO public.squads (
            match_id,
            name,
            max_capacity
        ) VALUES (
            v_match_id,
            'Squad 1',
            15
        ) RETURNING id INTO v_squad_id;

        -- Register the shooter in the Practical division for this match
        INSERT INTO public.registrations (
            match_id,
            profile_id,
            division,
            squad_id,
            payment_status
        ) VALUES (
            v_match_id,
            v_shooter_id,
            'Practical',
            v_squad_id,
            'free'
        ) RETURNING id INTO v_registration_id;

        -- Create 8 classifier stages for this match
        FOR v_stage_index IN 1..8 LOOP
            v_stage_name := 'Classifier Stage ' || v_stage_index;
            
            -- Insert Stage
            INSERT INTO public.stages (
                match_id,
                name,
                stage_number,
                description,
                required_hits_per_paper_target,
                required_hits_per_steel_target,
                max_points,
                is_classifier,
                classifier_number,
                classifier_hhfs
            ) VALUES (
                v_match_id,
                v_stage_name,
                v_stage_index,
                'Classifier WSB for ' || v_stage_name,
                2,
                1,
                10, -- 1 paper target with 2 required hits = 10 max points
                true,
                'CLS-' || LPAD(((v_match_index - 1) * 8 + v_stage_index)::text, 2, '0'),
                '{"Competition": 12.0, "Practical": 10.0, "PCC": 14.0, "Limited": 11.0, "Production": 9.0}'::jsonb
            ) RETURNING id INTO v_stage_id;

            -- Create 1 Paper Target for this stage
            INSERT INTO public.targets (
                stage_id,
                target_name,
                target_type,
                required_hits
            ) VALUES (
                v_stage_id,
                'T1',
                'paper',
                2
            ) RETURNING id INTO v_target_id;

            -- Calculate run percentages based on the match and stage index
            -- Match 10 runs will average exactly 90.00% (M Class)
            -- Match 9 runs will average exactly 80.00% (A Class)
            -- Match 8 runs will average exactly 70.00% (B Class)
            -- ... down to Match 1 which averages 25.00% (D/U Class)
            -- This makes sure that the rolling 8-run window (which grabs Match 10's 8 runs)
            -- will compute exactly a 90.00% rolling classification average!
            IF v_match_index = 10 THEN v_pct := 90.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 9 THEN v_pct := 80.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 8 THEN v_pct := 70.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 7 THEN v_pct := 60.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 6 THEN v_pct := 50.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 5 THEN v_pct := 45.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 4 THEN v_pct := 40.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 3 THEN v_pct := 35.0 + (v_stage_index - 4.5) * 2.0;
            ELSIF v_match_index = 2 THEN v_pct := 30.0 + (v_stage_index - 4.5) * 2.0;
            ELSE v_pct := 25.0 + (v_stage_index - 4.5) * 2.0;
            END IF;

            -- Safety clamp to ensure percentages are strictly positive and valid
            IF v_pct < 5.0 THEN
                v_pct := 5.0;
            END IF;

            -- Calculate precise run time to achieve exactly this percentage on a 10.0 max point stage
            -- Practical division HHF is set to 10.0.
            -- hit_factor = (v_pct * HHF) / 100.0 = v_pct / 10.0
            -- time = 10.0 / hit_factor = 100.0 / v_pct
            v_time := ROUND(100.0 / v_pct, 4);

            -- Insert Stage Run
            INSERT INTO public.stage_runs (
                registration_id,
                stage_id,
                time,
                procedural_penalties,
                is_dq,
                is_dnf,
                scorekeeper_id
            ) VALUES (
                v_registration_id,
                v_stage_id,
                v_time,
                0,
                false,
                false,
                v_director_id
            ) RETURNING id INTO v_stage_run_id;

            -- Insert Target Score (2 Alphas)
            INSERT INTO public.target_scores (
                stage_run_id,
                target_id,
                hits_t,
                hits_a,
                hits_c,
                hits_d,
                hits_m,
                hits_ns
            ) VALUES (
                v_stage_run_id,
                v_target_id,
                0,
                2, -- 2 Alphas = 10 points
                0,
                0,
                0,
                0
            );

        END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully seeded 10 matches with 8 classifier stages each for kasirocswell@rocketmail.com!';
END;
$$;
