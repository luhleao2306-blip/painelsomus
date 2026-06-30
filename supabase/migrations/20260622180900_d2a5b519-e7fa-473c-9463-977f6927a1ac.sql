CREATE OR REPLACE FUNCTION public.can_manage_task(_task_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.profiles me ON me.id = auth.uid()
    WHERE t.id = _task_id
      AND (
        public.is_internal_user()
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
$function$;