-- Update contracts table
ALTER TABLE public.contracts ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD COLUMN external_link TEXT;
ALTER TABLE public.contracts ADD COLUMN visible_to_client BOOLEAN DEFAULT true;

-- Update meeting_minutes table
ALTER TABLE public.meeting_minutes ADD COLUMN external_link TEXT;
ALTER TABLE public.meeting_minutes ADD COLUMN download_enabled BOOLEAN DEFAULT true;

-- Ensure RLS policies are up to date for new columns if necessary
-- (The existing policies already use client_id and role-based checks, so they should work)
