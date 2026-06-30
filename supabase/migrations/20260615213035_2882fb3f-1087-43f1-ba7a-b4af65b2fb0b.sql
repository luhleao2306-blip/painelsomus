CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  -- Allow service_role / admin contexts (no auth.uid set) to bypass.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'master' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.consultant_id IS DISTINCT FROM OLD.consultant_id
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;