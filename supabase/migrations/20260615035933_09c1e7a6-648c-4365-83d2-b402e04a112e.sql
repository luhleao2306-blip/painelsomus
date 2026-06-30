CREATE TABLE public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.process_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.process_pops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_steps_process ON public.process_steps(process_id, position);
CREATE INDEX idx_process_pops_process ON public.process_pops(process_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_pops TO authenticated;
GRANT ALL ON public.processes TO service_role;
GRANT ALL ON public.process_steps TO service_role;
GRANT ALL ON public.process_pops TO service_role;

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_pops ENABLE ROW LEVEL SECURITY;

-- Processes: everyone authenticated reads. Managers manage all, creators manage own.
CREATE POLICY "Authenticated read processes"
ON public.processes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert processes"
ON public.processes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or manager update processes"
ON public.processes FOR UPDATE TO authenticated
USING (public.is_manager() OR created_by = auth.uid())
WITH CHECK (public.is_manager() OR created_by = auth.uid());

CREATE POLICY "Manager delete processes"
ON public.processes FOR DELETE TO authenticated
USING (public.is_manager());

-- Steps: inherit process visibility/edit
CREATE POLICY "Authenticated read steps"
ON public.process_steps FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage steps when can edit process"
ON public.process_steps FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id
    AND (public.is_manager() OR p.created_by = auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id
    AND (public.is_manager() OR p.created_by = auth.uid()))
);

-- POPs: read all authenticated, add/remove if can edit process
CREATE POLICY "Authenticated read pops"
ON public.process_pops FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage pops when can edit process"
ON public.process_pops FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id
    AND (public.is_manager() OR p.created_by = auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id
    AND (public.is_manager() OR p.created_by = auth.uid()))
);

CREATE TRIGGER set_processes_updated_at
BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_process_steps_updated_at
BEFORE UPDATE ON public.process_steps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();