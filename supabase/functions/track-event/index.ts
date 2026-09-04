import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const ALLOWED_EVENTS = new Set([
  "video_view", "cta_click", "product_view", "story_complete", 
  "product_click", "share", "next_video", "video_close", 
  "whatsapp_click", "website_click", "like", "unlike", "comment",
]);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    let rawOrigin = req.headers.get("origin") || req.headers.get("referer") || "unknown_origin";

    const body = await req.json().catch(() => ({}));
    const { storeId, eventType, videoId, productId, storyId, pageUrl, deviceType, pagePath } = body;

    if (!storeId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return new Response(JSON.stringify({ error: "Payload inválido ou tipo de evento não permitido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sanitizedPageUrl = pageUrl ? String(pageUrl).slice(0, 2048) : null;
    const sanitizedPagePath = pagePath ? String(pagePath).slice(0, 512) : "/";
    const sanitizedDevice = deviceType ? String(deviceType).slice(0, 32) : "desktop";

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, url, subscription_status, trial_ends_at, past_due_since")
      .eq("id", storeId)
      .limit(1)
      .maybeSingle();

    if (storeError) {
      console.error("Erro ao buscar store:", storeError);
      return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: storeSettings } = await supabaseAdmin
      .from("store_settings")
      .select("store_url")
      .eq("store_id", storeId)
      .limit(1)
      .maybeSingle();

    function evaluateStoreBlock(s: any): boolean {
      if (!s) return true;
      const status = String(s.subscription_status || "").toLowerCase().trim();
      if (status === "canceled" || status === "unpaid") return true;
      if (status === "past_due") {
        if (!s.past_due_since) return true;
        const gracePeriodMs = 72 * 60 * 60 * 1000;
        const pastDueTime = new Date(s.past_due_since).getTime();
        if (isNaN(pastDueTime)) return true;
        return (Date.now() - pastDueTime) > gracePeriodMs;
      }
      if (status === "trialing") {
        if (!s.trial_ends_at) return true;
        return new Date(s.trial_ends_at).getTime() <= Date.now();
      }
      if (status === "active") return false;
      return true;
    }

    if (!store || evaluateStoreBlock(store)) {
      return new Response(JSON.stringify({ error: "Loja inativa ou com assinatura bloqueada." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const originHost = new URL(rawOrigin).hostname.toLowerCase();
      const rawStoreUrl = storeSettings?.store_url || store.url;
      const storeHost = new URL(rawStoreUrl.startsWith("http") ? rawStoreUrl : `https://${rawStoreUrl}`).hostname.toLowerCase();
      const isDevEnvironment = Deno.env.get("ENVIRONMENT") === "development" || Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1");
      const isLocalhostBypass = isDevEnvironment && (originHost === "localhost" || originHost === "127.0.0.1");
      
      const isAuthorizedDomain = isLocalhostBypass || originHost === storeHost || originHost.endsWith(`.${storeHost}`);

      if (!isAuthorizedDomain) {
        return new Response(JSON.stringify({ error: "Origem não autorizada para esta loja." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (_) {
      return new Response(JSON.stringify({ error: "Formato do cabeçalho de origem inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cfIp = req.headers.get("cf-connecting-ip");
    const realIp = req.headers.get("x-real-ip");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const lastForwardedIp = forwardedFor ? forwardedFor.split(",").map((s) => s.trim()).filter(Boolean).pop() : null;
    const clientIp = cfIp || realIp || lastForwardedIp || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${clientIp}-${userAgent}-${storeId}`));
    const clientHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);

    const { data: allowed, error: rpcError } = await supabaseAdmin.rpc("track_widget_event", {
      p_store_id: storeId,
      p_event_type: eventType,
      p_video_id: videoId || null,
      p_product_id: productId || null,
      p_device_type: sanitizedDevice,
      p_page_path: sanitizedPagePath,
      p_client_hash: clientHash,
    });

    if (rpcError) {
      console.error("Erro no RPC track_widget_event:", rpcError);
      return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Erro inesperado em track-event:", err?.message, err?.stack);
    return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
