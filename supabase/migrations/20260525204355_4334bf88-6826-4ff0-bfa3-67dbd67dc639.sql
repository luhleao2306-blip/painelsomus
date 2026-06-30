-- The current schema already supports multiple users linked to the same client_id in the profiles table.
-- We just need to ensure the RLS policies and logic handle this correctly.

-- Ensure the projects table has RLS and policies that allow client users to see projects of their company
-- First, check if RLS is enabled on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy for client users to view projects of their own company
CREATE POLICY "Clients can view their company projects" 
ON public.projects 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE client_id = projects.client_id
  )
);

-- Ensure tasks table has similar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their company tasks" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE client_id = tasks.client_id
  )
);

-- Ensure documents table has similar RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their company documents" 
ON public.documents 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE client_id = documents.client_id
  )
);
