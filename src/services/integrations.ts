import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const INTEGRATION_CONFIGS = {
  INSTAGRAM: {
    APP_ID: '1780976113328436', // Instagram App ID dedicado obtido do painel da Meta
    REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/instagram/callback',
    SCOPE: 'instagram_business_basic',
  },
  TIKTOK: {
    CLIENT_KEY: 'awpnw23q9tf7b3cp',
    REDIRECT_URI: 'https://wznvecurmisgoaijykbt.supabase.co/functions/v1/tiktok-oauth-callback',
    SCOPE: 'user.info.basic,video.list',
  },
  YOUTUBE: {
    CLIENT_ID: '', // Estrutura pronta para integração do YouTube
    REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/youtube/callback',
    SCOPE: 'https://www.googleapis.com/auth/youtube.readonly',
  },
  PINTEREST: {
    APP_ID: '', // Estrutura pronta para integração do Pinterest
    REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/pinterest/callback',
    SCOPE: 'boards:read,pins:read',
  },
};

/**
 * Dispara o fluxo oficial OAuth do Instagram
 */
// trecho novo
export const connectInstagramAccount = async () => {
  const settings = await db.getSettings();
  if (!settings?.store_id) {
    alert('ID da loja não encontrado.');
    return;
  }

  const { APP_ID, REDIRECT_URI, SCOPE } = INTEGRATION_CONFIGS.INSTAGRAM;

  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=${SCOPE}&state=${settings.store_id}`;

  window.location.href = authUrl;
};
/**
 * Dispara o fluxo oficial OAuth do TikTok
 */
export const connectTikTokAccount = async () => {
  try {
    const settings = await db.getSettings();
    if (!settings?.store_id) {
      console.error('ID da loja não encontrado.');
      return;
    }

    const { CLIENT_KEY, REDIRECT_URI, SCOPE } = INTEGRATION_CONFIGS.TIKTOK;

    if (!CLIENT_KEY) {
      console.warn('A integração com o TikTok está em fase de ativação.');
      return;
    }

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&response_type=code&scope=${SCOPE}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${settings.store_id}`;

    window.location.href = authUrl;
  } catch (error) {
    console.error('Erro ao conectar com TikTok:', error);
  }
};

/**
 * Dispara a conexão para YouTube / Shorts (Em breve)
 */
export const connectYouTubeAccount = async () => {
  alert('Conexão com YouTube Shorts será ativada em breve!');
};

/**
 * Dispara a conexão para Pinterest (Em breve)
 */
export const connectPinterestAccount = async () => {
  alert('Conexão com Pinterest Pins/Ideas será ativada em breve!');
};

/**
 * Busca as plataformas já conectadas à loja atual
 */
export const getConnectedIntegrations = async (storeId: string) => {
  if (!supabase || !storeId) return [];

  const { data, error } = await supabase
    .from('store_integrations')
    .select('platform, account_username, updated_at')
    .eq('store_id', storeId);

  if (error) {
    console.error('Erro ao buscar integrações:', error);
    return [];
  }

  return data || [];
};