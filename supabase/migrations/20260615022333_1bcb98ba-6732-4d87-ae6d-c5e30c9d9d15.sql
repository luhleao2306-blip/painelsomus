
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS product text,
  ADD COLUMN IF NOT EXISTS term_months integer,
  ADD COLUMN IF NOT EXISTS monthly_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS total_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status = ANY (ARRAY['Ativo','Em Renovação','Encerrado','Cancelado','Suspenso','Vigente']));

DROP TRIGGER IF EXISTS set_contracts_updated_at ON public.contracts;
CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_seller_id_idx ON public.contracts(seller_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_end_date_idx ON public.contracts(end_date);
