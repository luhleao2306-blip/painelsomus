CREATE TABLE public.knowledge_trail_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('cultura','time','produtos','informacoes')),
  title text NOT NULL,
  content text,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_trail_items TO authenticated;
GRANT ALL ON public.knowledge_trail_items TO service_role;

ALTER TABLE public.knowledge_trail_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read trail" ON public.knowledge_trail_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "managers insert trail" ON public.knowledge_trail_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager() OR public.get_my_role() = 'consultant');

CREATE POLICY "managers update trail" ON public.knowledge_trail_items
  FOR UPDATE TO authenticated
  USING (public.is_manager() OR public.get_my_role() = 'consultant')
  WITH CHECK (public.is_manager() OR public.get_my_role() = 'consultant');

CREATE POLICY "managers delete trail" ON public.knowledge_trail_items
  FOR DELETE TO authenticated
  USING (public.is_manager() OR public.get_my_role() = 'consultant');

CREATE TRIGGER set_knowledge_trail_updated_at
  BEFORE UPDATE ON public.knowledge_trail_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();