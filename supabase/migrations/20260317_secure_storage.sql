-- Migration: Secure Supabase Storage "pds-docs" Bucket

-- 1. Ensure the bucket exists and is public (for getPublicUrl)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pds-docs', 'pds-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Define policies for storage.objects
-- Note: 'storage.objects' natively supports RLS.

-- Drop existing policies to prevent conflicts if re-run
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;

-- Policy 1: Allow public read access (since getPublicUrl is used)
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'pds-docs' );

-- Policy 2: Allow ONLY authenticated users to upload files.
-- Includes a basic check to prevent obviously malicious file extensions from being uploaded directly.
CREATE POLICY "Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'pds-docs' AND
    auth.role() = 'authenticated' AND
    (
        name ILIKE '%.pdf' OR 
        name ILIKE '%.png' OR 
        name ILIKE '%.jpg' OR 
        name ILIKE '%.jpeg' OR 
        name ILIKE '%.doc' OR 
        name ILIKE '%.docx' OR 
        name ILIKE '%.xls' OR 
        name ILIKE '%.xlsx'
    )
);

-- Policy 3: Allow ONLY authenticated users to overwrite/update files
CREATE POLICY "Authenticated Updates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'pds-docs' AND
    auth.role() = 'authenticated'
);

-- Policy 4: Allow ONLY authenticated users to delete files
CREATE POLICY "Authenticated Deletes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'pds-docs' AND
    auth.role() = 'authenticated'
);
