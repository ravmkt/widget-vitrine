CREATE OR REPLACE FUNCTION public.track_widget_event(
  p_store_id uuid,
  p_story_id uuid DEFAULT NULL::uuid,
  p_video_id uuid DEFAULT NULL::uuid,
  p_product_id uuid DEFAULT NULL::uuid,
  p_event_type text DEFAULT NULL::text,
  p_page_url text DEFAULT NULL::text,
  p_device_type text DEFAULT NULL::text,
  p_browser text DEFAULT NULL::text,
  p_referrer text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_month text;
BEGIN
  INSERT INTO public.metrics (
    store_id, story_id, video_id, product_id,
    event_type, page_url, device_type, browser, referrer, created_at
  ) VALUES (
    p_store_id, p_story_id, p_video_id, p_product_id,
    p_event_type, p_page_url, p_device_type, p_browser, p_referrer, now()
  );

  -- Corrigido: aceita tanto 'view' quanto 'video_view' (nome real do evento enviado pelo widget)
  IF p_event_type IN ('view', 'video_view') THEN
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
    RETURN false;
END;
$function$;
