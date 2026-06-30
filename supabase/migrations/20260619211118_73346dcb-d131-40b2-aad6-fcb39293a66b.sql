
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_points TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_user_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_leader_stars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_missions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_user_missions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_reward_redemptions TO authenticated;
GRANT ALL ON public.gamification_points TO service_role;
GRANT ALL ON public.gamification_profiles TO service_role;
GRANT ALL ON public.gamification_user_pins TO service_role;
GRANT ALL ON public.gamification_pins TO service_role;
GRANT ALL ON public.gamification_leader_stars TO service_role;
GRANT ALL ON public.gamification_missions TO service_role;
GRANT ALL ON public.gamification_user_missions TO service_role;
GRANT ALL ON public.gamification_rewards TO service_role;
GRANT ALL ON public.gamification_reward_redemptions TO service_role;
