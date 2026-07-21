
-- 1) Fix tautology in public_form_submissions INSERT policy
DROP POLICY IF EXISTS "Anyone can submit to an existing share" ON public.public_form_submissions;
CREATE POLICY "Anyone can submit to an existing share"
  ON public.public_form_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.public_form_shares s
      WHERE s.token = public_form_submissions.token
    )
  );

-- 2) Restrict profiles SELECT: no more "all authenticated see everyone"
DROP POLICY IF EXISTS "Authenticated can view active profiles" ON public.profiles;
-- Internal staff can view all active profiles (needed for assignees, teams, etc.)
CREATE POLICY "Internal users can view active profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND public.is_internal_user()
  );
-- Self and Master policies already exist and remain

-- 3) Avatars storage: restrict SELECT to owner's own folder
DROP POLICY IF EXISTS "Avatars: users read own" ON storage.objects;
CREATE POLICY "Avatars: users read own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-assets'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- 4) entity_attachments: scope SELECT
DROP POLICY IF EXISTS "Authenticated can view attachments" ON public.entity_attachments;
CREATE POLICY "Users view attachments they uploaded or as staff"
  ON public.entity_attachments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR public.is_internal_user()
  );

-- 5) Sales goals: restrict to internal users / managers
DROP POLICY IF EXISTS "auth users can read seller goals" ON public.seller_monthly_goals;
DROP POLICY IF EXISTS "auth users can insert seller goals" ON public.seller_monthly_goals;
DROP POLICY IF EXISTS "auth users can update seller goals" ON public.seller_monthly_goals;
DROP POLICY IF EXISTS "auth users can delete seller goals" ON public.seller_monthly_goals;

CREATE POLICY "Internal users read seller goals"
  ON public.seller_monthly_goals FOR SELECT TO authenticated
  USING (public.is_internal_user() OR seller_id = auth.uid());
CREATE POLICY "Managers insert seller goals"
  ON public.seller_monthly_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY "Managers update seller goals"
  ON public.seller_monthly_goals FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers delete seller goals"
  ON public.seller_monthly_goals FOR DELETE TO authenticated
  USING (public.is_manager());

DROP POLICY IF EXISTS "auth users can read strategic goals" ON public.strategic_sales_goals;
DROP POLICY IF EXISTS "auth users can insert strategic goals" ON public.strategic_sales_goals;
DROP POLICY IF EXISTS "auth users can update strategic goals" ON public.strategic_sales_goals;
DROP POLICY IF EXISTS "auth users can delete strategic goals" ON public.strategic_sales_goals;

CREATE POLICY "Internal users read strategic goals"
  ON public.strategic_sales_goals FOR SELECT TO authenticated
  USING (public.is_internal_user());
CREATE POLICY "Managers insert strategic goals"
  ON public.strategic_sales_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY "Managers update strategic goals"
  ON public.strategic_sales_goals FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers delete strategic goals"
  ON public.strategic_sales_goals FOR DELETE TO authenticated
  USING (public.is_manager());

-- 6) SECURITY DEFINER functions: revoke EXECUTE from PUBLIC on internal / trigger functions.
-- Trigger functions do NOT need EXECUTE grants to fire; RLS helpers keep authenticated grants.
REVOKE EXECUTE ON FUNCTION public.alcateia_news_add(uuid, text, text, text, text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.alcateia_post_weekly_leaders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bolao_after_match_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bolao_recalc_match_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_meeting_minute_revision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_contract_signed_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_habit_award_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_intelligent_central_insert_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_leader_star_inserted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_leader_star_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_minute_insert_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_mission_subtask_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_points_inserted_bump_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_project_insert_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_reward_redemption_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_seller_goal_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_task_change_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_task_time_session_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_user_pin_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_task_time(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.metas_set_status_and_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_task_time_before_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_task_time_session_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
