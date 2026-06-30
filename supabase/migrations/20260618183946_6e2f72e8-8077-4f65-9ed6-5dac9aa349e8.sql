
-- Enums
CREATE TYPE public.gam_leader_category AS ENUM (
  'extraordinary_execution','loyalty','leadership_by_example','high_performance',
  'somus_culture','courage_to_solve','collaboration','evolution','ownership','exceptional_result'
);
CREATE TYPE public.gam_rarity AS ENUM ('bronze','silver','gold','legendary');
CREATE TYPE public.gam_redemption_status AS ENUM ('pending','approved','rejected','delivered');
CREATE TYPE public.gam_mission_status AS ENUM ('active','completed','expired','cancelled');
CREATE TYPE public.gam_user_mission_status AS ENUM ('in_progress','completed','failed');

-- Helper: is internal (not client)?
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master','project_manager','consultant'));
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master');
$$;

-- 1. gamification_profiles
CREATE TABLE public.gamification_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_stars INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'Filhote da Alcateia',
  ranking_position INTEGER,
  leader_stars_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_profiles TO authenticated;
GRANT ALL ON public.gamification_profiles TO service_role;
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read profiles" ON public.gamification_profiles FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage profiles" ON public.gamification_profiles FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());
CREATE TRIGGER trg_gam_profiles_updated BEFORE UPDATE ON public.gamification_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. gamification_points
CREATE TABLE public.gamification_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_points TO authenticated;
GRANT ALL ON public.gamification_points TO service_role;
ALTER TABLE public.gamification_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read points" ON public.gamification_points FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage points" ON public.gamification_points FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 3. gamification_pins
CREATE TABLE public.gamification_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unlock_criteria TEXT,
  icon TEXT,
  rarity public.gam_rarity NOT NULL DEFAULT 'bronze',
  stars_required INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_pins TO authenticated;
GRANT ALL ON public.gamification_pins TO service_role;
ALTER TABLE public.gamification_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read pins" ON public.gamification_pins FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage pins" ON public.gamification_pins FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 4. gamification_user_pins
CREATE TABLE public.gamification_user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_id UUID NOT NULL REFERENCES public.gamification_pins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_type TEXT,
  source_id UUID,
  UNIQUE(user_id, pin_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_user_pins TO authenticated;
GRANT ALL ON public.gamification_user_pins TO service_role;
ALTER TABLE public.gamification_user_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read user pins" ON public.gamification_user_pins FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage user pins" ON public.gamification_user_pins FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 5. gamification_missions
CREATE TABLE public.gamification_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  stars_reward INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status public.gam_mission_status NOT NULL DEFAULT 'active',
  criteria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_missions TO authenticated;
GRANT ALL ON public.gamification_missions TO service_role;
ALTER TABLE public.gamification_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read missions" ON public.gamification_missions FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage missions" ON public.gamification_missions FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());
CREATE TRIGGER trg_gam_missions_updated BEFORE UPDATE ON public.gamification_missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. gamification_user_missions
CREATE TABLE public.gamification_user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.gamification_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.gam_user_mission_status NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  stars_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mission_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_user_missions TO authenticated;
GRANT ALL ON public.gamification_user_missions TO service_role;
ALTER TABLE public.gamification_user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read user missions" ON public.gamification_user_missions FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage user missions" ON public.gamification_user_missions FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 7. gamification_rewards
CREATE TABLE public.gamification_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  stars_cost INTEGER NOT NULL,
  stock INTEGER,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_rewards TO authenticated;
GRANT ALL ON public.gamification_rewards TO service_role;
ALTER TABLE public.gamification_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read rewards" ON public.gamification_rewards FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage rewards" ON public.gamification_rewards FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());
CREATE TRIGGER trg_gam_rewards_updated BEFORE UPDATE ON public.gamification_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. gamification_reward_redemptions
CREATE TABLE public.gamification_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.gamification_rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars_cost INTEGER NOT NULL,
  status public.gam_redemption_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_reward_redemptions TO authenticated;
