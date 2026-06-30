CREATE OR REPLACE FUNCTION public.create_task_mention(
  _task_id uuid,
  _mentioned_user_ids uuid[],
  _excerpt text,
  _context text DEFAULT 'description'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_mentioner_name text;
  v_user_id uuid;
  v_count integer := 0;
  v_excerpt text;
  v_link text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, title, project_id INTO v_task FROM public.tasks WHERE id = _task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found';
  END IF;

  IF NOT public.can_access_task(_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT full_name INTO v_mentioner_name FROM public.profiles WHERE id = auth.uid();
  v_excerpt := COALESCE(NULLIF(trim(_excerpt), ''), '');
  IF length(v_excerpt) > 240 THEN
    v_excerpt := substring(v_excerpt, 1, 237) || '...';
  END IF;

  IF v_task.project_id IS NOT NULL THEN
    v_link := '/projects/' || v_task.project_id::text || '?taskId=' || v_task.id::text;
  ELSE
    v_link := '/projects-overview?taskId=' || v_task.id::text;
  END IF;

  FOREACH v_user_id IN ARRAY _mentioned_user_ids LOOP
    IF v_user_id IS NULL OR v_user_id = auth.uid() THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.notifications (user_id, title, description, type, link, entity_type, entity_id)
    VALUES (
      v_user_id,
      COALESCE(v_mentioner_name, 'Alguém') || ' mencionou você na tarefa: ' || v_task.title,
      CASE WHEN v_excerpt = '' THEN NULL ELSE '"' || v_excerpt || '"' END,
      'mention',
      v_link,
      'task',
      v_task.id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Corrigir notificações existentes
UPDATE public.notifications n
SET link = '/projects/' || t.project_id::text || '?taskId=' || t.id::text
FROM public.tasks t
WHERE n.entity_type = 'task'
  AND n.entity_id = t.id
  AND t.project_id IS NOT NULL
  AND (n.link LIKE '/tasks?taskId=%' OR n.link LIKE '/tasks/%');