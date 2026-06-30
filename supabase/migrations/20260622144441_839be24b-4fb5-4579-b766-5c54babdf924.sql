REVOKE EXECUTE ON FUNCTION public.can_access_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_task(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_task(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_task(uuid) TO service_role;