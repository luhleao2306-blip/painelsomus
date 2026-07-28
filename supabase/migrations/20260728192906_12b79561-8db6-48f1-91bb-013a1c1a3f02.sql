CREATE TABLE public.client_form_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  template_key text NOT NULL DEFAULT 'visao_futuro',
  template_name text NOT NULL DEFAULT 'Visão de Futuro',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  contact_name text,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE INDEX idx_cfr_client ON public.client_form_requests(client_id);
CREATE INDEX idx_cfr_status ON public.client_form_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_form_requests TO authenticated;
GRANT ALL ON public.client_form_requests TO service_role;

ALTER TABLE public.client_form_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_manage_client_form_requests"
  ON public.client_form_requests FOR ALL TO authenticated
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

CREATE POLICY "client_reads_own_form_requests"
  ON public.client_form_requests FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND client_id = public.get_my_client_id());

CREATE TRIGGER trg_cfr_updated_at
  BEFORE UPDATE ON public.client_form_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_form_request(_token text)
RETURNS TABLE(
  id uuid, template_key text, template_name text, client_name text,
  contact_name text, contact_email text, status text, answers jsonb,
  progress integer, submitted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.template_key, r.template_name,
         COALESCE(c.name, r.client_name), r.contact_name, r.contact_email,
         r.status, r.answers, r.progress, r.submitted_at
  FROM public.client_form_requests r
  LEFT JOIN public.clients c ON c.id = r.client_id
  WHERE r.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.save_client_form_progress(_token text, _answers jsonb, _progress integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v RECORD;
BEGIN
  SELECT id, status INTO v FROM public.client_form_requests WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v.status = 'submitted' THEN RAISE EXCEPTION 'already_submitted'; END IF;
  UPDATE public.client_form_requests
    SET answers = COALESCE(_answers, '{}'::jsonb),
        progress = GREATEST(0, LEAST(100, COALESCE(_progress, 0))),
        updated_at = now()
    WHERE id = v.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_client_form(
  _token text, _answers jsonb, _progress integer,
  _client_name text, _contact_name text, _contact_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v RECORD;
  v_match uuid;
BEGIN
  SELECT * INTO v FROM public.client_form_requests WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v.status = 'submitted' THEN RAISE EXCEPTION 'already_submitted'; END IF;

  v_match := v.client_id;
  IF v_match IS NULL THEN
    IF _contact_email IS NOT NULL AND length(trim(_contact_email)) > 3 THEN
      SELECT c.id INTO v_match FROM public.clients c
        WHERE lower(c.email) = lower(trim(_contact_email)) LIMIT 1;
    END IF;
  END IF;
  IF v_match IS NULL AND _client_name IS NOT NULL AND length(trim(_client_name)) > 2 THEN
    SELECT c.id INTO v_match FROM public.clients c
      WHERE lower(c.name) = lower(trim(_client_name)) LIMIT 1;
    IF v_match IS NULL THEN
      SELECT c.id INTO v_match FROM public.clients c
        WHERE c.name ILIKE '%' || trim(_client_name) || '%' LIMIT 1;
    END IF;
  END IF;

  UPDATE public.client_form_requests
    SET answers = COALESCE(_answers, '{}'::jsonb),
        progress = GREATEST(0, LEAST(100, COALESCE(_progress, 100))),
        client_id = COALESCE(v_match, client_id),
        client_name = COALESCE(NULLIF(trim(_client_name), ''), client_name),
        contact_name = COALESCE(NULLIF(trim(_contact_name), ''), contact_name),
        contact_email = COALESCE(NULLIF(trim(_contact_email), ''), contact_email),
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    WHERE id = v.id;

  INSERT INTO public.notifications(user_id, title, description, type, link, entity_type, entity_id)
  SELECT p.id, 'Formulário respondido',
         COALESCE(NULLIF(trim(_client_name), ''), v.client_name, 'Um cliente') || ' enviou o formulário ' || v.template_name,
         'system', '/formularios', 'client_form_request', v.id
  FROM public.profiles p WHERE p.role IN ('master','project_manager');

  RETURN v.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_form_request(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_client_form_progress(text, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_client_form(text, jsonb, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_form_request(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_client_form_progress(text, jsonb, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_client_form(text, jsonb, integer, text, text, text) TO anon, authenticated;