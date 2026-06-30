
-- 1) Add payment fields to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_day INTEGER;

-- 2) Financial entries table
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('receita','despesa')),
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(14,2) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente','atrasado','cancelado')),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_entries_date_idx ON public.financial_entries(entry_date);
CREATE INDEX IF NOT EXISTS financial_entries_type_idx ON public.financial_entries(entry_type);
CREATE INDEX IF NOT EXISTS financial_entries_contract_idx ON public.financial_entries(contract_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage financial entries"
  ON public.financial_entries
  FOR ALL
  TO authenticated
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

CREATE TRIGGER trg_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Promote Guilherme to top gamification level
INSERT INTO public.gamification_profiles(user_id, total_stars)
VALUES ('0cd43361-e8a3-482c-a3f4-801c5070acac', 3000)
ON CONFLICT (user_id) DO UPDATE
  SET total_stars = GREATEST(public.gamification_profiles.total_stars, 3000),
      updated_at = now();
