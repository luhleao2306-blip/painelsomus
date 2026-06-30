DROP POLICY IF EXISTS "Tasks visible to linked client and team" ON public.tasks;
CREATE POLICY "Tasks visible to linked client and team"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR assignee = (auth.uid())::text
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.client_id IS NOT NULL
      AND p.client_id = public.get_my_client_id()
  )
);

DROP POLICY IF EXISTS "Deliverables visible to linked client and team" ON public.deliverables;
CREATE POLICY "Deliverables visible to linked client and team"
ON public.deliverables
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = deliverables.project_id
      AND p.client_id IS NOT NULL
      AND p.client_id = public.get_my_client_id()
  )
);

DROP POLICY IF EXISTS "Documents isolation" ON public.documents;
DROP POLICY IF EXISTS "Clients can view their company documents" ON public.documents;
CREATE POLICY "Documents visible to linked client and team"
ON public.documents
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR owner_id = auth.uid()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = documents.project_id
      AND p.client_id IS NOT NULL
      AND p.client_id = public.get_my_client_id()
  )
);

DROP POLICY IF EXISTS "Meeting minutes visible to linked client and team" ON public.meeting_minutes;
CREATE POLICY "Meeting minutes visible to linked client and team"
ON public.meeting_minutes
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = meeting_minutes.project_id
      AND p.client_id IS NOT NULL
      AND p.client_id = public.get_my_client_id()
  )
);

DROP POLICY IF EXISTS "Contracts visible to linked client and team" ON public.contracts;
CREATE POLICY "Contracts visible to linked client and team"
ON public.contracts
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = contracts.project_id
      AND p.client_id IS NOT NULL
      AND p.client_id = public.get_my_client_id()
  )
);

DROP POLICY IF EXISTS "View revisions through linked minute access" ON public.meeting_minute_revisions;
CREATE POLICY "View revisions through linked minute access"
ON public.meeting_minute_revisions
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR EXISTS (
    SELECT 1
    FROM public.meeting_minutes m
    LEFT JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = meeting_minute_revisions.minute_id
      AND (
        (m.client_id IS NOT NULL AND m.client_id = public.get_my_client_id())
        OR (p.client_id IS NOT NULL AND p.client_id = public.get_my_client_id())
      )
  )
);