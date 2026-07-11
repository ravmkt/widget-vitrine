export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok';

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
