
-- 1. Revoke EXECUTE from PUBLIC on SECURITY DEFINER functions; grant explicitly

-- Helpers used inside RLS (need authenticated only)
REVOKE EXECUTE ON FUNCTION
  public.is_master(),
  public.is_manager(),
  public.is_collab_admin(),
  public.is_internal_user(),
  public.get_my_role(),
  public.get_my_client_id(),
  public.get_my_full_name(),
  public.can_access_task(uuid),
  public.can_manage_task(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.is_master(),
  public.is_manager(),
  public.is_collab_admin(),
  public.is_internal_user(),
  public.get_my_role(),
  public.get_my_client_id(),
  public.get_my_full_name(),
  public.can_access_task(uuid),
  public.can_manage_task(uuid)
TO authenticated, service_role;

-- Token-based public functions (anon + authenticated)
REVOKE EXECUTE ON FUNCTION
  public.get_briefing_by_token(uuid),
  public.get_contract_by_token(text),
  public.get_onboarding_invite(text),
  public.sign_contract(text, text, text, text, text),
  public.save_briefing_progress(uuid, jsonb),
  public.submit_briefing_by_token(uuid, jsonb),
  public.submit_onboarding(text, jsonb, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.get_briefing_by_token(uuid),
  public.get_contract_by_token(text),
  public.get_onboarding_invite(text),
  public.sign_contract(text, text, text, text, text),
  public.save_briefing_progress(uuid, jsonb),
  public.submit_briefing_by_token(uuid, jsonb),
  public.submit_onboarding(text, jsonb, text)
TO anon, authenticated, service_role;

-- Authenticated-only definer functions
REVOKE EXECUTE ON FUNCTION
  public.claim_habit_reward(uuid),
  public.bolao_award_champion(),
  public.create_task_mention(uuid, uuid[], text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.claim_habit_reward(uuid),
  public.bolao_award_champion(),
  public.create_task_mention(uuid, uuid[], text, text)
TO authenticated, service_role;

-- 2. collaborators: restrict full access + financial PII to masters; expose safe view to internal
DROP POLICY IF EXISTS "Admins manage collaborators" ON public.collaborators;

CREATE POLICY "Masters manage collaborators"
  ON public.collaborators FOR ALL TO authenticated
  USING (public.is_master()) WITH CHECK (public.is_master());

-- Safe listing RPC (non-financial fields) for internal users
CREATE OR REPLACE FUNCTION public.list_collaborators_public()
RETURNS TABLE (
  id uuid,
  full_name text,
  display_name text,
  birth_date date,
  job_title text,
  avatar_url text,
  profile_id uuid,
  status text,
  department text,
  role_function text,
  profile_avatar_url text,
  profile_avatar_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.display_name, c.birth_date, c.job_title,
         c.avatar_url, c.profile_id, c.status, c.department, c.role_function,
         p.avatar_url, p.avatar_key
  FROM public.collaborators c
  LEFT JOIN public.profiles p ON p.id = c.profile_id
  WHERE public.is_internal_user();
$$;

REVOKE EXECUTE ON FUNCTION public.list_collaborators_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_collaborators_public() TO authenticated, service_role;

-- 3. gamification habits/checkins/awards/followers + pack_moods: scope SELECT to owner or admin
DROP POLICY IF EXISTS "Authenticated can view all habits" ON public.gamification_habits;
CREATE POLICY "View own or admin habits"
  ON public.gamification_habits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_collab_admin()
    OR EXISTS (
      SELECT 1 FROM public.gamification_habit_followers f
      WHERE f.habit_id = gamification_habits.id AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated can view all checkins" ON public.gamification_habit_checkins;
CREATE POLICY "View own or admin checkins"
  ON public.gamification_habit_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_collab_admin());

DROP POLICY IF EXISTS "Authenticated can view habit awards" ON public.gamification_habit_awards;
CREATE POLICY "View own or admin awards"
  ON public.gamification_habit_awards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_collab_admin());

DROP POLICY IF EXISTS "Authenticated can view followers" ON public.gamification_habit_followers;
CREATE POLICY "View habit followers if involved"
  ON public.gamification_habit_followers FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_collab_admin()
    OR EXISTS (
      SELECT 1 FROM public.gamification_habits h
      WHERE h.id = gamification_habit_followers.habit_id AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated can read all pack moods" ON public.pack_moods;
CREATE POLICY "View own or admin pack moods"
  ON public.pack_moods FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_collab_admin());

-- 4. op_senhas: remove from Realtime publication (prevents broadcast of credentials)
ALTER PUBLICATION supabase_realtime DROP TABLE public.op_senhas;

-- 5. profiles: only managers see all internal profiles; consultants only see themselves + managers
DROP POLICY IF EXISTS "Internal users can view active profiles" ON public.profiles;

CREATE POLICY "Internal profile visibility (scoped)"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      public.is_manager()
      OR (
        public.is_internal_user()
        AND (id = auth.uid() OR role IN ('master','project_manager'))
      )
    )
  );

-- 6. public_form_shares: remove blanket public SELECT; expose via SECURITY DEFINER RPC by token
DROP POLICY IF EXISTS "Anyone can read form shares by token" ON public.public_form_shares;

CREATE OR REPLACE FUNCTION public.get_public_form_share(_token text)
RETURNS TABLE (form jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT form FROM public.public_form_shares WHERE token = _token LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_form_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_form_share(text) TO anon, authenticated, service_role;
