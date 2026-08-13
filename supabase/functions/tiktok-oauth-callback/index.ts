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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const storeId = url.searchParams.get("state"); // state = store_id enviado no connectTikTokAccount

    if (!code || !storeId) {
      throw new Error("Parâmetros ausentes: code ou state (store_id).");
    }

    const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
    const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";
    
    // URL exata da sua Edge Function (deve ser exatamente a mesma configurada no painel do TikTok)
    const REDIRECT_URI = "https://wznvecurmisgoaijykbt.supabase.co/functions/v1/tiktok-oauth-callback";

    if (!CLIENT_KEY || !CLIENT_SECRET) {
      throw new Error("Credenciais do TikTok não configuradas no ambiente da função.");
    }

    // 1. Troca o code pelo access_token na API oficial do TikTok
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(`Erro ao trocar código por token: ${JSON.stringify(tokenData)}`);
    }

    const {
      open_id,
      access_token,
      refresh_token,
      expires_in,
    } = tokenData;

    // 2. Busca informações básicas do usuário (username) na API do TikTok
    let username = open_id;
    try {
      const userInfoResp = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      const userInfoData = await userInfoResp.json();
      username = userInfoData?.data?.user?.username || userInfoData?.data?.user?.display_name || open_id;
    } catch (userErr) {
      console.warn("Não foi possível buscar username do TikTok:", userErr);
    }

    // 3. Calcula a data de expiração
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 4. Salva/atualiza no Supabase usando service_role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertErr } = await supabase
      .from("store_integrations")
      .upsert(
        {
          store_id: storeId,
          platform: "tiktok",
          account_id: open_id,
          account_username: username,
          access_token: access_token,
          refresh_token: refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,platform" }
      );

    if (upsertErr) throw upsertErr;

    // 5. Redireciona o usuário de volta pro painel com sucesso
    return Response.redirect(
      "https://app.vidlytics.com.br/storage?tiktok=connected",
      302
    );
  } catch (error) {
    console.error("Erro no tiktok-oauth-callback:", error);
    return Response.redirect(
      `https://app.vidlytics.com.br/storage?tiktok=error&message=${encodeURIComponent(error.message)}`,
      302
    );
  }
});