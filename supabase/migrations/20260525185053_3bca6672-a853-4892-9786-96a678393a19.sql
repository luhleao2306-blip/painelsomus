-- Change helper functions to SECURITY INVOKER
ALTER FUNCTION public.is_manager() SECURITY INVOKER;
ALTER FUNCTION public.get_my_client_id() SECURITY INVOKER;
ALTER FUNCTION public.get_my_role() SECURITY INVOKER;

-- For handle_new_user, keep SECURITY DEFINER but revoke all execute permissions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
