-- Cria tabela dedicada para as configurações de Live Commerce
CREATE TABLE IF NOT EXISTS public.live_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    widget_divulgacao JSONB NOT NULL DEFAULT '{}'::jsonb,
    widget_aovivo JSONB NOT NULL DEFAULT '{}'::jsonb,
    player_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT live_settings_store_id_unique UNIQUE (store_id)
);

-- Ativa RLS
ALTER TABLE public.live_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para o lojista autenticado
CREATE POLICY "Users can view own store live_settings"
    ON public.live_settings FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own store live_settings"
    ON public.live_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own store live_settings"
    ON public.live_settings FOR UPDATE
    TO authenticated
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

-- Migra dados legados existentes em store_settings para a nova tabela
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'store_settings' 
          AND column_name = 'live_widget_config'
    ) THEN
        INSERT INTO public.live_settings (store_id, widget_divulgacao, widget_aovivo, player_settings)
        SELECT 
            store_id,
            COALESCE(live_widget_config->'divulgacao', live_widget_config, '{}'::jsonb) AS widget_divulgacao,
            COALESCE(live_widget_config->'aoVivo', '{}'::jsonb) AS widget_aovivo,
            COALESCE(live_player_config, '{}'::jsonb) AS player_settings
        FROM public.store_settings
        WHERE live_widget_config IS NOT NULL OR live_player_config IS NOT NULL
        ON CONFLICT (store_id) DO NOTHING;
    END IF;
END $$;

-- View pública para o widget embeddable ler configurações de live com segurança
CREATE OR REPLACE VIEW public.public_live_settings AS
SELECT 
    ls.store_id,
    ls.widget_divulgacao,
    ls.widget_aovivo,
    ls.player_settings
FROM public.live_settings ls
JOIN public.stores s ON s.id = ls.store_id;

-- Permissões na view para o widget anônimo
GRANT SELECT ON public.public_live_settings TO anon, authenticated;
