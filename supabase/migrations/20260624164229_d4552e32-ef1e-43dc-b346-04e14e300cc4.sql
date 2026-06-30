
CREATE OR REPLACE FUNCTION public.bolao_recalc_match_points(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m RECORD;
  b RECORD;
  pts INTEGER;
BEGIN
  SELECT * INTO m FROM public.bolao_matches WHERE id = _match_id;
  IF m.score_a IS NULL OR m.score_b IS NULL THEN RETURN; END IF;
  FOR b IN SELECT * FROM public.bolao_bets WHERE match_id = _match_id LOOP
    IF b.guess_a = m.score_a AND b.guess_b = m.score_b THEN
      pts := 10;
    ELSE
      pts := 0;
    END IF;
    UPDATE public.bolao_bets SET points = pts WHERE id = b.id;
  END LOOP;
END;
$function$;

-- Recalcula todas as partidas já finalizadas com a nova regra
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.bolao_matches WHERE score_a IS NOT NULL AND score_b IS NOT NULL LOOP
    PERFORM public.bolao_recalc_match_points(r.id);
  END LOOP;
END $$;
