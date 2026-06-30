-- Fix search_path and revoke public execution for notification functions
ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;

ALTER FUNCTION public.on_task_change_notify() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.on_task_change_notify() FROM PUBLIC;

ALTER FUNCTION public.on_project_insert_notify() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.on_project_insert_notify() FROM PUBLIC;

ALTER FUNCTION public.on_minute_insert_notify() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.on_minute_insert_notify() FROM PUBLIC;

ALTER FUNCTION public.on_intelligent_central_insert_notify() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.on_intelligent_central_insert_notify() FROM PUBLIC;
