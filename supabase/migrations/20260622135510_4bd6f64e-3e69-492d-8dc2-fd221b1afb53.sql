DROP POLICY IF EXISTS "Masters manage invites" ON public.collaborator_invites;
CREATE POLICY "Managers manage invites" ON public.collaborator_invites
FOR ALL
USING (public.get_my_role() IN ('master','project_manager'))
WITH CHECK (public.get_my_role() IN ('master','project_manager'));