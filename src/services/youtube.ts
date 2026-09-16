export interface YouTubeOEmbedData {
  title: string;
  thumbnailUrl: string;
  videoId: string;
}

/**
 * Extrai o ID do video a partir de diferentes formatos de URL do YouTube
 * (watch?v=, youtu.be/, live/, embed/)
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
 * Busca titulo e thumbnail de um video/live do YouTube via oEmbed publico
 */
export const fetchYouTubeOEmbed = async (url: string): Promise<YouTubeOEmbedData> => {
  try {
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
      throw new Error('URL do YouTube invalida');
    }

    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      throw new Error('Nao foi possivel obter os dados do video do YouTube');
    }

    const data = await response.json();

    return {
      title: data.title || 'Live sem titulo',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    };
  } catch (error) {
    console.error('Erro no servico fetchYouTubeOEmbed:', error);
    throw error;
  }
};
