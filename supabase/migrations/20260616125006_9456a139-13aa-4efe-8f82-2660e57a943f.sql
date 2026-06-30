CREATE POLICY "Authenticated can read knowledge trail images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-assets'
  AND (storage.foldername(name))[1] = 'knowledge-trail'
);