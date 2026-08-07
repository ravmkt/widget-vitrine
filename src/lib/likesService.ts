// ── Serviço de Likes (backend + cache local) ──────────────

import { supabase } from '@/lib/supabase';

export type LikeRecord = Record<string, { liked: boolean; count: number }>;

/** Obtém ID anônimo do usuário (persiste no localStorage) */
function getUserId(): string {
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
    const userId = getUserId();

    // Busca contagens do backend
    // (ajuste o nome da tabela conforme seu schema)
    const countsMap: Record<string, number> = {};
    const userLikedSet = new Set<string>();

    // Tenta buscar da tabela story_likes
    const { data, error } = await supabase
      .from('story_likes')
      .select('video_id, user_id')
      .in('video_id', videoIds);

    if (!error && data) {
      for (const row of data) {
        countsMap[row.video_id] = (countsMap[row.video_id] || 0) + 1;
        if (row.user_id === userId) {
          userLikedSet.add(row.video_id);
        }
      }
    }

    // Merge: backend vence, mas localStorage complementa se backend falhou
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

/** Envia toggle de like para o backend */
export async function toggleLike(videoId: string, liked: boolean, storeId?: string) {
  const userId = getUserId();

  const { error } = liked
    ? await supabase.from('story_likes').upsert({
        video_id: videoId,
        user_id: userId,
        store_id: storeId || null,
        created_at: new Date().toISOString(),
      })
    : await supabase
        .from('story_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', userId);

  if (error) throw error;
}
