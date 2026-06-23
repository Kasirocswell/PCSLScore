-- Configure 'assets' storage bucket and RLS policies with safe UUID casting

-- 1. Insert 'assets' bucket if it does not exist, setting public to true
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to prevent conflicts during migration
DROP POLICY IF EXISTS "Allow public read access to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow directors to upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow directors to update assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow directors to delete assets" ON storage.objects;

-- 3. Create policy to allow public select/read of files in 'assets' bucket
CREATE POLICY "Allow public read access to assets" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'assets');

-- 4. Create policy to allow Match Directors to upload/insert assets for their own matches (with safe UUID casting)
CREATE POLICY "Allow directors to upload assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        CASE 
            WHEN split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = (split_part(name, '/', 2))::uuid
                  AND m.created_by = auth.uid()
            )
            ELSE FALSE
        END
    );

-- 5. Create policy to allow Match Directors to update assets for their own matches (with safe UUID casting)
CREATE POLICY "Allow directors to update assets" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        CASE 
            WHEN split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = (split_part(name, '/', 2))::uuid
                  AND m.created_by = auth.uid()
            )
            ELSE FALSE
        END
    );

-- 6. Create policy to allow Match Directors to delete assets for their own matches (with safe UUID casting)
CREATE POLICY "Allow directors to delete assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'assets' AND
        split_part(name, '/', 1) = 'matches' AND
        CASE 
            WHEN split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = (split_part(name, '/', 2))::uuid
                  AND m.created_by = auth.uid()
            )
            ELSE FALSE
        END
    );
