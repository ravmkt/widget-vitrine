// ── Serviço de Likes (backend + cache local) ──────────────

import { supabase } from '@/lib/supabase';

export type LikeRecord = Record<string, { liked: boolean; count: number }>;

/** Obtém fingerprint anônimo do usuário (persiste no localStorage) */
function getUserFingerprint(): string {
  let uid = localStorage.getItem('anonymous_user_id');
  if (!uid) {
    uid = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('anonymous_user_id', uid);
  }
  return uid;
}

/** Busca likes do Supabase e faz merge com cache local */
export async function fetchLikes(videoIds: string[], storeId?: string): Promise<LikeRecord> {
  const localLikes: LikeRecord = (() => {
    try {
      return JSON.parse(localStorage.getItem('story_video_likes') || '{}');
    } catch {
      return {};
    }
  })();

  if (!videoIds.length) return localLikes;

  try {
    const fingerprint = getUserFingerprint();

    const countsMap: Record<string, number> = {};
    const userLikedSet = new Set<string>();

    const { data, error } = await supabase
      .from('video_likes')
      .select('video_id, user_fingerprint')
      .in('video_id', videoIds);

    if (!error && data) {
      for (const row of data) {
        countsMap[row.video_id] = (countsMap[row.video_id] || 0) + 1;
        if (row.user_fingerprint === fingerprint) {
          userLikedSet.add(row.video_id);
        }
      }
    }

    const merged: LikeRecord = {};

    for (const id of videoIds) {
      const backendCount = countsMap[id] || 0;
      const local = localLikes[id] || { liked: false, count: 0 };

      merged[id] = {
        liked: userLikedSet.has(id) || local.liked,
        count: Math.max(backendCount, local.count),
      };
    }

    return merged;
  } catch (error) {
    console.warn('[LikesService] Falha ao buscar likes do backend, usando cache local:', error);
    return localLikes;
  }
}

/** Envia toggle de like para o backend via RPC segura (rate-limited) */
export async function toggleLike(videoId: string, liked: boolean, storeId?: string) {
  if (!storeId) throw new Error('storeId é obrigatório para toggleLike');

  const fingerprint = getUserFingerprint();

  const { data, error } = await supabase.rpc('toggle_video_like_safe', {
    p_store_id: storeId,
    p_video_id: videoId,
    p_user_fingerprint: fingerprint,
  });

  if (error) throw error;

  return data?.[0] as { likes_count: number; viewer_liked: boolean } | undefined;
}
