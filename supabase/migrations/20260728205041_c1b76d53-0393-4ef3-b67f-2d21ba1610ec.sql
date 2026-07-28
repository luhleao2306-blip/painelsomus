GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_form_submissions TO authenticated;
GRANT ALL ON public.public_form_submissions TO service_role;

DROP POLICY IF EXISTS "Internal users can view all public submissions" ON public.public_form_submissions;
CREATE POLICY "Internal users can view all public submissions"
ON public.public_form_submissions
FOR SELECT
TO authenticated
USING (public.is_internal_user());