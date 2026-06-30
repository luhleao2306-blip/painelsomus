CREATE OR REPLACE FUNCTION public.log_meeting_minute_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changes jsonb := '{}'::jsonb;
  v_user_id uuid := auth.uid();
  v_user_name text;
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
  END IF;
  IF NEW.meeting_date IS DISTINCT FROM OLD.meeting_date THEN
    v_changes := v_changes || jsonb_build_object('meeting_date', jsonb_build_object('old', OLD.meeting_date, 'new', NEW.meeting_date));
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
$function$;