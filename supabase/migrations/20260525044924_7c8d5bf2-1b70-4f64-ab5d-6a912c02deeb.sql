-- Create the storage bucket for client assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Everyone (Master, Manager, Consultant, Client) can see objects if they meet criteria
-- We use folder naming convention: bucket/client_id/project_id/filename
-- or bucket/client_id/general/filename

-- 1. Master and Manager can see everything
CREATE POLICY "Master/Manager can see all assets" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('master', 'project_manager')
  )
);

-- 2. Consultant can see assets of their assigned clients
CREATE POLICY "Consultants can see assigned client assets" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.manager_id = p.id
    WHERE p.id = auth.uid() 
    AND p.role = 'consultant'
    AND (storage.foldername(name))[1] = c.id::text
  )
);

-- 3. Clients can see assets of their own client if visible_to_client is handled at DB level
-- But for storage level, we restrict by client_id folder
CREATE POLICY "Clients can see their own assets" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'client'
    AND (storage.foldername(name))[1] = profiles.client_id::text
  )
);

-- 4. Upload/Insert Policy (Master, Manager, Consultant)
CREATE POLICY "Staff can upload assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('master', 'project_manager', 'consultant')
  )
);

-- 5. Delete Policy
CREATE POLICY "Staff can delete assets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('master', 'project_manager', 'consultant')
  )
);
