DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Profiles isolation"
ON public.profiles FOR SELECT
USING (
  id = auth.uid()
  OR public.is_manager()
  OR (client_id IS NOT NULL AND client_id = public.get_my_client_id())
);