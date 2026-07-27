import { supabase } from '@/lib/supabase';

/**
 * Generates a thumbnail data URL from a video by seeking to a frame.
 * Works with data URLs and same-origin/CORS-enabled URLs.
 * Returns null if extraction fails (caller should fallback to video element).
 */
export const generateVideoThumbnail = (videoUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!videoUrl || videoUrl.startsWith('blob:')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = videoUrl;

    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };

    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    };

    timeout = setTimeout(() => finish(null), 6000);

    video.onloadedmetadata = () => {
      try {
        const seekTime = Math.min(1, (video.duration || 2) * 0.25);
        video.currentTime = seekTime;
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 568;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        finish(dataUrl);
      } catch {
        finish(null);
      }
    };

    video.onerror = () => {
      finish(null);
    };
  });
};

/**
 * Fallback via Edge Function: busca thumbnail do Instagram/TikTok
 * usando oEmbed/og:image e faz upload pro bucket store-assets.
 * Só chama isso quando generateVideoThumbnail falhar (plataformas que não expõem .mp4 direto).
 */
export const fetchThumbnailViaEdgeFunction = async (
  videoUrl: string,
  storeId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-thumbnail', {
      body: { videoUrl, storeId },
    });

    if (error || !data?.thumbnailUrl) {
      console.warn('Edge Function fallback failed:', error || 'no thumbnailUrl');
      return null;
    }

    return data.thumbnailUrl;
  } catch (err) {
    console.warn('Edge Function call failed:', err);
    return null;
  }
};
