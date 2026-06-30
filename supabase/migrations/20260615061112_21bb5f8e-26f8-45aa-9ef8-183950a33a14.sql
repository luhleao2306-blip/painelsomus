
-- Schedules
CREATE TABLE public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT SELECT ON public.work_schedules TO anon;
GRANT ALL ON public.work_schedules TO service_role;

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active public schedules"
  ON public.work_schedules FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND is_active = true);

CREATE POLICY "Authenticated can view all schedules"
  ON public.work_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert schedules"
  ON public.work_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can update schedules"
  ON public.work_schedules FOR UPDATE
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can delete schedules"
  ON public.work_schedules FOR DELETE
  TO authenticated
  USING (public.is_manager());

CREATE TRIGGER trg_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items
CREATE TABLE public.work_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.work_schedules(id) ON DELETE CASCADE,
  scheduled_date timestamptz NOT NULL,
  title text NOT NULL,
  theme text,
  description text,
  duration_minutes integer DEFAULT 60,
  location text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedule_items TO authenticated;
GRANT SELECT ON public.work_schedule_items TO anon;
GRANT ALL ON public.work_schedule_items TO service_role;

ALTER TABLE public.work_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view items of public schedules"
  ON public.work_schedule_items FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.work_schedules s
    WHERE s.id = schedule_id AND s.is_public = true AND s.is_active = true
  ));

CREATE POLICY "Authenticated can view all items"
  ON public.work_schedule_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert items"
  ON public.work_schedule_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can update items"
  ON public.work_schedule_items FOR UPDATE
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can delete items"
  ON public.work_schedule_items FOR DELETE
  TO authenticated
  USING (public.is_manager());

CREATE TRIGGER trg_work_schedule_items_updated_at
  BEFORE UPDATE ON public.work_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_work_schedule_items_schedule ON public.work_schedule_items(schedule_id, scheduled_date);
CREATE INDEX idx_work_schedules_token ON public.work_schedules(public_token);
