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

  const matchesRule = (rule) => {
    const href = window.location.href;
    const path = window.location.pathname || '/';
    const value = String(rule.value || '');

    switch (rule.condition_type) {
      case 'all_pages':
        return true;
      case 'home_only':
        return path === '/' || path === '/home' || path === '/index.html' || path === '';
      case 'product_pages':
        return path.includes('/product') || path.includes('/products') || path.includes('/produto') || path.includes('/produtos');
      case 'category_pages':
        return path.includes('/category') || path.includes('/categories') || path.includes('/categoria') || path.includes('/colecao') || path.includes('/collections');
      case 'contains':
        return href.includes(value);
      case 'equals':
        return href === value;
      case 'starts_with':
        return href.startsWith(value);
      case 'ends_with':
        return href.endsWith(value);
      case 'regex':
        try {
          return new RegExp(value).test(href);
        } catch (e) {
          return false;
        }
      default:
        return true;
    }
  };

  const readStories = async () => {
    if (!storeId || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_stories', []).filter((story) => !storeId || story.store_id === storeId && story.active !== false);
    const response = await supabaseFetch(`stories?select=*&store_id=eq.${encodeURIComponent(storeId)}&active=eq.true&order=position.asc`, { method: 'GET' });
    return response ? await response.json() : [];
  };

  const readStoryVideos = async (storyIds) => {
    if (!storyIds.length || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_story_videos', []).filter((item) => storyIds.includes(item.story_id));
    const response = await supabaseFetch(`story_videos?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
    return response ? await response.json() : [];
  };

  const readVideos = async (videoIds) => {
    if (!videoIds.length || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_videos', []).filter((item) => videoIds.includes(item.id));
    const response = await supabaseFetch(`videos?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
    return response ? (await response.json()).filter((item) => videoIds.includes(item.id)) : [];
  };

  const readStoryProducts = async (storyIds) => {
    if (!storyIds.length || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_story_products', []).filter((item) => storyIds.includes(item.story_id));
    const response = await supabaseFetch(`story_products?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
    return response ? await response.json() : [];
  };

  const readProducts = async (productIds) => {
    if (!productIds.length || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_products', []).filter((item) => productIds.includes(item.id));
    const response = await supabaseFetch(`products?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
    return response ? (await response.json()).filter((item) => productIds.includes(item.id)) : [];
  };

  const readPageRules = async (storyIds) => {
    if (!storyIds.length || !supabaseUrl || !supabaseAnonKey) return getStorageItem('vidlytics_page_rules', []).filter((item) => storyIds.includes(item.story_id));
    const response = await supabaseFetch(`page_rules?select=*&store_id=eq.${encodeURIComponent(storeId)}`, { method: 'GET' });
    return response ? await response.json() : [];
  };

  const renderWidget = async () => {
    try {
      const stories = await readStories();
      if (!stories.length) return;

      const storyIds = stories.map((story) => story.id);
      const [storyVideos, storyProducts, pageRules] = await Promise.all([
        readStoryVideos(storyIds),
        readStoryProducts(storyIds),
        readPageRules(storyIds),
      ]);

      const videoIds = Array.from(new Set(storyVideos.map((item) => item.video_id).filter(Boolean)));
      const productIds = Array.from(new Set(storyProducts.map((item) => item.product_id).filter(Boolean)));
      const [videos, products] = await Promise.all([readVideos(videoIds), readProducts(productIds)]);

      const activeVideos = videos.filter((video) => {
        const statusOk = 'status' in video ? video.status === 'active' : true;
        const activeOk = 'active' in video ? video.active !== false : true;
        return statusOk && activeOk && Boolean(video.video_url);
      });

      const storyVideoMap = new Map();
      const coverMap = new Map();
      storyVideos.forEach((item) => {
        if (!storyVideoMap.has(item.story_id)) storyVideoMap.set(item.story_id, []);
        storyVideoMap.get(item.story_id).push(item);
        if (item.is_cover) coverMap.set(item.story_id, item.video_id);
      });

      const productsByStory = new Map();
      storyProducts.forEach((item) => {
        if (!productsByStory.has(item.story_id)) productsByStory.set(item.story_id, []);
        const product = products.find((entry) => entry.id === item.product_id);
        if (product && (product.active === undefined || product.active)) productsByStory.get(item.story_id).push(product);
      });

      const applicableStories = stories.filter((story) => {
        const rulesForStory = pageRules.filter((rule) => rule.story_id === story.id);
        if (!rulesForStory.length) return true;
        return rulesForStory.some(matchesRule);
      });

      if (!applicableStories.length) return;

      const existingRoot = document.getElementById('vidlytics-widget-root');
      if (existingRoot) existingRoot.remove();

      const root = document.createElement('div');
      root.id = 'vidlytics-widget-root';
      root.className = 'vidlytics-widget-root';
      root.style.position = 'fixed';
      root.style.right = '20px';
      root.style.bottom = '20px';
      root.style.zIndex = '2147483647';
      root.style.fontFamily = 'Inter, system-ui, sans-serif';

      const bubbles = document.createElement('div');
      bubbles.className = 'vidlytics-bubbles';
      bubbles.style.display = 'flex';
      bubbles.style.gap = '10px';
      bubbles.style.alignItems = 'center';
      bubbles.style.flexWrap = 'wrap';

      const overlay = document.createElement('div');
      overlay.className = 'vidlytics-overlay';
      overlay.style.display = 'none';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(15, 23, 42, 0.6)';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '20px';

      const modal = document.createElement('div');
      modal.className = 'vidlytics-modal';
      modal.style.width = 'min(92vw, 420px)';
      modal.style.maxHeight = '88vh';
      modal.style.overflow = 'hidden';
      modal.style.background = '#fff';
      modal.style.borderRadius = '24px';
      modal.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 0.25)';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';

      const modalContent = document.createElement('div');
      modal.appendChild(modalContent);

      const closeOverlay = () => {
        overlay.style.display = 'none';
        modalContent.innerHTML = '';
      };

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeOverlay();
      });

      const openStory = (story) => {
        const relations = (storyVideoMap.get(story.id) || []).slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
        const orderedVideos = relations
          .map((relation) => activeVideos.find((video) => video.id === relation.video_id))
          .filter(Boolean);

        if (!orderedVideos.length) return;

        let currentIndex = Math.max(0, orderedVideos.findIndex((video) => video.id === coverMap.get(story.id)));
        if (currentIndex < 0) currentIndex = 0;

        const storyProductRelations = storyProducts.filter((item) => item.story_id === story.id);
        const activeProducts = storyProductRelations
          .map((relation) => products.find((product) => product.id === relation.product_id))
          .filter((product) => product && (product.active === undefined || product.active));

        const resolveCta = (video) => {
          if (story.cta_enabled && story.cta_url) {
            return {
              text: story.cta_text || 'Saiba mais',
              url: story.cta_url,
              type: story.cta_type || 'custom',
            };
          }

          if (activeProducts.length) {
            return {
              text: 'Comprar agora',
              url: activeProducts[0].product_url,
              type: 'product',
            };
          }

          if (story.cta_type === 'whatsapp' && story.whatsapp_message) {
            const phone = String((window.VIDLYTICS_CONFIG && window.VIDLYTICS_CONFIG.whatsappNumber) || '').replace(/\D/g, '');
            const base = phone ? `https://wa.me/${phone}` : '';
            const message = `Olha esse conteúdo${story.title ? `: ${story.title}` : ''}`;
            return base ? { text: story.cta_text || 'Falar no WhatsApp', url: `${base}?text=${encodeURIComponent(story.whatsapp_message || message)}`, type: 'whatsapp' } : null;
          }

          return null;
        };

        const renderCurrent = () => {
          const video = orderedVideos[currentIndex];
          if (!video) return;

          modalContent.innerHTML = '';

          const header = document.createElement('div');
          header.style.display = 'flex';
          header.style.alignItems = 'center';
          header.style.justifyContent = 'space-between';
          header.style.padding = '14px 16px';
          header.style.borderBottom = '1px solid #e2e8f0';

          const titleWrap = document.createElement('div');
          titleWrap.innerHTML = `<div style="font-weight:800;color:#0f172a;font-size:14px">${story.title || 'Story'}</div><div style="font-size:12px;color:#64748b">${currentIndex + 1}/${orderedVideos.length}</div>`;

          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.textContent = '×';
          closeBtn.style.border = 'none';
          closeBtn.style.background = 'transparent';
          closeBtn.style.fontSize = '24px';
          closeBtn.style.lineHeight = '1';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.color = '#0f172a';
          closeBtn.addEventListener('click', closeOverlay);

          header.appendChild(titleWrap);
          header.appendChild(closeBtn);

          const body = document.createElement('div');
          body.style.padding = '16px';
          body.style.display = 'grid';
          body.style.gap = '12px';

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

          const nav = document.createElement('div');
          nav.style.display = 'flex';
          nav.style.justifyContent = 'space-between';
          nav.style.gap = '10px';

          const prevBtn = document.createElement('button');
          prevBtn.type = 'button';
          prevBtn.textContent = 'Anterior';
          prevBtn.style.flex = '1';
          prevBtn.style.border = 'none';
          prevBtn.style.borderRadius = '999px';
          prevBtn.style.padding = '10px 14px';
          prevBtn.style.fontWeight = '800';
          prevBtn.style.cursor = 'pointer';
          prevBtn.style.background = '#e2e8f0';
          prevBtn.disabled = currentIndex === 0;
          prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
          prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
              currentIndex -= 1;
              renderCurrent();
            }
          });

          const nextBtn = document.createElement('button');
          nextBtn.type = 'button';
          nextBtn.textContent = currentIndex === orderedVideos.length - 1 ? 'Fechar' : 'Próximo';
          nextBtn.style.flex = '1';
          nextBtn.style.border = 'none';
          nextBtn.style.borderRadius = '999px';
          nextBtn.style.padding = '10px 14px';
          nextBtn.style.fontWeight = '800';
          nextBtn.style.cursor = 'pointer';
          nextBtn.style.background = '#0094EB';
          nextBtn.style.color = '#fff';
          nextBtn.addEventListener('click', () => {
            if (currentIndex < orderedVideos.length - 1) {
              currentIndex += 1;
              renderCurrent();
            } else {
              closeOverlay();
            }
          });

          nav.appendChild(prevBtn);
          nav.appendChild(nextBtn);
          body.appendChild(nav);

          const cta = resolveCta(video);
          if (cta) {
            const ctaBtn = document.createElement('button');
            ctaBtn.type = 'button';
            ctaBtn.textContent = cta.text;
            ctaBtn.style.border = 'none';
            ctaBtn.style.borderRadius = '999px';
            ctaBtn.style.padding = '12px 16px';
            ctaBtn.style.fontWeight = '800';
            ctaBtn.style.cursor = 'pointer';
            ctaBtn.style.background = cta.type === 'whatsapp' ? '#25D366' : '#111827';
            ctaBtn.style.color = '#fff';
            ctaBtn.addEventListener('click', async () => {
              await trackMetric({ event_type: cta.type === 'whatsapp' ? 'whatsapp_click' : 'cta_click', story_id: story.id, video_id: video.id, product_id: activeProducts[0] ? activeProducts[0].id : null, page_url: window.location.href });
              window.open(cta.url, '_blank', 'noopener,noreferrer');
            });
            body.appendChild(ctaBtn);
          }

          if (activeProducts.length) {
            const product = activeProducts[0];
            const productCard = document.createElement('div');
            productCard.style.display = 'flex';
            productCard.style.alignItems = 'center';
            productCard.style.gap = '12px';
            productCard.style.border = '1px solid #e2e8f0';
            productCard.style.borderRadius = '18px';
            productCard.style.padding = '12px';
            productCard.style.background = '#fff';
            productCard.innerHTML = `<img src="${product.image_url || ''}" alt="${product.name || ''}" style="width:72px;height:72px;object-fit:cover;border-radius:14px;background:#e2e8f0;"/><div style="min-width:0;flex:1"><div style="font-weight:800;color:#0f172a;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${product.name || ''}</div><div style="margin-top:4px;font-weight:800;color:#7c3aed;font-size:16px;">${Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>`;
            productCard.style.cursor = 'pointer';
            productCard.addEventListener('click', async () => {
              await trackMetric({ event_type: 'product_click', story_id: story.id, video_id: video.id, product_id: product.id, page_url: window.location.href });
              window.open(product.product_url, '_blank', 'noopener,noreferrer');
            });
            body.appendChild(productCard);
          }

          modalContent.appendChild(header);
          modalContent.appendChild(body);
          overlay.style.display = 'flex';
        };

        renderCurrent();
      };

      applicableStories.forEach((story) => {
        const relationVideos = (storyVideoMap.get(story.id) || []).slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
        const coverRelation = relationVideos.find((item) => item.is_cover) || relationVideos[0] || null;
        const coverVideo = coverRelation ? activeVideos.find((video) => video.id === coverRelation.video_id) : null;
        const thumb = coverVideo?.thumbnail_url || coverVideo?.poster_url || coverVideo?.image_url || '';
        const bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.className = 'vidlytics-bubble';
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
        trackMetric({ event_type: 'view', story_id: story.id, video_id: coverVideo ? coverVideo.id : null, page_url: window.location.href });
      });

      root.appendChild(bubbles);
      root.appendChild(overlay);
      document.body.appendChild(root);
    } catch (e) {}
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