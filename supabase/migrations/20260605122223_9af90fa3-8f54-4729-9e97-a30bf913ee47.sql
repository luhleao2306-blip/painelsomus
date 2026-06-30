DROP POLICY IF EXISTS "Master profile access" ON public.profiles;
CREATE POLICY "Master profile access" ON public.profiles FOR SELECT USING (public.get_my_role() = 'master');

DROP POLICY IF EXISTS "Master can update any profile" ON public.profiles;
CREATE POLICY "Master can update any profile" ON public.profiles FOR UPDATE USING (public.get_my_role() = 'master') WITH CHECK (public.get_my_role() = 'master');