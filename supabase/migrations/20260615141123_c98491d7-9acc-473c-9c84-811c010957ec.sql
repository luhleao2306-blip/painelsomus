
CREATE TABLE public.collaborator_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'master' CHECK (role IN ('master','project_manager','consultant')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_invites TO authenticated;
GRANT ALL ON public.collaborator_invites TO service_role;

ALTER TABLE public.collaborator_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters manage invites"
ON public.collaborator_invites
FOR ALL
TO authenticated
USING (public.get_my_role() = 'master')
WITH CHECK (public.get_my_role() = 'master');

CREATE TRIGGER trg_collab_invites_updated_at
BEFORE UPDATE ON public.collaborator_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_collaborator_invites_token ON public.collaborator_invites(token);
