/**
 * Vidlytics Widget — widget.js
 *
 * Widget público de vídeo commerce.
 * Versão corrigida definitiva:
 * - Floating TOP RIGHT
 * - Formato retrato 9:16
 * - Protegido contra CSS externo usando Shadow DOM
 * - 202607141248
 */
(function () {
  console.log('VIDLYTICS WIDGET CARREGADO - SHADOW DOM PORTRAIT 9:16 - 202607141248');

  var VIDLYTICS_WIDGET_VERSION = 'shadow-portrait-2026071416';

if (window.__vidlytics_widget_loaded_version === VIDLYTICS_WIDGET_VERSION) {
  return;
}

window.__vidlytics_widget_loaded_version = VIDLYTICS_WIDGET_VERSION;

// Não confiar na flag antiga, porque ela pode ter sido criada por uma versão circular anterior.
window.__vidlytics_widget_initialized = false;


  var config = window.VIDLYTICS_CONFIG || {};
  var storeId = config.storeId || config.lojaId || config.licenseId || null;
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
  var overlay = null;
  var modalContent = null;
  var readStoryProductsData = [];
  var readProductsData = [];

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var FORCE_FLOATING = {
    top: '20px',
    right: '23px',
    width: '85px',
    height: '151px',
    radius: '12px',
    innerRadius: '10px',
    zIndex: '2147483647'
  };

  function createEl(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  function setImportant(el, prop, value) {
    if (!el || value === undefined || value === null || value === '') return;

    try {
      el.style.setProperty(prop, String(value), 'important');
    } catch (e) {
      el.style[prop] = value;
    }
  }

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

    if (typeof value === 'object') return value;

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return {};
      }
    }

    return {};
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;

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
        store_id: nextMetric.store_id,
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

  function readAppearanceValue(appearance, names) {
    appearance = appearance || {};

    var sources = [
      appearance,
      parseJsonIfNeeded(appearance.config),
      parseJsonIfNeeded(appearance.settings),
      parseJsonIfNeeded(appearance.style),
      parseJsonIfNeeded(appearance.styles),
      parseJsonIfNeeded(appearance.appearance_config),
      parseJsonIfNeeded(appearance.appearanceConfig),
      parseJsonIfNeeded(appearance.floating),
      parseJsonIfNeeded(appearance.floatingVideo),
      parseJsonIfNeeded(appearance.floating_video),
      parseJsonIfNeeded(appearance.widget),
      parseJsonIfNeeded(appearance.widget_config),
      parseJsonIfNeeded(appearance.widgetConfig)
    ];

    var device = window.innerWidth < 768 ? 'mobile' : 'desktop';

    sources.slice().forEach(function (src) {
      if (!src || typeof src !== 'object') return;

      sources.push(parseJsonIfNeeded(src[device]));
      sources.push(parseJsonIfNeeded(src[device + '_config']));
      sources.push(parseJsonIfNeeded(src[device + 'Config']));
      sources.push(parseJsonIfNeeded(src.floating));
      sources.push(parseJsonIfNeeded(src.floatingVideo));
      sources.push(parseJsonIfNeeded(src.floating_video));
      sources.push(parseJsonIfNeeded(src.widget));
    });

    for (var i = 0; i < sources.length; i += 1) {
      var src = sources[i];

      if (!src || typeof src !== 'object') continue;

      for (var j = 0; j < names.length; j += 1) {
        if (
          src[names[j]] !== undefined &&
          src[names[j]] !== null &&
          src[names[j]] !== ''
        ) {
          return src[names[j]];
        }
      }
    }

    return undefined;
  }

  function getPrimaryColor(appearance) {
    return (
      readAppearanceValue(appearance, [
        'primary_color',
        'primaryColor',
        'color',
        'cor_primaria'
      ]) || '#0094EB'
    );
  }

  function getSecondaryColor(appearance) {
    return (
      readAppearanceValue(appearance, [
        'secondary_color',
        'secondaryColor',
        'cor_secundaria'
      ]) || '#EC4899'
    );
  }

  function getTextColor(appearance) {
    return (
      readAppearanceValue(appearance, [
        'text_color',
        'textColor',
        'cor_texto'
      ]) || '#0f172a'
    );
  }

  function getFontFamily(appearance) {
    return (
      readAppearanceValue(appearance, ['font_family', 'fontFamily', 'fonte']) ||
      'Inter, system-ui, sans-serif'
    );
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
      var parsed = new URL(String(url).trim());
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

    return '';
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

  function getOrCreateShadowRoot() {
    var existingRoot = document.getElementById('vidlytics-widget-root');

    if (existingRoot) {
      existingRoot.remove();
    }

    var host = createEl('div', 'vidlytics-widget-root');
    host.id = 'vidlytics-widget-root';

    setImportant(host, 'position', 'fixed');
    setImportant(host, 'top', FORCE_FLOATING.top);
    setImportant(host, 'right', FORCE_FLOATING.right);
    setImportant(host, 'bottom', 'auto');
    setImportant(host, 'left', 'auto');
    setImportant(host, 'z-index', FORCE_FLOATING.zIndex);
    setImportant(host, 'width', FORCE_FLOATING.width);
    setImportant(host, 'min-width', FORCE_FLOATING.width);
    setImportant(host, 'max-width', FORCE_FLOATING.width);
    setImportant(host, 'height', 'auto');
    setImportant(host, 'min-height', '0');
    setImportant(host, 'max-height', 'none');
    setImportant(host, 'overflow', 'visible');
    setImportant(host, 'background', 'transparent');
    setImportant(host, 'border', '0');
    setImportant(host, 'box-shadow', 'none');
    setImportant(host, 'pointer-events', 'auto');
    setImportant(host, 'transform', 'none');

    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    return {
      host: host,
      shadow: shadow
    };
  }

  function buildShadowCss(appearance) {
    var primary = getPrimaryColor(appearance);
    var secondary = getSecondaryColor(appearance);
    var text = getTextColor(appearance);
    var font = getFontFamily(appearance);
    var modalConfig = normalizeModalAppearanceConfig(appearance);

    return ''
      + ':host{'
      + 'all:initial!important;'
      + 'position:fixed!important;'
      + 'top:' + FORCE_FLOATING.top + '!important;'
      + 'right:' + FORCE_FLOATING.right + '!important;'
      + 'bottom:auto!important;'
      + 'left:auto!important;'
      + 'z-index:' + FORCE_FLOATING.zIndex + '!important;'
      + 'width:' + FORCE_FLOATING.width + '!important;'
      + 'min-width:' + FORCE_FLOATING.width + '!important;'
      + 'max-width:' + FORCE_FLOATING.width + '!important;'
      + 'height:auto!important;'
      + 'overflow:visible!important;'
      + 'background:transparent!important;'
      + 'pointer-events:auto!important;'
      + 'font-family:' + font + '!important;'
      + '}'

      + '*,*::before,*::after{'
      + 'box-sizing:border-box!important;'
      + '}'

      + '.vl-bubbles{'
      + 'width:' + FORCE_FLOATING.width + '!important;'
      + 'display:flex!important;'
      + 'flex-direction:column!important;'
      + 'align-items:flex-end!important;'
      + 'justify-content:flex-start!important;'
      + 'gap:10px!important;'
      + 'overflow:visible!important;'
      + '}'

      + '.vl-bubble{'
      + 'all:unset!important;'
      + 'width:' + FORCE_FLOATING.width + '!important;'
      + 'min-width:' + FORCE_FLOATING.width + '!important;'
      + 'max-width:' + FORCE_FLOATING.width + '!important;'
      + 'height:auto!important;'
      + 'display:flex!important;'
      + 'flex-direction:column!important;'
      + 'align-items:center!important;'
      + 'justify-content:flex-start!important;'
      + 'gap:4px!important;'
      + 'cursor:pointer!important;'
      + 'overflow:visible!important;'
      + 'pointer-events:auto!important;'
      + '}'

      + '.vl-ring{'
      + 'width:' + FORCE_FLOATING.width + '!important;'
      + 'height:' + FORCE_FLOATING.height + '!important;'
      + 'min-width:' + FORCE_FLOATING.width + '!important;'
      + 'min-height:' + FORCE_FLOATING.height + '!important;'
      + 'max-width:' + FORCE_FLOATING.width + '!important;'
      + 'max-height:' + FORCE_FLOATING.height + '!important;'
      + 'aspect-ratio:9/16!important;'
      + 'border-radius:' + FORCE_FLOATING.radius + '!important;'
      + 'padding:2px!important;'
      + 'overflow:hidden!important;'
      + 'display:block!important;'
      + 'background:linear-gradient(135deg,' + primary + ',' + secondary + ')!important;'
      + 'box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 12px 30px rgba(15,23,42,.18)' : 'none') + '!important;'
      + 'clip-path:none!important;'
      + '}'

      + '.vl-inner{'
      + 'width:100%!important;'
      + 'height:100%!important;'
      + 'border-radius:' + FORCE_FLOATING.innerRadius + '!important;'
      + 'overflow:hidden!important;'
      + 'background:#e2e8f0!important;'
      + 'display:flex!important;'
      + 'align-items:center!important;'
      + 'justify-content:center!important;'
      + 'font-weight:800!important;'
      + 'font-size:24px!important;'
      + 'color:' + text + '!important;'
      + 'clip-path:none!important;'
      + '}'

      + '.vl-img{'
      + 'width:100%!important;'
      + 'height:100%!important;'
      + 'min-width:100%!important;'
      + 'min-height:100%!important;'
      + 'max-width:100%!important;'
      + 'max-height:100%!important;'
      + 'object-fit:cover!important;'
      + 'object-position:center!important;'
      + 'display:block!important;'
      + 'border-radius:' + FORCE_FLOATING.innerRadius + '!important;'
      + 'clip-path:none!important;'
      + 'overflow:hidden!important;'
      + '}'

      + '.vl-label{'
      + 'width:' + FORCE_FLOATING.width + '!important;'
      + 'max-width:' + FORCE_FLOATING.width + '!important;'
      + 'font-family:' + font + '!important;'
      + 'font-size:11px!important;'
      + 'line-height:12px!important;'
      + 'font-weight:700!important;'
      + 'color:' + text + '!important;'
      + 'text-align:center!important;'
      + 'white-space:nowrap!important;'
      + 'overflow:hidden!important;'
      + 'text-overflow:ellipsis!important;'
      + 'display:block!important;'
      + '}'

      + '.vl-overlay{'
      + 'position:fixed!important;'
      + 'inset:0!important;'
      + 'width:100vw!important;'
      + 'height:100vh!important;'
      + 'background:rgba(15,23,42,.7)!important;'
      + 'display:none!important;'
      + 'align-items:center!important;'
      + 'justify-content:center!important;'
      + 'padding:20px!important;'
      + 'z-index:' + FORCE_FLOATING.zIndex + '!important;'
      + 'font-family:' + font + '!important;'
      + '}'

      + '.vl-overlay.is-open{'
      + 'display:flex!important;'
      + '}'

      + '.vl-modal{'
      + 'width:min(92vw,420px)!important;'
      + 'max-height:88vh!important;'
      + 'overflow:hidden!important;'
      + 'background:#fff!important;'
      + 'border-radius:24px!important;'
      + 'box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 24px 80px rgba(15,23,42,.3)' : 'none') + '!important;'
      + 'display:flex!important;'
      + 'flex-direction:column!important;'
      + '}'

      + '.vl-header{'
      + 'display:flex!important;'
      + 'align-items:center!important;'
      + 'justify-content:space-between!important;'
      + 'padding:14px 16px!important;'
      + 'border-bottom:1px solid #e2e8f0!important;'
      + '}'

      + '.vl-title{'
      + 'font-weight:800!important;'
      + 'color:' + text + '!important;'
      + 'font-size:14px!important;'
      + '}'

      + '.vl-count{'
      + 'font-size:12px!important;'
      + 'color:#64748b!important;'
      + '}'

      + '.vl-close{'
      + 'all:unset!important;'
      + 'font-size:28px!important;'
      + 'line-height:1!important;'
      + 'cursor:pointer!important;'
      + 'color:' + text + '!important;'
      + '}'

      + '.vl-body{'
      + 'padding:16px!important;'
      + 'display:grid!important;'
      + 'gap:12px!important;'
      + 'overflow:auto!important;'
      + '}'

      + '.vl-player{'
      + 'width:100%!important;'
      + 'aspect-ratio:9/16!important;'
      + 'border-radius:18px!important;'
      + 'overflow:hidden!important;'
      + 'background:#000!important;'
      + '}'

      + '.vl-player video,.vl-player iframe{'
      + 'width:100%!important;'
      + 'height:100%!important;'
      + 'border:0!important;'
      + 'display:block!important;'
      + 'object-fit:cover!important;'
      + '}'

      + '.vl-nav{'
      + 'display:flex!important;'
      + 'gap:10px!important;'
      + '}'

      + '.vl-btn{'
      + 'all:unset!important;'
      + 'flex:1!important;'
      + 'text-align:center!important;'
      + 'border-radius:999px!important;'
      + 'padding:10px 14px!important;'
      + 'font-weight:800!important;'
      + 'font-size:13px!important;'
      + 'cursor:pointer!important;'
      + 'background:#e2e8f0!important;'
      + 'color:#0f172a!important;'
      + '}'

      + '.vl-btn-primary{'
      + 'background:' + primary + '!important;'
      + 'color:#fff!important;'
      + '}'

      + '.vl-product{'
      + 'display:flex!important;'
      + 'align-items:center!important;'
      + 'gap:12px!important;'
      + 'border:1px solid #e2e8f0!important;'
      + 'border-radius:18px!important;'
      + 'padding:12px!important;'
      + 'background:#fff!important;'
      + 'cursor:pointer!important;'
      + '}'

      + '.vl-product-img{'
      + 'width:72px!important;'
      + 'height:72px!important;'
      + 'border-radius:14px!important;'
      + 'object-fit:cover!important;'
      + 'background:#e2e8f0!important;'
      + 'flex:0 0 auto!important;'
      + '}'

      + '.vl-product-info{'
      + 'min-width:0!important;'
      + 'flex:1!important;'
      + '}'

      + '.vl-product-name{'
      + 'font-weight:800!important;'
      + 'font-size:14px!important;'
      + 'color:#0f172a!important;'
      + 'white-space:nowrap!important;'
      + 'overflow:hidden!important;'
      + 'text-overflow:ellipsis!important;'
      + '}'

      + '.vl-product-price{'
      + 'margin-top:4px!important;'
      + 'font-weight:800!important;'
      + 'font-size:16px!important;'
      + 'color:#7c3aed!important;'
      + '}';
  }

  function buildVideoPlayer(video, storyId) {
    var url = getVideoUrl(video);
    var ytId = extractYouTubeId(url);
    var isUpload =
      video.source_type === 'upload' || video.sourceType === 'upload';
    var isDirect = isDirectVideoUrl(url);

    var wrapper = createEl('div', 'vl-player');

    if (!isUpload && ytId) {
      var iframe = createEl('iframe');
      iframe.src = getYouTubeEmbedUrl(url);
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.title = video.title || video.name || 'Vídeo';

      wrapper.appendChild(iframe);

      return {
        el: wrapper,
        type: 'youtube'
      };
    }

    if ((isUpload || isDirect) && url) {
      var media = createEl('video');
      media.src = url;
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;

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

      wrapper.appendChild(media);

      return {
        el: wrapper,
        type: 'html5'
      };
    }

    var link = createEl('a');
    link.href = url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir vídeo';
    link.className = 'vl-btn vl-btn-primary';

    wrapper.appendChild(link);

    return {
      el: wrapper,
      type: 'link'
    };
  }

  function closeOverlay() {
    if (overlay) {
      overlay.className = 'vl-overlay';
    }

    if (modalContent) {
      modalContent.innerHTML = '';
    }
  }

  function openStory(story, storyVideoMap, activeVideos, storyProducts, products) {
    if (!overlay || !modalContent) return;

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

      if (activeProducts.length && activeProducts[0].product_url) {
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

      var header = createEl('div', 'vl-header');
      var titleWrap = createEl('div');

      if (modalConfig.show_title) {
        var title = createEl('div', 'vl-title');
        title.textContent = story.title || story.name || 'Story';

        var count = createEl('div', 'vl-count');
        count.textContent = currentIndex + 1 + '/' + orderedVideos.length;

        titleWrap.appendChild(title);
        titleWrap.appendChild(count);
      }

      var closeBtn = createEl('button', 'vl-close');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', closeOverlay);

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);

      var body = createEl('div', 'vl-body');

      var playerResult = buildVideoPlayer(video, story.id);
      body.appendChild(playerResult.el);

      var nav = createEl('div', 'vl-nav');

      var prevBtn = createEl('button', 'vl-btn');
      prevBtn.type = 'button';
      prevBtn.textContent = 'Anterior';
      prevBtn.disabled = currentIndex === 0;

      if (currentIndex === 0) {
        prevBtn.style.opacity = '0.5';
      }

      prevBtn.addEventListener('click', function () {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderCurrent();
        }
      });

      var nextBtn = createEl('button', 'vl-btn vl-btn-primary');
      nextBtn.type = 'button';
      nextBtn.textContent =
        currentIndex === orderedVideos.length - 1 ? 'Fechar' : 'Próximo';

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
        var ctaBtn = createEl('button', 'vl-btn vl-btn-primary');
        ctaBtn.type = 'button';
        ctaBtn.textContent = cta.text;

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

        var productCard = createEl('div', 'vl-product');

        var productImg = createEl('img', 'vl-product-img');
        productImg.src = normalizeMediaUrl(
          product.image_url || product.imageUrl || ''
        );
        productImg.alt = product.name || '';

        var productInfo = createEl('div', 'vl-product-info');

        var productName = createEl('div', 'vl-product-name');
        productName.textContent = product.name || '';

        var productPrice = createEl('div', 'vl-product-price');
        productPrice.textContent = Number(product.price || 0).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL'
          }
        );

        productInfo.appendChild(productName);
        productInfo.appendChild(productPrice);

        productCard.appendChild(productImg);
        productCard.appendChild(productInfo);

        productCard.addEventListener('click', function () {
          trackMetric({
            event_type: 'product_click',
            story_id: story.id,
            video_id: video.id,
            product_id: product.id,
            page_url: window.location.href
          });

          if (product.product_url) {
            window.open(product.product_url, '_blank', 'noopener,noreferrer');
          }
        });

        body.appendChild(productCard);
      }

      modalContent.appendChild(header);
      modalContent.appendChild(body);

      overlay.className = 'vl-overlay is-open';
    }

    renderCurrent();
  }

  function renderFloatingBubbles(stories, storyVideoMap, activeVideos) {
    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);
    var shadowData = getOrCreateShadowRoot();
    var shadow = shadowData.shadow;

    var style = createEl('style');
    style.textContent = buildShadowCss(appearance);

    var bubbles = createEl('div', 'vl-bubbles');

    overlay = createEl('div', 'vl-overlay');

    var modal = createEl('div', 'vl-modal');
    modalContent = createEl('div');

    modal.appendChild(modalContent);
    overlay.appendChild(modal);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeOverlay();
      }
    });

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

      var bubble = createEl('button', 'vl-bubble');
      bubble.type = 'button';
      bubble.setAttribute('aria-label', story.title || story.name || 'Story');

      var ring = createEl('div', 'vl-ring');
      var inner = createEl('div', 'vl-inner');

      if (thumb) {
        var img = createEl('img', 'vl-img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        img.loading = 'lazy';

        img.onerror = function () {
          inner.innerHTML = '';
          inner.textContent = (story.title || story.name || 'S')
            .slice(0, 1)
            .toUpperCase();
        };

        inner.appendChild(img);
      } else {
        inner.textContent = (story.title || story.name || 'S')
          .slice(0, 1)
          .toUpperCase();
      }

      ring.appendChild(inner);
      bubble.appendChild(ring);

      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'vl-label');
        label.textContent = story.title || story.name || 'Story';
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

    shadow.appendChild(style);
    shadow.appendChild(bubbles);
    shadow.appendChild(overlay);
  }

  function renderCarousel(stories, storyVideoMap, activeVideos) {
    var existing = document.getElementById('vidlytics-carousel-root');
    if (existing) existing.remove();

    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);

    var host = createEl('div', 'vidlytics-carousel-root');
    host.id = 'vidlytics-carousel-root';

    var shadow = host.attachShadow({ mode: 'open' });

    var style = createEl('style');
    style.textContent =
      '*{box-sizing:border-box!important;}' +
      '.carousel{' +
      'font-family:' + getFontFamily(appearance) + '!important;' +
      'max-width:100%!important;' +
      'overflow-x:auto!important;' +
      'padding:12px 16px!important;' +
      'display:flex!important;' +
      'gap:14px!important;' +
      'scroll-snap-type:x mandatory!important;' +
      '-webkit-overflow-scrolling:touch!important;' +
      '}' +
      '.card{' +
      'all:unset!important;' +
      'cursor:pointer!important;' +
      'flex-shrink:0!important;' +
      'scroll-snap-align:start!important;' +
      'display:flex!important;' +
      'flex-direction:column!important;' +
      'gap:6px!important;' +
      '}' +
      '.media{' +
      'width:120px!important;' +
      'height:180px!important;' +
      'border-radius:16px!important;' +
      'overflow:hidden!important;' +
      'background:#e2e8f0!important;' +
      'display:grid!important;' +
      'place-items:center!important;' +
      'font-weight:800!important;' +
      'font-size:24px!important;' +
      'color:#64748b!important;' +
      'box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 10px 24px rgba(15,23,42,.14)' : 'none') + '!important;' +
      '}' +
      '.media img{' +
      'width:100%!important;' +
      'height:100%!important;' +
      'object-fit:cover!important;' +
      'display:block!important;' +
      '}' +
      '.label{' +
      'max-width:120px!important;' +
      'font-size:12px!important;' +
      'font-weight:700!important;' +
      'color:' + getTextColor(appearance) + '!important;' +
      'white-space:nowrap!important;' +
      'overflow:hidden!important;' +
      'text-overflow:ellipsis!important;' +
      '}';

    var container = createEl('div', 'carousel');

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

      var card = createEl('button', 'card');
      card.type = 'button';

      var mediaBox = createEl('div', 'media');

      if (thumb) {
        var img = createEl('img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        img.loading = 'lazy';

        img.onerror = function () {
          mediaBox.innerHTML = '';
          mediaBox.textContent = (story.title || story.name || 'S')
            .slice(0, 1)
            .toUpperCase();
        };

        mediaBox.appendChild(img);
      } else {
        mediaBox.textContent = (story.title || story.name || 'S')
          .slice(0, 1)
          .toUpperCase();
      }

      card.appendChild(mediaBox);

      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'label');
        label.textContent = story.title || story.name || 'Story';
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

    shadow.appendChild(style);
    shadow.appendChild(container);

    document.body.appendChild(host);
  }

  function forceHostPosition() {
    var host = document.getElementById('vidlytics-widget-root');
    if (!host) return;

    setImportant(host, 'position', 'fixed');
    setImportant(host, 'top', FORCE_FLOATING.top);
    setImportant(host, 'right', FORCE_FLOATING.right);
    setImportant(host, 'bottom', 'auto');
    setImportant(host, 'left', 'auto');
    setImportant(host, 'z-index', FORCE_FLOATING.zIndex);
    setImportant(host, 'width', FORCE_FLOATING.width);
    setImportant(host, 'min-width', FORCE_FLOATING.width);
    setImportant(host, 'max-width', FORCE_FLOATING.width);
    setImportant(host, 'height', 'auto');
    setImportant(host, 'overflow', 'visible');
    setImportant(host, 'background', 'transparent');
    setImportant(host, 'border', '0');
    setImportant(host, 'box-shadow', 'none');
    setImportant(host, 'pointer-events', 'auto');
    setImportant(host, 'transform', 'none');
  }

  function renderWidget() {
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

        forceHostPosition();

        setTimeout(forceHostPosition, 100);
        setTimeout(forceHostPosition, 500);
        setTimeout(forceHostPosition, 1500);
        setTimeout(forceHostPosition, 3000);
      })
      .catch(function (error) {
        console.error('Erro no Vidlytics Widget:', error);
      });
  }

  function initMutationObserver() {
    if (!window.MutationObserver) return;

    var scheduled = false;

    function scheduleForce() {
      if (scheduled) return;

      scheduled = true;

      setTimeout(function () {
        scheduled = false;
        forceHostPosition();
      }, 150);
    }

    var observer = new MutationObserver(function (mutations) {
      var shouldForce = false;

      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          shouldForce = true;
        }

        if (
          mutation.type === 'attributes' &&
          mutation.target &&
          mutation.target.id === 'vidlytics-widget-root'
        ) {
          shouldForce = true;
        }
      });

      if (shouldForce) {
        scheduleForce();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  function init() {
    if (!storeId) {
      console.warn('Vidlytics Widget: storeId não informado.');
      return;
    }

    initMutationObserver();
    renderWidget();

    setTimeout(forceHostPosition, 300);
    setTimeout(forceHostPosition, 1000);
    setTimeout(forceHostPosition, 3000);
    setTimeout(forceHostPosition, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
