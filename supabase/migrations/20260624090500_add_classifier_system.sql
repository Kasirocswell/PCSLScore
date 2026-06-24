-- Add classifier fields to public.stages table
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS is_classifier boolean not null default false;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS classifier_number text;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS classifier_hhfs jsonb;

-- Create dynamic view that computes competitor classifications based on their average of the last 8 classifier runs
CREATE OR REPLACE VIEW public.view_competitor_classifications AS
WITH classifier_runs AS (
    SELECT 
        reg.profile_id,
        reg.division,
        r.stage_run_id,
        r.hit_factor,
        m.date AS match_date,
        s.created_at AS stage_created_at,
        CASE 
            WHEN (s.classifier_hhfs->>reg.division) IS NOT NULL AND (s.classifier_hhfs->>reg.division)::numeric > 0 THEN
                LEAST(100.0, ROUND((r.hit_factor / (s.classifier_hhfs->>reg.division)::numeric) * 100.0, 4))
            ELSE 0.0000
        END AS run_percentage
    FROM public.view_stage_run_scores r
    JOIN public.registrations reg ON r.registration_id = reg.id
    JOIN public.stages s ON r.stage_id = s.id
    JOIN public.matches m ON s.match_id = m.id
    WHERE s.is_classifier = true 
      AND m.is_published = true 
      AND r.is_dq = false 
      AND r.is_dnf = false 
      AND r.time > 0 
      AND r.hit_factor > 0
),
ranked_runs AS (
    SELECT 
        profile_id,
        division,
        run_percentage,
        ROW_NUMBER() OVER (
            PARTITION BY profile_id, division 
            ORDER BY match_date DESC, stage_created_at DESC
        ) AS rn
    FROM classifier_runs
),
last_8_runs AS (
    SELECT 
        profile_id,
        division,
        run_percentage
    FROM ranked_runs
    WHERE rn <= 8
),
calculated_averages AS (
    SELECT 
        profile_id,
        division,
        ROUND(AVG(run_percentage), 4) AS average_percentage,
        COUNT(*) AS runs_count
    FROM last_8_runs
    GROUP BY profile_id, division
),
profiles_with_divisions AS (
    SELECT p.id AS profile_id, d.division
    FROM public.profiles p
    CROSS JOIN (
        SELECT UNNEST(ARRAY['Competition', 'Practical', 'PCC', 'Limited', 'Production']) AS division
    ) d
)
SELECT 
    pd.profile_id,
    pd.division,
    COALESCE(ca.average_percentage, 0.0000) AS average_percentage,
    COALESCE(ca.runs_count, 0) AS runs_count,
    CASE 
        WHEN COALESCE(ca.average_percentage, 0) >= 95.0 THEN 'GM'
        WHEN COALESCE(ca.average_percentage, 0) >= 85.0 THEN 'M'
        WHEN COALESCE(ca.average_percentage, 0) >= 75.0 THEN 'A'
        WHEN COALESCE(ca.average_percentage, 0) >= 60.0 THEN 'B'
        WHEN COALESCE(ca.average_percentage, 0) >= 40.0 THEN 'C'
        WHEN COALESCE(ca.average_percentage, 0) >= 2.0 THEN 'D'
        ELSE 'U'
    END AS classification
FROM profiles_with_divisions pd
LEFT JOIN calculated_averages ca ON pd.profile_id = ca.profile_id AND pd.division = ca.division;
