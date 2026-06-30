
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, title INTO v_task FROM public.tasks WHERE id = _task_id;
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
      '/tasks?taskId=' || v_task.id::text,
      'task',
      v_task.id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_task_mention(uuid, uuid[], text, text) TO authenticated;
