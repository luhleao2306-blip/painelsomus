-- Drop dependent policies first
DROP POLICY IF EXISTS "Tasks isolation" ON public.tasks;
DROP POLICY IF EXISTS "Subtasks viewable by task access" ON public.subtasks;
DROP POLICY IF EXISTS "Write access for admins and assignees" ON public.tasks;
DROP POLICY IF EXISTS "Write access for admins and assignees" ON public.subtasks;

-- Drop foreign keys
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_fkey;
ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS subtasks_assignee_fkey;

-- Convert assignee columns to text
ALTER TABLE public.tasks ALTER COLUMN assignee TYPE text;
ALTER TABLE public.subtasks ALTER COLUMN assignee TYPE text;

-- Re-create Tasks policies
CREATE POLICY "Tasks isolation"
ON public.tasks FOR SELECT
USING (
  public.is_manager() 
  OR assignee = auth.uid()::text 
  OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

CREATE POLICY "Managers and assignees can manage tasks" 
ON public.tasks FOR ALL
USING (public.is_manager() OR assignee = auth.uid()::text)
WITH CHECK (public.is_manager() OR assignee = auth.uid()::text);

-- Re-create Subtasks policies
CREATE POLICY "Subtasks viewable by task access"
ON public.subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = subtasks.task_id 
    AND (public.is_manager() OR t.assignee = auth.uid()::text OR (t.client_id = public.get_my_client_id() AND t.visible_to_client = true))
  )
);

CREATE POLICY "Managers and assignees can manage subtasks" 
ON public.subtasks FOR ALL
USING (
  public.is_manager() 
  OR EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = subtasks.task_id AND t.assignee = auth.uid()::text
  )
)
WITH CHECK (
  public.is_manager() 
  OR EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = subtasks.task_id AND t.assignee = auth.uid()::text
  )
);

-- Ensure managers can manage everything else
-- Clients
DROP POLICY IF EXISTS "Write access for admins" ON public.clients;
CREATE POLICY "Managers can manage clients" 
ON public.clients FOR ALL
USING (public.is_manager())
WITH CHECK (public.is_manager());

-- Projects
DROP POLICY IF EXISTS "Write access for admins" ON public.projects;
CREATE POLICY "Managers can manage projects" 
ON public.projects FOR ALL
USING (public.is_manager())
WITH CHECK (public.is_manager());
