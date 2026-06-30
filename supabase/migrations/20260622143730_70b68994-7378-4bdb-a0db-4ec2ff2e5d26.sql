DROP POLICY IF EXISTS "Tasks visible to linked client and team" ON public.tasks;
DROP POLICY IF EXISTS "Managers and assignees can manage tasks" ON public.tasks;

CREATE POLICY "Tasks visible to linked client and team"
ON public.tasks FOR SELECT
USING (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee ILIKE '%' || public.get_my_full_name() || '%')
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = tasks.id
      AND (ta.assignee = (auth.uid())::text
        OR (public.get_my_full_name() IS NOT NULL AND ta.assignee ILIKE '%' || public.get_my_full_name() || '%'))
  )
  OR (client_id IS NOT NULL AND client_id = get_my_client_id())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = tasks.project_id
      AND ((p.client_id IS NOT NULL AND p.client_id = get_my_client_id()) OR p.consultant_id = auth.uid())
  )
);

CREATE POLICY "Managers and assignees can manage tasks"
ON public.tasks FOR ALL
USING (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee ILIKE '%' || public.get_my_full_name() || '%')
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = tasks.id
      AND (ta.assignee = (auth.uid())::text
        OR (public.get_my_full_name() IS NOT NULL AND ta.assignee ILIKE '%' || public.get_my_full_name() || '%'))
  )
)
WITH CHECK (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee ILIKE '%' || public.get_my_full_name() || '%')
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = tasks.id
      AND (ta.assignee = (auth.uid())::text
        OR (public.get_my_full_name() IS NOT NULL AND ta.assignee ILIKE '%' || public.get_my_full_name() || '%'))
  )
);