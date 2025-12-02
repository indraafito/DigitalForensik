-- Create evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to evidence bucket
CREATE POLICY "Users can upload evidence files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);

-- Allow users to read files from evidence bucket
CREATE POLICY "Users can view evidence files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update their own files
CREATE POLICY "Users can update evidence files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete evidence files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);
