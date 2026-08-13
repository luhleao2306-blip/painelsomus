ALTER TABLE public.public_form_submissions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.public_form_submissions ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.public_form_submissions ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.public_form_submissions ADD COLUMN IF NOT EXISTS contact_email text;