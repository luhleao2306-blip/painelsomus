
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"new_minutes":true,"deadline_alerts":true,"mentions":true,"weekly_reports":false}'::jsonb;

-- Storage policies for client-assets bucket: avatars/{auth.uid()}/...
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars: users read own') THEN
    CREATE POLICY "Avatars: users read own" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars: users upload own') THEN
    CREATE POLICY "Avatars: users upload own" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars: users update own') THEN
    CREATE POLICY "Avatars: users update own" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars: users delete own') THEN
    CREATE POLICY "Avatars: users delete own" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
END $$;
