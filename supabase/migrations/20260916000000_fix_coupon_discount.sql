-- Corrige campo usado no front-end mas ausente na tabela lives
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS coupon_discount text;
