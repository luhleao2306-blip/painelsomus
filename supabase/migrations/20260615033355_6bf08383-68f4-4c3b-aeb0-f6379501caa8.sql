
CREATE OR REPLACE FUNCTION public.enforce_task_completion_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total int;
BEGIN
  IF NEW.status IN ('Concluído','Concluída','Concluido','done','Done','completed','Completed')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT COALESCE(SUM(duration_seconds),0)
    INTO v_total
    FROM public.task_time_sessions WHERE task_id = NEW.id;

    IF COALESCE(v_total,0) <= 0 AND COALESCE(NEW.time_invested_seconds,0) <= 0 THEN
      RAISE EXCEPTION 'Informe ou registre o tempo investido antes de concluir esta tarefa.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
