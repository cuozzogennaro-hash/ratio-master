-- Read: any authenticated user can read (admin + operators)
CREATE POLICY "recipe-images read authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recipe-images');

-- Insert: authenticated users can upload only inside a folder named as their user id
CREATE POLICY "recipe-images insert own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: only within their own folder
CREATE POLICY "recipe-images update own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: only within their own folder
CREATE POLICY "recipe-images delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);