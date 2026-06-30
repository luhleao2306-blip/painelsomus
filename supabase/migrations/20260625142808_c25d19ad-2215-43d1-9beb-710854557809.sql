
-- 1. Client agents (curated AI agents available per client)
CREATE TABLE public.client_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT DEFAULT 'Bot',
  external_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_agents TO authenticated;
GRANT ALL ON public.client_agents TO service_role;
ALTER TABLE public.client_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_agents_select" ON public.client_agents FOR SELECT TO authenticated
  USING (public.is_internal_user() OR client_id = public.get_my_client_id());
CREATE POLICY "client_agents_admin_write" ON public.client_agents FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE TRIGGER set_client_agents_updated BEFORE UPDATE ON public.client_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Learning tracks
CREATE TABLE public.client_learning_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_learning_tracks TO authenticated;
GRANT ALL ON public.client_learning_tracks TO service_role;
ALTER TABLE public.client_learning_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks_select" ON public.client_learning_tracks FOR SELECT TO authenticated
  USING (public.is_internal_user() OR (client_id = public.get_my_client_id() AND is_published));
CREATE POLICY "tracks_admin_write" ON public.client_learning_tracks FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE TRIGGER set_tracks_updated BEFORE UPDATE ON public.client_learning_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Learning items
CREATE TABLE public.client_learning_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.client_learning_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL,
  duration_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_learning_items TO authenticated;
GRANT ALL ON public.client_learning_items TO service_role;
ALTER TABLE public.client_learning_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON public.client_learning_items FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR EXISTS (SELECT 1 FROM public.client_learning_tracks t
               WHERE t.id = client_learning_items.track_id
                 AND t.client_id = public.get_my_client_id()
                 AND t.is_published)
  );
CREATE POLICY "items_admin_write" ON public.client_learning_items FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE TRIGGER set_items_updated BEFORE UPDATE ON public.client_learning_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Glossary
CREATE TABLE public.client_glossary_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  examples TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_glossary_terms TO authenticated;
GRANT ALL ON public.client_glossary_terms TO service_role;
ALTER TABLE public.client_glossary_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "glossary_select" ON public.client_glossary_terms FOR SELECT TO authenticated
  USING (public.is_internal_user() OR client_id = public.get_my_client_id());
CREATE POLICY "glossary_admin_write" ON public.client_glossary_terms FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE TRIGGER set_glossary_updated BEFORE UPDATE ON public.client_glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Strategic goals
CREATE TABLE public.client_strategic_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT,
  target_value NUMERIC,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'on_track',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_strategic_goals TO authenticated;
GRANT ALL ON public.client_strategic_goals TO service_role;
ALTER TABLE public.client_strategic_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_select" ON public.client_strategic_goals FOR SELECT TO authenticated
  USING (public.is_internal_user() OR client_id = public.get_my_client_id());
CREATE POLICY "goals_admin_write" ON public.client_strategic_goals FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE TRIGGER set_goals_updated BEFORE UPDATE ON public.client_strategic_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
