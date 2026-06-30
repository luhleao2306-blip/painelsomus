-- Enum de status de meta
DO $$ BEGIN
  CREATE TYPE public.goal_status AS ENUM ('rascunho','ativa','encerrada','batida','superada','nao_batida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela: metas gerais mensais
CREATE TABLE IF NOT EXISTS public.strategic_sales_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  general_goal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  general_result_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  achievement_percentage NUMERIC(7,2) GENERATED ALWAYS AS (
    CASE WHEN general_goal_amount > 0
      THEN ROUND((general_result_amount / general_goal_amount) * 100, 2)
      ELSE 0 END
  ) STORED,
  gap_amount NUMERIC(14,2) GENERATED ALWAYS AS (general_goal_amount - general_result_amount) STORED,
  status public.goal_status NOT NULL DEFAULT 'ativa',
  notes TEXT,
  responsible_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_sales_goals TO authenticated;
GRANT ALL ON public.strategic_sales_goals TO service_role;

ALTER TABLE public.strategic_sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can read strategic goals"
  ON public.strategic_sales_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users can insert strategic goals"
  ON public.strategic_sales_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth users can update strategic goals"
  ON public.strategic_sales_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users can delete strategic goals"
  ON public.strategic_sales_goals FOR DELETE TO authenticated USING (true);

-- Tabela: metas mensais por vendedor
CREATE TABLE IF NOT EXISTS public.seller_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategic_goal_id UUID REFERENCES public.strategic_sales_goals(id) ON DELETE SET NULL,
  seller_id UUID,
  seller_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  individual_goal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  individual_result_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  achievement_percentage NUMERIC(7,2) GENERATED ALWAYS AS (
    CASE WHEN individual_goal_amount > 0
      THEN ROUND((individual_result_amount / individual_goal_amount) * 100, 2)
      ELSE 0 END
  ) STORED,
  gap_amount NUMERIC(14,2) GENERATED ALWAYS AS (individual_goal_amount - individual_result_amount) STORED,
  status public.goal_status NOT NULL DEFAULT 'ativa',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_name, month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_monthly_goals TO authenticated;
GRANT ALL ON public.seller_monthly_goals TO service_role;

ALTER TABLE public.seller_monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can read seller goals"
  ON public.seller_monthly_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users can insert seller goals"
  ON public.seller_monthly_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth users can update seller goals"
  ON public.seller_monthly_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users can delete seller goals"
  ON public.seller_monthly_goals FOR DELETE TO authenticated USING (true);

-- Atualiza updated_at + status automático
CREATE OR REPLACE FUNCTION public.metas_set_status_and_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  goal NUMERIC;
  result NUMERIC;
  pct NUMERIC;
BEGIN
  NEW.updated_at := now();
  IF TG_TABLE_NAME = 'strategic_sales_goals' THEN
    goal := NEW.general_goal_amount; result := NEW.general_result_amount;
  ELSE
    goal := NEW.individual_goal_amount; result := NEW.individual_result_amount;
  END IF;
  IF goal > 0 THEN
    pct := (result / goal) * 100;
    IF pct >= 110 THEN NEW.status := 'superada';
    ELSIF pct >= 100 THEN NEW.status := 'batida';
    ELSE NEW.status := 'nao_batida';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strategic_status ON public.strategic_sales_goals;
CREATE TRIGGER trg_strategic_status BEFORE INSERT OR UPDATE ON public.strategic_sales_goals
  FOR EACH ROW EXECUTE FUNCTION public.metas_set_status_and_updated();

DROP TRIGGER IF EXISTS trg_seller_status ON public.seller_monthly_goals;
CREATE TRIGGER trg_seller_status BEFORE INSERT OR UPDATE ON public.seller_monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.metas_set_status_and_updated();

CREATE INDEX IF NOT EXISTS idx_strategic_goals_year_month ON public.strategic_sales_goals(year, month);
CREATE INDEX IF NOT EXISTS idx_seller_goals_year_month ON public.seller_monthly_goals(year, month);
CREATE INDEX IF NOT EXISTS idx_seller_goals_seller ON public.seller_monthly_goals(seller_name);