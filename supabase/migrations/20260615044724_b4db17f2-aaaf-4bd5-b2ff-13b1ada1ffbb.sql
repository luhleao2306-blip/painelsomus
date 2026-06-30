
CREATE TABLE public.personal_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_checklist_items TO authenticated;
GRANT ALL ON public.personal_checklist_items TO service_role;

ALTER TABLE public.personal_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own checklist"
  ON public.personal_checklist_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_personal_checklist_user ON public.personal_checklist_items(user_id, completed, position);

CREATE TRIGGER set_personal_checklist_updated_at
  BEFORE UPDATE ON public.personal_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
