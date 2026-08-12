import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const INTEGRATION_CONFIGS = {
  INSTAGRAM: {
    APP_ID: '4361903077394793',
    REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/instagram/callback',
    SCOPE: 'instagram_graph_user_media,instagram_graph_user_profile',
  },
  TIKTOK: {
    CLIENT_KEY: '', // Inserir quando aprovado no portal do TikTok
    REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/tiktok/callback',
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
export const connectInstagramAccount = async () => {
  const settings = await db.getSettings();
  if (!settings?.store_id) {
    alert('ID da loja não encontrado.');
    return;
  }

  const { APP_ID, REDIRECT_URI } = INTEGRATION_CONFIGS.INSTAGRAM;

  // Permissão suportada e obrigatória para a API do Instagram Graph
  const graphScopes = ['public_profile', 'instagram_basic'].join(',');

  const authUrl = `https://www.facebook.com/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(graphScopes)}&response_type=code&state=${settings.store_id}`;

  window.location.href = authUrl;
};
/**
 * Dispara o fluxo oficial OAuth do TikTok
 */
export const connectTikTokAccount = async () => {
  const settings = await db.getSettings();
  if (!settings?.store_id) {
    alert('ID da loja não encontrado.');
    return;
  }

  const { CLIENT_KEY, REDIRECT_URI, SCOPE } = INTEGRATION_CONFIGS.TIKTOK;
  if (!CLIENT_KEY) {
    alert('A integração com o TikTok está em fase de ativação no portal de desenvolvedores.');
    return;
  }

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${encodeURIComponent(
    SCOPE
  )}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${settings.store_id}`;

  window.location.href = authUrl;
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