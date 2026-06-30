ALTER TABLE public.bolao_bets ALTER COLUMN amount SET DEFAULT 0;
UPDATE public.bolao_bets SET amount = 0 WHERE amount <> 0;