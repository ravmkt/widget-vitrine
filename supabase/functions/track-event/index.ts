import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const ALLOWED_EVENTS = new Set([
  "video_view",
  "cta_click",
  "product_view",
  "story_complete",
  "product_click",
  "share",
  "next_video",
  "video_close",
  "whatsapp_click",
  "website_click",
  "like",
  "unlike",
  "comment",
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

    // 1. Validação Obrigatória de Origem
    if (!rawOrigin) { rawOrigin = "unknown_origin"; // Evita bloqueio severo por AdBlockers
      return new Response(JSON.stringify({ error: "Acesso negado: Cabeçalho de origem ou referer obrigatório." }), {
        
        
      });
    }

    const body = await req.json().catch(() => ({}));
    const { storeId, eventType, videoId, productId, storyId, pageUrl, deviceType, pagePath } = body;

    // 2. Validação do Payload e Whitelist
    if (!storeId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return new Response(JSON.stringify({ error: "Payload inválido ou tipo de evento não permitido." }), {
        status: 400,
        
      });
    }

    // 3. Sanitização prévia de variáveis de ambiente/request
    const sanitizedPageUrl = pageUrl ? String(pageUrl).slice(0, 2048) : null;
    const sanitizedPagePath = pagePath ? String(pagePath).slice(0, 512) : "/";
    const sanitizedDevice = deviceType ? String(deviceType).slice(0, 32) : "desktop";

    // 4. Validação Temporal e de Status da Assinatura da Loja (Campos reais corrigidos)
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, url, subscription_status, trial_ends_at, past_due_since")
      .eq("id", storeId)
      .limit(1)
      .maybeSingle();

    if (storeError) {
      console.error("[Track Event] Erro de infraestrutura ao buscar store:", storeError);
      return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
        status: 500,
        
      });
    }

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
        
        
      });
    }

    // 5. Validação Segura de Domínio Autorizado (Bypass de localhost restrito a desenvolvimento)
    try {
      const originHost = new URL(rawOrigin).hostname.toLowerCase();
      const storeHost = new URL(store.url.startsWith("http") ? store.url : `https://${store.url}`).hostname.toLowerCase();

      const isDevEnvironment = Deno.env.get("ENVIRONMENT") === "development" || Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1");
      const isLocalhostBypass = isDevEnvironment && (originHost === "localhost" || originHost === "127.0.0.1");

      const isAuthorizedDomain =
        isLocalhostBypass ||
        originHost === storeHost ||
        originHost.endsWith(`.${storeHost}`);

      if (!isAuthorizedDomain) {
        console.warn(`[Track Event] Bloqueado: Origem '${originHost}' não corresponde à loja '${storeHost}'`);
        return new Response(JSON.stringify({ error: "Origem não autorizada para esta loja." }), {
          
          
        });
      }
    } catch (_) {
      return new Response(JSON.stringify({ error: "Formato do cabeçalho de origem inválido." }), {
        status: 400,
        
      });
    }

    // 6. Extração Segura de IP e Hash Criptográfico
    const cfIp = req.headers.get("cf-connecting-ip");
    const realIp = req.headers.get("x-real-ip");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const lastForwardedIp = forwardedFor ? forwardedFor.split(",").map((s) => s.trim()).filter(Boolean).pop() : null;
    const clientIp = cfIp || realIp || lastForwardedIp || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${clientIp}-${userAgent}-${storeId}`));
    const clientHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32);

    // 7. Ingestão Atômica no Banco via RPC protegida (Utilizando variáveis declaradas corretamente)
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
      console.error("[Track Event] Erro na RPC interna:", rpcError);
      return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
        status: 500,
        
      });
    }

    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
        status: 429,
        
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      
    });
  } catch (err: any) {
    console.error("[Track Event] Erro fatal não tratado:", err);
    return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
      status: 500,
      
    });
  }
});
