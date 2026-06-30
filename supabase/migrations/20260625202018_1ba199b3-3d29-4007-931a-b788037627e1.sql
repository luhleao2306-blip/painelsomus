
CREATE TABLE public.learning_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon TEXT,
  accent TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_tracks TO authenticated;
GRANT ALL ON public.learning_tracks TO service_role;

ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_tracks_select_all_auth" ON public.learning_tracks
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "learning_tracks_modify_admin" ON public.learning_tracks
  FOR ALL TO authenticated USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());

CREATE INDEX learning_tracks_display_order_idx ON public.learning_tracks(display_order);

CREATE TABLE public.learning_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  reading_minutes INT NOT NULL DEFAULT 5,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_lessons TO authenticated;
GRANT ALL ON public.learning_lessons TO service_role;

ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_lessons_select_all_auth" ON public.learning_lessons
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "learning_lessons_modify_admin" ON public.learning_lessons
  FOR ALL TO authenticated USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());

CREATE INDEX learning_lessons_track_order_idx ON public.learning_lessons(track_id, display_order);
