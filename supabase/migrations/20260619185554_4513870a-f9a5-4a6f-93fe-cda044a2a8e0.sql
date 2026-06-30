
CREATE TABLE public.entity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task','project')),
  entity_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entity_attachments_entity ON public.entity_attachments(entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_attachments TO authenticated;
GRANT ALL ON public.entity_attachments TO service_role;

ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attachments"
  ON public.entity_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert attachments"
  ON public.entity_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader or staff can delete attachments"
  ON public.entity_attachments FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_collab_admin());

-- Storage policies for entity-attachments bucket
CREATE POLICY "Authenticated read entity-attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'entity-attachments');
CREATE POLICY "Authenticated upload entity-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entity-attachments');
CREATE POLICY "Authenticated delete own entity-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entity-attachments' AND (owner = auth.uid() OR public.is_collab_admin()));
