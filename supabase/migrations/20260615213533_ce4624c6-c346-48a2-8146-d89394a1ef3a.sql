DROP POLICY IF EXISTS "Projects isolation" ON public.projects;
DROP POLICY IF EXISTS "Clients can view their company projects" ON public.projects;
CREATE POLICY "Projects visible to linked client and team"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR consultant_id = auth.uid()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);

DROP POLICY IF EXISTS "Tasks isolation" ON public.tasks;
DROP POLICY IF EXISTS "Clients can view their company tasks" ON public.tasks;
CREATE POLICY "Tasks visible to linked client and team"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR assignee = (auth.uid())::text
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);

DROP POLICY IF EXISTS "Stages viewable by project access" ON public.project_stages;
CREATE POLICY "Stages visible through linked project access"
ON public.project_stages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_stages.project_id
      AND (
        public.is_manager()
        OR p.consultant_id = auth.uid()
        OR (p.client_id IS NOT NULL AND p.client_id = public.get_my_client_id())
      )
  )
);

DROP POLICY IF EXISTS "Subtasks viewable by task access" ON public.subtasks;
CREATE POLICY "Subtasks visible through linked task access"
ON public.subtasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND (
        public.is_manager()
        OR t.assignee = (auth.uid())::text
        OR (t.client_id IS NOT NULL AND t.client_id = public.get_my_client_id())
      )
  )
);

DROP POLICY IF EXISTS "Deliverables isolation" ON public.deliverables;
CREATE POLICY "Deliverables visible to linked client and team"
ON public.deliverables
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);

DROP POLICY IF EXISTS "Meeting Minutes isolation" ON public.meeting_minutes;
CREATE POLICY "Meeting minutes visible to linked client and team"
ON public.meeting_minutes
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);

DROP POLICY IF EXISTS "Contracts isolation" ON public.contracts;
DROP POLICY IF EXISTS "Clients can view linked contracts" ON public.contracts;
CREATE POLICY "Contracts visible to linked client and team"
ON public.contracts
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);

DROP POLICY IF EXISTS "View revisions: internal team or client owner" ON public.meeting_minute_revisions;
CREATE POLICY "View revisions through linked minute access"
ON public.meeting_minute_revisions
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR EXISTS (
    SELECT 1
    FROM public.meeting_minutes m
    WHERE m.id = meeting_minute_revisions.minute_id
      AND m.client_id IS NOT NULL
      AND m.client_id = public.get_my_client_id()
  )
);