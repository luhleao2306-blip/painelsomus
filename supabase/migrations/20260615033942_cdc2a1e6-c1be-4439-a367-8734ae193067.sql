
-- Enums
DO $$ BEGIN
  CREATE TYPE public.collaborator_status AS ENUM ('ativo','inativo','ferias','afastado','desligado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.collaborator_contract_type AS ENUM ('clt','pj','freelancer','estagiario','socio','terceirizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.collaborator_access_level AS ENUM ('super_admin','admin','gerente','colaborador','cliente','visualizador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pessoais
  full_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  cpf TEXT,
  rg TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  -- Profissionais
  job_title TEXT,
  role_function TEXT,
  department TEXT,
  contract_type public.collaborator_contract_type,
  start_date DATE,
  status public.collaborator_status NOT NULL DEFAULT 'ativo',
  manager_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  access_level public.collaborator_access_level NOT NULL DEFAULT 'colaborador',
  linked_project_ids UUID[] NOT NULL DEFAULT '{}',
  linked_client_ids UUID[] NOT NULL DEFAULT '{}',
  -- Financeiros (restritos via RLS)
  payment_type TEXT,
  monthly_value NUMERIC(12,2),
  hourly_value NUMERIC(12,2),
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  bank_account_type TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  cnpj TEXT,
  company_name TEXT,
  payment_day INT,
  financial_notes TEXT,
  -- Meta
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO authenticated;
GRANT ALL ON public.collaborators TO service_role;

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin (master/project_manager)?
CREATE OR REPLACE FUNCTION public.is_collab_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master','project_manager'));
$$;

CREATE POLICY "Admins manage collaborators"
  ON public.collaborators FOR ALL
  USING (public.is_collab_admin())
  WITH CHECK (public.is_collab_admin());

CREATE POLICY "Collaborator sees own record"
  ON public.collaborators FOR SELECT
  USING (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_collaborators_status ON public.collaborators(status);
CREATE INDEX IF NOT EXISTS idx_collaborators_birth ON public.collaborators(birth_date);
CREATE INDEX IF NOT EXISTS idx_collaborators_department ON public.collaborators(department);

CREATE TRIGGER trg_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
