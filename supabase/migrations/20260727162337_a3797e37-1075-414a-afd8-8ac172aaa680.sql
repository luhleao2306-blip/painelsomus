
-- 1) bolao_bets: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Authenticated can view bets" ON public.bolao_bets;
CREATE POLICY "Users view own bets or admins view all"
  ON public.bolao_bets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_collab_admin());

-- 2) entity_attachments: restrict SELECT to uploader + admins
DROP POLICY IF EXISTS "Users view attachments they uploaded or as staff" ON public.entity_attachments;
CREATE POLICY "Uploader or admins view attachments"
  ON public.entity_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_collab_admin());

-- 3) storage.objects: entity-attachments SELECT — must own attachment record or be admin
DROP POLICY IF EXISTS "Authenticated read entity-attachments" ON storage.objects;
CREATE POLICY "Read entity-attachments owned or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'entity-attachments'
    AND (
      public.is_collab_admin()
      OR EXISTS (
        SELECT 1 FROM public.entity_attachments ea
        WHERE ea.file_path = storage.objects.name
          AND ea.uploaded_by = auth.uid()
      )
    )
  );

-- 4) storage.objects: entity-attachments INSERT — path must be scoped to user id
DROP POLICY IF EXISTS "Authenticated upload entity-attachments" ON storage.objects;
CREATE POLICY "Upload entity-attachments under own prefix"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'entity-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
