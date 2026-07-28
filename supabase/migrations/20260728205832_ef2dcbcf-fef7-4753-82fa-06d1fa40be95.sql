CREATE POLICY "Internal users can delete public submissions"
ON public.public_form_submissions
FOR DELETE
TO authenticated
USING (public.is_internal_user());