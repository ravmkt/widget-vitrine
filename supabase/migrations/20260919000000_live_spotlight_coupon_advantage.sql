-- Colunas de destaque (spotlight) para cupom e vantagem, sincronizados em tempo real
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS spotlight_coupon_code text,
  ADD COLUMN IF NOT EXISTS spotlight_advantage_idx integer;
