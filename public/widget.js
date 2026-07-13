(function () {
  if (window.__vc_widget_initialized) return;
  window.__vc_widget_initialized = true;

  const config = window.VIDLYTICS_CONFIG || {};

  const storeId = config.storeId || null;
  const supabaseUrl = config.supabaseUrl || null;
  const supabaseAnonKey = config.supabaseAnonKey || null;

  const enabledWidgets = {
    floatingVideo: config.widgets?.floatingVideo !== false,
    carousel: config.widgets?.carousel !== false,
    gallery: config.widgets?.gallery !== false,
  };

  const ROOT_ID = 'vidlytics-widget-root';
  const STYLE_ID = 'vidlytics-widget-styles';

  const isMobile = () => window.innerWidth < 768;

  const uuid = () => {
    try {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }
    } catch (e) {}

    return `vc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

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

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const safeUrl = (value) => {
    const url = String(value || '').trim();

    if (!url) return '';

    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('/') ||
      url.startsWith('#')
    ) {
      return url;
    }

    return '';
  };

  const formatCurrency = (value) => {
    const number = Number(value || 0);

    try {
      return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    } catch (e) {
      return `R$ ${number.toFixed(2).replace('.', ',')}`;
    }
  };

  const normalizeText = (value) => String(value || '').trim();

  const getWidgetType = (story) => {
    const value = String(
      story.widget_type ||
        story.display_type ||
        story.layout ||
        story.type ||
        story.widget ||
        ''
    ).toLowerCase();

    if (
      value.includes('carousel') ||
      value.includes('carrossel') ||
      value.includes('stories')
    ) {
      return 'carousel';
    }

    if (
      value.includes('gallery') ||
      value.includes('galeria') ||
      value.includes('grid')
    ) {
      return 'gallery';
    }

    if (
      value.includes('floating') ||
      value.includes('float') ||
      value.includes('flutuante') ||
      value.includes('bubble') ||
      value.includes('bolha')
    ) {
      return 'floating';
    }

    return 'floating';
  };

  const getTargetSelector = (story, rulesForStory) => {
    const fromStory =
      story.target_selector ||
      story.css_selector ||
      story.selector ||
      story.placement_selector ||
      story.insert_selector ||
      story.mount_selector ||
      '';

    if (fromStory) return String(fromStory).trim();

    const ruleWithSelector = rulesForStory.find(
      (rule) =>
        rule.target_selector ||
        rule.css_selector ||
        rule.selector ||
        rule.placement_selector ||
        rule.insert_selector ||
        rule.mount_selector
    );

    if (!ruleWithSelector) return '';

    return String(
      ruleWithSelector.target_selector ||
        ruleWithSelector.css_selector ||
        ruleWithSelector.selector ||
        ruleWithSelector.placement_selector ||
        ruleWithSelector.insert_selector ||
        ruleWithSelector.mount_selector ||
        ''
    ).trim();
  };

  const getInsertPosition = (story, rulesForStory) => {
    const value = String(
      story.insert_position ||
        story.position_type ||
        story.placement_position ||
        story.mount_position ||
        story.target_position ||
        story.position ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.insert_position ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.position_type ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.placement_position ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.mount_position ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.target_position ||
        rulesForStory.find(
          (rule) =>
            rule.insert_position ||
            rule.position_type ||
            rule.placement_position ||
            rule.mount_position ||
            rule.target_position ||
            rule.position
        )?.position ||
        'after'
    ).toLowerCase();

    if (['before', 'beforebegin'].includes(value)) return 'before';
    if (['prepend', 'afterbegin', 'inside_start', 'inside-start'].includes(value)) return 'prepend';
    if (['append', 'beforeend', 'inside_end', 'inside-end', 'inside'].includes(value)) return 'append';
    if (['after', 'afterend'].includes(value)) return 'after';

    return 'after';
  };

  const supabaseFetch = async (path, options) => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
        'content-type': 'application/json',
        ...(options && options.headers ? options.headers : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${path}`);
    }

    return response;
  };

  const trackMetric = async (metric) => {
    const nextMetric = {
      id: uuid(),
      store_id: storeId,
      story_id: metric.story_id || null,
      video_id: metric.video_id || null,
      product_id: metric.product_id || null,
      event_type: metric.event_type,
      page_url: metric.page_url || window.location.href,
      device_type: metric.device_type || (isMobile() ? 'mobile' : 'desktop'),
      browser: metric.browser || navigator.userAgent,
      referrer: metric.referrer || document.referrer || null,
      created_at: new Date().toISOString(),
    };

    const fallbackMetrics = getStorageItem('vidlytics_metrics', []);
    fallbackMetrics.push(nextMetric);
    setStorageItem('vidlytics_metrics', fallbackMetrics.slice(-300));

    if (!storeId || !supabaseUrl || !supabaseAnonKey) return;

    try {
      await supabaseFetch('metrics', {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          store_id: nextMetric.store_id,
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
    const value = String(rule.value || rule.url || rule.path || '').trim();

    switch (rule.condition_type) {
      case 'all_pages':
        return true;

      case 'home_only':
        return (
          path === '/' ||
          path === '/home' ||
          path === '/index.html' ||
          path === ''
        );

      case 'product_pages':
        return (
          path.includes('/product') ||
          path.includes('/products') ||
          path.includes('/produto') ||
          path.includes('/produtos') ||
          path.includes('/p/')
        );

      case 'category_pages':
        return (
          path.includes('/category') ||
          path.includes('/categories') ||
          path.includes('/categoria') ||
          path.includes('/categorias') ||
          path.includes('/colecao') ||
          path.includes('/colecoes') ||
          path.includes('/collections') ||
          path.includes('/c/')
        );

      case 'cart_pages':
        return (
          path.includes('/cart') ||
          path.includes('/carrinho') ||
          path.includes('/checkout')
        );

      case 'contains':
        return value ? href.includes(value) : true;

      case 'equals':
        return value ? href === value : true;

      case 'starts_with':
        return value ? href.startsWith(value) : true;

      case 'ends_with':
        return value ? href.endsWith(value) : true;

      case 'regex':
        try {
          return value ? new RegExp(value).test(href) : true;
        } catch (e) {
          return false;
        }

      default:
        return true;
    }
  };

  const readStories = async () => {
    if (!storeId || !supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_stories', []).filter((story) => {
        const sameStore = !storeId || story.store_id === storeId;
        const active = story.active !== false;
        return sameStore && active;
      });
    }

    const response = await supabaseFetch(
      `stories?select=*&store_id=eq.${encodeURIComponent(
        storeId
      )}&active=eq.true&order=position.asc`,
      { method: 'GET' }
    );

    return response ? await response.json() : [];
  };

  const readStoryVideos = async (storyIds) => {
    if (!storyIds.length) return [];

    if (!supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_story_videos', []).filter((item) =>
        storyIds.includes(item.story_id)
      );
    }

    const response = await supabaseFetch(
      `story_videos?select=*&store_id=eq.${encodeURIComponent(
        storeId
      )}&order=position.asc`,
      { method: 'GET' }
    );

    const rows = response ? await response.json() : [];

    return rows.filter((item) => storyIds.includes(item.story_id));
  };

  const readVideos = async (videoIds) => {
    if (!videoIds.length) return [];

    if (!supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_videos', []).filter((item) =>
        videoIds.includes(item.id)
      );
    }

    const response = await supabaseFetch(
      `videos?select=*&store_id=eq.${encodeURIComponent(storeId)}`,
      { method: 'GET' }
    );

    const rows = response ? await response.json() : [];

    return rows.filter((item) => videoIds.includes(item.id));
  };

  const readStoryProducts = async (storyIds) => {
    if (!storyIds.length) return [];

    if (!supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_story_products', []).filter((item) =>
        storyIds.includes(item.story_id)
      );
    }

    const response = await supabaseFetch(
      `story_products?select=*&store_id=eq.${encodeURIComponent(storeId)}`,
      { method: 'GET' }
    );

    const rows = response ? await response.json() : [];

    return rows.filter((item) => storyIds.includes(item.story_id));
  };

  const readProducts = async (productIds) => {
    if (!productIds.length) return [];

    if (!supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_products', []).filter((item) =>
        productIds.includes(item.id)
      );
    }

    const response = await supabaseFetch(
      `products?select=*&store_id=eq.${encodeURIComponent(storeId)}`,
      { method: 'GET' }
    );

    const rows = response ? await response.json() : [];

    return rows.filter((item) => productIds.includes(item.id));
  };

  const readPageRules = async (storyIds) => {
    if (!storyIds.length) return [];

    if (!supabaseUrl || !supabaseAnonKey) {
      return getStorageItem('vidlytics_page_rules', []).filter((item) =>
        storyIds.includes(item.story_id)
      );
    }

    const response = await supabaseFetch(
      `page_rules?select=*&store_id=eq.${encodeURIComponent(storeId)}`,
      { method: 'GET' }
    );

    const rows = response ? await response.json() : [];

    return rows.filter((item) => storyIds.includes(item.story_id));
  };

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .vidlytics-widget-root,
      .vidlytics-widget-root * {
        box-sizing: border-box;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .vidlytics-floating-root {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
      }

      .vidlytics-floating-bubbles {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
        max-width: min(92vw, 360px);
      }

      .vidlytics-bubble {
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        display: grid;
        justify-items: center;
        gap: 6px;
        appearance: none;
      }

      .vidlytics-bubble-ring {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        padding: 3px;
        background: linear-gradient(135deg, #0094EB, #EC4899);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
      }

      .vidlytics-bubble-inner {
        width: 100%;
        height: 100%;
        border-radius: 999px;
        overflow: hidden;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        color: #0f172a;
        font-weight: 900;
      }

      .vidlytics-bubble-inner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .vidlytics-bubble-label {
        max-width: 76px;
        font-size: 11px;
        line-height: 1.1;
        font-weight: 800;
        color: #0f172a;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.85);
      }

      .vidlytics-section {
        width: 100%;
        margin: 24px 0;
      }

      .vidlytics-section-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .vidlytics-section-title {
        margin: 0;
        color: #0f172a;
        font-size: 20px;
        line-height: 1.2;
        font-weight: 900;
      }

      .vidlytics-carousel {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        padding: 4px 2px 12px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
      }

      .vidlytics-carousel::-webkit-scrollbar {
        height: 8px;
      }

      .vidlytics-carousel::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
      }

      .vidlytics-card {
        border: 0;
        padding: 0;
        background: transparent;
        cursor: pointer;
        appearance: none;
        text-align: left;
      }

      .vidlytics-carousel-card {
        width: 132px;
        min-width: 132px;
        scroll-snap-align: start;
      }

      .vidlytics-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
        gap: 14px;
      }

      .vidlytics-card-media {
        position: relative;
        width: 100%;
        aspect-ratio: 9 / 16;
        overflow: hidden;
        border-radius: 20px;
        background: #e2e8f0;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.14);
      }

      .vidlytics-card-media img,
      .vidlytics-card-media video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .vidlytics-play-badge {
        position: absolute;
        left: 10px;
        bottom: 10px;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 900;
      }

      .vidlytics-card-title {
        margin-top: 8px;
        color: #0f172a;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 900;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .vidlytics-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.68);
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .vidlytics-modal {
        width: min(92vw, 430px);
        max-height: 90vh;
        overflow: hidden;
        background: #fff;
        border-radius: 26px;
        box-shadow: 0 28px 90px rgba(15, 23, 42, 0.34);
        display: flex;
        flex-direction: column;
      }

      .vidlytics-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      .vidlytics-modal-title {
        min-width: 0;
      }

      .vidlytics-modal-title strong {
        display: block;
        color: #0f172a;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 900;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .vidlytics-modal-title span {
        display: block;
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }

      .vidlytics-close-btn {
        border: 0;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #0f172a;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
      }

      .vidlytics-modal-body {
        padding: 16px;
        overflow-y: auto;
        display: grid;
        gap: 12px;
      }

      .vidlytics-player {
        width: 100%;
        aspect-ratio: 9 / 16;
        object-fit: cover;
        border-radius: 20px;
        background: #020617;
        display: block;
      }

      .vidlytics-nav {
        display: flex;
        gap: 10px;
      }

      .vidlytics-btn {
        border: 0;
        border-radius: 999px;
        padding: 11px 14px;
        font-size: 13px;
        line-height: 1;
        font-weight: 900;
        cursor: pointer;
        appearance: none;
      }

      .vidlytics-btn-secondary {
        flex: 1;
        background: #e2e8f0;
        color: #0f172a;
      }

      .vidlytics-btn-primary {
        flex: 1;
        background: #0094EB;
        color: #fff;
      }

      .vidlytics-btn-cta {
        width: 100%;
        background: #111827;
        color: #fff;
        padding: 13px 16px;
      }

      .vidlytics-btn-whatsapp {
        background: #25D366;
      }

      .vidlytics-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .vidlytics-product-card {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 12px;
        background: #fff;
        cursor: pointer;
        appearance: none;
        width: 100%;
        text-align: left;
      }

      .vidlytics-product-card img {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: 14px;
        background: #e2e8f0;
        flex-shrink: 0;
      }

      .vidlytics-product-info {
        min-width: 0;
        flex: 1;
      }

      .vidlytics-product-name {
        color: #0f172a;
        font-size: 14px;
        line-height: 1.25;
        font-weight: 900;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .vidlytics-product-price {
        margin-top: 4px;
        color: #7c3aed;
        font-size: 16px;
        font-weight: 900;
      }

      @media (max-width: 767px) {
        .vidlytics-floating-root {
          right: 14px;
          bottom: 14px;
        }

        .vidlytics-bubble-ring {
          width: 58px;
          height: 58px;
        }

        .vidlytics-bubble-label {
          max-width: 68px;
          font-size: 10px;
        }

        .vidlytics-section-title {
          font-size: 18px;
        }

        .vidlytics-carousel-card {
          width: 118px;
          min-width: 118px;
        }

        .vidlytics-gallery-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .vidlytics-overlay {
          padding: 12px;
        }

        .vidlytics-modal {
          width: 100%;
          max-height: 94vh;
          border-radius: 24px;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const createOverlay = (openStory) => {
    const overlay = document.createElement('div');
    overlay.className = 'vidlytics-overlay';

    const modal = document.createElement('div');
    modal.className = 'vidlytics-modal';

    const modalContent = document.createElement('div');
    modal.appendChild(modalContent);
    overlay.appendChild(modal);

    const closeOverlay = () => {
      const videos = modalContent.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          video.pause();
        } catch (e) {}
      });

      overlay.style.display = 'none';
      modalContent.innerHTML = '';
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeOverlay();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay.style.display === 'flex') {
        closeOverlay();
      }
    });

    return {
      overlay,
      modalContent,
      closeOverlay,
    };
  };

  const mountElement = (element, selector, position) => {
    const cleanSelector = String(selector || '').trim();

    let target = null;

    if (cleanSelector) {
      try {
        target = document.querySelector(cleanSelector);
      } catch (e) {
        target = null;
      }
    }

    if (!target) {
      target =
        document.querySelector('main') ||
        document.querySelector('.main-content') ||
        document.querySelector('#main') ||
        document.body;
    }

    if (!target || target === document.body) {
      document.body.appendChild(element);
      return;
    }

    if (position === 'before') {
      target.parentNode.insertBefore(element, target);
      return;
    }

    if (position === 'prepend') {
      target.insertBefore(element, target.firstChild);
      return;
    }

    if (position === 'append') {
      target.appendChild(element);
      return;
    }

    if (position === 'after') {
      target.parentNode.insertBefore(element, target.nextSibling);
      return;
    }

    target.parentNode.insertBefore(element, target.nextSibling);
  };

  const renderWidget = async () => {
    try {
      injectStyles();

      const existingRoot = document.getElementById(ROOT_ID);
      if (existingRoot) existingRoot.remove();

      const stories = await readStories();

      if (!stories.length) return;

      const storyIds = stories.map((story) => story.id);

      const [storyVideos, storyProducts, pageRules] = await Promise.all([
        readStoryVideos(storyIds),
        readStoryProducts(storyIds),
        readPageRules(storyIds),
      ]);

      const videoIds = Array.from(
        new Set(storyVideos.map((item) => item.video_id).filter(Boolean))
      );

      const productIds = Array.from(
        new Set(storyProducts.map((item) => item.product_id).filter(Boolean))
      );

      const [videos, products] = await Promise.all([
        readVideos(videoIds),
        readProducts(productIds),
      ]);

      const activeVideos = videos.filter((video) => {
        const statusOk = 'status' in video ? video.status === 'active' : true;
        const activeOk = 'active' in video ? video.active !== false : true;

        return statusOk && activeOk && Boolean(video.video_url);
      });

      if (!activeVideos.length) return;

      const storyVideoMap = new Map();
      const coverMap = new Map();

      storyVideos.forEach((item) => {
        if (!storyVideoMap.has(item.story_id)) {
          storyVideoMap.set(item.story_id, []);
        }

        storyVideoMap.get(item.story_id).push(item);

        if (item.is_cover) {
          coverMap.set(item.story_id, item.video_id);
        }
      });

      const productsByStory = new Map();

      storyProducts.forEach((item) => {
        if (!productsByStory.has(item.story_id)) {
          productsByStory.set(item.story_id, []);
        }

        const product = products.find((entry) => entry.id === item.product_id);

        if (product && product.active !== false) {
          productsByStory.get(item.story_id).push(product);
        }
      });

      const applicableStories = stories.filter((story) => {
        const rulesForStory = pageRules.filter(
          (rule) => rule.story_id === story.id
        );

        if (!rulesForStory.length) return true;

        return rulesForStory.some(matchesRule);
      });

      const storiesWithVideos = applicableStories.filter((story) => {
        const relations = storyVideoMap.get(story.id) || [];
        return relations.some((relation) =>
          activeVideos.some((video) => video.id === relation.video_id)
        );
      });

      if (!storiesWithVideos.length) return;

      const root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'vidlytics-widget-root';

      const { overlay, modalContent, closeOverlay } = createOverlay();

      const getOrderedVideos = (story) => {
        const relations = (storyVideoMap.get(story.id) || [])
          .slice()
          .sort(
            (a, b) => Number(a.position || 0) - Number(b.position || 0)
          );

        return relations
          .map((relation) =>
            activeVideos.find((video) => video.id === relation.video_id)
          )
          .filter(Boolean);
      };

      const getCoverVideo = (story) => {
        const orderedVideos = getOrderedVideos(story);

        if (!orderedVideos.length) return null;

        const coverId = coverMap.get(story.id);

        return (
          orderedVideos.find((video) => video.id === coverId) ||
          orderedVideos[0]
        );
      };

      const getThumbnail = (story) => {
        const coverVideo = getCoverVideo(story);

        return (
          coverVideo?.thumbnail_url ||
          coverVideo?.poster_url ||
          coverVideo?.image_url ||
          story.thumbnail_url ||
          story.image_url ||
          ''
        );
      };

      const resolveCta = (story, video, activeProducts) => {
        if (story.cta_enabled && story.cta_url) {
          return {
            text: story.cta_text || 'Saiba mais',
            url: safeUrl(story.cta_url),
            type: story.cta_type || 'custom',
            product: null,
          };
        }

        if (activeProducts.length && activeProducts[0].product_url) {
          return {
            text: story.cta_text || 'Comprar agora',
            url: safeUrl(activeProducts[0].product_url),
            type: 'product',
            product: activeProducts[0],
          };
        }

        if (story.cta_type === 'whatsapp') {
          const phone = String(
            config.whatsappNumber || story.whatsapp_number || ''
          ).replace(/\D/g, '');

          if (!phone) return null;

          const defaultMessage = `Olha esse conteúdo${
            story.title ? `: ${story.title}` : ''
          }`;

          const message = story.whatsapp_message || defaultMessage;

          return {
            text: story.cta_text || 'Falar no WhatsApp',
            url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
            type: 'whatsapp',
            product: null,
          };
        }

        return null;
      };

      const openStory = (story) => {
        const orderedVideos = getOrderedVideos(story);

        if (!orderedVideos.length) return;

        const coverId = coverMap.get(story.id);

        let currentIndex = Math.max(
          0,
          orderedVideos.findIndex((video) => video.id === coverId)
        );

        if (currentIndex < 0) currentIndex = 0;

        const activeProducts = productsByStory.get(story.id) || [];

        const renderCurrent = () => {
          const video = orderedVideos[currentIndex];

          if (!video) return;

          modalContent.innerHTML = '';

          const header = document.createElement('div');
          header.className = 'vidlytics-modal-header';

          const titleWrap = document.createElement('div');
          titleWrap.className = 'vidlytics-modal-title';
          titleWrap.innerHTML = `
            <strong>${escapeHtml(story.title || 'Story')}</strong>
            <span>${currentIndex + 1}/${orderedVideos.length}</span>
          `;

          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'vidlytics-close-btn';
          closeBtn.textContent = '×';
          closeBtn.addEventListener('click', closeOverlay);

          header.appendChild(titleWrap);
          header.appendChild(closeBtn);

          const body = document.createElement('div');
          body.className = 'vidlytics-modal-body';

          const media = document.createElement('video');
          media.className = 'vidlytics-player';
          media.src = safeUrl(video.video_url);
          media.controls = true;
          media.autoplay = true;
          media.playsInline = true;
          media.setAttribute('playsinline', 'true');

          if (video.thumbnail_url || video.poster_url || video.image_url) {
            media.poster = safeUrl(
              video.thumbnail_url || video.poster_url || video.image_url
            );
          }

          let playTracked = false;

          media.addEventListener('play', () => {
            if (playTracked) return;
            playTracked = true;

            trackMetric({
              event_type: 'play',
              story_id: story.id,
              video_id: video.id,
              page_url: window.location.href,
            });
          });

          body.appendChild(media);

          if (orderedVideos.length > 1) {
            const nav = document.createElement('div');
            nav.className = 'vidlytics-nav';

            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'vidlytics-btn vidlytics-btn-secondary';
            prevBtn.textContent = 'Anterior';
            prevBtn.disabled = currentIndex === 0;

            prevBtn.addEventListener('click', () => {
              if (currentIndex > 0) {
                currentIndex -= 1;
                renderCurrent();
              }
            });

            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'vidlytics-btn vidlytics-btn-primary';
            nextBtn.textContent =
              currentIndex === orderedVideos.length - 1 ? 'Fechar' : 'Próximo';

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
          }

          const cta = resolveCta(story, video, activeProducts);

          if (cta && cta.url) {
            const ctaBtn = document.createElement('button');
            ctaBtn.type = 'button';
            ctaBtn.className = `vidlytics-btn vidlytics-btn-cta ${
              cta.type === 'whatsapp' ? 'vidlytics-btn-whatsapp' : ''
            }`;
            ctaBtn.textContent = cta.text;

            ctaBtn.addEventListener('click', async () => {
              await trackMetric({
                event_type:
                  cta.type === 'whatsapp' ? 'whatsapp_click' : 'cta_click',
                story_id: story.id,
                video_id: video.id,
                product_id: cta.product ? cta.product.id : null,
                page_url: window.location.href,
              });

              window.open(cta.url, '_blank', 'noopener,noreferrer');
            });

            body.appendChild(ctaBtn);
          }

          if (activeProducts.length) {
            const product = activeProducts[0];
            const productUrl = safeUrl(product.product_url || product.url || '');

            const productCard = document.createElement('button');
            productCard.type = 'button';
            productCard.className = 'vidlytics-product-card';

            productCard.innerHTML = `
              <img 
                src="${escapeHtml(safeUrl(product.image_url || product.image || ''))}" 
                alt="${escapeHtml(product.name || product.title || 'Produto')}"
                loading="lazy"
              />
              <div class="vidlytics-product-info">
                <div class="vidlytics-product-name">
                  ${escapeHtml(product.name || product.title || 'Produto')}
                </div>
                <div class="vidlytics-product-price">
                  ${formatCurrency(product.price)}
                </div>
              </div>
            `;

            if (productUrl) {
              productCard.addEventListener('click', async () => {
                await trackMetric({
                  event_type: 'product_click',
                  story_id: story.id,
                  video_id: video.id,
                  product_id: product.id,
                  page_url: window.location.href,
                });

                window.open(productUrl, '_blank', 'noopener,noreferrer');
              });
            }

            body.appendChild(productCard);
          }

          modalContent.appendChild(header);
          modalContent.appendChild(body);

          overlay.style.display = 'flex';

          setTimeout(() => {
            try {
              media.play().catch(() => {});
            } catch (e) {}
          }, 150);
        };

        trackMetric({
          event_type: 'open',
          story_id: story.id,
          video_id: orderedVideos[currentIndex]?.id || null,
          page_url: window.location.href,
        });

        renderCurrent();
      };

      const createBubble = (story) => {
        const coverVideo = getCoverVideo(story);
        const thumb = getThumbnail(story);

        const bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.className = 'vidlytics-bubble';

        const ring = document.createElement('div');
        ring.className = 'vidlytics-bubble-ring';

        const inner = document.createElement('div');
        inner.className = 'vidlytics-bubble-inner';

        if (thumb) {
          const img = document.createElement('img');
          img.src = safeUrl(thumb);
          img.alt = story.title || 'Story';
          img.loading = 'lazy';
          inner.appendChild(img);
        } else {
          inner.textContent = normalizeText(story.title || 'S')
            .slice(0, 1)
            .toUpperCase();
        }

        ring.appendChild(inner);
        bubble.appendChild(ring);

        const label = document.createElement('span');
        label.className = 'vidlytics-bubble-label';
        label.textContent = story.title || 'Story';
        bubble.appendChild(label);

        bubble.addEventListener('click', () => openStory(story));

        trackMetric({
          event_type: 'view',
          story_id: story.id,
          video_id: coverVideo ? coverVideo.id : null,
          page_url: window.location.href,
        });

        return bubble;
      };

      const createStoryCard = (story, mode) => {
        const coverVideo = getCoverVideo(story);
        const thumb = getThumbnail(story);

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `vidlytics-card ${
          mode === 'carousel' ? 'vidlytics-carousel-card' : ''
        }`;

        const media = document.createElement('div');
        media.className = 'vidlytics-card-media';

        if (thumb) {
          const img = document.createElement('img');
          img.src = safeUrl(thumb);
          img.alt = story.title || 'Story';
          img.loading = 'lazy';
          media.appendChild(img);
        } else {
          media.innerHTML = `
            <div style="
              width:100%;
              height:100%;
              display:grid;
              place-items:center;
              background:linear-gradient(135deg,#0094EB,#EC4899);
              color:white;
              font-size:34px;
              font-weight:900;
            ">
              ${escapeHtml(normalizeText(story.title || 'S').slice(0, 1).toUpperCase())}
            </div>
          `;
        }

        const playBadge = document.createElement('div');
        playBadge.className = 'vidlytics-play-badge';
        playBadge.textContent = '▶';
        media.appendChild(playBadge);

        const title = document.createElement('div');
        title.className = 'vidlytics-card-title';
        title.textContent = story.title || 'Story';

        card.appendChild(media);
        card.appendChild(title);

        card.addEventListener('click', () => openStory(story));

        trackMetric({
          event_type: mode === 'gallery' ? 'gallery_view' : 'carousel_view',
          story_id: story.id,
          video_id: coverVideo ? coverVideo.id : null,
          page_url: window.location.href,
        });

        return card;
      };

      const floatingStories = storiesWithVideos.filter(
        (story) => getWidgetType(story) === 'floating'
      );

      const carouselStories = storiesWithVideos.filter(
        (story) => getWidgetType(story) === 'carousel'
      );

      const galleryStories = storiesWithVideos.filter(
        (story) => getWidgetType(story) === 'gallery'
      );

      if (enabledWidgets.floatingVideo && floatingStories.length) {
        const floatingRoot = document.createElement('div');
        floatingRoot.className = 'vidlytics-floating-root';

        const bubbles = document.createElement('div');
        bubbles.className = 'vidlytics-floating-bubbles';

        floatingStories.forEach((story) => {
          bubbles.appendChild(createBubble(story));
        });

        floatingRoot.appendChild(bubbles);
        root.appendChild(floatingRoot);
      }

      if (enabledWidgets.carousel && carouselStories.length) {
        const grouped = new Map();

        carouselStories.forEach((story) => {
          const rulesForStory = pageRules.filter(
            (rule) => rule.story_id === story.id
          );

          const selector = getTargetSelector(story, rulesForStory);
          const position = getInsertPosition(story, rulesForStory);
          const key = `${selector}__${position}`;

          if (!grouped.has(key)) {
            grouped.set(key, {
              selector,
              position,
              stories: [],
            });
          }

          grouped.get(key).stories.push(story);
        });

        grouped.forEach((group) => {
          const section = document.createElement('section');
          section.className = 'vidlytics-section vidlytics-carousel-section';

          const title =
            group.stories[0]?.section_title ||
            group.stories[0]?.block_title ||
            group.stories[0]?.carousel_title ||
            'Vídeos';

          section.innerHTML = `
            <div class="vidlytics-section-header">
              <h2 class="vidlytics-section-title">${escapeHtml(title)}</h2>
            </div>
          `;

          const carousel = document.createElement('div');
          carousel.className = 'vidlytics-carousel';

          group.stories.forEach((story) => {
            carousel.appendChild(createStoryCard(story, 'carousel'));
          });

          section.appendChild(carousel);

          mountElement(section, group.selector, group.position);
        });
      }

      if (enabledWidgets.gallery && galleryStories.length) {
        const grouped = new Map();

        galleryStories.forEach((story) => {
          const rulesForStory = pageRules.filter(
            (rule) => rule.story_id === story.id
          );

          const selector = getTargetSelector(story, rulesForStory);
          const position = getInsertPosition(story, rulesForStory);
          const key = `${selector}__${position}`;

          if (!grouped.has(key)) {
            grouped.set(key, {
              selector,
              position,
              stories: [],
            });
          }

          grouped.get(key).stories.push(story);
        });

        grouped.forEach((group) => {
          const section = document.createElement('section');
          section.className = 'vidlytics-section vidlytics-gallery-section';

          const title =
            group.stories[0]?.section_title ||
            group.stories[0]?.block_title ||
            group.stories[0]?.gallery_title ||
            'Galeria de vídeos';

          section.innerHTML = `
            <div class="vidlytics-section-header">
              <h2 class="vidlytics-section-title">${escapeHtml(title)}</h2>
            </div>
          `;

          const grid = document.createElement('div');
          grid.className = 'vidlytics-gallery-grid';

          group.stories.forEach((story) => {
            grid.appendChild(createStoryCard(story, 'gallery'));
          });

          section.appendChild(grid);

          mountElement(section, group.selector, group.position);
        });
      }

      root.appendChild(overlay);
      document.body.appendChild(root);
    } catch (e) {
      try {
        console.warn('[Vidlytics Widget] erro ao renderizar:', e);
      } catch (error) {}
    }
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
