-- Simplify intelligent_central audience to 3 client-focused options
UPDATE public.intelligent_central
SET audience = CASE
  WHEN audience IN ('all', 'clients') THEN 'all_clients'
  ELSE 'self'
END,
audience_user_ids = '{}'::uuid[]
WHERE audience NOT IN ('self', 'all_clients', 'specific_clients');

ALTER TABLE public.intelligent_central ALTER COLUMN audience SET DEFAULT 'self';

DROP POLICY IF EXISTS "Users can view items by audience" ON public.intelligent_central;

CREATE POLICY "Users can view items by audience"
ON public.intelligent_central
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    created_by = auth.uid()
    OR is_manager()
    OR (audience = 'all_clients' AND get_my_role() = 'client')
    OR (audience = 'specific_clients' AND get_my_role() = 'client' AND get_my_client_id() = ANY(audience_user_ids))
  )
);