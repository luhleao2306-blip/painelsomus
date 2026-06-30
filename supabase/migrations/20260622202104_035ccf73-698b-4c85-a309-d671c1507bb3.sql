
-- News feed
CREATE TABLE public.alcateia_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alcateia_news TO authenticated;
GRANT ALL ON public.alcateia_news TO service_role;
ALTER TABLE public.alcateia_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_read_all" ON public.alcateia_news FOR SELECT TO authenticated USING (true);
CREATE POLICY "news_admin_write" ON public.alcateia_news FOR ALL TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());
CREATE INDEX idx_alcateia_news_created_at ON public.alcateia_news(created_at DESC);

-- Likes
CREATE TABLE public.alcateia_news_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.alcateia_news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(news_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alcateia_news_likes TO authenticated;
GRANT ALL ON public.alcateia_news_likes TO service_role;
ALTER TABLE public.alcateia_news_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_read_all" ON public.alcateia_news_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_self" ON public.alcateia_news_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_self" ON public.alcateia_news_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comments
CREATE TABLE public.alcateia_news_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.alcateia_news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alcateia_news_comments TO authenticated;
GRANT ALL ON public.alcateia_news_comments TO service_role;
ALTER TABLE public.alcateia_news_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_all" ON public.alcateia_news_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_self" ON public.alcateia_news_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_self" ON public.alcateia_news_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "comments_delete_self" ON public.alcateia_news_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_collab_admin());
CREATE INDEX idx_alcateia_news_comments_news ON public.alcateia_news_comments(news_id, created_at);

-- Helper to add a news event
CREATE OR REPLACE FUNCTION public.alcateia_news_add(
  _actor UUID, _event TEXT, _title TEXT, _desc TEXT,
  _icon TEXT, _color TEXT, _entity_type TEXT, _entity_id UUID, _meta JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.alcateia_news(actor_id, event_type, title, description, icon, color, entity_type, entity_id, metadata)
  VALUES (_actor, _event, _title, _desc, _icon, _color, _entity_type, _entity_id, COALESCE(_meta, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Trigger: user pin awarded
CREATE OR REPLACE FUNCTION public.on_user_pin_news()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_pin_name TEXT; v_pin_icon TEXT;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT name, icon INTO v_pin_name, v_pin_icon FROM public.gamification_pins WHERE id = NEW.pin_id;
  PERFORM public.alcateia_news_add(
    NEW.user_id, 'pin_awarded',
    COALESCE(v_name, 'Um lobo') || ' conquistou o selo ' || COALESCE(v_pin_name, 'novo'),
    NULL, COALESCE(v_pin_icon, 'Award'), 'amber',
    'pin', NEW.pin_id, jsonb_build_object('pin_name', v_pin_name)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_pin_news AFTER INSERT ON public.gamification_user_pins
  FOR EACH ROW EXECUTE FUNCTION public.on_user_pin_news();

-- Trigger: leader star
CREATE OR REPLACE FUNCTION public.on_leader_star_news()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.alcateia_news_add(
    NEW.user_id, 'leader_star',
    COALESCE(v_name, 'Um lobo') || ' ganhou Estrela do Líder ⭐',
    NEW.title, 'Crown', 'yellow',
    'leader_star', NEW.id,
    jsonb_build_object('bonus_stars', NEW.bonus_stars, 'rarity', NEW.rarity)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_leader_star_news AFTER INSERT ON public.gamification_leader_stars
  FOR EACH ROW EXECUTE FUNCTION public.on_leader_star_news();

-- Trigger: habit award (habit completed)
CREATE OR REPLACE FUNCTION public.on_habit_award_news()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_title TEXT;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO v_title FROM public.gamification_habits WHERE id = NEW.habit_id;
  PERFORM public.alcateia_news_add(
    NEW.user_id, 'habit_completed',
    COALESCE(v_name, 'Um lobo') || ' concluiu o hábito: ' || COALESCE(v_title, ''),
    'Recebeu ' || NEW.points || ' estrelas 🌟', 'Flame', 'orange',
    'habit', NEW.habit_id, jsonb_build_object('points', NEW.points)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_habit_award_news AFTER INSERT ON public.gamification_habit_awards
  FOR EACH ROW EXECUTE FUNCTION public.on_habit_award_news();

-- Trigger: sales goal achieved
CREATE OR REPLACE FUNCTION public.on_seller_goal_news()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  IF NEW.status IN ('batida','superada') AND (OLD.status IS NULL OR OLD.status NOT IN ('batida','superada')) THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.seller_id;
    PERFORM public.alcateia_news_add(
      NEW.seller_id, 'goal_hit',
      COALESCE(v_name, 'Um lobo') || ' bateu a meta! 🎯',
      CASE WHEN NEW.status = 'superada' THEN 'Meta superada' ELSE 'Meta batida' END,
      'Target', 'emerald', 'seller_goal', NEW.id, '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_seller_goal_news AFTER INSERT OR UPDATE ON public.seller_monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.on_seller_goal_news();
