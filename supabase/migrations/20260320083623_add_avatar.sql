-- Migration: Add avatar_url to employees and create avatars bucket

-- 1. Add avatar_url to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Define policies for avatars bucket
-- Drop existing policies to prevent conflicts if re-run
DROP POLICY IF EXISTS "Avatar Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Deletes" ON storage.objects;

-- Policy 1: Allow public read access
CREATE POLICY "Avatar Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- Policy 2: Allow ONLY authenticated users to upload their own avatar.
CREATE POLICY "Avatar Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (
        name ILIKE '%.png' OR 
        name ILIKE '%.jpg' OR 
        name ILIKE '%.jpeg' OR
        name ILIKE '%.webp'
    )
);

-- Policy 3: Allow ONLY authenticated users to overwrite/update their avatar
CREATE POLICY "Avatar Authenticated Updates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
);

-- Policy 4: Allow ONLY authenticated users to delete their avatar
CREATE POLICY "Avatar Authenticated Deletes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
);
