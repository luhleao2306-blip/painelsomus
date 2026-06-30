CREATE OR REPLACE FUNCTION public.on_task_change_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_title TEXT;
  v_description TEXT;
  v_manager_id UUID;
  v_assignee_uuid UUID;
BEGIN
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

  BEGIN
    v_assignee_uuid := NULLIF(NEW.assignee, '')::uuid;
  EXCEPTION WHEN others THEN
    v_assignee_uuid := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    IF v_assignee_uuid IS NOT NULL THEN
      PERFORM public.create_notification(
        v_assignee_uuid,
        'Nova tarefa atribuída',
        'Você foi atribuído à tarefa: ' || NEW.title || ' (' || COALESCE(v_client_name,'') || ')',
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_title := 'Status da tarefa alterado';
    v_description := 'A tarefa "' || NEW.title || '" mudou para: ' || NEW.status;

    IF v_assignee_uuid IS NOT NULL THEN
      PERFORM public.create_notification(
        v_assignee_uuid,
        v_title,
        v_description,
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;

    SELECT manager_id INTO v_manager_id FROM public.clients WHERE id = NEW.client_id;
    IF v_manager_id IS NOT NULL AND (v_assignee_uuid IS NULL OR v_manager_id != v_assignee_uuid) THEN
       PERFORM public.create_notification(
        v_manager_id,
        v_title,
        v_description,
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;