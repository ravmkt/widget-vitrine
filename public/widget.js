/**
 * Vidlytics Widget — widget.js
 *
 * Widget público de vídeo commerce.
 */
(function () {
  console.log('VIDLYTICS WIDGET CORRIGIDO CARREGADO - FORCE TOP RIGHT PORTRAIT');

  if (window.__vidlytics_widget_initialized) return;
  window.__vidlytics_widget_initialized = true;

  var config = window.VIDLYTICS_CONFIG || {};
  var storeId = config.storeId || config.lojaId || null;
  var supabaseUrl = (config.supabaseUrl || '').replace(/\/$/, '');
  var supabaseAnonKey = config.supabaseAnonKey || '';
  var widgetsCfg = config.widgets || {};

  var enableFloating =
    widgetsCfg.floatingVideo !== undefined
      ? widgetsCfg.floatingVideo
      : config.floatingVideo !== false;

  var enableCarousel =
    widgetsCfg.carousel !== undefined
      ? widgetsCfg.carousel
      : config.carousel !== false;

  var enableGallery =
    widgetsCfg.gallery !== undefined
      ? widgetsCfg.gallery
      : config.gallery !== false;

  var hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);
  var currentAppearance = {};

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var FORCE_FLOATING = {
    top: '20px',
    right: '23px',
    width: '85px',
    height: '151px',
    radius: '11px',
    zIndex: '2147483647'
  };

  function firstDefined() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (
        arguments[i] !== undefined &&
        arguments[i] !== null &&
        arguments[i] !== ''
      ) {
        return arguments[i];
      }
    }

    return undefined;
  }

  function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) {
      return false;
    }

    return String(a) === String(b);
  }

  function parseJsonIfNeeded(value) {
    if (!value) return {};

    if (typeof value === 'object') {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return {};
      }
    }

    return {};
  }

  function isPlainObject(value) {
    return (
      value &&
      typeof value === 'object' &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }

  function setImportant(el, prop, value) {
    if (!el || value === undefined || value === null || value === '') return;

    try {
      el.style.setProperty(prop, String(value), 'important');
    } catch (e) {
      el.style[prop] = value;
    }
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    var str = String(value).trim().toLowerCase();

    if (str === 'true' || str === '1' || str === 'yes' || str === 'sim') {
      return true;
    }

    if (
      str === 'false' ||
      str === '0' ||
      str === 'no' ||
      str === 'nao' ||
      str === 'não'
    ) {
      return false;
    }

    return fallback;
  }

  function normalizeMediaUrl(url) {
    if (!url) return '';

    var value = String(url).trim();
    if (!value) return '';

    if (
      value.indexOf('http://') === 0 ||
      value.indexOf('https://') === 0 ||
      value.indexOf('data:') === 0 ||
      value.indexOf('blob:') === 0
    ) {
      return value;
    }

    if (value.indexOf('//') === 0) {
      return window.location.protocol + value;
    }

    if (value.charAt(0) === '/' && supabaseUrl) {
      return supabaseUrl + value;
    }

    return value;
  }

  function toCssUnit(value, fallback) {
    var finalValue = firstDefined(value, fallback);

    if (finalValue === undefined || finalValue === null || finalValue === '') {
      return fallback || '20px';
    }

    if (typeof finalValue === 'number') {
      return finalValue + 'px';
    }

    var str = String(finalValue).trim();

    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return str + 'px';
    }

    return str;
  }

  function buildAppearanceSources(appearance, context) {
    appearance = appearance || {};

    var sources = [];
    var device = window.innerWidth < 768 ? 'mobile' : 'desktop';

    function add(value) {
      var obj = parseJsonIfNeeded(value);

      if (isPlainObject(obj)) {
        sources.push(obj);
        return obj;
      }

      return null;
    }

    var root = add(appearance) || {};

    [
      'config',
      'settings',
      'style',
      'styles',
      'appearance_config',
      'appearanceConfig',
      'style_config',
      'styleConfig',
      'global_config',
      'globalConfig',
      'visual_config',
      'visualConfig',
      'identity_config',
      'identityConfig',
      'floating_config',
      'floatingConfig',
      'floating',
      'floatingVideo',
      'floating_video',
      'floatingWidget',
      'floating_widget',
      'widget_config',
      'widgetConfig',
      'widget',
      'desktop_config',
      'desktopConfig',
      'mobile_config',
      'mobileConfig',
      'desktop',
      'mobile'
    ].forEach(function (key) {
      if (root[key] !== undefined) add(root[key]);
    });

    var snapshot = sources.slice();

    snapshot.forEach(function (src) {
      if (!src) return;

      if (context === 'floating') {
        add(src.floating);
        add(src.floatingVideo);
        add(src.floating_video);
        add(src.floatingWidget);
        add(src.floating_widget);
        add(src.widget);
        add(src.widget_config);
        add(src.widgetConfig);
        add(src.floating_config);
        add(src.floatingConfig);
      }

      if (context === 'carousel') {
        add(src.carousel);
        add(src.carousel_config);
        add(src.carouselConfig);
      }

      add(src[device]);
      add(src[device + '_config']);
      add(src[device + 'Config']);

      if (context === 'floating') {
        add(src['floating_' + device]);
        add(src['floating_' + device + '_config']);
        add(src['floating' + device.charAt(0).toUpperCase() + device.slice(1)]);
        add(src[device + '_floating']);
        add(src[device + '_floating_config']);
      }

      if (context === 'carousel') {
        add(src['carousel_' + device]);
        add(src['carousel_' + device + '_config']);
        add(src[device + '_carousel']);
        add(src[device + '_carousel_config']);
      }
    });

    return sources;
  }

  function readAppearanceValue(appearance, names, context) {
    var sources = buildAppearanceSources(appearance, context);

    for (var i = 0; i < sources.length; i += 1) {
      for (var j = 0; j < names.length; j += 1) {
        if (
          sources[i] &&
          sources[i][names[j]] !== undefined &&
          sources[i][names[j]] !== null &&
          sources[i][names[j]] !== ''
        ) {
          return sources[i][names[j]];
        }
      }
    }

    return undefined;
  }

  function getVideoUrl(video) {
    if (!video) return '';

    return normalizeMediaUrl(
      firstDefined(
        video.video_url,
        video.videoUrl,
        video.url,
        video.source_url,
        video.sourceUrl,
        video.external_url,
        video.externalUrl,
        video.file_url,
        video.fileUrl,
        video.public_url,
        video.publicUrl,
        video.video,
        video.src,
        ''
      )
    );
  }

  function isDirectVideoUrl(url) {
    if (!url) return false;
    return VIDEO_FILE_REGEX.test(url);
  }

  function extractYouTubeId(url) {
    if (!url) return '';

    try {
      var parsed = new URL(url.trim());
      var host = parsed.hostname.replace(/^www\./, '').toLowerCase();

      if (host === 'youtu.be') {
        return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      }

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname.indexOf('/shorts/') === 0) {
          return parsed.pathname.split('/')[2] || '';
        }

        if (parsed.pathname.indexOf('/embed/') === 0) {
          return parsed.pathname.replace(/^\/embed\//, '').split('/')[0] || '';
        }

        if (parsed.pathname === '/watch') {
          return parsed.searchParams.get('v') || '';
        }
      }
    } catch (e) {
      return '';
    }

    return '';
  }

  function getYouTubeEmbedUrl(url) {
    var id = extractYouTubeId(url);
    return id ? 'https://www.youtube.com/embed/' + id : '';
  }

  function getYouTubeThumbnail(url) {
    var id = extractYouTubeId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function getThumbnailFromObject(obj) {
    if (!obj) return '';

    var meta = parseJsonIfNeeded(
      firstDefined(
        obj.metadata,
        obj.meta,
        obj.extra,
        obj.data,
        obj.settings,
        obj.config,
        {}
      )
    );

    var direct = firstDefined(
      obj.thumbnail_url,
      obj.thumbnailUrl,
      obj.thumbnail,
      obj.thumb_url,
      obj.thumbUrl,
      obj.thumb,
      obj.poster_url,
      obj.posterUrl,
      obj.poster,
      obj.cover_url,
      obj.coverUrl,
      obj.cover,
      obj.capa_url,
      obj.capaUrl,
      obj.capa,
      obj.image_url,
      obj.imageUrl,
      obj.image,
      obj.photo_url,
      obj.photoUrl,
      obj.picture_url,
      obj.pictureUrl,
      obj.preview_url,
      obj.previewUrl,
      obj.preview,
      obj.frame_url,
      obj.frameUrl,
      obj.frame,
      obj.public_thumbnail_url,
      obj.publicThumbnailUrl,
      obj.public_cover_url,
      obj.publicCoverUrl,
      meta.thumbnail_url,
      meta.thumbnailUrl,
      meta.thumbnail,
      meta.thumb_url,
      meta.thumbUrl,
      meta.thumb,
      meta.poster_url,
      meta.posterUrl,
      meta.poster,
      meta.cover_url,
      meta.coverUrl,
      meta.cover,
      meta.capa_url,
      meta.capaUrl,
      meta.capa,
      meta.image_url,
      meta.imageUrl,
      meta.image,
      meta.preview_url,
      meta.previewUrl,
      meta.preview,
      ''
    );

    return normalizeMediaUrl(direct || '');
  }

  function getVideoThumbnail(video) {
    if (!video) return '';

    var direct = getThumbnailFromObject(video);
    if (direct) return direct;

    if (video.video && typeof video.video === 'object') {
      direct = getThumbnailFromObject(video.video);
      if (direct) return direct;
    }

    if (video.media && typeof video.media === 'object') {
      direct = getThumbnailFromObject(video.media);
      if (direct) return direct;
    }

    if (video.file && typeof video.file === 'object') {
      direct = getThumbnailFromObject(video.file);
      if (direct) return direct;
    }

    if (video.source_type !== 'upload' && video.sourceType !== 'upload') {
      return getYouTubeThumbnail(getVideoUrl(video));
    }

    return '';
  }

  function getStoryThumbnail(story, coverVideo, coverRelation) {
    var storyThumb = getThumbnailFromObject(story);
    if (storyThumb) return storyThumb;

    var relationThumb = getThumbnailFromObject(coverRelation);
    if (relationThumb) return relationThumb;

    var videoThumb = getVideoThumbnail(coverVideo);
    if (videoThumb) return videoThumb;

    if (story && story.videos && story.videos.length) {
      videoThumb = getVideoThumbnail(story.videos[0]);
      if (videoThumb) return videoThumb;
    }

    if (story && story.items && story.items.length) {
      videoThumb = getVideoThumbnail(story.items[0]);
      if (videoThumb) return videoThumb;
    }

    if (story && story.contents && story.contents.length) {
      videoThumb = getVideoThumbnail(story.contents[0]);
      if (videoThumb) return videoThumb;
    }

    return '';
  }

  function getPrimaryColor(appearance) {
    return (
      readAppearanceValue(
        appearance,
        ['primary_color', 'primaryColor', 'color', 'cor_primaria'],
        'floating'
      ) || '#0094EB'
    );
  }

  function getSecondaryColor(appearance) {
    return (
      readAppearanceValue(
        appearance,
        ['secondary_color', 'secondaryColor', 'cor_secundaria'],
        'floating'
      ) || '#EC4899'
    );
  }

  function getTextColor(appearance) {
    return (
      readAppearanceValue(
        appearance,
        ['text_color', 'textColor', 'cor_texto'],
        'floating'
      ) || '#0f172a'
    );
  }

  function getFontFamily(appearance) {
    return (
      readAppearanceValue(
        appearance,
        ['font_family', 'fontFamily', 'fonte'],
        'floating'
      ) || 'Inter, system-ui, sans-serif'
    );
  }

  function getStorageItem(key, fallback) {
    try {
      var item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function supabaseFetch(path, options) {
    if (!hasSupabase) return Promise.reject(new Error('No Supabase config'));

    var headers = {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + supabaseAnonKey,
      'Content-Type': 'application/json'
    };

    if (options && options.headers) {
      Object.keys(options.headers).forEach(function (key) {
        headers[key] = options.headers[key];
      });
    }

    return fetch(supabaseUrl + '/rest/v1/' + path, {
      method: (options && options.method) || 'GET',
      headers: headers,
      body: options && options.body ? options.body : undefined
    });
  }

  function trackMetric(metric) {
    var fallbackMetrics = getStorageItem('vidlytics_metrics', []);

    var nextMetric = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now() + '-' + Math.random().toString(36).slice(2),
      store_id: storeId,
      story_id: metric.story_id || null,
      video_id: metric.video_id || null,
      product_id: metric.product_id || null,
      event_type: metric.event_type,
      page_url: metric.page_url || window.location.href,
      device_type:
        metric.device_type ||
        (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      browser: metric.browser || navigator.userAgent,
      referrer: metric.referrer || document.referrer || null,
      created_at: new Date().toISOString()
    };

    fallbackMetrics.push(nextMetric);
    setStorageItem('vidlytics_metrics', fallbackMetrics);

    if (!storeId || !hasSupabase) return Promise.resolve();

    return supabaseFetch('metrics', {
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
        referrer: nextMetric.referrer
      })
    }).catch(function () {});
  }

  function normalizeModalAppearanceConfig(appearance) {
    appearance = appearance || {};

    var rawConfig = parseJsonIfNeeded(
      firstDefined(appearance.modal_config, appearance.modalConfig, {})
    );

    return {
      show_title: toBoolean(
        firstDefined(
          appearance.show_title,
          appearance.showTitle,
          rawConfig.show_title,
          rawConfig.showTitle
        ),
        true
      ),

      show_product: toBoolean(
        firstDefined(
          appearance.show_product,
          appearance.showProduct,
          rawConfig.show_product,
          rawConfig.showProduct
        ),
        true
      ),

      show_whatsapp_button: toBoolean(
        firstDefined(
          appearance.show_whatsapp_button,
          appearance.showWhatsappButton,
          rawConfig.show_whatsapp_button,
          rawConfig.showWhatsappButton
        ),
        true
      ),

      show_product_button: toBoolean(
        firstDefined(
          appearance.show_product_button,
          appearance.showProductButton,
          rawConfig.show_product_button,
          rawConfig.showProductButton
        ),
        true
      ),

      hide_stories: toBoolean(
        firstDefined(
          appearance.hide_stories,
          appearance.hideStories,
          rawConfig.hide_stories,
          rawConfig.hideStories
        ),
        false
      ),

      shadow_enabled: toBoolean(
        firstDefined(
          appearance.shadow_enabled,
          appearance.shadowEnabled,
          rawConfig.shadow_enabled,
          rawConfig.shadowEnabled
        ),
        true
      )
    };
  }

  function matchesRule(rule) {
    var href = window.location.href;
    var path = window.location.pathname || '/';
    var value = String(rule.value || '');

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
          path.indexOf('/product') !== -1 ||
          path.indexOf('/products') !== -1 ||
          path.indexOf('/produto') !== -1 ||
          path.indexOf('/produtos') !== -1
        );

      case 'category_pages':
        return (
          path.indexOf('/category') !== -1 ||
          path.indexOf('/categories') !== -1 ||
          path.indexOf('/categoria') !== -1 ||
          path.indexOf('/colecao') !== -1 ||
          path.indexOf('/collections') !== -1
        );

      case 'contains':
        return href.indexOf(value) !== -1;

      case 'equals':
        return href === value;

      case 'starts_with':
        return href.indexOf(value) === 0;

      case 'ends_with':
        return href.lastIndexOf(value) === href.length - value.length;

      case 'regex':
        try {
          return new RegExp(value).test(href);
        } catch (e) {
          return false;
        }

      default:
        return true;
    }
  }

  function readAppearance() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_appearance', {}) || {});
    }

    return supabaseFetch(
      'appearances?select=*&store_id=eq.' +
        encodeURIComponent(storeId) +
        '&is_default=eq.true&limit=1',
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .then(function (items) {
        if (items && items.length) return items[0];

        return supabaseFetch(
          'appearances?select=*&store_id=eq.' +
            encodeURIComponent(storeId) +
            '&limit=1',
          { method: 'GET' }
        )
          .then(function (response) {
            return response.ok ? response.json() : [];
          })
          .then(function (fallbackItems) {
            return fallbackItems && fallbackItems.length
              ? fallbackItems[0]
              : {};
          });
      })
      .catch(function () {
        return {};
      });
  }

  function readStories() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(
        getStorageItem('vidlytics_stories', []).filter(function (story) {
          return (
            (!storeId || idsEqual(story.store_id, storeId)) &&
            story.active !== false
          );
        })
      );
    }

    return supabaseFetch(
      'stories?select=*&store_id=eq.' +
        encodeURIComponent(storeId) +
        '&active=eq.true&order=position.asc',
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function readStoryVideos() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_story_videos', []));
    }

    return supabaseFetch(
      'story_videos?select=*&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function readVideos() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_videos', []));
    }

    return supabaseFetch(
      'videos?select=*&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function readStoryProducts() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_story_products', []));
    }

    return supabaseFetch(
      'story_products?select=*&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function readProducts() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_products', []));
    }

    return supabaseFetch(
      'products?select=*&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function readPageRules() {
    if (!storeId || !hasSupabase) {
      return Promise.resolve(getStorageItem('vidlytics_page_rules', []));
    }

    return supabaseFetch(
      'page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    )
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .catch(function () {
        return [];
      });
  }

  function createEl(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  function injectForceFloatingCss() {
    var oldStyle = document.getElementById('vidlytics-force-floating-css');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'vidlytics-force-floating-css';

    style.innerHTML =
      '' +
      '#vidlytics-widget-root,' +
      '.vidlytics-widget-root {' +
      'position: fixed !important;' +
      'top: ' +
      FORCE_FLOATING.top +
      ' !important;' +
      'right: ' +
      FORCE_FLOATING.right +
      ' !important;' +
      'bottom: auto !important;' +
      'left: auto !important;' +
      'z-index: ' +
      FORCE_FLOATING.zIndex +
      ' !important;' +
      'font-family: Inter, system-ui, sans-serif !important;' +
      'pointer-events: auto !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubbles {' +
      'display: flex !important;' +
      'flex-direction: column !important;' +
      'align-items: flex-end !important;' +
      'gap: 10px !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubble {' +
      'border: none !important;' +
      'background: transparent !important;' +
      'padding: 0 !important;' +
      'margin: 0 !important;' +
      'cursor: pointer !important;' +
      'display: grid !important;' +
      'justify-items: center !important;' +
      'gap: 6px !important;' +
      'outline: none !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubble-ring {' +
      'width: ' +
      FORCE_FLOATING.width +
      ' !important;' +
      'height: ' +
      FORCE_FLOATING.height +
      ' !important;' +
      'min-width: ' +
      FORCE_FLOATING.width +
      ' !important;' +
      'min-height: ' +
      FORCE_FLOATING.height +
      ' !important;' +
      'max-width: ' +
      FORCE_FLOATING.width +
      ' !important;' +
      'max-height: ' +
      FORCE_FLOATING.height +
      ' !important;' +
      'border-radius: ' +
      FORCE_FLOATING.radius +
      ' !important;' +
      'overflow: hidden !important;' +
      'box-sizing: border-box !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubble-inner,' +
      '#vidlytics-widget-root .vidlytics-bubble-img {' +
      'border-radius: ' +
      FORCE_FLOATING.radius +
      ' !important;' +
      'overflow: hidden !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubble-img {' +
      'width: 100% !important;' +
      'height: 100% !important;' +
      'object-fit: cover !important;' +
      'display: block !important;' +
      '}' +
      '#vidlytics-widget-root .vidlytics-bubble-label {' +
      'max-width: ' +
      FORCE_FLOATING.width +
      ' !important;' +
      'font-size: 11px !important;' +
      'font-weight: 700 !important;' +
      'text-align: center !important;' +
      'white-space: nowrap !important;' +
      'overflow: hidden !important;' +
      'text-overflow: ellipsis !important;' +
      '}';

    document.head.appendChild(style);
  }

  function forceFloatingStyles() {
    injectForceFloatingCss();

    var root = document.getElementById('vidlytics-widget-root');
    if (!root) return;

    setImportant(root, 'position', 'fixed');
    setImportant(root, 'top', FORCE_FLOATING.top);
    setImportant(root, 'right', FORCE_FLOATING.right);
    setImportant(root, 'bottom', 'auto');
    setImportant(root, 'left', 'auto');
    setImportant(root, 'z-index', FORCE_FLOATING.zIndex);
    setImportant(root, 'pointer-events', 'auto');

    var bubbles = root.querySelector('.vidlytics-bubbles');
    if (bubbles) {
      setImportant(bubbles, 'display', 'flex');
      setImportant(bubbles, 'flex-direction', 'column');
      setImportant(bubbles, 'align-items', 'flex-end');
      setImportant(bubbles, 'gap', '10px');
    }

    var rings = root.querySelectorAll('.vidlytics-bubble-ring');
    rings.forEach(function (ring) {
      setImportant(ring, 'width', FORCE_FLOATING.width);
      setImportant(ring, 'height', FORCE_FLOATING.height);
      setImportant(ring, 'min-width', FORCE_FLOATING.width);
      setImportant(ring, 'min-height', FORCE_FLOATING.height);
      setImportant(ring, 'max-width', FORCE_FLOATING.width);
      setImportant(ring, 'max-height', FORCE_FLOATING.height);
      setImportant(ring, 'border-radius', FORCE_FLOATING.radius);
      setImportant(ring, 'overflow', 'hidden');
      setImportant(ring, 'box-sizing', 'border-box');
    });

    var inners = root.querySelectorAll(
      '.vidlytics-bubble-inner, .vidlytics-bubble-img'
    );

    inners.forEach(function (inner) {
      setImportant(inner, 'border-radius', FORCE_FLOATING.radius);
      setImportant(inner, 'overflow', 'hidden');
    });

    var imgs = root.querySelectorAll('.vidlytics-bubble-img');
    imgs.forEach(function (img) {
      setImportant(img, 'width', '100%');
      setImportant(img, 'height', '100%');
      setImportant(img, 'object-fit', 'cover');
      setImportant(img, 'display', 'block');
    });
  }

  var overlay = null;
  var modalContent = null;

  function ensureModal() {
    if (overlay) return;

    var modalConfig = normalizeModalAppearanceConfig(currentAppearance);

    overlay = createEl('div', 'vidlytics-overlay');
    overlay.style.display = 'none';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(15, 23, 42, 0.7)';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2147483647';
    overlay.style.padding = '20px';

    var modal = createEl('div', 'vidlytics-modal');
    modal.style.width = 'min(92vw, 420px)';
    modal.style.maxHeight = '88vh';
    modal.style.overflow = 'hidden';
    modal.style.background =
      currentAppearance.background_color ||
      currentAppearance.backgroundColor ||
      '#fff';
    modal.style.borderRadius = '24px';
    modal.style.boxShadow = modalConfig.shadow_enabled
      ? '0 24px 80px rgba(15, 23, 42, 0.3)'
      : 'none';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    modalContent = createEl('div', 'vidlytics-modal-content');
    modal.appendChild(modalContent);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeOverlay();
    });
  }

  function closeOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (modalContent) modalContent.innerHTML = '';
  }

  function buildVideoPlayer(video, storyId) {
    var url = getVideoUrl(video);
    var ytId = extractYouTubeId(url);
    var isUpload =
      video.source_type === 'upload' || video.sourceType === 'upload';
    var isDirect = isDirectVideoUrl(url);

    if (!isUpload && ytId) {
      var iframe = createEl('iframe');
      iframe.src = getYouTubeEmbedUrl(url);
      iframe.style.width = '100%';
      iframe.style.aspectRatio = '9 / 16';
      iframe.style.objectFit = 'cover';
      iframe.style.borderRadius = '18px';
      iframe.style.border = 'none';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.title = video.title || video.name || 'Vídeo';

      return { el: iframe, type: 'youtube' };
    }

    if ((isUpload || isDirect) && url) {
      var media = createEl('video');
      media.src = url;
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;
      media.style.width = '100%';
      media.style.aspectRatio = '9 / 16';
      media.style.objectFit = 'cover';
      media.style.borderRadius = '18px';

      var thumb = getVideoThumbnail(video);
      if (thumb) media.poster = thumb;

      media.addEventListener('play', function () {
        trackMetric({
          event_type: 'play',
          story_id: storyId,
          video_id: video.id,
          page_url: window.location.href
        });
      });

      return { el: media, type: 'html5' };
    }

    var link = createEl('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir vídeo';
    link.style.display = 'inline-block';
    link.style.padding = '12px 20px';
    link.style.background = getPrimaryColor(currentAppearance);
    link.style.color = '#fff';
    link.style.borderRadius = '999px';
    link.style.fontWeight = '800';
    link.style.fontSize = '13px';
    link.style.textDecoration = 'none';

    return { el: link, type: 'link' };
  }

  var readStoryProductsData = [];
  var readProductsData = [];

  function openStory(story, storyVideoMap, activeVideos, storyProducts, products) {
    ensureModal();

    var relations = (storyVideoMap.get(story.id) || [])
      .slice()
      .sort(function (a, b) {
        return Number(a.position || 0) - Number(b.position || 0);
      });

    var orderedVideos = relations
      .map(function (rel) {
        return activeVideos.find(function (video) {
          return idsEqual(video.id, rel.video_id);
        });
      })
      .filter(Boolean);

    if (!orderedVideos.length) return;

    var coverVideoId = null;

    relations.forEach(function (rel) {
      if (rel.is_cover) coverVideoId = rel.video_id;
    });

    var currentIndex = orderedVideos.findIndex(function (video) {
      return idsEqual(video.id, coverVideoId);
    });

    if (currentIndex < 0) currentIndex = 0;

    var activeProducts = storyProducts
      .filter(function (sp) {
        return idsEqual(sp.story_id, story.id);
      })
      .map(function (sp) {
        return products.find(function (product) {
          return idsEqual(product.id, sp.product_id);
        });
      })
      .filter(function (product) {
        return product && (product.active === undefined || product.active);
      });

    function resolveCta() {
      if (story.cta_enabled && story.cta_url) {
        return {
          text: story.cta_text || 'Saiba mais',
          url: story.cta_url,
          type: story.cta_type || 'custom'
        };
      }

      if (activeProducts.length) {
        return {
          text: 'Comprar agora',
          url: activeProducts[0].product_url,
          type: 'product'
        };
      }

      return null;
    }

    function renderCurrent() {
      var video = orderedVideos[currentIndex];
      if (!video) return;

      var modalConfig = normalizeModalAppearanceConfig(currentAppearance);

      modalContent.innerHTML = '';

      var header = createEl('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '14px 16px';
      header.style.borderBottom = '1px solid #e2e8f0';

      var titleWrap = createEl('div');

      if (modalConfig.show_title) {
        titleWrap.innerHTML =
          '<div style="font-weight:800;color:' +
          getTextColor(currentAppearance) +
          ';font-size:14px">' +
          (story.title || story.name || 'Story') +
          '</div>' +
          '<div style="font-size:12px;color:#64748b">' +
          (currentIndex + 1) +
          '/' +
          orderedVideos.length +
          '</div>';
      }

      var closeBtn = createEl('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.style.border = 'none';
      closeBtn.style.background = 'transparent';
      closeBtn.style.fontSize = '24px';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = getTextColor(currentAppearance);
      closeBtn.addEventListener('click', closeOverlay);

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);

      var body = createEl('div');
      body.style.padding = '16px';
      body.style.display = 'grid';
      body.style.gap = '12px';

      var playerResult = buildVideoPlayer(video, story.id);
      body.appendChild(playerResult.el);

      var nav = createEl('div');
      nav.style.display = 'flex';
      nav.style.justifyContent = 'space-between';
      nav.style.gap = '10px';

      var prevBtn = createEl('button');
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

      prevBtn.addEventListener('click', function () {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderCurrent();
        }
      });

      var nextBtn = createEl('button');
      nextBtn.type = 'button';
      nextBtn.textContent =
        currentIndex === orderedVideos.length - 1 ? 'Fechar' : 'Próximo';
      nextBtn.style.flex = '1';
      nextBtn.style.border = 'none';
      nextBtn.style.borderRadius = '999px';
      nextBtn.style.padding = '10px 14px';
      nextBtn.style.fontWeight = '800';
      nextBtn.style.cursor = 'pointer';
      nextBtn.style.background =
        currentAppearance.button_color ||
        currentAppearance.buttonColor ||
        getPrimaryColor(currentAppearance);
      nextBtn.style.color = '#fff';

      nextBtn.addEventListener('click', function () {
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

      var cta = resolveCta();

      if (cta) {
        var ctaBtn = createEl('button');
        ctaBtn.type = 'button';
        ctaBtn.textContent = cta.text;
        ctaBtn.style.border = 'none';
        ctaBtn.style.borderRadius = '999px';
        ctaBtn.style.padding = '12px 16px';
        ctaBtn.style.fontWeight = '800';
        ctaBtn.style.cursor = 'pointer';
        ctaBtn.style.background =
          cta.type === 'whatsapp'
            ? '#25D366'
            : currentAppearance.button_color ||
              currentAppearance.buttonColor ||
              '#111827';
        ctaBtn.style.color = '#fff';

        ctaBtn.addEventListener('click', function () {
          trackMetric({
            event_type:
              cta.type === 'whatsapp' ? 'whatsapp_click' : 'cta_click',
            story_id: story.id,
            video_id: video.id,
            product_id: activeProducts[0] ? activeProducts[0].id : null,
            page_url: window.location.href
          });

          window.open(cta.url, '_blank', 'noopener,noreferrer');
        });

        body.appendChild(ctaBtn);
      }

      if (activeProducts.length && modalConfig.show_product !== false) {
        var product = activeProducts[0];
        var productCard = createEl('div');

        productCard.style.display = 'flex';
        productCard.style.alignItems = 'center';
        productCard.style.gap = '12px';
        productCard.style.border = '1px solid #e2e8f0';
        productCard.style.borderRadius = '18px';
        productCard.style.padding = '12px';
        productCard.style.background = '#fff';
        productCard.style.cursor = 'pointer';

        productCard.innerHTML =
          '<img src="' +
          normalizeMediaUrl(product.image_url || product.imageUrl || '') +
          '" alt="' +
          (product.name || '') +
          '" style="width:72px;height:72px;object-fit:cover;border-radius:14px;background:#e2e8f0;" />' +
          '<div style="min-width:0;flex:1">' +
          '<div style="font-weight:800;color:#0f172a;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          (product.name || '') +
          '</div>' +
          '<div style="margin-top:4px;font-weight:800;color:#7c3aed;font-size:16px;">' +
          Number(product.price || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }) +
          '</div></div>';

        productCard.addEventListener('click', function () {
          trackMetric({
            event_type: 'product_click',
            story_id: story.id,
            video_id: video.id,
            product_id: product.id,
            page_url: window.location.href
          });

          window.open(product.product_url, '_blank', 'noopener,noreferrer');
        });

        body.appendChild(productCard);
      }

      modalContent.appendChild(header);
      modalContent.appendChild(body);

      overlay.style.display = 'flex';
    }

    renderCurrent();
  }

  function renderFloatingBubbles(stories, storyVideoMap, activeVideos) {
    injectForceFloatingCss();

    var existingRoot = document.getElementById('vidlytics-widget-root');
    if (existingRoot) existingRoot.remove();

    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);

    var root = createEl('div', 'vidlytics-widget-root');
    root.id = 'vidlytics-widget-root';

    setImportant(root, 'font-family', getFontFamily(appearance));
    setImportant(root, 'pointer-events', 'auto');
    setImportant(root, 'position', 'fixed');
    setImportant(root, 'top', FORCE_FLOATING.top);
    setImportant(root, 'right', FORCE_FLOATING.right);
    setImportant(root, 'bottom', 'auto');
    setImportant(root, 'left', 'auto');
    setImportant(root, 'z-index', FORCE_FLOATING.zIndex);

    var bubbles = createEl('div', 'vidlytics-bubbles');

    setImportant(bubbles, 'display', 'flex');
    setImportant(bubbles, 'gap', '10px');
    setImportant(bubbles, 'align-items', 'flex-end');
    setImportant(bubbles, 'flex-direction', 'column');

    stories.forEach(function (story) {
      var relations = (storyVideoMap.get(story.id) || [])
        .slice()
        .sort(function (a, b) {
          return Number(a.position || 0) - Number(b.position || 0);
        });

      var coverRelation =
        relations.find(function (item) {
          return item.is_cover;
        }) ||
        relations[0] ||
        null;

      var coverVideo = coverRelation
        ? activeVideos.find(function (video) {
            return idsEqual(video.id, coverRelation.video_id);
          })
        : null;

      var thumb = getStoryThumbnail(story, coverVideo, coverRelation);

      var bubble = createEl('button', 'vidlytics-bubble');
      bubble.type = 'button';

      setImportant(bubble, 'border', 'none');
      setImportant(bubble, 'background', 'transparent');
      setImportant(bubble, 'padding', '0');
      setImportant(bubble, 'margin', '0');
      setImportant(bubble, 'cursor', 'pointer');
      setImportant(bubble, 'display', 'grid');
      setImportant(bubble, 'justify-items', 'center');
      setImportant(bubble, 'gap', '6px');
      setImportant(bubble, 'outline', 'none');

      var ring = createEl('div', 'vidlytics-bubble-ring');

      setImportant(ring, 'width', FORCE_FLOATING.width);
      setImportant(ring, 'height', FORCE_FLOATING.height);
      setImportant(ring, 'min-width', FORCE_FLOATING.width);
      setImportant(ring, 'min-height', FORCE_FLOATING.height);
      setImportant(ring, 'max-width', FORCE_FLOATING.width);
      setImportant(ring, 'max-height', FORCE_FLOATING.height);
      setImportant(ring, 'border-radius', FORCE_FLOATING.radius);
      setImportant(ring, 'padding', '2px');
      setImportant(ring, 'overflow', 'hidden');
      setImportant(
        ring,
        'background',
        'linear-gradient(135deg, ' +
          getPrimaryColor(appearance) +
          ', ' +
          getSecondaryColor(appearance) +
          ')'
      );
      setImportant(ring, 'box-sizing', 'border-box');

      if (modalConfig.shadow_enabled !== false) {
        setImportant(ring, 'box-shadow', '0 12px 30px rgba(15, 23, 42, 0.18)');
      } else {
        setImportant(ring, 'box-shadow', 'none');
      }

      var inner = createEl('div', 'vidlytics-bubble-inner');

      setImportant(inner, 'width', '100%');
      setImportant(inner, 'height', '100%');
      setImportant(inner, 'border-radius', FORCE_FLOATING.radius);
      setImportant(inner, 'overflow', 'hidden');
      setImportant(inner, 'background', '#e2e8f0');
      setImportant(inner, 'display', 'grid');
      setImportant(inner, 'place-items', 'center');
      setImportant(inner, 'box-sizing', 'border-box');

      if (thumb) {
        var img = createEl('img', 'vidlytics-bubble-img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        img.loading = 'lazy';

        setImportant(img, 'width', '100%');
        setImportant(img, 'height', '100%');
        setImportant(img, 'object-fit', 'cover');
        setImportant(img, 'display', 'block');
        setImportant(img, 'border-radius', FORCE_FLOATING.radius);

        img.onerror = function () {
          inner.innerHTML = '';
          inner.textContent = (story.title || story.name || 'S')
            .slice(0, 1)
            .toUpperCase();
          setImportant(inner, 'font-weight', '800');
          setImportant(inner, 'color', getTextColor(appearance));
        };

        inner.appendChild(img);
      } else {
        inner.textContent = (story.title || story.name || 'S')
          .slice(0, 1)
          .toUpperCase();
        setImportant(inner, 'font-weight', '800');
        setImportant(inner, 'color', getTextColor(appearance));
      }

      ring.appendChild(inner);
      bubble.appendChild(ring);

      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'vidlytics-bubble-label');
        label.textContent = story.title || story.name || 'Story';

        setImportant(label, 'max-width', FORCE_FLOATING.width);
        setImportant(label, 'font-size', '11px');
        setImportant(label, 'font-weight', '700');
        setImportant(label, 'color', getTextColor(appearance));
        setImportant(label, 'text-align', 'center');
        setImportant(label, 'white-space', 'nowrap');
        setImportant(label, 'overflow', 'hidden');
        setImportant(label, 'text-overflow', 'ellipsis');

        bubble.appendChild(label);
      }

      bubble.addEventListener('click', function () {
        openStory(
          story,
          storyVideoMap,
          activeVideos,
          readStoryProductsData,
          readProductsData
        );
      });

      bubbles.appendChild(bubble);

      trackMetric({
        event_type: 'view',
        story_id: story.id,
        video_id: coverVideo ? coverVideo.id : null,
        page_url: window.location.href
      });
    });

    root.appendChild(bubbles);
    document.body.appendChild(root);

    forceFloatingStyles();

    setTimeout(forceFloatingStyles, 50);
    setTimeout(forceFloatingStyles, 300);
    setTimeout(forceFloatingStyles, 1000);
  }

  function renderCarousel(stories, storyVideoMap, activeVideos) {
    var existing = document.getElementById('vidlytics-carousel-root');
    if (existing) existing.remove();

    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);

    var container = createEl('div', 'vidlytics-carousel-root');
    container.id = 'vidlytics-carousel-root';
    container.style.fontFamily = getFontFamily(appearance);
    container.style.maxWidth = '100%';
    container.style.overflowX = 'auto';
    container.style.padding = '12px 16px';
    container.style.display = 'flex';
    container.style.gap = '14px';
    container.style.scrollSnapType = 'x mandatory';
    container.style.WebkitOverflowScrolling = 'touch';

    stories.forEach(function (story) {
      var relations = (storyVideoMap.get(story.id) || [])
        .slice()
        .sort(function (a, b) {
          return Number(a.position || 0) - Number(b.position || 0);
        });

      var coverRelation =
        relations.find(function (item) {
          return item.is_cover;
        }) ||
        relations[0] ||
        null;

      var coverVideo = coverRelation
        ? activeVideos.find(function (video) {
            return idsEqual(video.id, coverRelation.video_id);
          })
        : null;

      var thumb = getStoryThumbnail(story, coverVideo, coverRelation);

      var card = createEl('button', 'vidlytics-carousel-card');
      card.type = 'button';
      card.style.border = 'none';
      card.style.background = 'transparent';
      card.style.padding = '0';
      card.style.cursor = 'pointer';
      card.style.flexShrink = '0';
      card.style.scrollSnapAlign = 'start';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '6px';

      var mediaBox = createEl('div');
      mediaBox.style.width = '120px';
      mediaBox.style.height = '180px';
      mediaBox.style.borderRadius = '16px';
      mediaBox.style.overflow = 'hidden';
      mediaBox.style.background = '#e2e8f0';
      mediaBox.style.display = 'grid';
      mediaBox.style.placeItems = 'center';

      if (modalConfig.shadow_enabled !== false) {
        mediaBox.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.14)';
      } else {
        mediaBox.style.boxShadow = 'none';
      }

      if (thumb) {
        var img = createEl('img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';

        img.onerror = function () {
          mediaBox.innerHTML = '';
          mediaBox.textContent = (story.title || story.name || 'S')
            .slice(0, 1)
            .toUpperCase();
          mediaBox.style.fontWeight = '800';
          mediaBox.style.fontSize = '24px';
          mediaBox.style.color = '#64748b';
        };

        mediaBox.appendChild(img);
      } else {
        mediaBox.textContent = (story.title || story.name || 'S')
          .slice(0, 1)
          .toUpperCase();
        mediaBox.style.fontWeight = '800';
        mediaBox.style.fontSize = '24px';
        mediaBox.style.color = '#64748b';
      }

      card.appendChild(mediaBox);

      if (modalConfig.show_title !== false) {
        var label = createEl('span');
        label.textContent = story.title || story.name || 'Story';
        label.style.maxWidth = '120px';
        label.style.fontSize = '12px';
        label.style.fontWeight = '700';
        label.style.color = getTextColor(appearance);
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';

        card.appendChild(label);
      }

      card.addEventListener('click', function () {
        openStory(
          story,
          storyVideoMap,
          activeVideos,
          readStoryProductsData,
          readProductsData
        );
      });

      container.appendChild(card);

      trackMetric({
        event_type: 'impression',
        story_id: story.id,
        video_id: coverVideo ? coverVideo.id : null,
        page_url: window.location.href
      });
    });

    document.body.appendChild(container);
  }

  function renderWidget() {
    injectForceFloatingCss();

    return Promise.all([
      readAppearance(),
      readStories(),
      readStoryVideos(),
      readVideos(),
      readStoryProducts(),
      readProducts(),
      readPageRules()
    ])
      .then(function (results) {
        currentAppearance = results[0] || {};

        var modalConfig = normalizeModalAppearanceConfig(currentAppearance);

        var stories = results[1] || [];
        var storyVideos = results[2] || [];
        var videos = results[3] || [];
        var storyProducts = results[4] || [];
        var products = results[5] || [];
        var pageRules = results[6] || [];

        readStoryProductsData = storyProducts;
        readProductsData = products;

        if (!stories.length) return;
        if (modalConfig.hide_stories) return;

        var activeVideos = videos.filter(function (video) {
          var statusOk = 'status' in video ? video.status === 'active' : true;
          var activeOk = 'active' in video ? video.active !== false : true;
          var hasUrl = Boolean(getVideoUrl(video));

          return statusOk && activeOk && hasUrl;
        });

        if (!activeVideos.length) return;

        var storyVideoMap = new Map();

        storyVideos.forEach(function (item) {
          var storyId = item.story_id;

          if (!storyVideoMap.has(storyId)) {
            storyVideoMap.set(storyId, []);
          }

          storyVideoMap.get(storyId).push(item);
        });

        var storiesWithVideos = stories.filter(function (story) {
          var rels = storyVideoMap.get(story.id) || [];

          return rels.some(function (rel) {
            return activeVideos.some(function (video) {
              return idsEqual(video.id, rel.video_id);
            });
          });
        });

        if (!storiesWithVideos.length) return;

        var applicableStories = storiesWithVideos.filter(function (story) {
          var rulesForStory = pageRules.filter(function (rule) {
            return idsEqual(rule.story_id, story.id);
          });

          if (!rulesForStory.length) return true;

          return rulesForStory.some(matchesRule);
        });

        if (!applicableStories.length) return;

        if (enableFloating) {
          renderFloatingBubbles(
            applicableStories,
            storyVideoMap,
            activeVideos
          );
        }

        if (enableCarousel) {
          renderCarousel(applicableStories, storyVideoMap, activeVideos);
        }

        if (enableGallery) {
          // Reservado para implementação futura de galeria.
        }

        forceFloatingStyles();
      })
      .catch(function (error) {
        console.error('Erro no Vidlytics Widget:', error);
      });
  }

  function initMutationObserver() {
    if (!window.MutationObserver) return;

    var observer = new MutationObserver(function () {
      var root = document.getElementById('vidlytics-widget-root');
      if (root) forceFloatingStyles();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  function init() {
    if (!storeId) return;

    injectForceFloatingCss();
    initMutationObserver();
    renderWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
