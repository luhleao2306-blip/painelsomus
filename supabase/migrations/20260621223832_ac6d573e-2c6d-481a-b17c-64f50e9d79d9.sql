
CREATE TABLE public.gamification_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outro',
  points_weight INTEGER NOT NULL DEFAULT 10,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_checkins INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_habits TO authenticated;
GRANT ALL ON public.gamification_habits TO service_role;

ALTER TABLE public.gamification_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view all habits"
  ON public.gamification_habits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own habits"
  ON public.gamification_habits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own habits"
  ON public.gamification_habits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_collab_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_collab_admin());

CREATE POLICY "Users delete own habits"
  ON public.gamification_habits FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_collab_admin());

CREATE TRIGGER update_gamification_habits_updated_at
  BEFORE UPDATE ON public.gamification_habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gamification_habit_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.gamification_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, checkin_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_habit_checkins TO authenticated;
GRANT ALL ON public.gamification_habit_checkins TO service_role;

ALTER TABLE public.gamification_habit_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view all checkins"
  ON public.gamification_habit_checkins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own checkins"
  ON public.gamification_habit_checkins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own checkins"
  ON public.gamification_habit_checkins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX gamification_habits_user_idx ON public.gamification_habits(user_id);
CREATE INDEX gamification_habit_checkins_habit_idx ON public.gamification_habit_checkins(habit_id);
