CREATE TABLE public.public_form_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  form JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_form_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_form_shares TO authenticated;
GRANT ALL ON public.public_form_shares TO service_role;

ALTER TABLE public.public_form_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read form shares by token"
  ON public.public_form_shares FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create form shares"
  ON public.public_form_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their form shares"
  ON public.public_form_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can delete their form shares"
  ON public.public_form_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_public_form_shares_updated_at
  BEFORE UPDATE ON public.public_form_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_public_form_shares_token ON public.public_form_shares(token);