
-- Helper to fetch current user's full_name
CREATE OR REPLACE FUNCTION public.get_my_full_name()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;

-- Replace tasks SELECT policy to also match by full_name (tasks.assignee stores display names)
DROP POLICY IF EXISTS "Tasks visible to linked client and team" ON public.tasks;
CREATE POLICY "Tasks visible to linked client and team"
ON public.tasks FOR SELECT
USING (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee = public.get_my_full_name())
  OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND (ta.assignee = (auth.uid())::text OR ta.assignee = public.get_my_full_name()))
  OR (client_id IS NOT NULL AND client_id = get_my_client_id())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = tasks.project_id
      AND ((p.client_id IS NOT NULL AND p.client_id = get_my_client_id()) OR p.consultant_id = auth.uid())
  )
);

-- Also broaden update policy so assignees can update their own tasks by name
DROP POLICY IF EXISTS "Managers and assignees can manage tasks" ON public.tasks;
CREATE POLICY "Managers and assignees can manage tasks"
ON public.tasks FOR ALL
USING (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee = public.get_my_full_name())
  OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND (ta.assignee = (auth.uid())::text OR ta.assignee = public.get_my_full_name()))
)
WITH CHECK (
  is_manager()
  OR assignee = (auth.uid())::text
  OR (public.get_my_full_name() IS NOT NULL AND assignee = public.get_my_full_name())
  OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND (ta.assignee = (auth.uid())::text OR ta.assignee = public.get_my_full_name()))
);
