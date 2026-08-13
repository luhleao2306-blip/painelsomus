GRANT SELECT ON public.public_form_shares TO authenticated;
DROP POLICY IF EXISTS "Internal users can view form shares" ON public.public_form_shares;
CREATE POLICY "Internal users can view form shares" ON public.public_form_shares FOR SELECT TO authenticated USING (public.is_internal_user() OR auth.uid() = created_by);