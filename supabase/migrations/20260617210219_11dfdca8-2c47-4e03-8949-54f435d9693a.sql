DROP TRIGGER IF EXISTS enforce_task_completion_time_trigger ON public.tasks;
DROP TRIGGER IF EXISTS trg_enforce_task_completion_time ON public.tasks;
DROP TRIGGER IF EXISTS enforce_task_completion_time ON public.tasks;
DROP FUNCTION IF EXISTS public.enforce_task_completion_time() CASCADE;