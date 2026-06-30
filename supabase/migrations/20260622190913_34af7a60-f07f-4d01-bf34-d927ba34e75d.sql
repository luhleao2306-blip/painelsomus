
-- 1) Photo proof on check-ins
ALTER TABLE public.gamification_habit_checkins
  ADD COLUMN IF NOT EXISTS proof_url text;

-- Backfill safe default for existing rows
UPDATE public.gamification_habit_checkins SET proof_url = '' WHERE proof_url IS NULL;
ALTER TABLE public.gamification_habit_checkins
  ALTER COLUMN proof_url SET DEFAULT '',
  ALTER COLUMN proof_url SET NOT NULL;

-- Allow multiple check-ins per day for same user? Keep current unique constraint behavior if any.
-- Ensure check-ins by ANY participant (not only owner) are allowed; existing RLS on user_id = auth.uid() already supports this.

-- 2) Followers (participants) table
CREATE TABLE IF NOT EXISTS public.gamification_habit_followers (
  habit_id uuid NOT NULL REFERENCES public.gamification_habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.gamification_habit_followers TO authenticated;
GRANT ALL ON public.gamification_habit_followers TO service_role;

ALTER TABLE public.gamification_habit_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view followers"
  ON public.gamification_habit_followers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can follow habits as themselves"
  ON public.gamification_habit_followers FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow themselves"
  ON public.gamification_habit_followers FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- 3) Per-participant awards (each member can claim the bonus once per habit)
CREATE TABLE IF NOT EXISTS public.gamification_habit_awards (
  habit_id uuid NOT NULL REFERENCES public.gamification_habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, user_id)
);

GRANT SELECT ON public.gamification_habit_awards TO authenticated;
GRANT ALL ON public.gamification_habit_awards TO service_role;

ALTER TABLE public.gamification_habit_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view habit awards"
  ON public.gamification_habit_awards FOR SELECT
  TO authenticated USING (true);

-- 4) Allow owners (and admins) to edit their habits while not completed
DROP POLICY IF EXISTS "Owners can update their habits" ON public.gamification_habits;
CREATE POLICY "Owners can update their habits"
  ON public.gamification_habits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status <> 'completed')
  WITH CHECK (user_id = auth.uid() AND status <> 'completed');

-- 5) claim_habit_reward(_habit_id): credits points to the current user if they reached the target
CREATE OR REPLACE FUNCTION public.claim_habit_reward(_habit_id uuid)
RETURNS TABLE(awarded boolean, points integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_habit RECORD;
  v_count integer;
  v_already integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN QUERY SELECT false, 0, 'not_authenticated'::text;
    RETURN;
  END IF;

  SELECT id, title, target_checkins, points_weight, status, user_id
    INTO v_habit
  FROM public.gamification_habits
  WHERE id = _habit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'habit_not_found'::text;
    RETURN;
  END IF;

  IF v_habit.status NOT IN ('active','completed') THEN
    RETURN QUERY SELECT false, 0, 'habit_not_active'::text;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.gamification_habit_checkins
  WHERE habit_id = _habit_id AND user_id = v_caller;

  IF v_count < v_habit.target_checkins THEN
    RETURN QUERY SELECT false, 0,
      ('faltam_' || (v_habit.target_checkins - v_count)::text || '_checkins')::text;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_already
  FROM public.gamification_habit_awards
  WHERE habit_id = _habit_id AND user_id = v_caller;

  IF v_already > 0 THEN
    RETURN QUERY SELECT false, 0, 'already_awarded'::text;
    RETURN;
  END IF;

  INSERT INTO public.gamification_habit_awards(habit_id, user_id, points)
  VALUES (_habit_id, v_caller, v_habit.points_weight);

  INSERT INTO public.gamification_points(user_id, points_amount, reason, source_type, source_id, awarded_by)
  VALUES (
    v_caller,
    v_habit.points_weight,
    'Hábito concluído: ' || v_habit.title,
    'habit',
    v_habit.id,
    v_caller
  );

  -- If caller is owner, also mark legacy points_awarded so old UI behaves
  IF v_habit.user_id = v_caller THEN
    UPDATE public.gamification_habits
      SET points_awarded = true,
          status = CASE WHEN status = 'active' THEN 'completed' ELSE status END
      WHERE id = _habit_id;
  END IF;

  RETURN QUERY SELECT true, v_habit.points_weight, 'ok'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_habit_reward(uuid) TO authenticated;

-- 6) Storage policies for the private habit-proofs bucket
DROP POLICY IF EXISTS "Habit proofs: user uploads own" ON storage.objects;
CREATE POLICY "Habit proofs: user uploads own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'habit-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Habit proofs: user updates own" ON storage.objects;
CREATE POLICY "Habit proofs: user updates own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'habit-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Habit proofs: user deletes own" ON storage.objects;
CREATE POLICY "Habit proofs: user deletes own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'habit-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Habit proofs: readable by uploader or internal" ON storage.objects;
CREATE POLICY "Habit proofs: readable by uploader or internal"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'habit-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_internal_user()
    )
  );
