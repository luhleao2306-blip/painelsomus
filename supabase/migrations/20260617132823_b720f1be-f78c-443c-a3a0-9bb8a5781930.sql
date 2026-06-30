
DO $$ BEGIN
  CREATE TYPE public.commercial_funnel_stage AS ENUM ('lead','in_contact','follow_up','meeting_scheduled','negotiating','won','lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.commercial_lead_level AS ENUM ('A','B','C');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name text NOT NULL,
  email text,
  phone text,
  architecture_office_name text,
  city text,
  state text,
  instagram text,
  website text,
  source text,
  responsible_id uuid,
  funnel_stage public.commercial_funnel_stage NOT NULL DEFAULT 'lead',
  lead_level public.commercial_lead_level NOT NULL DEFAULT 'B',
  next_follow_up_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  won_at timestamptz,
  lost_at timestamptz,
  created_by uuid DEFAULT auth.uid()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_leads TO authenticated;
GRANT ALL ON public.commercial_leads TO service_role;

ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view commercial leads"
  ON public.commercial_leads FOR SELECT
  USING (public.is_manager());

CREATE POLICY "Managers can insert commercial leads"
  ON public.commercial_leads FOR INSERT
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can update commercial leads"
  ON public.commercial_leads FOR UPDATE
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can delete commercial leads"
  ON public.commercial_leads FOR DELETE
  USING (public.is_manager());

CREATE TRIGGER trg_commercial_leads_updated_at
  BEFORE UPDATE ON public.commercial_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_commercial_leads_funnel_stage ON public.commercial_leads(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_commercial_leads_created_at ON public.commercial_leads(created_at DESC);
