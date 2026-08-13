ALTER TABLE public.public_form_shares 
ADD COLUMN IF NOT EXISTS project_id text,
ADD COLUMN IF NOT EXISTS client_id text;

-- Add foreign key constraints manually if we want to maintain integrity, but using text to match the source tables
ALTER TABLE public.public_form_shares
ADD CONSTRAINT public_form_shares_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.op_projects(id) ON DELETE SET NULL,
ADD CONSTRAINT public_form_shares_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.op_folders(id) ON DELETE SET NULL;
