
CREATE OR REPLACE FUNCTION public.bolao_award_champion()
RETURNS TABLE(user_id UUID, points INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner UUID;
  v_total INTEGER;
BEGIN
  IF NOT public.is_collab_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT b.user_id, SUM(b.points)::int
    INTO v_winner, v_total
  FROM public.bolao_bets b
  GROUP BY b.user_id
  ORDER BY SUM(b.points) DESC NULLS LAST
  LIMIT 1;

  IF v_winner IS NULL OR COALESCE(v_total, 0) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, 0, 'sem_ranking'::text;
    RETURN;
  END IF;

  INSERT INTO public.gamification_points(user_id, points_amount, reason, source_type, awarded_by)
  VALUES (v_winner, 300, 'Campeão do Somus Bolão 🏆', 'bolao_champion', auth.uid());

  INSERT INTO public.notifications(user_id, title, description, type, link)
  VALUES (v_winner, 'Você é o campeão do Somus Bolão! 🏆',
          'Recebeu 300 pontos por terminar em 1º lugar no bolão.',
          'system', '/bolao');

  RETURN QUERY SELECT v_winner, 300, 'ok'::text;
END;
$$;
