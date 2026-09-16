-- 1. Tabela de inscritos (leads) para lembrete da live
CREATE TABLE IF NOT EXISTS public.live_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojista visualiza inscritos de suas lives" ON public.live_subscribers;
CREATE POLICY "Lojista visualiza inscritos de suas lives" ON public.live_subscribers
  FOR SELECT
  USING (
    live_id IN (
      SELECT l.id FROM public.lives l
      JOIN public.stores s ON s.id = l.store_id
      WHERE s.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Publico se inscreve em lives" ON public.live_subscribers;
CREATE POLICY "Publico se inscreve em lives" ON public.live_subscribers
  FOR INSERT
  WITH CHECK (true);

-- 2. Novos campos na tabela lives (Divulgacao, Cupom, Produtos com CTA)
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS promo_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_target_type text DEFAULT 'all' CHECK (promo_target_type IN ('all', 'home', 'url_contains', 'url_not_contains')),
  ADD COLUMN IF NOT EXISTS promo_target_value text,
  ADD COLUMN IF NOT EXISTS promo_cta_text text DEFAULT 'Assista Agora',
  ADD COLUMN IF NOT EXISTS promo_media_url text,
  ADD COLUMN IF NOT EXISTS promo_media_type text CHECK (promo_media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS whatsapp_group_url text,
  ADD COLUMN IF NOT EXISTS coupon_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS product_cta_texts jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url text;

-- 3. Tabela de eventos de metricas da live
CREATE TABLE IF NOT EXISTS public.live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'peak_viewers', 'product_click', 'sale')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojista visualiza eventos de suas lives" ON public.live_events;
CREATE POLICY "Lojista visualiza eventos de suas lives" ON public.live_events
  FOR SELECT
  USING (
    live_id IN (
      SELECT l.id FROM public.lives l
      JOIN public.stores s ON s.id = l.store_id
      WHERE s.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Publico registra eventos de lives" ON public.live_events;
CREATE POLICY "Publico registra eventos de lives" ON public.live_events
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_live_events_live_type ON public.live_events (live_id, event_type);
