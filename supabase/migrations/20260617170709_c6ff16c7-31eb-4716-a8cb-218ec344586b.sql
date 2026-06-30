
-- 1) Novos campos na ficha de onboarding
ALTER TABLE public.client_registrations
  ADD COLUMN IF NOT EXISTS contact_cpf TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS financial_responsible TEXT;

-- 2) Expandir a tabela contracts para suportar o ciclo de assinatura
ALTER TABLE public.contracts
  ALTER COLUMN client_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES public.client_registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commercial_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contractor_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS signature_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS signed_by_cpf TEXT,
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS signed_html TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS contracts_registration_id_idx ON public.contracts(registration_id);
CREATE INDEX IF NOT EXISTS contracts_signature_token_idx ON public.contracts(signature_token);

-- 3) Função pública (security definer) para buscar contrato pelo token
CREATE OR REPLACE FUNCTION public.get_contract_by_token(_token TEXT)
RETURNS TABLE(
  id UUID,
  signature_status TEXT,
  commercial_data JSONB,
  contractor_snapshot JSONB,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  version INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, signature_status, commercial_data, contractor_snapshot, sent_at, signed_at, version
  FROM public.contracts
  WHERE signature_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_by_token(TEXT) TO anon, authenticated;

-- 4) RPC pública para assinar o contrato
CREATE OR REPLACE FUNCTION public.sign_contract(
  _token TEXT,
  _name TEXT,
  _cpf TEXT,
  _ip TEXT,
  _html TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_reg_id UUID;
BEGIN
  IF _name IS NULL OR length(trim(_name)) < 3 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF _cpf IS NULL OR length(regexp_replace(_cpf, '\D','','g')) <> 11 THEN RAISE EXCEPTION 'invalid_cpf'; END IF;

  SELECT * INTO v_contract FROM public.contracts WHERE signature_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_contract.signature_status <> 'sent' THEN RAISE EXCEPTION 'token_%', v_contract.signature_status; END IF;

  UPDATE public.contracts
    SET signature_status = 'signed',
        signed_at = now(),
        signed_by_name = _name,
        signed_by_cpf = _cpf,
        signed_ip = _ip,
        signed_html = _html,
        signature_token = NULL,
        updated_at = now()
    WHERE id = v_contract.id;

  v_reg_id := v_contract.registration_id;
  IF v_reg_id IS NOT NULL THEN
    UPDATE public.client_registrations
      SET status = 'contrato_assinado', updated_at = now()
      WHERE id = v_reg_id;

    INSERT INTO public.registration_history(registration_id, event_type, description, metadata)
      VALUES (v_reg_id, 'contrato_assinado',
              'Contrato assinado por ' || _name,
              jsonb_build_object('contract_id', v_contract.id, 'cpf', _cpf, 'ip', _ip));

    -- Notificar gestores
    INSERT INTO public.notifications(user_id, title, description, type, link, entity_type, entity_id)
    SELECT p.id,
           'Contrato assinado',
           'Contrato de cadastro assinado por ' || _name,
           'system',
           '/registrations/' || v_reg_id::text,
           'client_registration',
           v_reg_id
    FROM public.profiles p
    WHERE p.role IN ('master','project_manager');
  END IF;

  RETURN v_contract.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_contract(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5) Garantir que clientes consigam ver seus próprios contratos (RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contracts'
      AND policyname='Clients can read own contracts'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Clients can read own contracts"
        ON public.contracts FOR SELECT
        TO authenticated
        USING (
          client_id IS NOT NULL
          AND client_id = public.get_my_client_id()
          AND visible_to_client IS NOT FALSE
          AND signature_status = 'signed'
        );
    $p$;
  END IF;
END$$;
