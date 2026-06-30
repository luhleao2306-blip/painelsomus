
-- Reward redemption → news (when approved/delivered)
CREATE OR REPLACE FUNCTION public.on_reward_redemption_news()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_reward_name TEXT; v_reward_image TEXT;
BEGIN
  IF NEW.status IN ('approved','delivered') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT name, image_url INTO v_reward_name, v_reward_image FROM public.gamification_rewards WHERE id = NEW.reward_id;
    PERFORM public.alcateia_news_add(
      NEW.user_id, 'reward_redeemed',
      COALESCE(v_name,'Um lobo') || ' resgatou: ' || COALESCE(v_reward_name,'um prêmio') || ' 🎁',
      'Custou ' || NEW.stars_cost || ' estrelas',
      'Gift', 'pink',
      'reward_redemption', NEW.id,
      jsonb_build_object('reward_name', v_reward_name, 'image_url', v_reward_image, 'stars_cost', NEW.stars_cost)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reward_redemption_news ON public.gamification_reward_redemptions;
CREATE TRIGGER trg_reward_redemption_news
AFTER UPDATE ON public.gamification_reward_redemptions
FOR EACH ROW EXECUTE FUNCTION public.on_reward_redemption_news();

-- Contract signed → news
CREATE OR REPLACE FUNCTION public.on_contract_signed_news()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_name TEXT;
BEGIN
  IF NEW.signature_status = 'signed' AND (OLD.signature_status IS DISTINCT FROM 'signed') THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
    END IF;
    PERFORM public.alcateia_news_add(
      NULL, 'contract_signed',
      'Novo contrato fechado! 🤝',
      COALESCE('Cliente: ' || v_client_name, 'Assinado por ' || COALESCE(NEW.signed_by_name,'cliente')),
      'FileSignature', 'emerald',
      'contract', NEW.id,
      jsonb_build_object('client_name', v_client_name, 'signed_by', NEW.signed_by_name)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contract_signed_news ON public.contracts;
CREATE TRIGGER trg_contract_signed_news
AFTER UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.on_contract_signed_news();

-- Weekly leaders publisher (bolão + pontos)
CREATE OR REPLACE FUNCTION public.alcateia_post_weekly_leaders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week_start TIMESTAMPTZ := date_trunc('week', now());
  v_bolao_leader UUID; v_bolao_pts INT;
  v_points_leader UUID; v_points_total INT;
  v_name TEXT;
BEGIN
  -- Bolão leader (week)
  SELECT b.user_id, SUM(b.points)::int INTO v_bolao_leader, v_bolao_pts
  FROM public.bolao_bets b
  JOIN public.bolao_matches m ON m.id = b.match_id
  WHERE m.match_date >= v_week_start
  GROUP BY b.user_id
  ORDER BY SUM(b.points) DESC NULLS LAST
  LIMIT 1;

  IF v_bolao_leader IS NOT NULL AND COALESCE(v_bolao_pts,0) > 0 THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = v_bolao_leader;
    PERFORM public.alcateia_news_add(
      v_bolao_leader, 'bolao_weekly_leader',
      '🏆 Líder da semana no Somus Bolão: ' || COALESCE(v_name,'um lobo'),
      v_bolao_pts || ' pontos esta semana',
      'Trophy', 'amber',
      'bolao', NULL, jsonb_build_object('points', v_bolao_pts)
    );
  END IF;

  -- Points leader (week)
  SELECT user_id, SUM(points_amount)::int INTO v_points_leader, v_points_total
  FROM public.gamification_points
  WHERE created_at >= v_week_start
  GROUP BY user_id
  ORDER BY SUM(points_amount) DESC NULLS LAST
  LIMIT 1;

  IF v_points_leader IS NOT NULL AND COALESCE(v_points_total,0) > 0 THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = v_points_leader;
    PERFORM public.alcateia_news_add(
      v_points_leader, 'points_weekly_leader',
      '⭐ Líder de estrelas da semana: ' || COALESCE(v_name,'um lobo'),
      v_points_total || ' estrelas conquistadas nesta semana',
      'Star', 'yellow',
      'gamification_points', NULL, jsonb_build_object('points', v_points_total)
    );
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.alcateia_post_weekly_leaders() TO authenticated;
