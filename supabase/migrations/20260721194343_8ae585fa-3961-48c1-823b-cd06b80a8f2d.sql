
CREATE OR REPLACE FUNCTION public.submit_public_form(
  _token text,
  _form_id text,
  _form_name text,
  _form_snapshot jsonb,
  _answers jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.public_form_shares WHERE token = _token) THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.public_form_submissions (token, form_id, form_name, form_snapshot, answers)
  VALUES (_token, _form_id, _form_name, _form_snapshot, _answers)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_form(text, text, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_form(text, text, text, jsonb, jsonb) TO anon, authenticated;
