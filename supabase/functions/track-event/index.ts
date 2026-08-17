import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const ALLOWED_EVENTS = new Set([
  "video_view",
  "cta_click",
  "product_view",
  "story_complete",
  "product_click",
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
    const rawOrigin = req.headers.get("origin") || req.headers.get("referer") || "";

    // 1. Validação Obrigatória de Origem (Rejeita imediatamente bots e scripts sem headers)
    if (!rawOrigin) {
      return new Response(JSON.stringify({ error: "Acesso negado: Cabeçalho de origem ou referer obrigatório." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { storeId, eventType, videoId, productId, deviceType, pagePath } = body;

    // 2. Validação do Payload e Whitelist
    if (!storeId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return new Response(JSON.stringify({ error: "Payload inválido ou tipo de evento não permitido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Validação do Domínio da Loja
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, url, active")
      .eq("id", storeId)
      .limit(1)
      .maybeSingle();

    if (storeError || !store || !store.active) {
      return new Response(JSON.stringify({ error: "Loja inativa ou não encontrada." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const originHost = new URL(rawOrigin).hostname.toLowerCase();
      const storeHost = new URL(store.url.startsWith("http") ? store.url : `https://${store.url}`).hostname.toLowerCase();

      const isAuthorizedDomain =
        originHost === storeHost ||
        originHost.endsWith(`.${storeHost}`) ||
        originHost === "localhost" ||
        originHost === "127.0.0.1";

      if (!isAuthorizedDomain) {
        console.warn(`[Track Event] Bloqueado: Origem '${originHost}' não corresponde à loja '${storeHost}'`);
        return new Response(JSON.stringify({ error: "Origem não autorizada para esta loja." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (_) {
      return new Response(JSON.stringify({ error: "Formato do cabeçalho de origem inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Extração Segura de IP não-forjável
    const cfIp = req.headers.get("cf-connecting-ip");
    const realIp = req.headers.get("x-real-ip");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const lastForwardedIp = forwardedFor ? forwardedFor.split(",").map((s) => s.trim()).filter(Boolean).pop() : null;
    const clientIp = cfIp || realIp || lastForwardedIp || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // 5. Geração de Hash Criptográfico SHA-256
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${clientIp}-${userAgent}-${storeId}`));
    const clientHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32);

    // 6. Ingestão Atômica no Banco via RPC protegida
    const { data: allowed, error: rpcError } = await supabaseAdmin.rpc("track_widget_event", {
      p_store_id: storeId,
      p_event_type: eventType,
      p_video_id: videoId || null,
      p_product_id: productId || null,
      p_device_type: typeof deviceType === "string" ? deviceType : "desktop",
      p_page_path: typeof pagePath === "string" ? pagePath : "/",
      p_client_hash: clientHash,
    });

    if (rpcError) {
      console.error("[Track Event] Erro na RPC interna:", rpcError);
      return new Response(JSON.stringify({ error: "Falha interna ao processar evento." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Track Event] Erro fatal:", err);
    return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
