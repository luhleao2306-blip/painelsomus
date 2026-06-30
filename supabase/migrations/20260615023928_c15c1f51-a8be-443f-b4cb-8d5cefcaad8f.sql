CREATE OR REPLACE VIEW public.contracts_client_view
WITH (security_invoker = on) AS
SELECT
  id,
  client_id,
  project_id,
  name,
  file_path,
  external_link,
  status,
  start_date,
  end_date,
  download_enabled,
  visible_to_client,
  product,
  term_months,
  created_at,
  updated_at
FROM public.contracts;

GRANT SELECT ON public.contracts_client_view TO authenticated;
GRANT SELECT ON public.contracts_client_view TO service_role;

DROP POLICY IF EXISTS "Contracts isolation" ON public.contracts;

CREATE POLICY "Managers can read full contracts"
ON public.contracts
FOR SELECT
USING (public.is_manager());

DROP POLICY IF EXISTS "Clients can read own folder assets" ON storage.objects;
CREATE POLICY "Clients can read visible contract files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.file_path = storage.objects.name
      AND c.client_id = public.get_my_client_id()
      AND c.visible_to_client = true
      AND c.download_enabled = true
  )
);

DROP POLICY IF EXISTS "Clients can see their own assets" ON storage.objects;