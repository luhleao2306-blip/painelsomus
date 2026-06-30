
CREATE TABLE public.somus_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  openai_thread_id TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.somus_conversations TO authenticated;
GRANT ALL ON public.somus_conversations TO service_role;
ALTER TABLE public.somus_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own somus conversations"
  ON public.somus_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.somus_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.somus_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  openai_message_id TEXT,
  openai_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX somus_messages_conversation_idx ON public.somus_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.somus_messages TO authenticated;
GRANT ALL ON public.somus_messages TO service_role;
ALTER TABLE public.somus_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own somus messages"
  ON public.somus_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_somus_conversations_updated_at
  BEFORE UPDATE ON public.somus_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
