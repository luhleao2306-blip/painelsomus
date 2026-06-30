ALTER TABLE public.gamification_rewards
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS reference_value_cents integer,
  ADD COLUMN IF NOT EXISTS reward_type text,
  ADD COLUMN IF NOT EXISTS unlock_threshold_stars integer,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;