-- 0. Garantir que as colunas existem antes de criar a view
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS live_widget_config jsonb,
  ADD COLUMN IF NOT EXISTS live_player_config jsonb;

-- Recria a view pública incluindo as colunas de aparência da Live
DROP VIEW IF EXISTS public.store_settings_public CASCADE;

CREATE VIEW public.store_settings_public AS
SELECT
    store_id,
    auto_approve_comments,
    whatsapp_number,
    whatsapp_message,
    whatsapp_message_template,
    store_name,
    logo_url,
    live_widget_config,
    live_player_config
FROM public.store_settings;

GRANT SELECT ON public.store_settings_public TO anon;
GRANT SELECT ON public.store_settings_public TO authenticated;
