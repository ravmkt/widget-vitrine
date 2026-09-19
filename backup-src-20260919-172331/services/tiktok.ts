import { supabase } from '@/lib/supabase';

export const fetchTikTokMedia = async (storeId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('get-tiktok-media', {
      body: { storeId },
    });

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'Erro ao buscar vídeos do TikTok');
    }

    return data.videos || [];
  } catch (error) {
    console.error('Erro no serviço fetchTikTokMedia:', error);
    throw error;
  }
};
