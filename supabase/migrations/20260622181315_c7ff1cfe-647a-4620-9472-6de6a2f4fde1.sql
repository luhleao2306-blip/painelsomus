CREATE OR REPLACE FUNCTION public.can_manage_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_internal_user()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      LEFT JOIN public.profiles me ON me.id = auth.uid()
      WHERE t.id = _task_id
        AND (
          t.assignee = auth.uid()::text
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

REVOKE EXECUTE ON FUNCTION public.can_manage_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_task(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_task(uuid) TO service_role;