
-- Onboarding tables
CREATE TABLE public.onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  company_hint TEXT,
  contact_name TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','invalidated')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  registration_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_invites TO authenticated;
GRANT ALL ON public.onboarding_invites TO service_role;
ALTER TABLE public.onboarding_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage invites" ON public.onboarding_invites
  FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE TABLE public.client_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES public.onboarding_invites(id) ON DELETE SET NULL,
  -- Empresa
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  founded_at DATE,
  segment TEXT,
  employees_count INT,
  monthly_revenue NUMERIC,
  website TEXT,
  instagram TEXT,
  -- Responsável
  contact_name TEXT NOT NULL,
  contact_role TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT NOT NULL,
  -- Localização
  state TEXT,
  city TEXT,
  -- Workflow
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_analise','aguardando_correcao','aprovado','reprovado')),
  internal_notes TEXT,
  rejection_reason TEXT,
  correction_fields JSONB,
  correction_note TEXT,
  created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_ip TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_registrations TO authenticated;
GRANT ALL ON public.client_registrations TO service_role;
ALTER TABLE public.client_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage registrations" ON public.client_registrations
  FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE TABLE public.registration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.client_registrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.registration_history TO authenticated;
GRANT ALL ON public.registration_history TO service_role;
ALTER TABLE public.registration_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read history" ON public.registration_history
  FOR SELECT TO authenticated
  USING (public.is_manager());
CREATE POLICY "Managers write history" ON public.registration_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());

CREATE TRIGGER trg_onb_invites_updated BEFORE UPDATE ON public.onboarding_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_client_reg_updated BEFORE UPDATE ON public.client_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: validate token
CREATE OR REPLACE FUNCTION public.get_onboarding_invite(_token TEXT)
RETURNS TABLE(valid BOOLEAN, reason TEXT, expires_at TIMESTAMPTZ, company_hint TEXT, contact_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.onboarding_invites WHERE token = _token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::text, NULL::timestamptz, NULL::text, NULL::text;
    RETURN;
  END IF;
  IF v.status <> 'active' THEN
    RETURN QUERY SELECT false, v.status::text, v.expires_at, v.company_hint, v.contact_name;
    RETURN;
  END IF;
  IF v.expires_at < now() THEN
    UPDATE public.onboarding_invites SET status = 'expired' WHERE id = v.id;
    RETURN QUERY SELECT false, 'expired'::text, v.expires_at, v.company_hint, v.contact_name;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, NULL::text, v.expires_at, v.company_hint, v.contact_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_onboarding_invite(TEXT) TO anon, authenticated;

-- Public RPC: submit onboarding (atomic)
CREATE OR REPLACE FUNCTION public.submit_onboarding(
  _token TEXT, _payload JSONB, _ip TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_reg_id UUID;
  v_cnpj TEXT;
BEGIN
  SELECT * INTO v_invite FROM public.onboarding_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_invite.status <> 'active' THEN RAISE EXCEPTION 'token_%', v_invite.status; END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.onboarding_invites SET status='expired' WHERE id=v_invite.id;
    RAISE EXCEPTION 'token_expired';
  END IF;

  v_cnpj := _payload->>'cnpj';
  IF EXISTS(SELECT 1 FROM public.client_registrations WHERE cnpj = v_cnpj) THEN
    RAISE EXCEPTION 'cnpj_duplicado';
  END IF;

  INSERT INTO public.client_registrations(
    invite_id, legal_name, trade_name, cnpj, founded_at, segment, employees_count, monthly_revenue,
    website, instagram, contact_name, contact_role, phone, whatsapp, email, state, city, submitted_ip
  ) VALUES (
    v_invite.id,
    _payload->>'legal_name', _payload->>'trade_name', v_cnpj,
    NULLIF(_payload->>'founded_at','')::date,
    _payload->>'segment',
    NULLIF(_payload->>'employees_count','')::int,
    NULLIF(_payload->>'monthly_revenue','')::numeric,
    _payload->>'website', _payload->>'instagram',
    _payload->>'contact_name', _payload->>'contact_role',
    _payload->>'phone', _payload->>'whatsapp', _payload->>'email',
    _payload->>'state', _payload->>'city',
    _ip
  ) RETURNING id INTO v_reg_id;

  UPDATE public.onboarding_invites
    SET status='used', used_at=now(), registration_id=v_reg_id
    WHERE id=v_invite.id;

  INSERT INTO public.registration_history(registration_id, event_type, description)
    VALUES (v_reg_id, 'ficha_enviada', 'Ficha cadastral recebida');

  -- Notificar gestores
  INSERT INTO public.notifications(user_id, title, description, type, link, entity_type, entity_id)
  SELECT p.id, 'Nova ficha cadastral',
         'Cadastro de ' || COALESCE(_payload->>'trade_name', 'cliente') || ' recebido',
         'system', '/registrations/' || v_reg_id::text, 'client_registration', v_reg_id
  FROM public.profiles p WHERE p.role IN ('master','project_manager');

  RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_onboarding(TEXT, JSONB, TEXT) TO anon, authenticated;
