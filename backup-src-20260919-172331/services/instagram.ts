import { supabase } from '@/lib/supabase';

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

/**
 * Busca as mídias (Reels/Vídeos) do perfil do Instagram conectado
 */
export const fetchInstagramMedia = async (storeId: string): Promise<InstagramMedia[]> => {
  if (!supabase) return [];

  // 1. Resgata o access_token gravado na tabela store_integrations
  const { data: integration, error: dbError } = await supabase
    .from('store_integrations')
    .select('access_token')
    .eq('store_id', storeId)
    .eq('platform', 'instagram')
    .single();

  if (dbError || !integration?.access_token) {
    throw new Error('Integração com o Instagram não encontrada ou expirada.');
  }

  // 2. Consulta a Graph API do Instagram resgatando Reels e Vídeos
  const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${integration.access_token}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Erro na Graph API do Instagram:', data.error);
    throw new Error(data.error?.message || 'Falha ao carregar vídeos do Instagram.');
  }

  // 3. Filtra apenas mídias do tipo VIDEO / REELS
  const videosOnly = (data.data || []).filter(
    (item: InstagramMedia) => item.media_type === 'VIDEO' || item.thumbnail_url
  );

  return videosOnly;
};
