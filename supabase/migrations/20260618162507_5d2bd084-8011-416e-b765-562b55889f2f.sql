CREATE TABLE public.pack_moods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('feliz','neutro','triste')),
  mood_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mood_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pack_moods TO authenticated;
GRANT ALL ON public.pack_moods TO service_role;

ALTER TABLE public.pack_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all pack moods"
  ON public.pack_moods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own mood"
  ON public.pack_moods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood"
  ON public.pack_moods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood"
  ON public.pack_moods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_pack_moods_date ON public.pack_moods(mood_date);

CREATE TRIGGER pack_moods_updated_at
  BEFORE UPDATE ON public.pack_moods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();