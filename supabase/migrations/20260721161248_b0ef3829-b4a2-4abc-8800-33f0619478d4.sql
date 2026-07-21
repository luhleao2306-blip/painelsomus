
DROP POLICY IF EXISTS "Authenticated can insert task types" ON public.task_types;
DROP POLICY IF EXISTS "Authenticated can update task types" ON public.task_types;
DROP POLICY IF EXISTS "Authenticated can delete task types" ON public.task_types;

CREATE POLICY "Internal users insert task types"
  ON public.task_types FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());
CREATE POLICY "Internal users update task types"
  ON public.task_types FOR UPDATE TO authenticated
  USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());
CREATE POLICY "Internal users delete task types"
  ON public.task_types FOR DELETE TO authenticated
  USING (public.is_internal_user());
