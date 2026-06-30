CREATE TABLE public.task_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_types TO authenticated;
GRANT ALL ON public.task_types TO service_role;

ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task types" ON public.task_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert task types" ON public.task_types
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update task types" ON public.task_types
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete task types" ON public.task_types
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_task_types_updated_at
  BEFORE UPDATE ON public.task_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.task_types (name, sort_order) VALUES
  ('Cliente', 1),
  ('Time', 2),
  ('Aprovação', 3),
  ('Administrativo', 4),
  ('Estratégico', 5)
ON CONFLICT (name) DO NOTHING;