-- ==========================================
-- VIDLYTICS - MIGRATION 0013
-- Unificação de Setores, Benchmarks e Rastreamento
-- Gerado em: 01/09/2026
-- ==========================================

-- 1. Criação da tabela física store_settings (Necessária para a view da Migration 0011)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  auto_approve_comments boolean DEFAULT true,
  whatsapp_number text,
  whatsapp_message text,
  whatsapp_message_template text,
  store_name text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS para store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de configurações" 
  ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Permitir alteração aos administradores da loja" 
  ON public.store_settings FOR ALL 
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));


-- 2. Criação da tabela de setores (Sectors)
CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS para sectors
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de setores" ON public.sectors FOR SELECT USING (true);


-- 3. Adicionar as colunas que faltavam na tabela 'stores'
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sector text;


-- 4. Criação do Trigger para manter stores.sector em sincronia com stores.sector_id de forma transparente
CREATE OR REPLACE FUNCTION public.sync_store_sector_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sector_id IS NULL THEN
    NEW.sector := NULL;
  ELSE
    SELECT slug INTO NEW.sector FROM public.sectors WHERE id = NEW.sector_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_store_sector ON public.stores;
CREATE TRIGGER trg_sync_store_sector
BEFORE INSERT OR UPDATE OF sector_id ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.sync_store_sector_slug();


-- 5. Tabelas de Benchmarks para suprir ambas as abordagens do Frontend
CREATE TABLE IF NOT EXISTS public.sector_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_key text UNIQUE NOT NULL,
  sector_name text NOT NULL,
  avg_ctr numeric(5,2) DEFAULT 0.00,
  avg_cvr numeric(5,2) DEFAULT 0.00,
  avg_hook_rate numeric(5,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid UNIQUE NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  avg_ctr numeric(5,2) DEFAULT 0.00,
  avg_cvr numeric(5,2) DEFAULT 0.00,
  avg_hook_rate numeric(5,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS para tabelas de benchmarks
ALTER TABLE public.sector_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de sector_benchmarks" ON public.sector_benchmarks FOR SELECT USING (true);
CREATE POLICY "Leitura pública de benchmarks" ON public.benchmarks FOR SELECT USING (true);


-- 6. Inserção de dados iniciais (Seed) de Setores e seus Benchmarks agregados para 2026
DO $$
DECLARE
  v_moda_id uuid := gen_random_uuid();
  v_cosmeticos_id uuid := gen_random_uuid();
  v_eletronicos_id uuid := gen_random_uuid();
  v_casa_decor_id uuid := gen_random_uuid();
BEGIN
  -- Popular Sectors
  INSERT INTO public.sectors (id, name, slug, icon, display_order) VALUES
    (v_moda_id, 'Moda e Acessórios', 'moda_acessorios', 'ShoppingBag', 1),
    (v_cosmeticos_id, 'Beleza e Cosméticos', 'beleza_cosmeticos', 'Sparkles', 2),
    (v_eletronicos_id, 'Eletrônicos e Gadgets', 'eletronicos', 'Cpu', 3),
    (v_casa_decor_id, 'Casa e Decoração', 'casa_decoracao', 'Home', 4)
  ON CONFLICT (slug) DO NOTHING;

  -- Popular Benchmarks estruturados (Abordagem por ID)
  INSERT INTO public.benchmarks (sector_id, avg_ctr, avg_cvr, avg_hook_rate) VALUES
    (v_moda_id, 3.8, 1.8, 62.5),
    (v_cosmeticos_id, 4.5, 2.1, 70.0),
    (v_eletronicos_id, 2.9, 1.2, 55.0),
    (v_casa_decor_id, 3.2, 1.5, 58.0)
  ON CONFLICT (sector_id) DO NOTHING;

  -- Popular Sector Benchmarks estruturados (Abordagem por Slug textual)
  INSERT INTO public.sector_benchmarks (sector_key, sector_name, avg_ctr, avg_cvr, avg_hook_rate) VALUES
    ('moda_acessorios', 'Moda e Acessórios', 3.80, 1.80, 62.50),
    ('beleza_cosmeticos', 'Beleza e Cosméticos', 4.50, 2.10, 70.00),
    ('eletronicos', 'Eletrônicos e Gadgets', 2.90, 1.20, 55.00),
    ('casa_decoracao', 'Casa e Decoração', 3.20, 1.50, 58.00)
  ON CONFLICT (sector_key) DO NOTHING;
END $$;


-- 7. Criação da RPC track_widget_event
CREATE OR REPLACE FUNCTION public.track_widget_event(
  p_store_id uuid,
  p_story_id uuid DEFAULT NULL,
  p_video_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_referrer text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_month text;
BEGIN
  -- Inserir o evento de tracking diretamente na tabela de métricas
  INSERT INTO public.metrics (
    store_id,
    story_id,
    video_id,
    product_id,
    event_type,
    page_url,
    device_type,
    browser,
    referrer,
    created_at
  ) VALUES (
    p_store_id,
    p_story_id,
    p_video_id,
    p_product_id,
    p_event_type,
    p_page_url,
    p_device_type,
    p_browser,
    p_referrer,
    now()
  );

  -- Se for um evento de 'view', atualiza de forma atômica o contador mensal da loja (SaaS Usage Control)
  IF p_event_type = 'view' THEN
    v_month := to_char(now(), 'YYYY-MM');
    
    INSERT INTO public.usage_counters (store_id, month, views_count, updated_at)
    VALUES (p_store_id, v_month, 1, now())
    ON CONFLICT (store_id, month)
    DO UPDATE SET 
      views_count = public.usage_counters.views_count + 1,
      updated_at = now();
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback silencioso para garantir que erros de banco não quebrem a renderização do widget do cliente
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso de execução anônimo para o Widget público do cliente
GRANT EXECUTE ON FUNCTION public.track_widget_event TO anon;
GRANT EXECUTE ON FUNCTION public.track_widget_event TO authenticated;
