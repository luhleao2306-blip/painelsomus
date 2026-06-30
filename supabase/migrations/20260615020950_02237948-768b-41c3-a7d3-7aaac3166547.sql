
-- 1. Clientes só veem projetos liberados (visible_to_client=true) da sua empresa
DROP POLICY IF EXISTS "Clients can view their company projects" ON public.projects;
CREATE POLICY "Clients can view their company projects"
  ON public.projects FOR SELECT
  USING (
    visible_to_client = true
    AND auth.uid() IN (
      SELECT profiles.id FROM public.profiles
      WHERE profiles.client_id = projects.client_id AND profiles.role = 'client'
    )
  );

-- 2. Clientes só veem tarefas liberadas (visible_to_client=true) da sua empresa
DROP POLICY IF EXISTS "Clients can view their company tasks" ON public.tasks;
CREATE POLICY "Clients can view their company tasks"
  ON public.tasks FOR SELECT
  USING (
    visible_to_client = true
    AND auth.uid() IN (
      SELECT profiles.id FROM public.profiles
      WHERE profiles.client_id = tasks.client_id AND profiles.role = 'client'
    )
  );

-- 3. Consultor vê e edita tarefas dos projetos onde é responsável
DROP POLICY IF EXISTS "Consultants can view tasks of their projects" ON public.tasks;
CREATE POLICY "Consultants can view tasks of their projects"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Consultants can manage tasks of their projects" ON public.tasks;
CREATE POLICY "Consultants can manage tasks of their projects"
  ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.consultant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.consultant_id = auth.uid()
    )
  );

-- 4. Consultor vê e gerencia subtarefas das tarefas dos seus projetos
DROP POLICY IF EXISTS "Consultants can manage subtasks of their projects" ON public.subtasks;
CREATE POLICY "Consultants can manage subtasks of their projects"
  ON public.subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = subtasks.task_id AND p.consultant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = subtasks.task_id AND p.consultant_id = auth.uid()
    )
  );

-- 5. Consultor acessa atas dos seus projetos
DROP POLICY IF EXISTS "Consultants can view minutes of their projects" ON public.meeting_minutes;
CREATE POLICY "Consultants can view minutes of their projects"
  ON public.meeting_minutes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = meeting_minutes.project_id AND p.consultant_id = auth.uid()
    )
  );
