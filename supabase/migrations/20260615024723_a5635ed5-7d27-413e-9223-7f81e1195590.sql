ALTER TABLE public.meeting_minutes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Rascunho',
  ADD COLUMN IF NOT EXISTS internal_responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_minutes
  DROP CONSTRAINT IF EXISTS meeting_minutes_status_check;

ALTER TABLE public.meeting_minutes
  ADD CONSTRAINT meeting_minutes_status_check
  CHECK (status IN ('Rascunho','Revisada','Enviada ao cliente','Aprovada','Arquivada'));

CREATE INDEX IF NOT EXISTS meeting_minutes_status_idx ON public.meeting_minutes(status);
CREATE INDEX IF NOT EXISTS meeting_minutes_meeting_date_idx ON public.meeting_minutes(meeting_date DESC);
CREATE INDEX IF NOT EXISTS meeting_minutes_client_id_idx ON public.meeting_minutes(client_id);
CREATE INDEX IF NOT EXISTS meeting_minutes_project_id_idx ON public.meeting_minutes(project_id);