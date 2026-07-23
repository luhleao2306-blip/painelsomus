
-- 1) op_senhas: restrict to master only
DROP POLICY IF EXISTS "op_senhas internal read" ON public.op_senhas;
DROP POLICY IF EXISTS "op_senhas internal write" ON public.op_senhas;
CREATE POLICY "op_senhas master read" ON public.op_senhas FOR SELECT TO authenticated USING (public.is_master());
CREATE POLICY "op_senhas master write" ON public.op_senhas FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 2) commercial_leads: scope to authenticated
DROP POLICY IF EXISTS "Managers can delete commercial leads" ON public.commercial_leads;
DROP POLICY IF EXISTS "Managers can insert commercial leads" ON public.commercial_leads;
DROP POLICY IF EXISTS "Managers can update commercial leads" ON public.commercial_leads;
DROP POLICY IF EXISTS "Managers can view commercial leads" ON public.commercial_leads;
CREATE POLICY "Managers can view commercial leads" ON public.commercial_leads FOR SELECT TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can insert commercial leads" ON public.commercial_leads FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update commercial leads" ON public.commercial_leads FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers can delete commercial leads" ON public.commercial_leads FOR DELETE TO authenticated USING (public.is_manager());

-- 3) profiles: scope policies to authenticated
DROP POLICY IF EXISTS "Master profile access" ON public.profiles;
DROP POLICY IF EXISTS "Master can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Self profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Master profile access" ON public.profiles FOR SELECT TO authenticated USING (public.get_my_role() = 'master');
CREATE POLICY "Master can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.get_my_role() = 'master') WITH CHECK (public.get_my_role() = 'master');
CREATE POLICY "Self profile access" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 4) work_schedules & items: restrict all-authenticated read to managers; public schedules still shareable via existing anon policies
DROP POLICY IF EXISTS "Authenticated can view all schedules" ON public.work_schedules;
CREATE POLICY "Managers can view all schedules" ON public.work_schedules FOR SELECT TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "Authenticated can view all items" ON public.work_schedule_items;
CREATE POLICY "Managers can view all items" ON public.work_schedule_items FOR SELECT TO authenticated USING (public.is_manager());

-- 5) can_access_task / can_manage_task: use stable user IDs via task_assignees, drop fuzzy name matching
CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.profiles me ON me.id = auth.uid()
    WHERE t.id = _task_id
      AND (
        public.is_internal_user()
        OR t.assignee = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id AND ta.assignee = auth.uid()::text
        )
        OR (
          me.client_id IS NOT NULL
          AND (
            t.client_id = me.client_id
            OR EXISTS (
              SELECT 1 FROM public.projects p
              WHERE p.id = t.project_id AND p.client_id = me.client_id
            )
          )
        )
      )
  );
$fn$;

CREATE OR REPLACE FUNCTION public.can_manage_task(_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT
    public.is_internal_user()
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = _task_id
        AND (
          t.assignee = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.task_assignees ta
            WHERE ta.task_id = t.id AND ta.assignee = auth.uid()::text
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = t.project_id AND p.consultant_id = auth.uid()
          )
        )
    );
$fn$;

-- 6) Revoke public/anon EXECUTE on SECURITY DEFINER helpers that shouldn't be callable by anon
REVOKE EXECUTE ON FUNCTION public.can_access_task(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_task(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_internal_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_collab_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_full_name() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_client_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_collaborators_public() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_habit_reward(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_task_mention(uuid, uuid[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bolao_award_champion() FROM PUBLIC, anon;
