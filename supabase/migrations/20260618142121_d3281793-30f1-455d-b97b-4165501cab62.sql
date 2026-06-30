
CREATE TABLE public.task_assignees (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assignee text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, assignee)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignees follow tasks" ON public.task_assignees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id));

CREATE TABLE public.task_projects (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_projects TO authenticated;
GRANT ALL ON public.task_projects TO service_role;
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_projects follow tasks" ON public.task_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_projects.task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_projects.task_id));

CREATE INDEX task_assignees_task_idx ON public.task_assignees(task_id);
CREATE INDEX task_projects_task_idx ON public.task_projects(task_id);
CREATE INDEX task_projects_project_idx ON public.task_projects(project_id);
