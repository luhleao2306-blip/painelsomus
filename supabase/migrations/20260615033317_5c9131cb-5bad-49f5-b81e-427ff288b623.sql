
-- Add time tracking to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS time_invested_seconds integer NOT NULL DEFAULT 0;

-- Sessions table
CREATE TABLE IF NOT EXISTS public.task_time_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  is_manual boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_time_sessions_task ON public.task_time_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_sessions_user ON public.task_time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_sessions_open ON public.task_time_sessions(task_id, user_id) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_time_sessions TO authenticated;
GRANT ALL ON public.task_time_sessions TO service_role;

ALTER TABLE public.task_time_sessions ENABLE ROW LEVEL SECURITY;

-- View: own sessions OR manager/master sees all
CREATE POLICY "view sessions"
ON public.task_time_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_manager());

-- Insert: only as self
CREATE POLICY "insert own sessions"
ON public.task_time_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update: owner can close own session; managers can edit any
CREATE POLICY "update sessions"
ON public.task_time_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_manager())
WITH CHECK (user_id = auth.uid() OR public.is_manager());

-- Delete: managers only
CREATE POLICY "delete sessions"
ON public.task_time_sessions FOR DELETE TO authenticated
USING (public.is_manager());

CREATE TRIGGER trg_task_time_sessions_updated_at
BEFORE UPDATE ON public.task_time_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recalculate task.time_invested_seconds from sessions
CREATE OR REPLACE FUNCTION public.recalc_task_time(_task_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tasks
  SET time_invested_seconds = COALESCE((
    SELECT SUM(duration_seconds)::int FROM public.task_time_sessions WHERE task_id = _task_id
  ), 0)
  WHERE id = _task_id;
$$;

CREATE OR REPLACE FUNCTION public.on_task_time_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_task_time(OLD.task_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_task_time(NEW.task_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_recalc_task_time
AFTER INSERT OR UPDATE OR DELETE ON public.task_time_sessions
FOR EACH ROW EXECUTE FUNCTION public.on_task_time_session_change();

-- Block completion without invested time
CREATE OR REPLACE FUNCTION public.enforce_task_completion_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total int;
BEGIN
  IF NEW.status IN ('Concluída','Concluido','Concluída ','done','Done','completed','Completed')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT COALESCE(SUM(duration_seconds),0) + COALESCE((
      SELECT SUM(EXTRACT(EPOCH FROM (now() - started_at))::int)
      FROM public.task_time_sessions WHERE task_id = NEW.id AND ended_at IS NULL
    ),0)
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

DROP TRIGGER IF EXISTS trg_enforce_task_completion_time ON public.tasks;
CREATE TRIGGER trg_enforce_task_completion_time
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_completion_time();
