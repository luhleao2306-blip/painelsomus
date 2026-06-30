DROP POLICY IF EXISTS "Authenticated can view active profiles" ON public.profiles;
CREATE POLICY "Authenticated can view active profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (status = 'active');