ALTER TABLE public.public_form_submissions
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text;

CREATE INDEX IF NOT EXISTS idx_pfs_client_id ON public.public_form_submissions(client_id);

CREATE OR REPLACE FUNCTION public.match_public_form_submission_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
  v_contact text;
  v_match uuid;
  k text;
BEGIN
  v_email := NULLIF(trim(COALESCE(NEW.contact_email, NEW.answers->>'E-mail', NEW.answers->>'Email', NEW.answers->>'email')), '');
  v_name  := NULLIF(trim(COALESCE(NEW.client_name, NEW.answers->>'Cliente', NEW.answers->>'Empresa', NEW.answers->>'cliente')), '');
  v_contact := NULLIF(trim(COALESCE(NEW.contact_name, NEW.answers->>'Contato', NEW.answers->>'Nome', NEW.answers->>'nome')), '');

  IF v_email IS NULL THEN
    FOR k IN SELECT jsonb_object_keys(NEW.answers) LOOP
      IF k ILIKE '%mail%' AND NEW.answers->>k ~ '@' THEN
        v_email := trim(NEW.answers->>k);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  NEW.contact_email := COALESCE(NEW.contact_email, v_email);
  NEW.client_name := COALESCE(NEW.client_name, v_name);
  NEW.contact_name := COALESCE(NEW.contact_name, v_contact);

  IF NEW.client_id IS NULL AND v_email IS NOT NULL THEN
    SELECT c.id INTO v_match FROM public.clients c WHERE lower(c.email) = lower(v_email) LIMIT 1;
  END IF;

  IF v_match IS NULL AND NEW.client_id IS NULL AND v_email IS NOT NULL THEN
    SELECT p.client_id INTO v_match FROM public.profiles p
      WHERE lower(p.email) = lower(v_email) AND p.client_id IS NOT NULL LIMIT 1;
  END IF;

  IF v_match IS NULL AND NEW.client_id IS NULL AND v_name IS NOT NULL AND length(v_name) > 2 THEN
    SELECT c.id INTO v_match FROM public.clients c WHERE lower(c.name) = lower(v_name) LIMIT 1;
    IF v_match IS NULL THEN
      SELECT c.id INTO v_match FROM public.clients c WHERE c.name ILIKE '%' || v_name || '%' LIMIT 1;
    END IF;
  END IF;

  NEW.client_id := COALESCE(NEW.client_id, v_match);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_public_form_submission_client ON public.public_form_submissions;
CREATE TRIGGER trg_match_public_form_submission_client
BEFORE INSERT OR UPDATE OF answers, contact_email, client_name ON public.public_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.match_public_form_submission_client();

UPDATE public.public_form_submissions SET answers = answers WHERE client_id IS NULL;

DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.public_form_submissions;
CREATE POLICY "Clients can view their own submissions"
ON public.public_form_submissions
FOR SELECT
TO authenticated
USING (client_id IS NOT NULL AND client_id = public.get_my_client_id());