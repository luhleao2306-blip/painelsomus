UPDATE public.intelligent_central
SET audience = CASE
  WHEN audience IN ('all', 'clients') THEN 'all_clients'
  WHEN audience IN ('specific') THEN 'specific_clients'
  WHEN audience IN ('self', 'admin', 'managers', 'consultants', 'admin_managers', 'admin_managers_consultants') THEN 'self'
  ELSE audience
END;

ALTER TABLE public.intelligent_central
DROP CONSTRAINT IF EXISTS intelligent_central_audience_check;

ALTER TABLE public.intelligent_central
ADD CONSTRAINT intelligent_central_audience_check
CHECK (audience = ANY (ARRAY['self'::text, 'all_clients'::text, 'specific_clients'::text]));