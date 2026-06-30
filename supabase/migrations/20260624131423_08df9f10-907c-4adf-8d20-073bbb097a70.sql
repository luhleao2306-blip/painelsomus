
CREATE TABLE public.personal_checklist_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_checklist_categories TO authenticated;
GRANT ALL ON public.personal_checklist_categories TO service_role;
ALTER TABLE public.personal_checklist_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own checklist categories" ON public.personal_checklist_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_personal_checklist_categories_updated_at
  BEFORE UPDATE ON public.personal_checklist_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.personal_checklist_items
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.personal_checklist_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3'));
