
CREATE TABLE public.user_module_overrides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  PRIMARY KEY (user_id, module_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_module_overrides TO authenticated;
GRANT ALL ON public.user_module_overrides TO service_role;

ALTER TABLE public.user_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own overrides"
  ON public.user_module_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_master());

CREATE POLICY "master manages overrides"
  ON public.user_module_overrides FOR ALL
  TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());
