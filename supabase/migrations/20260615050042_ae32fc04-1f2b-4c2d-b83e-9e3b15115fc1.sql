ALTER TABLE public.process_steps
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS approver TEXT,
  ADD COLUMN IF NOT EXISTS on_approval TEXT;