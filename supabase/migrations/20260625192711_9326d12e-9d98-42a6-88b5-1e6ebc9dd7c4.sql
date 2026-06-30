ALTER TABLE public.client_strategic_goals
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'estrategica'
  CHECK (category IN ('estrategica', 'operacional', 'economica'));

CREATE INDEX IF NOT EXISTS idx_client_strategic_goals_category
  ON public.client_strategic_goals(client_id, category);