
CREATE TABLE public.somus_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  openai_assistant_id TEXT NOT NULL,
  icon TEXT DEFAULT 'sparkles',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.somus_agents TO authenticated;
GRANT ALL ON public.somus_agents TO service_role;
ALTER TABLE public.somus_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active somus agents"
  ON public.somus_agents FOR SELECT
  TO authenticated
  USING (is_active OR public.is_master());

CREATE POLICY "Masters manage somus agents"
  ON public.somus_agents FOR ALL
  TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

CREATE TRIGGER update_somus_agents_updated_at
  BEFORE UPDATE ON public.somus_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.somus_conversations
  ADD COLUMN agent_id UUID REFERENCES public.somus_agents(id) ON DELETE SET NULL;
