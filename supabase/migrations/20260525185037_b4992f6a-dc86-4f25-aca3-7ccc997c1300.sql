ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_manager() SET search_path = public;
ALTER FUNCTION public.get_my_client_id() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_client_id() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_client_id() FROM anon;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_manager() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO service_role;
