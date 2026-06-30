
-- 1) Prevent role/client_id/consultant_id self-escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
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
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Tighten clients SELECT policy: only managers via manager_id
DROP POLICY IF EXISTS "Clients isolation" ON public.clients;
CREATE POLICY "Clients isolation" ON public.clients
FOR SELECT
USING (
  is_manager()
  OR (is_manager() AND manager_id = auth.uid())
  OR (id = get_my_client_id())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.client_id = clients.id AND p.consultant_id = auth.uid()
  )
);

-- 3) Restrict consultant uploads to assigned client folders
DROP POLICY IF EXISTS "Staff can upload assets" ON storage.objects;
CREATE POLICY "Staff can upload assets" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-assets'
  AND (
    public.is_manager()
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'consultant')
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.consultant_id = auth.uid()
          AND p.client_id::text = (storage.foldername(name))[1]
      )
    )
  )
);
