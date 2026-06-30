
CREATE POLICY "Clients can read own meeting minute files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.meeting_minutes m
    LEFT JOIN public.projects p ON p.id = m.project_id
    WHERE m.file_path = storage.objects.name
      AND (m.client_id = public.get_my_client_id() OR p.client_id = public.get_my_client_id())
      AND COALESCE(m.download_enabled, true) = true
  )
);

CREATE POLICY "Clients can read own deliverable files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.deliverables d
    LEFT JOIN public.projects p ON p.id = d.project_id
    WHERE d.file_path = storage.objects.name
      AND (d.client_id = public.get_my_client_id() OR p.client_id = public.get_my_client_id())
      AND COALESCE(d.download_enabled, true) = true
  )
);

CREATE POLICY "Clients can read own document files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    LEFT JOIN public.projects p ON p.id = d.project_id
    WHERE d.file_path = storage.objects.name
      AND (d.client_id = public.get_my_client_id() OR p.client_id = public.get_my_client_id())
      AND COALESCE(d.download_enabled, true) = true
  )
);
