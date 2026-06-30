CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.profiles me ON me.id = auth.uid()
    WHERE t.id = _task_id
      AND (
        public.is_manager()
        OR t.assignee = auth.uid()::text
        OR (
          me.full_name IS NOT NULL
          AND me.full_name <> ''
          AND t.assignee ILIKE '%' || me.full_name || '%'
        )
        OR EXISTS (
          SELECT 1
          FROM public.task_assignees ta
          WHERE ta.task_id = t.id
            AND (
              ta.assignee = auth.uid()::text
              OR (
                me.full_name IS NOT NULL
                AND me.full_name <> ''
                AND ta.assignee ILIKE '%' || me.full_name || '%'
              )
            )
        )
        OR (
          me.client_id IS NOT NULL
          AND (
            t.client_id = me.client_id
            OR EXISTS (
              SELECT 1
              FROM public.projects p
              WHERE p.id = t.project_id
                AND p.client_id = me.client_id
            )
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = t.project_id
            AND p.consultant_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.profiles me ON me.id = auth.uid()
    WHERE t.id = _task_id
      AND (
        public.is_manager()
        OR t.assignee = auth.uid()::text
        OR (
          me.full_name IS NOT NULL
          AND me.full_name <> ''
          AND t.assignee ILIKE '%' || me.full_name || '%'
        )
        OR EXISTS (
          SELECT 1
          FROM public.task_assignees ta
          WHERE ta.task_id = t.id
            AND (
              ta.assignee = auth.uid()::text
              OR (
                me.full_name IS NOT NULL
                AND me.full_name <> ''
                AND ta.assignee ILIKE '%' || me.full_name || '%'
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = t.project_id
            AND p.consultant_id = auth.uid()
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Tasks visible to linked client and team" ON public.tasks;
DROP POLICY IF EXISTS "Managers and assignees can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Consultants can view tasks of their projects" ON public.tasks;
DROP POLICY IF EXISTS "Consultants can manage tasks of their projects" ON public.tasks;
DROP POLICY IF EXISTS "task_assignees follow tasks" ON public.task_assignees;
DROP POLICY IF EXISTS "task_projects follow tasks" ON public.task_projects;
DROP POLICY IF EXISTS "Subtasks visible through linked task access" ON public.subtasks;
DROP POLICY IF EXISTS "Managers and assignees can manage subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Consultants can manage subtasks of their projects" ON public.subtasks;

CREATE POLICY "Tasks visible to linked client and team"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.can_access_task(id));

CREATE POLICY "Managers and assignees can manage tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (public.can_manage_task(id))
WITH CHECK (public.can_manage_task(id));

CREATE POLICY "task_assignees follow task access"
ON public.task_assignees
FOR SELECT
TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "task_assignees follow task management"
ON public.task_assignees
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_task(task_id));

CREATE POLICY "task_assignees update by task management"
ON public.task_assignees
FOR UPDATE
TO authenticated
USING (public.can_manage_task(task_id))
WITH CHECK (public.can_manage_task(task_id));

CREATE POLICY "task_assignees delete by task management"
ON public.task_assignees
FOR DELETE
TO authenticated
USING (public.can_manage_task(task_id));

CREATE POLICY "task_projects follow task access"
ON public.task_projects
FOR SELECT
TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "task_projects follow task management"
ON public.task_projects
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_task(task_id));

CREATE POLICY "task_projects update by task management"
ON public.task_projects
FOR UPDATE
TO authenticated
USING (public.can_manage_task(task_id))
WITH CHECK (public.can_manage_task(task_id));

CREATE POLICY "task_projects delete by task management"
ON public.task_projects
FOR DELETE
TO authenticated
USING (public.can_manage_task(task_id));

CREATE POLICY "Subtasks visible through linked task access"
ON public.subtasks
FOR SELECT
TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "Managers and assignees can manage subtasks"
ON public.subtasks
FOR ALL
TO authenticated
USING (public.can_manage_task(task_id))
WITH CHECK (public.can_manage_task(task_id));

GRANT EXECUTE ON FUNCTION public.can_access_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_task(uuid) TO authenticated;