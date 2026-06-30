
-- Restructure briefings: token-based public access
ALTER TABLE public.briefings
  ALTER COLUMN client_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS allow_edit BOOLEAN NOT NULL DEFAULT false;

-- Set default status & allow new values
ALTER TABLE public.briefings ALTER COLUMN status SET DEFAULT 'aguardando';
ALTER TABLE public.briefings ALTER COLUMN dados SET DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS briefings_token_key ON public.briefings(token);

-- Drop old policies if existing, redefine for managers + service_role
DROP POLICY IF EXISTS "Clients can manage their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Managers can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Managers manage all briefings" ON public.briefings;

CREATE POLICY "Managers manage all briefings"
  ON public.briefings FOR ALL
  TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Public RPC: get briefing by token
CREATE OR REPLACE FUNCTION public.get_briefing_by_token(_token UUID)
RETURNS TABLE(
  id UUID, token UUID, office_name TEXT, contact_name TEXT, email TEXT,
  status TEXT, dados JSONB, allow_edit BOOLEAN,
  submitted_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, token, office_name, contact_name, email, status, dados, allow_edit, submitted_at, updated_at
  FROM public.briefings WHERE token = _token LIMIT 1;
$$;

-- Public RPC: save progress
CREATE OR REPLACE FUNCTION public.save_briefing_progress(_token UUID, _dados JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT id, status, allow_edit INTO v FROM public.briefings WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v.status = 'enviado' AND NOT v.allow_edit THEN RAISE EXCEPTION 'already_submitted'; END IF;
  UPDATE public.briefings
    SET dados = _dados,
        status = CASE WHEN status = 'enviado' THEN 'enviado' ELSE 'em_andamento' END,
        updated_at = now()
    WHERE id = v.id;
END;
$$;

-- Public RPC: submit briefing
CREATE OR REPLACE FUNCTION public.submit_briefing_by_token(_token UUID, _dados JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT id, status, allow_edit INTO v FROM public.briefings WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v.status = 'enviado' AND NOT v.allow_edit THEN RAISE EXCEPTION 'already_submitted'; END IF;
  UPDATE public.briefings
    SET dados = _dados,
        status = 'enviado',
        submitted_at = COALESCE(submitted_at, now()),
        updated_at = now()
    WHERE id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_briefing_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_briefing_progress(UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_briefing_by_token(UUID, JSONB) TO anon, authenticated;
