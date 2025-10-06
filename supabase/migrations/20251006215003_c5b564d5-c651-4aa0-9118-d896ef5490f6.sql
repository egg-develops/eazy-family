-- Create user-uploads storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access for user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from user-uploads" ON storage.objects;

-- Create policy to allow anyone to view public files in user-uploads
CREATE POLICY "Public Access for user-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-uploads');

-- Create policy to allow anyone to upload files to user-uploads
CREATE POLICY "Allow uploads to user-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-uploads');

-- Create policy to allow anyone to update their files in user-uploads
CREATE POLICY "Allow updates to user-uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-uploads');

-- Create policy to allow anyone to delete files from user-uploads
CREATE POLICY "Allow deletes from user-uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-uploads');