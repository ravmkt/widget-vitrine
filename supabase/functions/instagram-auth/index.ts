import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, store_id } = await req.json();

    if (!code || !store_id) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros "code" e "store_id" são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APP_ID = Deno.env.get('INSTAGRAM_APP_ID') || '4361903077394793';
    const APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') || '7163d5d8fddb725d19f12c20f47f71db';
    const REDIRECT_URI = 'https://app.vidlytics.com.br/api/auth/instagram/callback';

    // 1. Troca o código temporário pelo Short-Lived Access Token
    const formData = new FormData();
    formData.append('client_id', APP_ID);
    formData.append('client_secret', APP_SECRET);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', REDIRECT_URI);
    formData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Erro na troca do token Meta:', tokenData);
      throw new Error(tokenData.error_message || 'Falha ao obter token do Instagram.');
    }

    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    // 2. Troca o Short-Lived Token por um Long-Lived Access Token (válido por 60 dias)
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortLivedToken}`;
    const longLivedResp = await fetch(longLivedUrl);
    const longLivedData = await longLivedResp.json();

    const finalAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Resgata informações básicas do perfil do usuário
    const profileUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${finalAccessToken}`;
    const profileResp = await fetch(profileUrl);
    const profileData = await profileResp.json();

    // 4. Salva ou atualiza a integração na tabela store_integrations do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase.from('store_integrations').upsert({
      store_id: store_id,
      platform: 'instagram',
      access_token: finalAccessToken,
      account_id: instagramUserId || profileData.id,
      account_username: profileData.username || 'instagram_user',
      updated_at: new Date().toISOString(),
    });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        username: profileData.username,
        message: 'Instagram conectado com sucesso!',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Erro na Edge Function de Autenticação:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno de servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
