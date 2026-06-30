
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_client_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