GRANT ALL ON public.gamification_reward_redemptions TO service_role;
ALTER TABLE public.gamification_reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read redemptions" ON public.gamification_reward_redemptions FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "user creates own redemption" ON public.gamification_reward_redemptions FOR INSERT TO authenticated WITH CHECK (public.is_internal_user() AND auth.uid() = user_id AND status = 'pending');
CREATE POLICY "master manage redemptions" ON public.gamification_reward_redemptions FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- 9. gamification_leader_stars
CREATE TABLE public.gamification_leader_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  reason TEXT NOT NULL,
  category public.gam_leader_category NOT NULL,
  rarity public.gam_rarity NOT NULL DEFAULT 'bronze',
  bonus_stars INTEGER NOT NULL DEFAULT 25,
  public_message TEXT,
  internal_note TEXT,
  related_pin_id UUID REFERENCES public.gamification_pins(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification_leader_stars TO authenticated;
GRANT ALL ON public.gamification_leader_stars TO service_role;
ALTER TABLE public.gamification_leader_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read leader stars" ON public.gamification_leader_stars FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY "master manage leader stars" ON public.gamification_leader_stars FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());

-- Trigger: when leader star inserted, also add to points + bump profile counter
CREATE OR REPLACE FUNCTION public.on_leader_star_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.gamification_points(user_id, points_amount, reason, source_type, source_id, awarded_by)
  VALUES (NEW.user_id, NEW.bonus_stars, COALESCE(NEW.title, 'Estrela do Líder'), 'leader_star', NEW.id, NEW.awarded_by);

  INSERT INTO public.gamification_profiles(user_id, total_stars, leader_stars_count)
  VALUES (NEW.user_id, NEW.bonus_stars, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET total_stars = public.gamification_profiles.total_stars + NEW.bonus_stars,
        leader_stars_count = public.gamification_profiles.leader_stars_count + 1,
        updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_leader_star_inserted AFTER INSERT ON public.gamification_leader_stars
FOR EACH ROW EXECUTE FUNCTION public.on_leader_star_inserted();

-- Trigger: when points inserted (non-leader path), bump profile total
CREATE OR REPLACE FUNCTION public.on_points_inserted_bump_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.source_type = 'leader_star' THEN
    RETURN NEW; -- already handled
  END IF;
  INSERT INTO public.gamification_profiles(user_id, total_stars)
  VALUES (NEW.user_id, NEW.points_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET total_stars = public.gamification_profiles.total_stars + NEW.points_amount,
        updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_points_bump_profile AFTER INSERT ON public.gamification_points
FOR EACH ROW EXECUTE FUNCTION public.on_points_inserted_bump_profile();

-- Seed pins (basic catalog)
INSERT INTO public.gamification_pins (name, category, description, unlock_criteria, icon, rarity, stars_required) VALUES
('Lobo Executor','Execução','Conclui tarefas com consistência','Concluir 20 tarefas no prazo','zap','bronze',50),
('Caçador de Prazo','Execução','Nunca passa do deadline','5 entregas consecutivas no prazo','target','silver',100),
('Missão Cumprida','Execução','Completou uma missão semanal','Concluir 1 missão','flag','bronze',0),
('Alta Performance','Performance','Bate metas com folga','Superar meta individual','trending-up','gold',300),
('Lobo de Resultado','Performance','Resultados acima da média','Top 3 do mês','award','silver',200),
('Batida de Meta','Performance','Atingiu a meta do mês','Bater meta individual','crosshair','silver',150),
('Ritmo de Alcateia','Consistência','Constante toda semana','4 semanas sem pendência','activity','silver',150),
('Constância Brutal','Consistência','Mantém o padrão alto','12 semanas consecutivas','infinity','gold',400),
('Disciplina de Ferro','Consistência','Rotina impecável','Zero atrasos no trimestre','shield','gold',500),
('Lealdade da Alcateia','Cultura','Vive a cultura SOMUS','Reconhecimento da liderança','heart','silver',0),
('Espírito SOMUS','Cultura','Representa o que somos','Indicação por pares','sparkles','silver',0),
('Guardião da Cultura','Cultura','Protege os valores da casa','Estrela do Líder em Cultura','shield-check','gold',0),
('Lobo Parceiro','Colaboração','Sempre ajuda o bando','Ajudar 5 colegas','users','bronze',50),
('Mentor da Alcateia','Colaboração','Forma novos lobos','Mentoria interna','graduation-cap','gold',300),
('Time Primeiro','Colaboração','Coloca o time na frente','Indicação coletiva','users-round','silver',150),
('Lobo em Evolução','Evolução','Cresce a cada ciclo','Subir de nível','arrow-up-circle','bronze',0),
('Mente Afiada','Evolução','Aprende continuamente','3 treinamentos no trimestre','brain','silver',100),
('Upgrade Desbloqueado','Evolução','Nova habilidade adquirida','Certificação relevante','rocket','gold',200),
('Lobo Alfa da Semana','Especial','Destaque absoluto da semana','Top 1 semanal','crown','gold',0),
('Destaque da Alcateia','Especial','Reconhecido pela liderança','Indicação semanal','star','silver',0),
('Honra SOMUS','Especial','Honra máxima da casa','Concessão especial','medal','legendary',0),
('Jogador Caro','Especial','Vale ouro para o time','Performance + cultura','gem','legendary',800),
('Escolhido da Alcateia','Estrela do Líder','Recebeu uma Estrela do Líder','1 Estrela do Líder','sparkles','silver',0),
('Lobo de Confiança','Estrela do Líder','Reconhecimento múltiplo','2 Estrelas do Líder','handshake','gold',0),
('Braço Direito','Estrela do Líder','Apoio fundamental','3 Estrelas do Líder','hand','gold',0),
('Sangue de Líder','Estrela do Líder','Lidera pelo exemplo','1 Estrela do Líder Ouro','flame','gold',0),
('Lenda Viva da Alcateia','Estrela do Líder','Lenda viva da casa','1 Estrela do Líder Lendária','trophy','legendary',0),
('Lealdade Inabalável','Estrela do Líder','Lealdade reconhecida','Estrela do Líder em Lealdade','shield-heart','gold',0),
('Dono da Missão','Estrela do Líder','Atitude de dono','Estrela do Líder em Ownership','briefcase','gold',0),
('Executor Implacável','Estrela do Líder','Execução extraordinária','Estrela do Líder em Execução','swords','gold',0),
('Lobo que Eleva o Bando','Estrela do Líder','Eleva todos ao redor','Estrela do Líder em Colaboração','users','gold',0);
