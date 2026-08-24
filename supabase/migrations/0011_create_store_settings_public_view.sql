-- 1. Remove a view antiga de forma limpa para evitar conflitos de colunas
DROP VIEW IF EXISTS public.store_settings_public CASCADE;

-- 2. Cria a view do zero com as colunas necessárias para o Widget
CREATE VIEW public.store_settings_public AS
SELECT 
    store_id, 
    auto_approve_comments, 
    whatsapp_number, 
    whatsapp_message, 
    whatsapp_message_template, 
    store_name, 
    logo_url
FROM public.store_settings;

-- 3. Restaura as permissões de leitura do widget
GRANT SELECT ON public.store_settings_public TO anon;
GRANT SELECT ON public.store_settings_public TO authenticated;
