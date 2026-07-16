
CREATE TABLE public.public_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL REFERENCES public.public_form_shares(token) ON DELETE CASCADE,
  form_id TEXT,
  form_name TEXT,
  form_snapshot JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.public_form_submissions TO authenticated;
GRANT INSERT ON public.public_form_submissions TO anon;
GRANT ALL ON public.public_form_submissions TO service_role;

ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to an existing share"
  ON public.public_form_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.public_form_shares s WHERE s.token = token));

CREATE POLICY "Share owners can view submissions"
  ON public.public_form_submissions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.public_form_shares s WHERE s.token = public_form_submissions.token AND s.created_by = auth.uid()));

CREATE POLICY "Share owners can delete submissions"
  ON public.public_form_submissions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.public_form_shares s WHERE s.token = public_form_submissions.token AND s.created_by = auth.uid()));

CREATE TRIGGER update_public_form_submissions_updated_at
  BEFORE UPDATE ON public.public_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_public_form_submissions_token ON public.public_form_submissions(token);
CREATE INDEX idx_public_form_submissions_submitted_at ON public.public_form_submissions(submitted_at DESC);
