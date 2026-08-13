// trecho antigo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();

    if (!storeId) {
      throw new Error("Parâmetro storeId é obrigatório.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: integration, error: dbError } = await supabase
      .from("store_integrations")
      .select("access_token")
      .eq("store_id", storeId)
      .eq("platform", "tiktok")
      .single();

    if (dbError || !integration?.access_token) {
      throw new Error("Token de acesso do TikTok não encontrado para esta loja.");
    }

    const accessToken = integration.access_token;

    const fieldsParam = "id,title,cover_image_url,video_url";
    const tkResponse = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fieldsParam}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max_count: 20
      })
    });

    const responseText = await tkResponse.text();
    
    if (!tkResponse.ok) {
      console.error("Erro detalhado API TikTok:", responseText);
      throw new Error(`TikTok API HTTP ${tkResponse.status}: ${responseText}`);
    }

    let tkData;
    try {
      tkData = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Resposta inválida da API do TikTok: " + responseText);
    }

    if (tkData.error && tkData.error.code !== "ok") {
      throw new Error(`TikTok Error Code ${tkData.error.code}: ${tkData.error.message}`);
    }

    const videosList = tkData.data?.videos || tkData.videos || [];

    return new Response(JSON.stringify({ success: true, videos: videosList }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na Edge Function get-tiktok-media:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Retornamos 200 para o front ler o JSON de erro limpo em vez de "non-2xx"
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});