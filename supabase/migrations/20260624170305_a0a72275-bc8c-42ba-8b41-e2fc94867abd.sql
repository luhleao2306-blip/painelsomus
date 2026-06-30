
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
  match_outcome TEXT;
  guess_outcome TEXT;
BEGIN
  SELECT * INTO m FROM public.bolao_matches WHERE id = _match_id;
  IF m.score_a IS NULL OR m.score_b IS NULL THEN RETURN; END IF;

  IF m.score_a > m.score_b THEN match_outcome := 'A';
  ELSIF m.score_a < m.score_b THEN match_outcome := 'B';
  ELSE match_outcome := 'D';
  END IF;

  FOR b IN SELECT * FROM public.bolao_bets WHERE match_id = _match_id LOOP
    IF b.guess_a = m.score_a AND b.guess_b = m.score_b THEN
      pts := 10;
    ELSE
      IF b.guess_a > b.guess_b THEN guess_outcome := 'A';
      ELSIF b.guess_a < b.guess_b THEN guess_outcome := 'B';
      ELSE guess_outcome := 'D';
      END IF;
      IF guess_outcome = match_outcome THEN pts := 5; ELSE pts := 0; END IF;
    END IF;
    UPDATE public.bolao_bets SET points = pts WHERE id = b.id;
  END LOOP;
END;
$function$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.bolao_matches WHERE score_a IS NOT NULL AND score_b IS NOT NULL LOOP
    PERFORM public.bolao_recalc_match_points(r.id);
  END LOOP;
END $$;
