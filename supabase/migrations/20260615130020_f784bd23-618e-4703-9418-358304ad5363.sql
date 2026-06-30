
-- 1. Projetos: client_id opcional + campos novos
ALTER TABLE public.projects ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 2. Tarefas: client_id opcional
ALTER TABLE public.tasks ALTER COLUMN client_id DROP NOT NULL;

-- 3. project_stages: cor para visual do kanban
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS color TEXT;

-- 4. Tabela de templates de funil reutilizáveis
CREATE TABLE IF NOT EXISTS public.stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_templates TO authenticated;
GRANT ALL ON public.stage_templates TO service_role;

ALTER TABLE public.stage_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stage templates readable by authenticated"
  ON public.stage_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Stage templates managed by managers"
  ON public.stage_templates FOR ALL
  TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE TRIGGER update_stage_templates_updated_at
  BEFORE UPDATE ON public.stage_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Sementes de templates iniciais
INSERT INTO public.stage_templates (name, description, is_default, stages) VALUES
('Padrão Consultoria', 'Funil clássico para projetos de cliente', true,
 '[
   {"name":"Backlog","color":"#94a3b8"},
   {"name":"A fazer","color":"#3b82f6"},
   {"name":"Em andamento","color":"#f59e0b"},
   {"name":"Em revisão","color":"#a855f7"},
   {"name":"Concluído","color":"#10b981"}
 ]'::jsonb),
('Interno Somus', 'Funil para iniciativas internas do time', false,
 '[
   {"name":"Ideias","color":"#94a3b8"},
   {"name":"Planejado","color":"#3b82f6"},
   {"name":"Em execução","color":"#f59e0b"},
   {"name":"Concluído","color":"#10b981"}
 ]'::jsonb)
ON CONFLICT DO NOTHING;

-- 6. Ajustar policies para lidar com client_id NULL (projetos internos)
DROP POLICY IF EXISTS "Clients can view their company projects" ON public.projects;
CREATE POLICY "Clients can view their company projects" ON public.projects
  FOR SELECT
  USING (
    client_id IS NOT NULL
    AND visible_to_client = true
    AND auth.uid() IN (
      SELECT profiles.id FROM profiles
      WHERE profiles.client_id = projects.client_id AND profiles.role = 'client'
    )
  );

DROP POLICY IF EXISTS "Projects isolation" ON public.projects;
CREATE POLICY "Projects isolation" ON public.projects
  FOR SELECT
  USING (
    public.is_manager()
    OR consultant_id = auth.uid()
    OR (client_id IS NOT NULL AND client_id = public.get_my_client_id() AND visible_to_client = true)
  );

DROP POLICY IF EXISTS "Clients can view their company tasks" ON public.tasks;
CREATE POLICY "Clients can view their company tasks" ON public.tasks
  FOR SELECT
  USING (
    client_id IS NOT NULL
    AND visible_to_client = true
    AND auth.uid() IN (
      SELECT profiles.id FROM profiles
      WHERE profiles.client_id = tasks.client_id AND profiles.role = 'client'
    )
  );

DROP POLICY IF EXISTS "Tasks isolation" ON public.tasks;
CREATE POLICY "Tasks isolation" ON public.tasks
  FOR SELECT
  USING (
    public.is_manager()
    OR assignee = (auth.uid())::text
    OR (client_id IS NOT NULL AND client_id = public.get_my_client_id() AND visible_to_client = true)
  );

-- 7. Índice para filtros por tag
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_projects_is_internal ON public.projects(is_internal);
