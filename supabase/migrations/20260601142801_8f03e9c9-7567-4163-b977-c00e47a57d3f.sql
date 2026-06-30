
-- Add audience system to intelligent_central
ALTER TABLE public.intelligent_central
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_user_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.intelligent_central
  DROP CONSTRAINT IF EXISTS intelligent_central_audience_check;
ALTER TABLE public.intelligent_central
  ADD CONSTRAINT intelligent_central_audience_check
  CHECK (audience IN ('all','admin','managers','consultants','clients','admin_managers','admin_managers_consultants','specific'));

-- Backfill audience from previous released_to_client flag (best-effort)
UPDATE public.intelligent_central
   SET audience = 'all'
 WHERE audience IS NULL;

-- Drop old visibility policies and rebuild around audience
DROP POLICY IF EXISTS "Consultants can view allowed items" ON public.intelligent_central;
DROP POLICY IF EXISTS "Clients can view released items" ON public.intelligent_central;
DROP POLICY IF EXISTS "Users can view items by audience" ON public.intelligent_central;

CREATE POLICY "Users can view items by audience"
ON public.intelligent_central
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    created_by = auth.uid()
    OR is_manager()
    OR (audience = 'all')
    OR (audience = 'admin' AND get_my_role() = 'master')
    OR (audience = 'managers' AND get_my_role() = 'project_manager')
    OR (audience = 'consultants' AND get_my_role() = 'consultant')
    OR (audience = 'clients' AND get_my_role() = 'client')
    OR (audience = 'admin_managers' AND get_my_role() IN ('master','project_manager'))
    OR (audience = 'admin_managers_consultants' AND get_my_role() IN ('master','project_manager','consultant'))
    OR (audience = 'specific' AND auth.uid() = ANY(audience_user_ids))
  )
);
