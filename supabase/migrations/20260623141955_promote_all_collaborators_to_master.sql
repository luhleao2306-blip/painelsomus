-- Promote all internal collaborators to master (full access)
UPDATE public.profiles
SET role = 'master', updated_at = now()
WHERE role IN ('consultant', 'project_manager');
