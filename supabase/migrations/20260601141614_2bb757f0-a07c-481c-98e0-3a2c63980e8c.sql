-- Create the intelligent_central table
CREATE TABLE public.intelligent_central (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Agente GPT, Dashboard, Lovable, Planilha, Ferramenta, Documento, Outro
    category TEXT,
    link_url TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'all', -- private, team, all
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    released_to_client BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Use GRANT to set permissions for different roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligent_central TO authenticated;
GRANT ALL ON public.intelligent_central TO service_role;

-- Enable Row Level Security
ALTER TABLE public.intelligent_central ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
-- Admin Master and Project Manager can do everything
CREATE POLICY "Managers can manage everything in intelligent_central"
ON public.intelligent_central
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'project_manager')
    )
);

-- Consultants can view items that are NOT private or were created by them
CREATE POLICY "Consultants can view allowed items"
ON public.intelligent_central
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'consultant' AND (
                visibility = 'all' OR visibility = 'team' OR created_by = auth.uid()
            )
        )
    )
);

-- Clients can only view items marked as released_to_client
CREATE POLICY "Clients can view released items"
ON public.intelligent_central
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
        AND released_to_client = true
        AND status = 'active'
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_intelligent_central_updated_at
BEFORE UPDATE ON public.intelligent_central
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
