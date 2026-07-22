const VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

/**
 * Extrai a URL do vídeo procurando em vários campos possíveis.
 */
export const getVideoUrl = (video: Record<string, any> | null): string => {
  if (!video) return '';

  return (
    video.video_url ||
    video.url ||
    video.source_url ||
    video.external_url ||
    video.file_url ||
    video.public_url ||
    video.videoUrl ||
    video.sourceUrl ||
    video.externalUrl ||
    video.fileUrl ||
    ''
  );
};

/**
 * Verifica se uma URL aponta para um arquivo de vídeo direto.
 */
export const isDirectVideoUrl = (url?: string | null): boolean => {
  if (!url) return false;

  return VIDEO_FILE_REGEX.test(url);
};

/**
 * Determina se um vídeo deve ser reproduzido via <video> HTML5
 * em vez de <iframe> (YouTube embed).
 *
 * Critérios (qualquer um):
 * 1. source_type === 'upload'
 * 2. URL contém 'supabase.co/storage'
 * 3. URL termina em .mp4, .webm, .ogg, .mov, .m4v, .m3u8
 */
export const isVideoPlayableNatively = (video: Record<string, any> | null): boolean => {
  if (!video) return false;

  const sourceType = video.source_type || video.sourceType || '';
  const url = getVideoUrl(video);

  if (sourceType === 'upload') return true;
  if (url && url.includes('supabase.co/storage')) return true;
  if (isDirectVideoUrl(url)) return true;

  return false;
};

/**
 * Extrai o ID de um vídeo do YouTube de vários formatos de URL:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/shorts/ID
 * - youtube.com/embed/ID
 */
export const extractYouTubeId = (url: string): string => {
  if (!url) return '';

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || '';
      }

      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.replace(/^\/embed\//, '').split('/')[0] || '';
      }

      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v') || '';
      }
    }
  } catch {
    return '';
  }

  return '';
};

/**
 * Gera a thumbnail do YouTube a partir de uma URL, se aplicável.
 */
export const getYouTubeThumbnailUrl = (video: Record<string, any> | null): string => {
  if (!video) return '';

  const url = getVideoUrl(video);
  const youTubeId = extractYouTubeId(url);

  return youTubeId ? `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg` : '';
};

export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok';

export const getExternalVideoData = (video: { source_type?: string; platform?: string; external_id?: string; video_url?: string; source_url?: string }) => {
  if (video.source_type === 'upload') {
    return { platform: null, externalId: '', embedUrl: null, sourceUrl: '' };
  }

  const sourceUrl = (video.source_url || video.video_url || '').trim();
  const platform = (video.platform as VideoPlatform | undefined) || null;
  const externalId = (video.external_id || '').trim();

  if (!sourceUrl) {
    return { platform: null, externalId: '', embedUrl: null, sourceUrl: '' };
  }

  const inferred = parseVideoPlatform(sourceUrl);
  const finalPlatform = platform || inferred.platform;
  const finalExternalId = externalId || inferred.externalId;

  if (!finalPlatform || !finalExternalId) {
    return { platform: finalPlatform, externalId: finalExternalId, embedUrl: null, sourceUrl };
  }

  if (finalPlatform === 'youtube') {
    return { platform: finalPlatform, externalId: finalExternalId, embedUrl: `https://www.youtube.com/embed/${finalExternalId}`, sourceUrl };
  }

  if (finalPlatform === 'instagram') {
    return { platform: finalPlatform, externalId: finalExternalId, embedUrl: `https://www.instagram.com/reel/${finalExternalId}/embed`, sourceUrl };
  }

  if (finalPlatform === 'tiktok') {
    return { platform: finalPlatform, externalId: finalExternalId, embedUrl: `https://www.tiktok.com/embed/v2/${finalExternalId}`, sourceUrl };
  }

  return { platform: finalPlatform, externalId: finalExternalId, embedUrl: null, sourceUrl };
};

export const parseVideoPlatform = (url: string): { platform: VideoPlatform | null; externalId: string; embedUrl: string; sourceUrl: string } => {
  const sourceUrl = url.trim();

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtube.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        const externalId = parsed.pathname.split('/')[2] || '';
        return { platform: 'youtube', externalId, embedUrl: externalId ? `https://www.youtube.com/embed/${externalId}` : sourceUrl, sourceUrl };
      }
      if (parsed.pathname === '/watch') {
        const externalId = parsed.searchParams.get('v') || '';
        return { platform: 'youtube', externalId, embedUrl: externalId ? `https://www.youtube.com/embed/${externalId}` : sourceUrl, sourceUrl };
      }
    }

    if (host === 'youtu.be') {
      const externalId = parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      return { platform: 'youtube', externalId, embedUrl: externalId ? `https://www.youtube.com/embed/${externalId}` : sourceUrl, sourceUrl };
    }

    if (host === 'instagram.com') {
      const match = parsed.pathname.match(/^\/(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
      if (match) {
        const externalId = match[2];
        return {
          platform: 'instagram',
          externalId,
          embedUrl: `https://www.instagram.com/${match[1]}/${externalId}/embed`,
          sourceUrl,
        };
      }
    }

    if (host === 'tiktok.com') {
      const match = parsed.pathname.match(/^\/@[A-Za-z0-9._-]+\/video\/(\d+)\/?$/);
      if (match) {
        const externalId = match[1];
        return {
          platform: 'tiktok',
          externalId,
          embedUrl: `https://www.tiktok.com/embed/v2/${externalId}`,
          sourceUrl,
        };
      }
    }

    if (host === 'vm.tiktok.com') {
      const externalId = parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      return { platform: 'tiktok', externalId, embedUrl: sourceUrl, sourceUrl };
    }
  } catch {
    return { platform: null, externalId: '', embedUrl: sourceUrl, sourceUrl };
  }

  return { platform: null, externalId: '', embedUrl: sourceUrl, sourceUrl };
};
