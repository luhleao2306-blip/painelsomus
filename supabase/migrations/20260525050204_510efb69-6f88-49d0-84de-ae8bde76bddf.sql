GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;

-- Simplificar a política de perfis para garantir que o próprio usuário sempre consiga se ler
DROP POLICY IF EXISTS "Profiles viewable by self and managers" ON public.profiles;

CREATE POLICY "Profiles viewable by self and managers" 
ON public.profiles 
FOR SELECT 
USING (
    auth.uid() = id 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('master', 'project_manager')
);
