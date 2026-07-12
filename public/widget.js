(function() {
  if (window.__vc_widget_initialized) return;
  window.__vc_widget_initialized = true;

  const config = window.VIDLYTICS_CONFIG || {};
  const storeId = config.storeId || null;
  const supabaseUrl = config.supabaseUrl || null;
  const supabaseAnonKey = config.supabaseAnonKey || null;

  const getStorageItem = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const setStorageItem = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  };

  const trackMetric = async (metric) => {
    const fallbackMetrics = getStorageItem('vidlytics_metrics', []);
    const nextMetric = {
      id: crypto.randomUUID(),
      store_id: storeId,
      story_id: metric.story_id || null,
      video_id: metric.video_id || null,
      product_id: metric.product_id || null,
      event_type: metric.event_type,
      page_url: metric.page_url || window.location.href,
      device_type: metric.device_type || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      browser: metric.browser || navigator.userAgent,
      referrer: metric.referrer || document.referrer || null,
      created_at: new Date().toISOString(),
    };

    fallbackMetrics.push(nextMetric);
    setStorageItem('vidlytics_metrics', fallbackMetrics);

    if (!storeId || !supabaseUrl || !supabaseAnonKey) return;

    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/metrics`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          store_id: storeId,
          story_id: metric.story_id || null,
          video_id: metric.video_id || null,
          product_id: metric.product_id || null,
          event_type: metric.event_type,
          page_url: metric.page_url || window.location.href,
          device_type: metric.device_type || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
          browser: metric.browser || navigator.userAgent,
          referrer: metric.referrer || document.referrer || null,
        }),
      });

      if (!response.ok) throw new Error('metrics insert failed');
    } catch (e) {}
  };

  window.VIDLYTICS_TRACK = trackMetric;

  const resolveStoryId = (story) => story && story.id ? story.id : null;
  const resolveVideoId = (video) => video && video.id ? video.id : null;

  const readConfigStories = () => getStorageItem('vidlytics_stories', []).filter((story) => !storeId || story.store_id === storeId);
  const readConfigVideos = () => getStorageItem('vidlytics_videos', []).filter((video) => !storeId || video.store_id === storeId);

  const init = () => {
    const stories = readConfigStories();
    if (!stories.length) return;

    stories.forEach((story) => {
      const triggerView = () => trackMetric({ event_type: 'view', story_id: resolveStoryId(story) });
      triggerView();
      window.addEventListener('scroll', () => {
        if (window.scrollY > 200) trackMetric({ event_type: 'play', story_id: resolveStoryId(story) });
      }, { passive: true });
    });

    const videos = readConfigVideos();
    const clickTargets = document.querySelectorAll('[data-vidlytics-video-id]');
    clickTargets.forEach((node) => {
      node.addEventListener('click', () => {
        const videoId = node.getAttribute('data-vidlytics-video-id') || null;
        const video = videos.find((item) => item.id === videoId);
        trackMetric({ event_type: 'click', story_id: video ? video.story_id : null, video_id: resolveVideoId(video) });
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();