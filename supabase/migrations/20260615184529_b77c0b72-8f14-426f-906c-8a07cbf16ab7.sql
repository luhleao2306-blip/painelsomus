-- 1) Tabela de revisões
CREATE TABLE public.meeting_minute_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_by_name text,
  edited_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_mmr_minute ON public.meeting_minute_revisions(minute_id, edited_at DESC);

-- 2) Grants
GRANT SELECT ON public.meeting_minute_revisions TO authenticated;
GRANT ALL ON public.meeting_minute_revisions TO service_role;

-- 3) RLS
ALTER TABLE public.meeting_minute_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View revisions: internal team or client owner"
ON public.meeting_minute_revisions
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR public.get_my_role() = 'consultant'
  OR EXISTS (
    SELECT 1 FROM public.meeting_minutes m
    WHERE m.id = meeting_minute_revisions.minute_id
      AND m.client_id = public.get_my_client_id()
  )
);

-- 4) Trigger que captura o diff em UPDATE
CREATE OR REPLACE FUNCTION public.log_meeting_minute_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes jsonb := '{}'::jsonb;
  v_user_id uuid := auth.uid();
  v_user_name text;
BEGIN
  -- Compara campos relevantes
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
  END IF;
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    v_changes := v_changes || jsonb_build_object('date', jsonb_build_object('old', OLD.date, 'new', NEW.date));
  END IF;
  IF NEW.agenda IS DISTINCT FROM OLD.agenda THEN
    v_changes := v_changes || jsonb_build_object('agenda', jsonb_build_object('old', OLD.agenda, 'new', NEW.agenda));
  END IF;
  IF NEW.decisions IS DISTINCT FROM OLD.decisions THEN
    v_changes := v_changes || jsonb_build_object('decisions', jsonb_build_object('old', OLD.decisions, 'new', NEW.decisions));
  END IF;
  IF NEW.next_steps IS DISTINCT FROM OLD.next_steps THEN
    v_changes := v_changes || jsonb_build_object('next_steps', jsonb_build_object('old', OLD.next_steps, 'new', NEW.next_steps));
  END IF;
  IF NEW.client_pending IS DISTINCT FROM OLD.client_pending THEN
    v_changes := v_changes || jsonb_build_object('client_pending', jsonb_build_object('old', OLD.client_pending, 'new', NEW.client_pending));
  END IF;
  IF NEW.team_pending IS DISTINCT FROM OLD.team_pending THEN
    v_changes := v_changes || jsonb_build_object('team_pending', jsonb_build_object('old', OLD.team_pending, 'new', NEW.team_pending));
  END IF;
  IF NEW.attendees IS DISTINCT FROM OLD.attendees THEN
    v_changes := v_changes || jsonb_build_object('attendees', jsonb_build_object('old', to_jsonb(OLD.attendees), 'new', to_jsonb(NEW.attendees)));
  END IF;
  IF NEW.recording_link IS DISTINCT FROM OLD.recording_link THEN
    v_changes := v_changes || jsonb_build_object('recording_link', jsonb_build_object('old', OLD.recording_link, 'new', NEW.recording_link));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    v_changes := v_changes || jsonb_build_object('project_id', jsonb_build_object('old', OLD.project_id, 'new', NEW.project_id));
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.meeting_minute_revisions (minute_id, edited_by, edited_by_name, changes)
  VALUES (NEW.id, v_user_id, v_user_name, v_changes);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_meeting_minute_revision
AFTER UPDATE ON public.meeting_minutes
FOR EACH ROW
EXECUTE FUNCTION public.log_meeting_minute_revision();