(function () {
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

  const supabaseFetch = async (path, options) => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
        'content-type': 'application/json',
        ...(options && options.headers ? options.headers : {}),
      },
    });
    if (!response.ok) throw new Error(`Supabase request failed: ${path}`);
    return response;
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
      await supabaseFetch('metrics', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          store_id: storeId,
          story_id: nextMetric.story_id,
          video_id: nextMetric.video_id,
          product_id: nextMetric.product_id,
          event_type: nextMetric.event_type,
          page_url: nextMetric.page_url,
          device_type: nextMetric.device_type,
          browser: nextMetric.browser,
          referrer: nextMetric.referrer,
        }),
      });
    } catch (e) {}
  };

  const readStoryVideos = async (storyIds) => {
    if (!storyIds.length || !supabaseUrl || !supabaseAnonKey) return [];
    const query = storyIds.map((id) => `story_id=eq.${encodeURIComponent(id)}`).join('&');
    const response = await supabaseFetch(`story_videos?select=* &${query}`, { method: 'GET' });
    return response ? await response.json() : [];
  };

  const readVideos = async (videoIds) => {
    if (!videoIds.length || !supabaseUrl || !supabaseAnonKey) return [];
    const response = await supabaseFetch(`videos?select=*`, {
      method: 'GET',
      headers: {
        Prefer: 'plurality=singular',
      },
    });
    const data = response ? await response.json() : [];
    return data.filter((item) => videoIds.includes(item.id));
  };

  const renderWidget = async () => {
    const storiesFallback = getStorageItem('vidlytics_stories', []).filter((story) => !storeId || story.store_id === storeId);
    const videosFallback = getStorageItem('vidlytics_videos', []).filter((video) => !storeId || video.store_id === storeId);
    const storyVideosFallback = getStorageItem('vidlytics_story_videos', []).filter((item) => !storeId || item.store_id === storeId);

    let stories = storiesFallback;
    let videos = videosFallback;
    let storyVideos = storyVideosFallback;

    if (storeId && supabaseUrl && supabaseAnonKey) {
      try {
        const storiesResponse = await supabaseFetch(`stories?select=*&store_id=eq.${encodeURIComponent(storeId)}&active=eq.true&order=position.asc`, { method: 'GET' });
        const storyData = storiesResponse ? await storiesResponse.json() : [];
        stories = Array.isArray(storyData) ? storyData : storiesFallback;

        const storyIds = stories.map((story) => story.id);
        if (storyIds.length > 0) {
          const storyVideosResponse = await supabaseFetch(`story_videos?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
          const storyVideosData = storyVideosResponse ? await storyVideosResponse.json() : [];
          storyVideos = Array.isArray(storyVideosData) ? storyVideosData : storyVideosFallback;

          const videoIds = storyVideos.map((item) => item.video_id);
          if (videoIds.length > 0) {
            const videosResponse = await supabaseFetch(`videos?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
            const videoData = videosResponse ? await videosResponse.json() : [];
            videos = Array.isArray(videoData) ? videoData.filter((video) => videoIds.includes(video.id)) : videosFallback;
          }
        }
      } catch (e) {
        stories = storiesFallback;
        videos = videosFallback;
        storyVideos = storyVideosFallback;
      }
    }

    stories = stories.filter((story) => story.active !== false);

    if (!stories.length) return;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = '2147483647';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';

    const bubbles = document.createElement('div');
    bubbles.style.display = 'flex';
    bubbles.style.gap = '10px';
    bubbles.style.alignItems = 'center';
    bubbles.style.flexWrap = 'wrap';

    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(15, 23, 42, 0.6)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';

    const modalCard = document.createElement('div');
    modalCard.style.width = 'min(92vw, 420px)';
    modalCard.style.background = '#fff';
    modalCard.style.borderRadius = '24px';
    modalCard.style.overflow = 'hidden';
    modalCard.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 0.25)';

    const modalContent = document.createElement('div');
    modalCard.appendChild(modalContent);

    const closeModal = () => {
      modal.style.display = 'none';
      modalContent.innerHTML = '';
    };

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    const getStoryVideosForStory = (storyId) => storyVideos
      .filter((item) => item.story_id === storyId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const getVideoById = (videoId) => videos.find((video) => video.id === videoId) || null;

    const openStory = async (story) => {
      await trackMetric({ event_type: 'play', story_id: story.id, page_url: window.location.href });
      const relations = getStoryVideosForStory(story.id);
      const primaryRelation = relations[0] || null;
      const video = primaryRelation ? getVideoById(primaryRelation.video_id) : null;

      modalContent.innerHTML = '';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '14px 16px';
      header.style.borderBottom = '1px solid #e2e8f0';

      const titleWrap = document.createElement('div');
      titleWrap.innerHTML = `<div style="font-weight:800;color:#0f172a;font-size:14px">${story.title || 'Story'}</div><div style="font-size:12px;color:#64748b">${story.format || 'widget'}</div>`;

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.border = 'none';
      closeBtn.style.background = 'transparent';
      closeBtn.style.fontSize = '24px';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = '#0f172a';
      closeBtn.addEventListener('click', closeModal);

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.style.padding = '16px';
      body.style.display = 'grid';
      body.style.gap = '12px';

      if (video) {
        const media = document.createElement('video');
        media.src = video.video_url;
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
        media.style.width = '100%';
        media.style.aspectRatio = '9 / 16';
        media.style.objectFit = 'cover';
        media.style.borderRadius = '18px';
        media.addEventListener('play', () => trackMetric({ event_type: 'play', story_id: story.id, video_id: video.id, page_url: window.location.href }));
        body.appendChild(media);
      } else if (story.image_url) {
        const image = document.createElement('img');
        image.src = story.image_url;
        image.alt = story.title || 'Story';
        image.style.width = '100%';
        image.style.borderRadius = '18px';
        image.style.objectFit = 'cover';
        body.appendChild(image);
      }

      if (story.cta_enabled && story.cta_type !== 'none') {
        const cta = document.createElement('button');
        cta.textContent = story.cta_text || 'Saiba mais';
        cta.style.border = 'none';
        cta.style.borderRadius = '999px';
        cta.style.padding = '12px 16px';
        cta.style.fontWeight = '800';
        cta.style.cursor = 'pointer';
        cta.style.background = '#0094EB';
        cta.style.color = '#fff';
        cta.addEventListener('click', async () => {
          await trackMetric({ event_type: 'cta_click', story_id: story.id, video_id: video ? video.id : null, page_url: window.location.href });
          if (story.cta_type === 'whatsapp' && story.whatsapp_message) {
            await trackMetric({ event_type: 'whatsapp_click', story_id: story.id, video_id: video ? video.id : null, page_url: window.location.href });
            window.open(story.cta_url || '#', '_blank', 'noopener,noreferrer');
            return;
          }
          if (story.cta_url) window.open(story.cta_url, '_blank', 'noopener,noreferrer');
        });
        body.appendChild(cta);
      }

      modalContent.appendChild(header);
      modalContent.appendChild(body);
      modal.style.display = 'flex';
    };

    stories.forEach((story) => {
      const relation = getStoryVideosForStory(story.id)[0];
      const video = relation ? getVideoById(relation.video_id) : null;
      const thumb = video?.thumbnail_url || video?.poster_url || video?.image_url || '';
      const bubble = document.createElement('button');
      bubble.type = 'button';
      bubble.style.border = 'none';
      bubble.style.background = 'transparent';
      bubble.style.padding = '0';
      bubble.style.cursor = 'pointer';
      bubble.style.display = 'grid';
      bubble.style.justifyItems = 'center';
      bubble.style.gap = '6px';

      const ring = document.createElement('div');
      ring.style.width = '62px';
      ring.style.height = '62px';
      ring.style.borderRadius = '999px';
      ring.style.padding = '2px';
      ring.style.background = 'linear-gradient(135deg, #0094EB, #EC4899)';

      const inner = document.createElement('div');
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.borderRadius = '999px';
      inner.style.overflow = 'hidden';
      inner.style.background = '#e2e8f0';
      inner.style.display = 'grid';
      inner.style.placeItems = 'center';

      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = story.title || 'Story';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        inner.appendChild(img);
      } else {
        inner.textContent = (story.title || 'S').slice(0, 1).toUpperCase();
        inner.style.fontWeight = '800';
        inner.style.color = '#0f172a';
      }

      ring.appendChild(inner);
      bubble.appendChild(ring);

      const label = document.createElement('span');
      label.textContent = story.title || 'Story';
      label.style.maxWidth = '74px';
      label.style.fontSize = '11px';
      label.style.fontWeight = '700';
      label.style.color = '#0f172a';
      label.style.textAlign = 'center';
      label.style.whiteSpace = 'nowrap';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      bubble.appendChild(label);

      bubble.addEventListener('click', () => openStory(story));
      bubbles.appendChild(bubble);
      trackMetric({ event_type: 'view', story_id: story.id, video_id: video ? video.id : null, page_url: window.location.href });
    });

    container.appendChild(bubbles);
    modal.appendChild(modalCard);
    container.appendChild(modal);
    document.body.appendChild(container);
  };

  const init = () => {
    renderWidget().catch(() => {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();