
CREATE TABLE public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  definition text NOT NULL,
  example text,
  category text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glossary_terms TO authenticated;
GRANT ALL ON public.glossary_terms TO service_role;

ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read glossary" ON public.glossary_terms
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage glossary" ON public.glossary_terms
  FOR ALL TO authenticated USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());

CREATE INDEX idx_glossary_terms_category_order ON public.glossary_terms(category, display_order);
