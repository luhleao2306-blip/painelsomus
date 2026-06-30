
-- Matches
CREATE TABLE public.bolao_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL DEFAULT 'grupos',
  group_name TEXT,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  team_a_flag TEXT,
  team_b_flag TEXT,
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  score_a INTEGER,
  score_b INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bolao_matches TO authenticated;
GRANT ALL ON public.bolao_matches TO service_role;
ALTER TABLE public.bolao_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view matches" ON public.bolao_matches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage matches" ON public.bolao_matches
  FOR ALL TO authenticated
  USING (public.is_collab_admin())
  WITH CHECK (public.is_collab_admin());

CREATE TRIGGER bolao_matches_updated_at BEFORE UPDATE ON public.bolao_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bets
CREATE TABLE public.bolao_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.bolao_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guess_a INTEGER NOT NULL CHECK (guess_a >= 0),
  guess_b INTEGER NOT NULL CHECK (guess_b >= 0),
  amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  paid BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bolao_bets TO authenticated;
GRANT ALL ON public.bolao_bets TO service_role;
ALTER TABLE public.bolao_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bets" ON public.bolao_bets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own bets before kickoff" ON public.bolao_bets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bolao_matches m
      WHERE m.id = match_id AND m.kickoff_at > now()
    )
  );

CREATE POLICY "Users update own bets before kickoff" ON public.bolao_bets
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bolao_matches m WHERE m.id = match_id AND m.kickoff_at > now())
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers update any bet" ON public.bolao_bets
  FOR UPDATE TO authenticated
  USING (public.is_collab_admin()) WITH CHECK (public.is_collab_admin());

CREATE POLICY "Users delete own bets before kickoff" ON public.bolao_bets
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bolao_matches m WHERE m.id = match_id AND m.kickoff_at > now())
  );

CREATE TRIGGER bolao_bets_updated_at BEFORE UPDATE ON public.bolao_bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: compute points when a match result is set
-- Rules: placar exato = 10, acerto do vencedor + saldo de gols = 7,
--        acerto só do vencedor/empate = 5, errou = 0
CREATE OR REPLACE FUNCTION public.bolao_recalc_match_points(_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    ELSIF sign(b.guess_a - b.guess_b) = sign(m.score_a - m.score_b)
          AND (b.guess_a - b.guess_b) = (m.score_a - m.score_b) THEN
      pts := 7;
    ELSIF sign(b.guess_a - b.guess_b) = sign(m.score_a - m.score_b) THEN
      pts := 5;
    ELSE
      pts := 0;
    END IF;
    UPDATE public.bolao_bets SET points = pts WHERE id = b.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.bolao_after_match_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.score_a IS DISTINCT FROM OLD.score_a OR NEW.score_b IS DISTINCT FROM OLD.score_b THEN
    PERFORM public.bolao_recalc_match_points(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER bolao_match_score_trg
  AFTER UPDATE ON public.bolao_matches
  FOR EACH ROW EXECUTE FUNCTION public.bolao_after_match_update();

-- Seed: jogos fase de grupos Copa do Mundo 2026
INSERT INTO public.bolao_matches (phase, group_name, team_a, team_b, kickoff_at, venue) VALUES
('grupos','A','México','Canadá','2026-06-11 21:00-03','Estádio Azteca - Cidade do México'),
('grupos','A','EUA','Equador','2026-06-12 22:00-03','SoFi Stadium - Los Angeles'),
('grupos','B','Argentina','Polônia','2026-06-13 18:00-03','MetLife Stadium - Nova York'),
('grupos','B','Brasil','Croácia','2026-06-14 17:00-03','Mercedes-Benz Stadium - Atlanta'),
('grupos','C','França','Marrocos','2026-06-15 16:00-03','AT&T Stadium - Dallas'),
('grupos','C','Inglaterra','Portugal','2026-06-16 21:00-03','BMO Field - Toronto'),
('grupos','D','Alemanha','Japão','2026-06-17 19:00-03','BC Place - Vancouver'),
('grupos','D','Espanha','Senegal','2026-06-18 22:00-03','Estadio Akron - Guadalajara'),
('grupos','E','Países Baixos','Uruguai','2026-06-19 17:00-03','Levi''s Stadium - San Francisco'),
('grupos','E','Bélgica','Coreia do Sul','2026-06-20 20:00-03','Hard Rock Stadium - Miami'),
('grupos','F','Itália','Austrália','2026-06-21 18:00-03','Estadio BBVA - Monterrey'),
('grupos','F','Colômbia','Suíça','2026-06-22 21:00-03','NRG Stadium - Houston'),
('grupos','G','Dinamarca','Egito','2026-06-23 16:00-03','Gillette Stadium - Boston'),
('grupos','G','Uruguai','Gana','2026-06-24 19:00-03','Lincoln Financial Field - Filadélfia'),
('grupos','H','Suécia','Nigéria','2026-06-25 22:00-03','Lumen Field - Seattle'),
('grupos','H','Áustria','Chile','2026-06-26 20:00-03','Arrowhead Stadium - Kansas City'),
-- Segunda rodada
('grupos','A','México','EUA','2026-06-27 21:00-03','Estádio Azteca - Cidade do México'),
('grupos','A','Canadá','Equador','2026-06-28 18:00-03','BC Place - Vancouver'),
('grupos','B','Brasil','Argentina','2026-06-29 17:00-03','MetLife Stadium - Nova York'),
('grupos','B','Croácia','Polônia','2026-06-30 16:00-03','Mercedes-Benz Stadium - Atlanta'),
('grupos','C','França','Inglaterra','2026-07-01 21:00-03','AT&T Stadium - Dallas'),
('grupos','C','Portugal','Marrocos','2026-07-02 19:00-03','BMO Field - Toronto'),
('grupos','D','Alemanha','Espanha','2026-07-03 22:00-03','SoFi Stadium - Los Angeles'),
('grupos','D','Japão','Senegal','2026-07-04 17:00-03','Estadio Akron - Guadalajara');
