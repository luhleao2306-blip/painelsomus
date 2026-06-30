CREATE OR REPLACE FUNCTION public.enforce_task_time_before_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_seconds bigint;
BEGIN
  IF NEW.status = 'Concluído' AND (OLD.status IS DISTINCT FROM 'Concluído') THEN
    SELECT COALESCE(SUM(duration_seconds), 0)
      INTO total_seconds
      FROM public.task_time_sessions
      WHERE task_id = NEW.id AND duration_seconds IS NOT NULL;
    IF total_seconds <= 0 THEN
      RAISE EXCEPTION 'É necessário registrar o tempo investido antes de concluir esta tarefa.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_task_time_before_completion ON public.tasks;
CREATE TRIGGER trg_enforce_task_time_before_completion
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_time_before_completion();