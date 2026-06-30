
-- Fix project_stages SELECT policy
DROP POLICY IF EXISTS "Stages viewable by project access" ON public.project_stages;
CREATE POLICY "Stages viewable by project access" ON public.project_stages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_stages.project_id
      AND (public.is_manager() OR p.consultant_id = auth.uid() OR (p.client_id = public.get_my_client_id() AND p.visible_to_client = true))
  )
);

-- Fix subtasks SELECT policy
DROP POLICY IF EXISTS "Subtasks viewable by task access" ON public.subtasks;
CREATE POLICY "Subtasks viewable by task access" ON public.subtasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND (public.is_manager() OR t.assignee = auth.uid() OR (t.client_id = public.get_my_client_id() AND t.visible_to_client = true))
  )
);

-- Contracts: respect visible_to_client for clients
DROP POLICY IF EXISTS "Contracts isolation" ON public.contracts;
CREATE POLICY "Contracts isolation" ON public.contracts
FOR SELECT USING (
  public.is_manager() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

-- Write policies for admins on data tables
CREATE POLICY "Write access for admins" ON public.documents
  FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Write access for admins" ON public.deliverables
  FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Write access for admins" ON public.contracts
  FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Write access for admins" ON public.meeting_minutes
  FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Write access for admins" ON public.project_stages
  FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Write access for admins and assignees" ON public.subtasks
  FOR ALL USING (
    public.is_manager() OR EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.assignee = auth.uid()
    )
  ) WITH CHECK (
    public.is_manager() OR EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.assignee = auth.uid()
    )
  );

-- Profiles: allow users to update their own profile (role changes still blocked by separate column-level discipline)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Fix broken consultant storage policy
DROP POLICY IF EXISTS "Consultants can see assigned client assets" ON storage.objects;

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'client-assets';

-- Storage policies for client-assets bucket
DROP POLICY IF EXISTS "Managers can manage client assets" ON storage.objects;
CREATE POLICY "Managers can manage client assets" ON storage.objects
  FOR ALL USING (bucket_id = 'client-assets' AND public.is_manager())
  WITH CHECK (bucket_id = 'client-assets' AND public.is_manager());

DROP POLICY IF EXISTS "Clients can read own folder assets" ON storage.objects;
CREATE POLICY "Clients can read own folder assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-assets'
    AND (storage.foldername(name))[1] = (public.get_my_client_id())::text
  );
