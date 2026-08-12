import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const INSTAGRAM_CONFIG = {
  APP_ID: '4361903077394793',
  REDIRECT_URI: 'https://app.vidlytics.com.br/api/auth/instagram/callback',
  SCOPE: 'instagram_graph_user_media,instagram_graph_user_profile',
};

/**
 * Redireciona o lojista para a tela oficial de permissão do Instagram
 */
export const connectInstagramAccount = async () => {
  const settings = await db.getSettings();
  if (!settings?.store_id) {
    throw new Error('Loja não identificada para realizar a conexão.');
  }

  const { APP_ID, REDIRECT_URI, SCOPE } = INSTAGRAM_CONFIG;
  
  // Enviamos o store_id no parâmetro 'state' para não perder a referência da loja ao retornar
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPE)}&response_type=code&state=${settings.store_id}`;

  window.location.href = authUrl;
};

/**
 * Busca as contas sociais já conectadas na loja atual
 */
export const getConnectedIntegrations = async (storeId: string) => {
  if (!supabase || !storeId) return [];

  const { data, error } = await supabase
    .from('store_integrations')
    .select('platform, account_username, updated_at')
    .eq('store_id', storeId);

  if (error) {
    console.error('Erro ao buscar integrações conectadas:', error);
    return [];
  }

  return data || [];
};
