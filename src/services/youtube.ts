import { supabase } from "@/lib/supabase";

export interface YouTubeLiveMetadata {
  title: string;
  thumbnailUrl: string;
  videoId: string;
  scheduledStartTime?: string | null;
}

/**
 * Extrai o ID do vídeo a partir de URLs do YouTube
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

/**
 * Busca Título, Thumbnail e Data/Hora Programada da Live
 */
export const fetchYouTubeLiveDetails = async (url: string): Promise<YouTubeLiveMetadata> => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("URL do YouTube inválida");
  }

  // 1. Tenta buscar via Edge Function (que lê a data programada diretamente)
  try {
    const { data, error } = await supabase.functions.invoke("fetch-youtube-live", {
      body: { videoId },
    });

    if (!error && data && (data.title || data.scheduledStartTime)) {
      return {
        videoId,
        title: data.title || "Live sem título",
        thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        scheduledStartTime: data.scheduledStartTime || null,
      };
    }
  } catch (e) {
    console.warn("Falha ao consultar Edge Function do YouTube, usando fallback oEmbed:", e);
  }

  // 2. Fallback público via oEmbed (caso a função esteja offline ou em deploy)
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oEmbedUrl);
    if (response.ok) {
      const oembed = await response.json();
      return {
        videoId,
        title: oembed.title || "Live sem título",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        scheduledStartTime: null,
      };
    }
  } catch (err) {
    console.error("Erro no oEmbed:", err);
  }

  return {
    videoId,
    title: "",
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    scheduledStartTime: null,
  };
};
