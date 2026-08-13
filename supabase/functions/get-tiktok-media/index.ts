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

    // 1. Resgatar o Token do TikTok salvo no seu banco de dados
    // NOTA: Ajuste 'store_integrations' e a estrutura conforme sua modelagem real do banco
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

    // 2. Chamar a API oficial do TikTok para listar os vídeos do perfil
    const tkResponse = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,video_url,download_url", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "max_count": 20
      })
    });

    if (!tkResponse.ok) {
      const errBody = await tkResponse.text();
      console.error("Erro API TikTok:", errBody);
      throw new Error(`Falha na comunicação com o TikTok: ${tkResponse.statusText}`);
    }

    const tkData = await tkResponse.json();

    // 3. Devolver os dados limpos para o React
    return new Response(JSON.stringify({ success: true, videos: tkData.data?.videos || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na Edge Function get-tiktok-media:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});