-- Remover políticas que causam recursão na tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and managers" ON public.profiles;

-- Criar uma política simples e não recursiva para leitura de perfis
-- Isso permite que a função is_manager() selecione da tabela profiles sem disparar a si mesma recursivamente
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Garantir que as funções SD continuem funcionando
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;
