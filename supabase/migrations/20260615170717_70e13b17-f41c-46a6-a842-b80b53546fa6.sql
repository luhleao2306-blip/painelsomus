
CREATE TABLE public.password_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  username TEXT,
  password TEXT NOT NULL,
  url TEXT,
  category TEXT,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_entries TO authenticated;
GRANT ALL ON public.password_entries TO service_role;

ALTER TABLE public.password_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master only access"
ON public.password_entries
FOR ALL
TO authenticated
USING (public.get_my_role() = 'master')
WITH CHECK (public.get_my_role() = 'master');

CREATE TRIGGER trg_password_entries_updated_at
BEFORE UPDATE ON public.password_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
