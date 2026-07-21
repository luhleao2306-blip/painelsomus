
-- ============ Operações: migração completa para o Lovable Cloud ============
-- Tabelas com IDs em TEXT para permitir importação direta dos dados existentes
-- em localStorage (que usam ids curtos gerados no navegador).

CREATE TABLE IF NOT EXISTS public.op_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_folders TO authenticated;
GRANT ALL ON public.op_folders TO service_role;
ALTER TABLE public.op_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_folders internal read"  ON public.op_folders FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_folders internal write" ON public.op_folders FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_projects (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES public.op_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nao_iniciado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_projects TO authenticated;
GRANT ALL ON public.op_projects TO service_role;
ALTER TABLE public.op_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_projects internal read"  ON public.op_projects FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_projects internal write" ON public.op_projects FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.op_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_sections TO authenticated;
GRANT ALL ON public.op_sections TO service_role;
ALTER TABLE public.op_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_sections internal read"  ON public.op_sections FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_sections internal write" ON public.op_sections FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_tasks (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES public.op_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assignee_id TEXT,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'nao_iniciado',
  priority TEXT NOT NULL DEFAULT 'media',
  recurrence TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_tasks TO authenticated;
GRANT ALL ON public.op_tasks TO service_role;
ALTER TABLE public.op_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_tasks internal read"  ON public.op_tasks FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_tasks internal write" ON public.op_tasks FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());
CREATE INDEX IF NOT EXISTS op_tasks_section_idx ON public.op_tasks(section_id);

CREATE TABLE IF NOT EXISTS public.op_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_templates TO authenticated;
GRANT ALL ON public.op_templates TO service_role;
ALTER TABLE public.op_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_templates internal read"  ON public.op_templates FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_templates internal write" ON public.op_templates FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_forms TO authenticated;
GRANT ALL ON public.op_forms TO service_role;
ALTER TABLE public.op_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_forms internal read"  ON public.op_forms FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_forms internal write" ON public.op_forms FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_form_answers (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES public.op_forms(id) ON DELETE CASCADE,
  project_id TEXT,
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_form_answers TO authenticated;
GRANT ALL ON public.op_form_answers TO service_role;
ALTER TABLE public.op_form_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_form_answers internal read"  ON public.op_form_answers FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_form_answers internal write" ON public.op_form_answers FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE TABLE IF NOT EXISTS public.op_senhas (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  service TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_senhas TO authenticated;
GRANT ALL ON public.op_senhas TO service_role;
ALTER TABLE public.op_senhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_senhas internal read"  ON public.op_senhas FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "op_senhas internal write" ON public.op_senhas FOR ALL   TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

-- Realtime: publica alterações para os assinantes autenticados
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_form_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_senhas;
