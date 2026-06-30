
CREATE TABLE IF NOT EXISTS public.info_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  parent_id UUID REFERENCES public.info_folders(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['master','project_manager','consultant']::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_folders TO authenticated;
GRANT ALL ON public.info_folders TO service_role;
ALTER TABLE public.info_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage info_folders"
  ON public.info_folders FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "Internal users read info_folders by role"
  ON public.info_folders FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('master','project_manager','consultant')
    AND (
      public.is_manager()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(allowed_roles)
    )
  );

CREATE INDEX IF NOT EXISTS idx_info_folders_parent ON public.info_folders(parent_id);

CREATE TRIGGER trg_info_folders_updated_at
  BEFORE UPDATE ON public.info_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.info_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.info_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'link_external',
  link_url TEXT,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'ativo',
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['master','project_manager','consultant']::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_items TO authenticated;
GRANT ALL ON public.info_items TO service_role;
ALTER TABLE public.info_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage info_items"
  ON public.info_items FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "Internal users read info_items by role"
  ON public.info_items FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('master','project_manager','consultant')
    AND (
      public.is_manager()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(allowed_roles)
    )
  );

CREATE INDEX IF NOT EXISTS idx_info_items_folder ON public.info_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_info_items_type ON public.info_items(item_type);
CREATE INDEX IF NOT EXISTS idx_info_items_client ON public.info_items(client_id);
CREATE INDEX IF NOT EXISTS idx_info_items_project ON public.info_items(project_id);

CREATE TRIGGER trg_info_items_updated_at
  BEFORE UPDATE ON public.info_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
