-- Remover a política problemática que causava recursão
DROP POLICY IF EXISTS "Profiles viewable by self and managers" ON public.profiles;

-- Criar uma nova política que evita recursão usando auth.jwt() ou verificando o ID diretamente
CREATE POLICY "Profiles viewable by self and managers" 
ON public.profiles 
FOR SELECT 
USING (
    auth.uid() = id 
    OR 
    (auth.jwt() ->> 'role' = 'service_role') -- Permite acesso total via service role
    OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (auth.users.raw_user_meta_data ->> 'role' IN ('master', 'project_manager'))
    )
);

-- Como alternativa mais segura e performática, vamos usar a função security definer que criamos antes, 
-- mas garantindo que ela não entre em loop.
-- Mas a forma mais simples e robusta para "Profiles" é permitir que todos os autenticados vejam os perfis básicos,
-- ou pelo menos que vejam a si mesmos sem condições complexas.

DROP POLICY IF EXISTS "Profiles viewable by self and managers" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles"
ON public.profiles FOR SELECT
USING (is_manager());
