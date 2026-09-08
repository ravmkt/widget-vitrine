-- 1. Adicionar colunas necessárias na tabela plans se não existirem
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS videos_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS allows_live boolean DEFAULT false;

-- 2. Atualizar ou inserir os 3 planos padrão do Vidlytics
-- Desativa planos legados que não sejam os 3 oficiais
UPDATE public.plans SET is_active = false WHERE slug NOT IN ('starter', 'pro', 'scale');

-- Inserir / Atualizar Starter
INSERT INTO public.plans (name, slug, price_cents, billing_cycle, views_limit, pages_limit, videos_limit, storage_limit_bytes, allows_live, is_popular, is_active)
VALUES (
  'Starter',
  'starter',
  6700,
  'monthly',
  5000,
  2,
  10,
  5368709120, -- 5GB
  false,
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  billing_cycle = EXCLUDED.billing_cycle,
  views_limit = EXCLUDED.views_limit,
  pages_limit = EXCLUDED.pages_limit,
  videos_limit = EXCLUDED.videos_limit,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  allows_live = EXCLUDED.allows_live,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active;

-- Inserir / Atualizar Pro
INSERT INTO public.plans (name, slug, price_cents, billing_cycle, views_limit, pages_limit, videos_limit, storage_limit_bytes, allows_live, is_popular, is_active)
VALUES (
  'Pro',
  'pro',
  12700,
  'monthly',
  20000,
  10,
  30,
  16106127360, -- 15GB
  true,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  billing_cycle = EXCLUDED.billing_cycle,
  views_limit = EXCLUDED.views_limit,
  pages_limit = EXCLUDED.pages_limit,
  videos_limit = EXCLUDED.videos_limit,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  allows_live = EXCLUDED.allows_live,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active;

-- Inserir / Atualizar Scale
INSERT INTO public.plans (name, slug, price_cents, billing_cycle, views_limit, pages_limit, videos_limit, storage_limit_bytes, allows_live, is_popular, is_active)
VALUES (
  'Scale',
  'scale',
  24700,
  'monthly',
  60000,
  9999,
  100,
  53687091200, -- 50GB
  true,
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  billing_cycle = EXCLUDED.billing_cycle,
  views_limit = EXCLUDED.views_limit,
  pages_limit = EXCLUDED.pages_limit,
  videos_limit = EXCLUDED.videos_limit,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  allows_live = EXCLUDED.allows_live,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active;

-- 3. Criar a tabela de Lives para Live Commerce
CREATE TABLE IF NOT EXISTS public.lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  is_active boolean NOT NULL DEFAULT false,
  badge_text text DEFAULT 'AO VIVO AGORA',
  badge_color text DEFAULT '#ff0033',
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  instagram_url text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela lives
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lives
DROP POLICY IF EXISTS "Lojista gerencia suas lives" ON public.lives;
CREATE POLICY "Lojista gerencia suas lives" ON public.lives
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Público visualiza lives ativas" ON public.lives;
CREATE POLICY "Público visualiza lives ativas" ON public.lives
  FOR SELECT
  USING (is_active = true);

-- Índice para busca rápida de lives ativas pelo widget
CREATE INDEX IF NOT EXISTS idx_lives_store_active ON public.lives (store_id, is_active, status);
