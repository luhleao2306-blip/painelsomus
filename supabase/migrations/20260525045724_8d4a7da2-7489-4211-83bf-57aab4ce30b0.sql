
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master','project_manager'));
$$;

DROP POLICY IF EXISTS "Profiles viewable by self and managers" ON public.profiles;
CREATE POLICY "Profiles viewable by self and managers" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.is_manager());

DROP POLICY IF EXISTS "Clients isolation" ON public.clients;
CREATE POLICY "Clients isolation" ON public.clients FOR SELECT USING (
  public.is_manager() OR manager_id = auth.uid() OR id = public.get_my_client_id()
);

DROP POLICY IF EXISTS "Projects isolation" ON public.projects;
CREATE POLICY "Projects isolation" ON public.projects FOR SELECT USING (
  public.is_manager() OR consultant_id = auth.uid() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

DROP POLICY IF EXISTS "Tasks isolation" ON public.tasks;
CREATE POLICY "Tasks isolation" ON public.tasks FOR SELECT USING (
  public.is_manager() OR assignee = auth.uid() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

DROP POLICY IF EXISTS "Documents isolation" ON public.documents;
CREATE POLICY "Documents isolation" ON public.documents FOR SELECT USING (
  public.is_manager() OR owner_id = auth.uid() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

DROP POLICY IF EXISTS "Deliverables isolation" ON public.deliverables;
CREATE POLICY "Deliverables isolation" ON public.deliverables FOR SELECT USING (
  public.is_manager() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

DROP POLICY IF EXISTS "Meeting Minutes isolation" ON public.meeting_minutes;
CREATE POLICY "Meeting Minutes isolation" ON public.meeting_minutes FOR SELECT USING (
  public.is_manager() OR (client_id = public.get_my_client_id() AND visible_to_client = true)
);

DROP POLICY IF EXISTS "Contracts isolation" ON public.contracts;
CREATE POLICY "Contracts isolation" ON public.contracts FOR SELECT USING (
  public.is_manager() OR client_id = public.get_my_client_id()
);

DROP POLICY IF EXISTS "Logs viewable by self and admins" ON public.activity_logs;
CREATE POLICY "Logs viewable by self and admins" ON public.activity_logs FOR SELECT USING (
  user_id = auth.uid() OR public.is_manager()
);

DROP POLICY IF EXISTS "Write access for admins" ON public.clients;
CREATE POLICY "Write access for admins" ON public.clients FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Write access for admins" ON public.projects;
CREATE POLICY "Write access for admins" ON public.projects FOR ALL USING (public.is_manager()) WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Write access for admins and assignees" ON public.tasks;
CREATE POLICY "Write access for admins and assignees" ON public.tasks FOR ALL USING (public.is_manager() OR assignee = auth.uid()) WITH CHECK (public.is_manager() OR assignee = auth.uid());
