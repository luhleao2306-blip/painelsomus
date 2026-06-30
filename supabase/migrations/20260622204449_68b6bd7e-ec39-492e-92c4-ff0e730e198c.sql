
-- Subtasks for missions: anyone in the team can claim and complete one,
-- and the claimer gets 100 points when completed.

CREATE TABLE IF NOT EXISTS public.gamification_mission_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.gamification_missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open', -- open | claimed | completed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_mission_subtasks TO authenticated;
GRANT ALL ON public.gamification_mission_subtasks TO service_role;

ALTER TABLE public.gamification_mission_subtasks ENABLE ROW LEVEL SECURITY;

-- All internal users see subtasks
CREATE POLICY "internal read mission subtasks"
  ON public.gamification_mission_subtasks FOR SELECT
  TO authenticated
  USING (public.is_internal_user());

-- Master can insert/delete subtasks
CREATE POLICY "master insert mission subtasks"
  ON public.gamification_mission_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master());

CREATE POLICY "master delete mission subtasks"
  ON public.gamification_mission_subtasks FOR DELETE
  TO authenticated
  USING (public.is_master());

-- Any internal user can update (to claim/release/complete); master can update anything
CREATE POLICY "internal update mission subtasks"
  ON public.gamification_mission_subtasks FOR UPDATE
  TO authenticated
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

CREATE TRIGGER trg_mission_subtasks_updated_at
  BEFORE UPDATE ON public.gamification_mission_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Award 100 points to claimer when a subtask becomes completed
CREATE OR REPLACE FUNCTION public.on_mission_subtask_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission_name text;
  v_recipient uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    v_recipient := COALESCE(NEW.claimed_by, NEW.completed_by, auth.uid());
    IF v_recipient IS NULL THEN
      RETURN NEW;
    END IF;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    SELECT name INTO v_mission_name FROM public.gamification_missions WHERE id = NEW.mission_id;
    INSERT INTO public.gamification_points(user_id, points_amount, reason, source_type, source_id, awarded_by)
    VALUES (
      v_recipient,
      100,
      'Subtarefa concluída: ' || COALESCE(NEW.title, '') || ' (missão ' || COALESCE(v_mission_name, '') || ')',
      'mission_subtask',
      NEW.id,
      v_recipient
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mission_subtask_award
  BEFORE UPDATE ON public.gamification_mission_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.on_mission_subtask_completed();
