-- 1. Tabela de chat da live (bidirecional: público + loja)
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  is_from_store boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Lojista gerencia (ler, responder, moderar/excluir) mensagens da própria loja
DROP POLICY IF EXISTS "Lojista gerencia chat da sua live" ON public.live_chat_messages;
CREATE POLICY "Lojista gerencia chat da sua live" ON public.live_chat_messages
  FOR ALL
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
  );

-- Público pode ler mensagens de lives ativas
DROP POLICY IF EXISTS "Público lê chat de lives ativas" ON public.live_chat_messages;
CREATE POLICY "Público lê chat de lives ativas" ON public.live_chat_messages
  FOR SELECT
  USING (
    live_id IN (SELECT id FROM public.lives WHERE is_active = true)
  );

-- Público pode inserir mensagens em lives ativas (chat aberto, sem is_from_store)
DROP POLICY IF EXISTS "Público envia mensagem em live ativa" ON public.live_chat_messages;
CREATE POLICY "Público envia mensagem em live ativa" ON public.live_chat_messages
  FOR INSERT
  WITH CHECK (
    is_from_store = false
    AND live_id IN (SELECT id FROM public.lives WHERE is_active = true)
  );

CREATE INDEX IF NOT EXISTS idx_live_chat_live_id ON public.live_chat_messages (live_id, created_at);

-- 2. Coluna de produto em destaque (spotlight) — controle 100% visual, não afeta estoque
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS spotlight_product_id uuid;

-- 3. Habilitar Realtime nas tabelas necessárias
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lives;
