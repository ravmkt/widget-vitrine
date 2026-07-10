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
    video.preload = 'metadata';
    video.src = videoUrl;

    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timeout = setTimeout(() => finish(null), 6000);

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
        clearTimeout(timeout);
        finish(dataUrl);
      } catch {
        clearTimeout(timeout);
        finish(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
  });
};