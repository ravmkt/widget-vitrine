(function () {
  var WIDGET_VERSION = '2026.08.09-12';

  console.info(
    '%cVidlytics Widget carregado — versão ' + WIDGET_VERSION,
    'color: #22c55e; font-weight: bold; font-size: 13px;'
  );

  var globalConfig = window.VIDLYTICS_CONFIG || window.vidlyticsConfig || {};
  var config = globalConfig.config || globalConfig;
  var widgetsCfg = globalConfig.widgets || globalConfig.widgetsConfig || {};

  var supabaseUrl = String(globalConfig.supabaseUrl || config.supabaseUrl || '').replace(/\/+$/, '');
  var supabaseAnonKey = globalConfig.supabaseAnonKey || globalConfig.anonKey || config.supabaseAnonKey || config.anonKey || '';
  var storeId = globalConfig.storeId || config.storeId || '';

  var hasSupabase = Boolean(supabaseUrl && supabaseAnonKey && storeId);

  if (window.__vidlytics_widget_loaded_version === WIDGET_VERSION) return;
  window.__vidlytics_widget_loaded_version = WIDGET_VERSION;

  try {
    var oldRoot = document.getElementById('vidlytics-widget-root');
    if (oldRoot) oldRoot.remove();
    var oldCarousel = document.getElementById('vidlytics-carousel-root');
    if (oldCarousel) oldCarousel.remove();
  } catch (e) {}

  var enableFloating = widgetsCfg.floatingVideo !== undefined ? widgetsCfg.floatingVideo : config.floatingVideo !== false;

  // 🆕 PLAYER FULLSCREEN (independente do modal de stories)
  var fsPlayerOverlay = null;
  var fsPlayerContainer = null;

function ensureModalStylesInLightDOM(appearance) {
  if (document.getElementById('vl-modal-light-styles')) return;
  
  var style = document.createElement('style');
  style.id = 'vl-modal-light-styles';
  style.textContent = buildSharedCss(appearance);
  document.head.appendChild(style);
}

  function createFullscreenPlayer() {
    if (fsPlayerOverlay) return;

    // Injeta CSS do player fullscreen no DOM global (light DOM),
    // pois o overlay é anexado em document.body, fora do Shadow DOM
    if (!document.getElementById('vl-fs-player-styles')) {
      var fsStyle = document.createElement('style');
      fsStyle.id = 'vl-fs-player-styles';
      fsStyle.textContent =
        '.vl-fullscreen-player{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,.96)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;opacity:0!important;pointer-events:none!important;transition:opacity .3s ease!important;}' +
        '.vl-fullscreen-player.vl-active{opacity:1!important;pointer-events:all!important;}' +
        '.vl-fs-close{position:absolute!important;top:18px!important;right:28px!important;width:42px!important;height:42px!important;border:none!important;background:rgba(255,255,255,.12)!important;border-radius:50%!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;font-size:28px!important;z-index:20!important;line-height:1!important;transition:background .2s!important;}' +
        '.vl-fs-close:hover{background:rgba(255,255,255,.22)!important;}' +
        '.vl-fs-container{width:92vw!important;max-width:1200px!important;aspect-ratio:16/9!important;position:relative!important;}' +
        '.vl-fs-container iframe,.vl-fs-container video{width:100%!important;height:100%!important;border:none!important;border-radius:8px!important;}' +
        '.vl-fs-container video{object-fit:contain!important;background:#000!important;}';
      document.head.appendChild(fsStyle);
    }

    fsPlayerOverlay = document.createElement('div');
    fsPlayerOverlay.className = 'vl-fullscreen-player';
    fsPlayerOverlay.innerHTML =
      '<button class="vl-fs-close">&times;</button>' +
      '<div class="vl-fs-container"></div>';
    document.body.appendChild(fsPlayerOverlay);

    fsPlayerContainer = fsPlayerOverlay.querySelector('.vl-fs-container');

    // Fechar pelo botão X
    fsPlayerOverlay.querySelector('.vl-fs-close').addEventListener('click', function(e) {
      e.stopPropagation();
      closeFullscreenPlayer();
    });

    // Fechar clicando fora do vídeo
    fsPlayerOverlay.addEventListener('click', function(e) {
      if (e.target === fsPlayerOverlay) closeFullscreenPlayer();
    });

    // Fechar com tecla ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && fsPlayerOverlay && fsPlayerOverlay.classList.contains('vl-active')) {
        closeFullscreenPlayer();
      }
    });
  }

  function closeFullscreenPlayer() {
    if (!fsPlayerOverlay || !fsPlayerContainer) return;
    fsPlayerOverlay.classList.remove('vl-active');
    var vid = fsPlayerContainer.querySelector('video');
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    fsPlayerContainer.innerHTML = '';
  }

  function openFullscreenPlayer(videoUrl, sourceType) {
    createFullscreenPlayer();
    if (!fsPlayerContainer) return;

    fsPlayerContainer.innerHTML = '';
    sourceType = String(sourceType || '').trim().toLowerCase();

    // YouTube
    if (sourceType === 'youtube' || sourceType === 'yt') {
      var ytId = extractYouTubeId(videoUrl);
      if (ytId) {
        fsPlayerContainer.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
      }
    }
    // Instagram Reel
    else if (sourceType === 'instagram' || sourceType === 'ig') {
      var igId = extractInstagramId(videoUrl);
      fsPlayerContainer.innerHTML = '<iframe src="https://www.instagram.com/reel/' + igId + '/embed/" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    }
    // TikTok
    else if (sourceType === 'tiktok' || sourceType === 'tt') {
      var tkId = extractTikTokId(videoUrl);
      fsPlayerContainer.innerHTML = '<iframe src="https://www.tiktok.com/embed/v2/' + tkId + '" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    }
    // Upload direto (MP4, WebM, etc.)
    else if (sourceType === 'upload' || isDirectVideoUrl(videoUrl)) {
      fsPlayerContainer.innerHTML = '<video src="' + videoUrl + '" controls autoplay playsinline></video>';
    }
    // Fallback genérico: tenta como vídeo direto
    else {
      fsPlayerContainer.innerHTML = '<video src="' + videoUrl + '" controls autoplay playsinline></video>';
    }

    fsPlayerOverlay.classList.add('vl-active');
  }

  var currentAppearance = {};
  var overlay = null;
  var modalContent = null;
  var globalShadowRoot = null;
  var floatingWasDragged = false;
  var floatingWasClosed = false;
  var widgetSelectToken = null;
  var readStoryProductsData = [];
  var readProductsData = [];
  var readCommentsData = [];
  var readSizingModelsData = [];
  var readLikeCounts = {};
  var autoApproveComments = false;
  var likedVideos = {};
  var videoLikeCounts = {};
  var userCommentedVideos = {};
  var storeWhatsappNumber = '';
  var storeWhatsappMessage = '';

  var currentStories = [];
  var currentStoryIndex = 0;
  var currentVideoIndex = 0;

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var DEFAULT_APPEARANCE = {
    style_name: 'default',
    same_appearance_all_devices: true,
    primary_color: '#0094EB',
    secondary_color: '#0094EB',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    font_family: 'Inter, system-ui, sans-serif',
    font_size: '14',
    floating_shape: 'portrait',
    floating_size: '80',
    floating_border_radius: '12',
    floating_position: 'bottom-right',
    floating_margin_bottom: '20',
    floating_margin_top: '20',
    floating_margin_side: '20',
    floating_border_color: '#0094EB',
    floating_border_width: '2',
    floating_object_fit: 'cover',
    floating_z_index: '2147483647',
    floating_show_title: true,
    floating_show_play_button: true,
    floating_allow_drag: false,
    floating_allow_close: true,
    carousel_shape: 'portrait',
    carousel_size: '200',
    carousel_visible_items: '4',
    carousel_spacing: '16',
    carousel_border_color: '#0094EB',
    carousel_border_width: '2',
    carousel_border_radius: '12',
    carousel_object_fit: 'cover',
    carousel_margin_top: '0',
    carousel_margin_bottom: '0',
    carousel_show_title: false,
    carousel_show_product: true,
    carousel_show_play_button: true,
    carousel_auto_center: false,
    grid_shape: 'portrait',
    grid_size: '200',
    grid_columns: '4',
    grid_rows: '1',
    grid_spacing: '16',
    grid_border_color: '#0094EB',
    grid_border_width: '2',
    grid_border_radius: '12',
    grid_object_fit: 'cover',
    grid_show_title: false,
    modal_show_title: true,
    modal_show_play_button: true,
    modal_show_product: true,
    modal_show_product_button: true,
    modal_show_like_button: true,
    modal_show_comment_button: true,
    modal_show_share_button: true,
    modal_show_whatsapp_button: true,
    modal_show_sizing_button: true,
    modal_hide_stories: false,
    modal_shadow_enabled: true,
    modal_border_color: '',
    modal_border_width: '',
    modal_border_radius: ''
  };

  function getDevice() {
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }

  function readDeviceValue(appearance, baseName, fallback) {
    var sameAll = appearance.same_appearance_all_devices;
    if (sameAll === undefined || sameAll === null || sameAll === true || sameAll === 'true' || sameAll === 1 || sameAll === '1') {
      var baseVal = appearance[baseName];
      return (baseVal !== undefined && baseVal !== null && baseVal !== '') ? baseVal : fallback;
    }
    var device = getDevice();
    var deviceKey = baseName + '_' + device;
    var deviceVal = appearance[deviceKey];
    if (deviceVal !== undefined && deviceVal !== null && deviceVal !== '') {
      return deviceVal;
    }
    var fallbackBase = appearance[baseName];
    return (fallbackBase !== undefined && fallbackBase !== null && fallbackBase !== '') ? fallbackBase : fallback;
  }

  function readJsonbConfigValue(appearance, configKey, fieldName, fallback) {
    var configObj = appearance[configKey];
    if (configObj === undefined || configObj === null) return fallback;
    if (typeof configObj === 'string') {
      try { configObj = JSON.parse(configObj); } catch(e) { return fallback; }
    }
    if (!isPlainObject(configObj)) return fallback;
    if (configObj[fieldName] !== undefined && configObj[fieldName] !== null && configObj[fieldName] !== '') {
      return configObj[fieldName];
    }
    var device = getDevice();
    var sameAll = configObj.same_for_all;
    if (sameAll === true || sameAll === undefined || sameAll === null) {
      if (configObj.desktop && configObj.desktop[fieldName] !== undefined && configObj.desktop[fieldName] !== null && configObj.desktop[fieldName] !== '') {
        return configObj.desktop[fieldName];
      }
      if (configObj.mobile && configObj.mobile[fieldName] !== undefined && configObj.mobile[fieldName] !== null && configObj.mobile[fieldName] !== '') {
        return configObj.mobile[fieldName];
      }
      return fallback;
    }
    var deviceConfig = configObj[device];
    if (deviceConfig && deviceConfig[fieldName] !== undefined && deviceConfig[fieldName] !== null && deviceConfig[fieldName] !== '') {
      return deviceConfig[fieldName];
    }
    var otherDevice = device === 'mobile' ? 'desktop' : 'mobile';
    var otherConfig = configObj[otherDevice];
    if (otherConfig && otherConfig[fieldName] !== undefined && otherConfig[fieldName] !== null && otherConfig[fieldName] !== '') {
      return otherConfig[fieldName];
    }
    return fallback;
  }

  function readConfigValue(appearance, configKey, jsonbField, flatField, fallback) {
    var jsonbVal = readJsonbConfigValue(appearance, configKey, jsonbField);
    if (jsonbVal !== undefined && jsonbVal !== null && jsonbVal !== '') return jsonbVal;
    if (flatField) {
      var flatVal = readDeviceValue(appearance, flatField);
      if (flatVal !== undefined && flatVal !== null && flatVal !== '') return flatVal;
    }
    return fallback;
  }

  function createEl(tag, className) { var el = document.createElement(tag); if (className) el.className = className; return el; }

  function setImportant(el, prop, value) {
    if (!el || value === undefined || value === null || value === '') return;
    try { el.style.setProperty(prop, String(value), 'important'); } catch (e) { el.style[prop] = value; }
  }

  function firstDefined() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i];
    }
    return undefined;
  }

  function safeInt(value, fallback) {
    var num = parseInt(value);
    return isNaN(num) ? fallback : num;
  }

  function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
  }

  function isPlainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }

  function parseJsonIfNeeded(value) {
    if (!value) return {};
    if (isPlainObject(value)) return value;
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed || (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[')) return {};
      try { var parsed = JSON.parse(trimmed); return isPlainObject(parsed) ? parsed : {}; } catch (e) { return {}; }
    }
    return {};
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/_/g, '-').replace(/\s+/g, '-');
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (value === true || value === 1 || value === '1') return true;
    if (typeof value === 'string') {
      var norm = value.trim().toLowerCase();
      if (norm === 'true') return true;
      if (norm === 'false') return false;
    }
    if (value === false || value === 0 || value === '0') return false;
    return fallback;
  }

  function toNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    var parsed = Number(String(value).trim().replace('px', '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function px(value, fallback) {
    if (value === undefined || value === null || value === '') value = fallback !== undefined ? fallback : 0;
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (trimmed === 'auto' || trimmed.indexOf('px') !== -1 || trimmed.indexOf('%') !== -1 || trimmed.indexOf('vh') !== -1 || trimmed.indexOf('vw') !== -1) return trimmed;
    }
    return toNumber(value, fallback !== undefined ? fallback : 0) + 'px';
  }

  function normalizeMediaUrl(url) {
    if (!url) return '';
    var value = String(url).trim();
    if (!value) return '';
    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('data:') === 0 || value.indexOf('blob:') === 0) return value;
    if (value.indexOf('//') === 0) return window.location.protocol + value;
    if (value.charAt(0) === '/' && supabaseUrl) return supabaseUrl + value;
    return value;
  }

  function getStorageItem(key, fallback) {
    try { var item = localStorage.getItem(key); if (!item) return fallback; try { return JSON.parse(item); } catch (e) { return item; } } catch (e2) { return fallback; }
  }

  function sanitizeCssValue(value, fallback, type) {
    type = type || 'color';
    if (value === undefined || value === null || value === '') return fallback || '';

    var sanitized = String(value).trim();

    if (type === 'color') {
      sanitized = sanitized.replace(/[<>"'`&;{}()\\]/g, '');
      if (/^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|transparent|inherit|initial|currentColor|var\(--|[a-z]+$)/.test(sanitized)) {
        return sanitized;
      }
      return fallback || '';
    }

    if (type === 'font') {
      sanitized = sanitized.replace(/[<>`&;{}()\\]/g, '');
      sanitized = sanitized.replace(/;+/g, '').replace(/\{+/g, '').replace(/\}+/g, '');
      return sanitized || fallback || 'Inter, system-ui, sans-serif';
    }

    if (type === 'number') {
      var num = parseFloat(sanitized);
      return isNaN(num) ? (fallback || '0') : String(num);
    }

    sanitized = sanitized.replace(/[<>"'`&;{}()]/g, '');
    return sanitized || fallback || '';
  }

  function setStorageItem(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  function normalizeAppearanceItem(item) {
    var merged = {};
    flattenAppearanceInto(merged, item || {}, 0);
    delete merged.storageAppearance; delete merged.configAppearance; delete merged.dbAppearance;
    delete merged.widgetsAppearance; delete merged.widgetsAparencia;
    return merged;
  }

  var JSONB_KEYS = ['floating_config', 'carousel_config', 'grid_config', 'modal_config'];

  function flattenAppearanceInto(target, source, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 12 || !source) return target;
    if (typeof source === 'string') source = parseJsonIfNeeded(source);
    if (!isPlainObject(source)) return target;
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value === undefined || value === null || value === '') return;
      if (JSONB_KEYS.indexOf(key) !== -1) { target[key] = value; return; }
      if (isPlainObject(value)) { flattenAppearanceInto(target, value, depth + 1); return; }
      if (typeof value === 'string') {
        var parsed = parseJsonIfNeeded(value);
        if (isPlainObject(parsed) && Object.keys(parsed).length) { flattenAppearanceInto(target, parsed, depth + 1); return; }
      }
      target[key] = value;
    });
    return target;
  }

  function mergeObject(target, source) {
    source = normalizeAppearanceItem(source || {});
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value !== undefined && value !== null && value !== '') target[key] = value;
    });
    return target;
  }

  function readAppearanceValue(appearance, names) {
    appearance = normalizeAppearanceItem(appearance || {});
    for (var i = 0; i < names.length; i += 1) {
      if (appearance[names[i]] !== undefined && appearance[names[i]] !== null && appearance[names[i]] !== '') return appearance[names[i]];
    }
    var normalizedNames = names.map(function (name) { return normalizeKey(name); });
    var keys = Object.keys(appearance);
    for (var k = 0; k < keys.length; k += 1) {
      var currentKey = keys[k];
      if (normalizedNames.indexOf(normalizeKey(currentKey)) !== -1) {
        if (appearance[currentKey] !== undefined && appearance[currentKey] !== null && appearance[currentKey] !== '') return appearance[currentKey];
      }
    }
    return undefined;
  }

  function supabaseFetch(path, options) {
    if (!hasSupabase) return Promise.reject(new Error('Supabase não configurado.'));
    options = options || {};
    var headers = {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };
    if (options.headers) {
      Object.keys(options.headers).forEach(function (key) { headers[key] = options.headers[key]; });
    }
    return fetch(supabaseUrl + '/rest/v1/' + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined,
      cache: 'no-store'
    });
  }

  function fetchJson(path) {
    return supabaseFetch(path, { method: 'GET' })
      .then(function (response) { if (!response.ok) return []; return response.json(); })
      .then(function (data) { return Array.isArray(data) ? data : []; })
      .catch(function () { return []; });
  }

  function fetchDbAppearance() {
    if (!storeId || !hasSupabase) return Promise.resolve({});
    return supabaseFetch(
      'appearances?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1',
      { method: 'GET' }
    )
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          return normalizeAppearanceItem(data[0]);
        }
        return tryLegacyTable();
      })
      .catch(function () { return tryLegacyTable(); });

    function tryLegacyTable() {
      return supabaseFetch(
        'widget_appearances?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1',
        { method: 'GET' }
      )
        .then(function (response) {
          if (!response.ok) return null;
          return response.json();
        })
        .then(function (data) {
          if (Array.isArray(data) && data.length > 0) {
            return normalizeAppearanceItem(data[0]);
          }
          return {};
        })
        .catch(function () { return {}; });
    }
  }

  function getConfigAppearance() {
    var merged = {};
    [
      config.appearance, config.aparencia, config.appearanceConfig, config.appearance_config,
      config.floating, config.floatingConfig, config.floatingAppearance, config.floatingVideoConfig,
      config.floatingVideoAppearance, config.floating_video,
      widgetsCfg.appearance, widgetsCfg.aparencia, widgetsCfg.appearanceConfig, widgetsCfg.appearance_config,
      widgetsCfg.floating, widgetsCfg.floatingConfig, widgetsCfg.floatingAppearance,
      widgetsCfg.floatingVideoConfig, widgetsCfg.floatingVideoAppearance, widgetsCfg.floating_video
    ].forEach(function (src) { flattenAppearanceInto(merged, src, 0); });
    return normalizeAppearanceItem(merged);
  }

  function getStorageAppearance() {
    var merged = {};
    var keys = [
      'vidlytics_appearance', 'vidlytics_appearance_' + storeId,
      'vidlytics_aparencia', 'vidlytics_aparencia_' + storeId,
      'vidlytics_widget_appearance', 'vidlytics_widget_appearance_' + storeId,
      'vidlytics_config', 'vidlytics_config_' + storeId,
      'VIDLYTICS_APPEARANCE', 'VIDLYTICS_CONFIG'
    ];
    keys.forEach(function (key) { flattenAppearanceInto(merged, getStorageItem(key, {}), 0); });
    return normalizeAppearanceItem(merged);
  }

  function readAppearance() {
    var configAppearance = normalizeAppearanceItem(getConfigAppearance());
    var storageAppearance = normalizeAppearanceItem(getStorageAppearance());
    return fetchDbAppearance().then(function (dbAppearance) {
      var finalAppearance = {};
      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, storageAppearance);
      mergeObject(finalAppearance, dbAppearance);
      return finalAppearance;
    });
  }

  function normalizeFloatingPosition(value) {
    var key = normalizeKey(value);
    if (key === 'fixed-top-left' || key === 'top-left' || key === 'superior-esquerda') return 'top-left';
    if (key === 'fixed-top-right' || key === 'top-right' || key === 'superior-direita') return 'top-right';
    if (key === 'fixed-bottom-left' || key === 'bottom-left' || key === 'inferior-esquerda') return 'bottom-left';
    if (key === 'fixed-bottom-right' || key === 'bottom-right' || key === 'inferior-direita') return 'bottom-right';
    return DEFAULT_APPEARANCE.floating_position;
  }

  function normalizeFloatingShape(value) {
    var key = normalizeKey(value);
    if (key === 'square' || key === 'quadrado') return 'square';
    if (key === 'portrait' || key === 'retrato' || key === '9-16') return 'portrait';
    if (key === 'circle' || key === 'circulo' || key === 'redondo') return 'circle';
    return DEFAULT_APPEARANCE.floating_shape;
  }

  function getFloatingConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    function rcv(jsonbField, flatField, fallback) {
      return readConfigValue(appearance, 'floating_config', jsonbField, flatField, fallback);
    }
    var position = normalizeFloatingPosition(rcv('floating_position', 'floating_position', DEFAULT_APPEARANCE.floating_position));
    var shape = normalizeFloatingShape(rcv('shape', 'floating_shape', DEFAULT_APPEARANCE.floating_shape));
    var sizeNumber = toNumber(rcv('width', 'floating_size', '80'), 80);
    var widthNumber = sizeNumber;
    var heightNumber;
    if (shape === 'square' || shape === 'circle') { heightNumber = widthNumber; }
    else { heightNumber = Math.round(widthNumber * 16 / 9); }
    var borderWidthNumber = toNumber(rcv('border_style', 'floating_border_width', '2'), 2);
    var radiusNumber = toNumber(rcv('border_radius', 'floating_border_radius', '12'), 12);
    if (shape === 'circle') radiusNumber = 999;
    var marginTopNumber = toNumber(rcv('top_spacing', 'floating_margin_top', '20'), 20);
    var marginBottomNumber = toNumber(rcv('bottom_spacing', 'floating_margin_bottom', '20'), 20);
    var marginSideNumber = toNumber(rcv('left_spacing', 'floating_margin_side', '20'), 20);
    var zIndexNumber = toNumber(rcv('z_index', 'floating_z_index', '2147483647'), 2147483647);
    var objectFit = String(rcv('object_fit', 'floating_object_fit', 'cover') || 'cover').trim().toLowerCase();
    var top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignItems = 'flex-end';
    if (position === 'top-left') { top = px(marginTopNumber); left = px(marginSideNumber); alignItems = 'flex-start'; }
    if (position === 'top-right') { top = px(marginTopNumber); right = px(marginSideNumber); alignItems = 'flex-end'; }
    if (position === 'bottom-left') { bottom = px(marginBottomNumber); left = px(marginSideNumber); alignItems = 'flex-start'; }
    if (position === 'bottom-right') { bottom = px(marginBottomNumber); right = px(marginSideNumber); alignItems = 'flex-end'; }
    return {
      position: position, shape: shape,
      top: top, right: right, bottom: bottom, left: left,
      width: px(widthNumber), height: px(heightNumber),
      borderWidth: px(borderWidthNumber),
      radius: shape === 'circle' ? '999px' : px(radiusNumber),
      innerRadius: shape === 'circle' ? '999px' : px(Math.max(0, radiusNumber - borderWidthNumber)),
      zIndex: zIndexNumber, alignItems: alignItems, objectFit: objectFit
    };
  }

  function getFloatingBehaviorConfig(appearance) {
    appearance = appearance || {};
    function rcv(jsonbField, flatField, fallback) {
      return readConfigValue(appearance, 'floating_config', jsonbField, flatField, fallback);
    }
    return {
      objectFit: rcv('object_fit', 'floating_object_fit', DEFAULT_APPEARANCE.floating_object_fit),
      showPlayButton: toBoolean(rcv('show_play_icon', 'floating_show_play_button', true), true),
      allowDrag: toBoolean(rcv('draggable', 'floating_allow_drag', false), false),
      allowClose: toBoolean(rcv('allow_close', 'floating_allow_close', true), true)
    };
  }

  function getCarouselConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    function rcv(jsonbField, flatField, fallback) {
      return readConfigValue(appearance, 'carousel_config', jsonbField, flatField, fallback);
    }
    var shape = String(rcv('shape', 'carousel_shape', 'portrait') || 'portrait').trim().toLowerCase();
    var sizeNumber = toNumber(rcv('width', 'carousel_size', '30'), 30);
    var visibleItems = safeInt(rcv('visible_items', 'carousel_visible_items', '4'), 4);
    var spacing = safeInt(rcv('spacing', 'carousel_spacing', '16'), 16);
    var borderColor = rcv('border_color', 'carousel_border_color', '#0094EB') || '#0094EB';
    var borderWidth = safeInt(rcv('border_style', 'carousel_border_width', '2'), 2);
    var borderRadius = safeInt(rcv('border_radius', 'carousel_border_radius', '12'), 12);
    var objectFit = String(rcv('object_fit', 'carousel_object_fit', 'cover') || 'cover').trim().toLowerCase();
    var marginTop = safeInt(rcv('margin_top', 'carousel_margin_top', '0'), 0);
    var marginBottom = safeInt(rcv('margin_bottom', 'carousel_margin_bottom', '0'), 0);
    var showTitle = toBoolean(rcv('show_title', 'carousel_show_title', false), false);
    var showProduct = toBoolean(rcv('show_product', 'carousel_show_product', true), true);
    var showPlayButton = toBoolean(rcv('show_play_icon', 'carousel_show_play_button', true), true);
    var autoCenter = toBoolean(rcv('auto_center', 'carousel_auto_center', false), false);
    var aspectRatio = '9 / 16';
    if (shape.indexOf('landscape') !== -1 || shape.indexOf('16_9') !== -1 || shape.indexOf('16-9') !== -1) {
      aspectRatio = '16 / 9';
    } else if (shape.indexOf('square') !== -1 || shape.indexOf('1_1') !== -1 || shape.indexOf('1-1') !== -1 || shape === 'circle') {
      aspectRatio = '1 / 1';
    }
    return {
      shape: shape, size: sizeNumber,
      visibleItems: visibleItems, spacing: spacing,
      borderColor: borderColor, borderWidth: borderWidth,
      borderRadius: borderRadius, objectFit: objectFit,
      marginTop: marginTop, marginBottom: marginBottom,
      showTitle: showTitle, showProduct: showProduct,
      showPlayButton: showPlayButton, autoCenter: autoCenter,
      aspectRatio: aspectRatio
    };
  }

  function getGridConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    function rcv(jsonbField, flatField, fallback) {
      return readConfigValue(appearance, 'grid_config', jsonbField, flatField, fallback);
    }
    var shape = String(rcv('shape', 'grid_shape', 'portrait') || 'portrait').trim().toLowerCase();
    var sizeNumber = toNumber(rcv('width', 'grid_size', '30'), 30);
    var columns = safeInt(rcv('visible_items', 'grid_columns', '4'), 4);
    var rows = safeInt(rcv('rows', 'grid_rows', '1'), 1);
    var spacing = safeInt(rcv('spacing', 'grid_spacing', '16'), 16);
    var borderColor = rcv('border_color', 'grid_border_color', '#0094EB') || '#0094EB';
    var borderWidth = safeInt(rcv('border_style', 'grid_border_width', '2'), 2);
    var borderRadius = safeInt(rcv('border_radius', 'grid_border_radius', '12'), 12);
    var objectFit = String(rcv('object_fit', 'grid_object_fit', 'cover') || 'cover').trim().toLowerCase();
    var showTitle = toBoolean(rcv('show_title', 'grid_show_title', false), false);
    var aspectRatio = '9 / 16';
    if (shape.indexOf('landscape') !== -1 || shape.indexOf('16_9') !== -1 || shape.indexOf('16-9') !== -1) {
      aspectRatio = '16 / 9';
    } else if (shape.indexOf('square') !== -1 || shape.indexOf('1_1') !== -1 || shape.indexOf('1-1') !== -1 || shape === 'circle') {
      aspectRatio = '1 / 1';
    }
    return {
      shape: shape, size: sizeNumber,
      columns: columns, rows: rows, spacing: spacing,
      borderColor: borderColor, borderWidth: borderWidth,
      borderRadius: borderRadius, objectFit: objectFit,
      showTitle: showTitle, aspectRatio: aspectRatio
    };
  }

  function getPrimaryColor(appearance) {
    var raw = readAppearanceValue(appearance, ['primary_color', 'primaryColor', 'cor_primaria']);
    return sanitizeCssValue(raw, DEFAULT_APPEARANCE.primary_color, 'color');
  }

  function getSecondaryColor(appearance) {
    var raw = readAppearanceValue(appearance, ['secondary_color', 'secondaryColor', 'cor_secundaria']);
    return sanitizeCssValue(raw, DEFAULT_APPEARANCE.secondary_color, 'color');
  }

  function getBorderColor(appearance) {
    var jsonbVal = sanitizeCssValue(readJsonbConfigValue(appearance, 'floating_config', 'border_color'), '', 'color');
    if (jsonbVal) return jsonbVal;
    var flatVal = sanitizeCssValue(readDeviceValue(appearance, 'floating_border_color'), '', 'color');
    if (flatVal) return flatVal;
    return getPrimaryColor(appearance);
  }

  function getButtonColor(appearance) {
    var raw = readAppearanceValue(appearance, ['button_color', 'buttonColor', 'btn_color', 'cor_botao']);
    return sanitizeCssValue(raw, getPrimaryColor(appearance), 'color');
  }

  function getFontFamily(appearance) {
    var raw = readAppearanceValue(appearance, ['font_family', 'fontFamily', 'fonte']);
    return sanitizeCssValue(raw, DEFAULT_APPEARANCE.font_family, 'font');
  }

  function normalizeModalAppearanceConfig(appearance) {
    appearance = appearance || {};
    var rawModalConfig = parseJsonIfNeeded(appearance.modal_config || appearance.modalConfig) || {};
    function rcv(jsonbField, flatField, fallback) {
      var jsonbVal = rawModalConfig[jsonbField];
      if (jsonbVal !== undefined && jsonbVal !== null && jsonbVal !== '') return jsonbVal;
      if (flatField) {
        var flatVal = readDeviceValue(appearance, flatField);
        if (flatVal !== undefined && flatVal !== null && flatVal !== '') return flatVal;
      }
      return fallback;
    }
    return {
      show_title: rcv('show_title', 'modal_show_title', true),
      show_play_button: rcv('show_play_button', 'modal_show_play_button', true),
      show_product: rcv('show_product', 'modal_show_product', true),
      show_product_button: rcv('show_product_button', 'modal_show_product_button', true),
      show_product_whatsapp_button: rcv('show_product_whatsapp_button', null, true),
      show_like_button: rcv('show_like_button', 'modal_show_like_button', true),
      show_comment_button: rcv('show_comment_button', 'modal_show_comment_button', true),
      show_share_button: rcv('show_share_button', 'modal_show_share_button', true),
      show_whatsapp_button: rcv('show_whatsapp_button', 'modal_show_whatsapp_button', true),
      show_sizing_button: rcv('show_sizing_button', 'modal_show_sizing_button', true),
      hide_stories: rcv('hide_stories', 'modal_hide_stories', false),
      shadow_enabled: rcv('shadow_enabled', 'modal_shadow_enabled', true),
      border_color: rcv('border_color', 'modal_border_color', ''),
      border_width: rcv('border_width', 'modal_border_width', ''),
      border_radius: rcv('border_radius', 'modal_border_radius', '')
    };
  }
  function readStories() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_stories', []));
    return fetchJson('stories?select=*&store_id=eq.' + encodeURIComponent(storeId))
      .then(function (items) {
        return items.filter(function (story) {
          return ('status' in story ? story.status === 'active' : true) &&
                 ('active' in story ? story.active !== false : true);
        });
      });
  }

  function readStoryVideos() {
    return (!storeId || !hasSupabase)
      ? Promise.resolve(getStorageItem('vidlytics_story_videos', []))
      : fetchJson('story_videos?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readVideos() {
    return (!storeId || !hasSupabase)
      ? Promise.resolve(getStorageItem('vidlytics_videos', []))
      : fetchJson('videos?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  // 🔧 NOVA FUNÇÃO — Junta vídeos aos stories via tabela story_videos
  function joinStoriesWithVideos(stories, storyVideos, videos) {
    if (!stories || !stories.length) return stories;

    // Cria um mapa rápido de vídeos por ID
    var videoMap = {};
    (videos || []).forEach(function (v) {
      if (v && v.id) videoMap[v.id] = v;
    });

    // Para cada story, monta o array de vídeos ordenado por position
    (stories || []).forEach(function (story) {
      var svRows = (storyVideos || []).filter(function (sv) {
        return sv.story_id === story.id;
      });

      // Ordena por position (campo que define a ordem dos vídeos no story)
      svRows.sort(function (a, b) {
        return (a.position || 0) - (b.position || 0);
      });

      // Mapeia para os objetos completos de vídeo
      story.videos = svRows.map(function (sv) {
        return videoMap[sv.video_id];
      }).filter(Boolean);

      // Log para debug
      if (story.videos.length === 0) {
        console.warn('[Vidlytics] Story "' + (story.title || story.id) + '" sem videos vinculados.');
      } else {
        console.log('[Vidlytics] Story "' + (story.title || story.id) + '" com ' + story.videos.length + ' video(s).');
      }
    });

    return stories;
  }

  function readStoryProducts() {
    return (!storeId || !hasSupabase)
      ? Promise.resolve(getStorageItem('vidlytics_story_products', []))
      : fetchJson('story_products?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readProducts() {
    return (!storeId || !hasSupabase)
      ? Promise.resolve(getStorageItem('vidlytics_products', []))
      : fetchJson('products?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readComments() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_comments', []));
    var query = 'comments?select=id,store_id,video_id,user_name,user_email,content,status,created_at,reply_content,reply_status&store_id=eq.' +
      encodeURIComponent(storeId) + '&status=eq.approved&order=created_at.asc';
    return fetchJson(query);
  }

  function readPageRules() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_page_rules', []));
    return fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&order=created_at.desc')
      .then(function (rules) {
        if (!Array.isArray(rules)) return [];
        return rules.filter(function (rule) {
          if (rule.active === false || rule.active === 'false' || rule.active === 0 || rule.active === '0') {
            return false;
          }
          return true;
        });
      });
  }

  function readDisplayLocations() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_display_locations', []));
    return fetchJson('display_locations?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&order=created_at.desc')
      .then(function (locations) {
        if (!Array.isArray(locations)) return [];
        return locations.filter(function (location) {
          if (location.active === false || location.active === 'false' || location.active === 0 || location.active === '0') {
            return false;
          }
          return true;
        });
      });
  }

  function readLikesFromDb() {
    if (!hasSupabase) return Promise.resolve({ likedVideos: {}, likeCounts: {} });
    var fingerprint = getFingerprint();
    var userLikesPromise = supabaseFetch(
      'video_likes?select=video_id&store_id=eq.' + encodeURIComponent(storeId) +
      '&user_fingerprint=eq.' + encodeURIComponent(fingerprint),
      { method: 'GET' }
    ).then(function (response) {
      if (!response.ok) return [];
      return response.json();
    }).then(function (data) {
      return Array.isArray(data) ? data : [];
    }).catch(function () { return []; });

    var allLikesPromise = supabaseFetch(
      'video_likes?select=video_id&store_id=eq.' + encodeURIComponent(storeId),
      { method: 'GET' }
    ).then(function (response) {
      if (!response.ok) return [];
      return response.json();
    }).then(function (data) {
      return Array.isArray(data) ? data : [];
    }).catch(function () { return []; });

    return Promise.all([userLikesPromise, allLikesPromise]).then(function (results) {
      var userLikes = results[0];
      var allLikes = results[1];
      var likedVideosMap = {};
      userLikes.forEach(function (like) {
        if (like.video_id) likedVideosMap[like.video_id] = true;
      });
      var likeCountsMap = {};
      allLikes.forEach(function (like) {
        if (like.video_id) {
          likeCountsMap[like.video_id] = (likeCountsMap[like.video_id] || 0) + 1;
        }
      });
      return { likedVideos: likedVideosMap, likeCounts: likeCountsMap };
    });
  }

  function readSizingModels() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_sizing_models', []));
    return fetchJson('sizing_models?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readStoreSettings() {
    if (!storeId || !hasSupabase) return Promise.resolve({});
    return supabaseFetch(
      'store_settings?select=auto_approve_comments,whatsapp_number,whatsapp_message,whatsapp_message_template&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1',
      { method: 'GET' }
    )
      .then(function (response) { if (!response.ok) return {}; return response.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) return data[0];
        return {};
      })
      .catch(function () { return {}; })
      .then(function (store) {
        return {
          auto_approve_comments: store.auto_approve_comments,
          whatsapp_number: store.whatsapp_number || '',
          whatsapp_message: store.whatsapp_message || '',
          whatsapp_message_template: store.whatsapp_message_template || ''
        };
      });
  }

  function matchesRule(rule) {
    if (!rule) return false;
    if (rule.active === false || rule.active === 'false' || rule.active === 0 || rule.active === '0') return false;

    var href = window.location.href;
    var path = window.location.pathname || '/';

    var rawCondition = String(
      firstDefined(rule.condition_type, rule.rule_type, rule.match_type) || ''
    ).trim().toLowerCase();

    var conditionType = rawCondition
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    var value = String(
      firstDefined(rule.url_pattern, rule.page_url, rule.value, rule.url) || ''
    ).trim();

    if (!conditionType && value) {
      conditionType = 'contains';
    }

    if (
      conditionType.indexOf('contem') !== -1 ||
      conditionType === 'url_contains' ||
      conditionType === 'contains'
    ) {
      conditionType = 'contains';
    } else if (
      conditionType.indexOf('exata') !== -1 ||
      conditionType === 'url_equals' ||
      conditionType === 'exact' ||
      conditionType === 'equals'
    ) {
      conditionType = 'equals';
    } else if (
      conditionType.indexOf('todas') !== -1 ||
      conditionType === 'all' ||
      conditionType === 'all_pages'
    ) {
      conditionType = 'all_pages';
    } else if (
      conditionType.indexOf('inicial') !== -1 ||
      conditionType === 'home' ||
      conditionType === 'home_only'
    ) {
      conditionType = 'home_only';
    } else if (
      conditionType.indexOf('produto') !== -1 ||
      conditionType === 'product_pages' ||
      conditionType === 'product'
    ) {
      conditionType = 'product_pages';
    } else if (
      conditionType.indexOf('categoria') !== -1 ||
      conditionType.indexOf('colecao') !== -1 ||
      conditionType.indexOf('collection') !== -1 ||
      conditionType === 'category_pages' ||
      conditionType === 'category'
    ) {
      conditionType = 'category_pages';
    } else if (conditionType) {
      conditionType = 'contains';
    }

    if (!conditionType) return false;

    switch (conditionType) {
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
          path.indexOf('/produto') !== -1
        );

      case 'category_pages':
        return (
          path.indexOf('/category') !== -1 ||
          path.indexOf('/categoria') !== -1 ||
          path.indexOf('/colecao') !== -1 ||
          path.indexOf('/collection') !== -1
        );

      case 'contains':
        return (
          href.indexOf(value) !== -1 ||
          path.indexOf(value) !== -1
        );

      case 'equals':
        return (
          href === value ||
          path === value
        );

      case 'not_equals':
        return (
          href !== value &&
          path !== value
        );

      case 'starts_with':
        return (
          href.indexOf(value) === 0 ||
          path.indexOf(value) === 0
        );

      case 'ends_with':
        return (
          href.endsWith(value) ||
          path.endsWith(value)
        );

      case 'regex':
        try {
          return new RegExp(value).test(href);
        } catch (error) {
          return false;
        }

      default:
        return false;
    }
  }

  function matchesUrl(appearance) {
    if (!appearance) return true;
    var rawUrl = firstDefined(appearance.url, appearance.pageUrl, appearance.page_url);
    if (!rawUrl || String(rawUrl).trim() === '') return true;
    var pattern = String(rawUrl).trim().toLowerCase();
    var href = window.location.href.toLowerCase();
    var path = (window.location.pathname || '/').toLowerCase();
    var search = (window.location.search || '').toLowerCase();
    var fullPath = (path + search).replace(/\/+$/, '');
    var patterns = pattern.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    return patterns.some(function (p) {
      var normalizedPattern = p.replace(/\/+$/, '').replace(/^https?:\/\/[^/]+/i, '');
      if (p === '/') normalizedPattern = '/';
      if (!normalizedPattern) return false;
      if (normalizedPattern === 'all' || normalizedPattern === 'todas' || normalizedPattern === 'all_pages') return true;
      if (normalizedPattern === '/') return path === '/' || path === '';
      return (
        href.indexOf(normalizedPattern) !== -1 ||
        fullPath.indexOf(normalizedPattern) !== -1 ||
        path.indexOf(normalizedPattern) !== -1
      );
    });
  }

  function getVideoUrl(video) {
    if (!video) return '';
    return normalizeMediaUrl(firstDefined(
      video.video_url, video.videoUrl, video.url, video.source_url,
      video.sourceUrl, video.file_url, video.fileUrl, video.video, video.src, ''
    ));
  }

  function isDirectVideoUrl(url) {
    if (!url) return false;
    return VIDEO_FILE_REGEX.test(url) || url.indexOf('/storage/v1/object/') !== -1;
  }

  function extractYouTubeId(url) {
    if (!url) return '';
    try {
      var parsed = new URL(String(url).trim());
      var host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname.indexOf('/shorts/') === 0) return parsed.pathname.split('/')[2] || '';
        if (parsed.pathname.indexOf('/embed/') === 0) return parsed.pathname.replace(/^\/embed\//, '').split('/')[0] || '';
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
      }
    } catch (e) { return ''; }
    return '';
  }

    // 🆕 EXTRAIR ID DO INSTAGRAM REEL
  function extractInstagramId(url) {
    if (!url) return '';
    try {
      var u = String(url).trim();
      var match = u.match(/instagram\.com\/reel\/([^/?&]+)/);
      return match ? match[1] : u;
    } catch (e) { return url; }
  }

  // 🆕 EXTRAIR ID DO TIKTOK
  function extractTikTokId(url) {
    if (!url) return '';
    try {
      var u = String(url).trim();
      var match = u.match(/tiktok\.com\/.*\/video\/(\d+)/);
      return match ? match[1] : u;
    } catch (e) { return url; }
  }

  function getYouTubeThumbnail(url) {
    var id = extractYouTubeId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function getThumbnailFromObject(obj) {
    if (!obj) return '';
    var meta = parseJsonIfNeeded(firstDefined(obj.metadata, obj.meta, obj.extra, obj.data, {}));
    return normalizeMediaUrl(firstDefined(
      obj.thumbnail_url, obj.thumbnailUrl, obj.thumbnail,
      obj.cover_url, obj.coverUrl, obj.cover,
      obj.poster_url, obj.posterUrl, obj.poster,
      obj.image_url, obj.imageUrl, obj.image,
      obj.url, obj.src,
      meta.thumbnail_url, meta.thumbnailUrl, meta.thumbnail,
      meta.cover_url, meta.coverUrl, meta.cover,
      meta.poster_url, meta.posterUrl, meta.poster,
      meta.image_url, meta.imageUrl, meta.image,
      meta.url, meta.src, ''
    ) || '');
  }

  function getVideoThumbnail(video) {
    if (!video) return '';
    var direct = getThumbnailFromObject(video);
    if (direct) return direct;
    if (video.source_type !== 'upload' && video.sourceType !== 'upload') return getYouTubeThumbnail(getVideoUrl(video));
    return '';
  }

  function getStoryThumbnail(story, coverVideo, coverRelation) {
    return getThumbnailFromObject(coverRelation) || getThumbnailFromObject(story) || getVideoThumbnail(coverVideo) || getThumbnailFromObject(coverVideo) || '';
  }

  function applyHostPosition(host, appearance) {
    var cfg = getFloatingConfig(appearance || currentAppearance);
    setImportant(host, 'position', 'fixed');
    setImportant(host, 'top', cfg.top);
    setImportant(host, 'right', cfg.right);
    setImportant(host, 'bottom', cfg.bottom);
    setImportant(host, 'left', cfg.left);
    setImportant(host, 'z-index', cfg.zIndex);
    setImportant(host, 'width', cfg.width);
    setImportant(host, 'min-width', cfg.width);
    setImportant(host, 'max-width', cfg.width);
    setImportant(host, 'height', 'auto');
    setImportant(host, 'overflow', 'visible');
    setImportant(host, 'background', 'transparent');
    setImportant(host, 'border', '0');
    setImportant(host, 'box-shadow', 'none');
    setImportant(host, 'pointer-events', 'auto');
    setImportant(host, 'transform', 'none');
  }

  function getOrCreateShadowRoot(appearance) {
    var existingRoot = document.getElementById('vidlytics-widget-root');
    if (existingRoot) existingRoot.remove();
    var host = createEl('div', 'vidlytics-widget-root');
    host.id = 'vidlytics-widget-root';
    applyHostPosition(host, appearance);
    document.body.appendChild(host);
    globalShadowRoot = host.attachShadow({ mode: 'open' });
    return { host: host, shadow: globalShadowRoot };
  }

  function buildSharedCss(appearance) {
    var cfg = getFloatingConfig(appearance);
    var primary = getPrimaryColor(appearance);
    var secondary = getSecondaryColor(appearance);
    var buttonColor = getButtonColor(appearance);
    var textColor = readAppearanceValue(appearance, ['text_color', 'textColor']) || '#0f172a';
    var bgColor = readAppearanceValue(appearance, ['background_color', 'backgroundColor']) || '#ffffff';
    var modalBackground = readAppearanceValue(appearance, ['modal_background_color', 'modalBackgroundColor', 'background_color', 'backgroundColor']) || bgColor;
    var modalText = readAppearanceValue(appearance, ['modal_text_color', 'modalTextColor', 'text_color', 'textColor']) || textColor;
    var modalBorder = readAppearanceValue(appearance, ['modal_border_color', 'modalBorderColor']) || 'rgba(15,23,42,.12)';
    var modalMuted = readAppearanceValue(appearance, ['modal_muted_color', 'modalMutedColor']) || '#64748b';
    var font = getFontFamily(appearance);
    var fontSize = readAppearanceValue(appearance, ['font_size', 'fontSize']) || '14';
    var modalConfig = normalizeModalAppearanceConfig(appearance);
    var modalBorderColor = modalConfig.border_color || 'transparent';
    var modalBorderWidthNum = parseInt(modalConfig.border_width) || 0;
    var modalBorderRadiusNum = parseInt(modalConfig.border_radius) || 0;

    var shadow = modalConfig.shadow_enabled !== false ? '0 24px 80px rgba(15,23,42,.24)' : 'none';
    return (
      '*,*::before,*::after{box-sizing:border-box!important;}'
      + '.vl-overlay{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(15,23,42,.62)!important;display:none!important;align-items:center!important;justify-content:center!important;z-index:' + cfg.zIndex + '!important;font-family:' + font + '!important;font-size:' + toNumber(fontSize, 14) + 'px!important;}'
      + '.vl-overlay.vl-active{display:flex!important;}'
+ '.vl-modal{position:relative!important;width:100%!important;max-width:420px!important;height:100%!important;max-height:100dvh!important;background:#000!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;border:1px solid ' + modalBorderColor + '!important;box-shadow:' + shadow + '!important;}'
      + '.vl-modal>div:not(.vl-comments-panel-full):not(.vl-sizing-panel-full){position:relative!important;display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;width:100%!important;height:100%!important;}'
      + '@media(min-width:640px){.vl-modal{height:auto!important;aspect-ratio:9/16!important;max-height:90vh!important;border-radius:' + (modalBorderRadiusNum > 0 ? modalBorderRadiusNum : 36) + 'px!important;}}'
      + '.vl-progress{position:absolute!important;top:12px!important;left:0!important;right:0!important;z-index:50!important;display:flex!important;gap:6px!important;padding:0 16px!important;}'
      + '.vl-progress-bar{height:2px!important;flex:1!important;border-radius:999px!important;background:rgba(255,255,255,.25)!important;overflow:hidden!important;}'
      + '.vl-progress-fill{height:100%!important;border-radius:999px!important;background:' + primary + '!important;transition:width .3s ease!important;}'
      + '.vl-header{position:absolute!important;top:0!important;left:0!important;right:0!important;z-index:40!important;width:100%!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;padding:20px 16px 16px!important;background:linear-gradient(to bottom,rgba(0,0,0,.7),transparent)!important;pointer-events:none!important;}'
      + '.vl-header-left{display:flex!important;flex-direction:column!important;gap:2px!important;min-width:0!important;flex:1!important;padding-right:48px!important;pointer-events:auto!important;}'
      + '.vl-title{font-weight:800!important;color:#fff!important;font-size:13px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-shadow:0 1px 3px rgba(0,0,0,.5)!important;}'
      + '.vl-count{font-size:10px!important;font-weight:700!important;color:rgba(255,255,255,.65)!important;text-transform:uppercase!important;}'
      + '.vl-header-actions{display:flex!important;align-items:center!important;gap:8px!important;pointer-events:auto!important;flex-shrink:0!important;}'
      + '.vl-control,.vl-close{all:unset!important;box-sizing:border-box!important;flex-shrink:0!important;width:32px!important;height:32px!important;border-radius:999px!important;background:rgba(0,0,0,.4)!important;backdrop-filter:blur(12px)!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;color:#fff!important;pointer-events:auto!important;border:1px solid rgba(255,255,255,.8)!important;}'
      + '.vl-control:hover,.vl-close:hover{background:rgba(0,0,0,.6)!important;}'
      + '.vl-control svg,.vl-close svg{width:18px!important;height:18px!important;display:block!important;pointer-events:none!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important;}'
      + '.vl-body{position:relative!important;display:block!important;flex:1 1 auto!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;background:#000!important;}'
      + '.vl-player{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;z-index:1!important;background:#000!important;display:block!important;}'
      + '.vl-player video,.vl-player iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:0!important;display:block!important;object-fit:cover!important;visibility:visible!important;opacity:1!important;z-index:2!important;}'
      + '.vl-nav{position:absolute!important;inset:0!important;display:flex!important;z-index:30!important;}'
      + '.vl-nav-btn{all:unset!important;height:100%!important;cursor:pointer!important;}'
      + '.vl-nav-prev{width:30%!important;}'
      + '.vl-nav-next{width:70%!important;}'
      + '.vl-nav-arrow{position:absolute!important;top:42%!important;transform:translateY(-50%)!important;width:36px!important;height:36px!important;border-radius:999px!important;background:rgba(255,255,255,.18)!important;backdrop-filter:blur(6px)!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:35!important;pointer-events:auto!important;border:1px solid rgba(255,255,255,.35)!important;transition:background .2s!important;}'
      + '.vl-nav-arrow:hover{background:rgba(255,255,255,.32)!important;}'
      + '.vl-nav-arrow-left{left:10px!important;}'
      + '.vl-nav-arrow-right{right:10px!important;}'
      + '.vl-nav-arrow svg{width:18px!important;height:18px!important;display:block!important;pointer-events:none!important;}'
      + '.vl-social{position:absolute!important;top:calc(42% + 180px)!important;right:12px!important;transform:translateY(-50%)!important;z-index:45!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:12px!important;}'
      + '.vl-social-btn{all:unset!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.8)!important;background:rgba(0,0,0,.1)!important;backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;cursor:pointer!important;flex-shrink:0!important;padding:0!important;}'
      + '.vl-social-btn svg{width:18px!important;height:18px!important;}'
      + '.vl-social-btn:hover{background:rgba(0,0,0,.25)!important;}'
      + '.vl-social-wrapper{display:flex!important;flex-direction:column!important;align-items:center!important;gap:0!important;}'
      + '.vl-social-count{font-size:10px!important;font-weight:800!important;color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.5)!important;margin-top:4px!important;line-height:1!important;text-align:center!important;display:block!important;width:100%!important;}'
      + '.vl-social-btn.whatsapp{background:#25d366!important;border-color:#25d366!important;}'
      + '.vl-comments-panel{position:absolute!important;z-index:70!important;display:none!important;flex-direction:column!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;width:calc(100% - 40px)!important;max-width:306px!important;max-height:72%!important;overflow:hidden!important;background:' + modalBackground + '!important;padding:18px!important;color:' + modalText + '!important;border-radius:24px!important;box-shadow:0 18px 50px rgba(0,0,0,.32)!important;}'
      + '.vl-comments-panel.is-open{display:flex!important;}'
      + '.vl-comments-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 0 14px!important;border-bottom:1px solid ' + modalBorder + '!important;}'
      + '.vl-comments-title{font-size:17px!important;font-weight:800!important;color:' + modalText + '!important;}'
      + '.vl-comments-close{all:unset!important;width:36px!important;height:36px!important;border-radius:999px!important;background:' + modalBorder + '!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;color:' + modalText + '!important;font-size:20px!important;}'
      + '.vl-comments-close:hover{background:' + primary + '!important;color:#fff!important;}'
      + '.vl-comments-list{flex:1!important;min-height:0!important;overflow-y:auto!important;padding:14px 0!important;}'
      + '.vl-comment-item{padding:12px!important;margin-bottom:10px!important;border-radius:14px!important;background:' + modalBorder + '!important;}'
      + '.vl-comment-author{font-size:12px!important;font-weight:800!important;color:' + primary + '!important;margin-bottom:5px!important;}'
      + '.vl-comment-content{font-size:14px!important;line-height:1.45!important;color:' + modalText + '!important;word-break:break-word!important;}'
      + '.vl-comment-reply{margin-top:10px!important;padding:10px 12px!important;border-left:3px solid ' + primary + '!important;border-radius:8px!important;background:' + modalBorder + '!important;}'
      + '.vl-comment-reply-label{font-size:11px!important;font-weight:800!important;color:' + primary + '!important;margin-bottom:4px!important;}'
      + '.vl-comment-reply-content{font-size:13px!important;line-height:1.4!important;color:' + modalText + '!important;word-break:break-word!important;}'
      + '.vl-comments-empty{padding:40px 10px!important;text-align:center!important;font-size:14px!important;color:' + modalMuted + '!important;}'
      + '.vl-comments-form{display:flex!important;flex-direction:column!important;gap:8px!important;border-top:1px solid ' + modalBorder + '!important;padding-top:14px!important;}'
      + '.vl-comments-input{all:unset!important;width:100%!important;box-sizing:border-box!important;border-radius:11px!important;background:' + modalBorder + '!important;color:' + modalText + '!important;padding:11px!important;font-size:14px!important;border:1px solid transparent!important;}'
      + '.vl-comments-input:focus{border-color:' + primary + '!important;}'
      + '.vl-comments-input::placeholder{color:' + modalMuted + '!important;}'
      + '.vl-comments-textarea{min-height:76px!important;resize:none!important;}'
      + '.vl-comments-editor{position:relative!important;width:100%!important;}'
      + '.vl-comments-editor .vl-comments-textarea{display:block!important;width:100%!important;padding-right:52px!important;}'
      + '.vl-emoji-button{all:unset!important;position:absolute!important;right:10px!important;bottom:10px!important;width:32px!important;height:32px!important;border:2px solid ' + modalText + '!important;border-radius:999px!important;background:' + modalBackground + '!important;color:' + modalText + '!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:19px!important;line-height:1!important;cursor:pointer!important;z-index:4!important;}'
      + '.vl-emoji-button:hover{background:' + modalBorder + '!important;transform:scale(1.04)!important;}'
      + '.vl-emoji-picker{position:absolute!important;right:0!important;bottom:calc(100% + 8px)!important;width:100%!important;max-height:150px!important;overflow-y:auto!important;display:none!important;grid-template-columns:repeat(6,1fr)!important;gap:7px!important;padding:10px!important;background:' + modalBackground + '!important;border:1px solid ' + modalBorder + '!important;border-radius:16px!important;box-shadow:0 12px 35px rgba(15,23,42,.18)!important;z-index:20!important;}'
      + '.vl-emoji-picker.is-open{display:grid!important;}'
      + '.vl-emoji-item{all:unset!important;width:100%!important;min-height:32px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:9px!important;font-size:22px!important;line-height:1!important;cursor:pointer!important;}'
      + '.vl-emoji-item:hover{background:' + modalBorder + '!important;transform:scale(1.12)!important;}'
      + '.vl-comments-submit{all:unset!important;box-sizing:border-box!important;width:100%!important;text-align:center!important;border-radius:11px!important;padding:12px!important;background:' + buttonColor + '!important;color:#fff!important;font-size:14px!important;font-weight:800!important;cursor:pointer!important;}'
      + '.vl-comments-submit:hover{filter:brightness(.95)!important;}'
      + '.vl-comments-submit:disabled{opacity:.6!important;cursor:wait!important;}'
      + '.vl-comments-feedback{min-height:18px!important;text-align:center!important;font-size:12px!important;color:' + modalMuted + '!important;}'
      + '.vl-sizing-panel{position:absolute!important;z-index:70!important;display:none!important;flex-direction:column!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;width:calc(100% - 40px)!important;max-width:340px!important;max-height:62%!important;overflow:hidden!important;background:' + modalBackground + '!important;padding:0!important;color:' + modalText + '!important;border-radius:24px!important;box-shadow:0 18px 50px rgba(0,0,0,.32)!important;}'
      + '.vl-sizing-panel.is-open{display:flex!important;}'
      + '.vl-sizing-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:18px 18px 8px!important;border:0!important;}'
      + '.vl-sizing-title{font-size:11px!important;font-weight:900!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:' + primary + '!important;}'
      + '.vl-sizing-close{all:unset!important;width:36px!important;height:36px!important;border-radius:999px!important;background:#f1f5f9!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;color:#334155!important;font-size:25px!important;line-height:1!important;}'
      + '.vl-sizing-close:hover{background:' + primary + '!important;color:#fff!important;}'
      + '.vl-sizing-content{flex:1!important;overflow-y:auto!important;padding:0 18px 18px!important;}'
      + '.vl-sizing-table{width:100%!important;border-collapse:separate!important;border-spacing:0 9px!important;margin:6px 0 0!important;font-size:14px!important;}'
      + '.vl-sizing-table thead{display:none!important;}'
      + '.vl-sizing-table td{padding:14px 12px!important;border:0!important;background:#f6f8fb!important;font-weight:800!important;color:' + modalText + '!important;}'
      + '.vl-sizing-table td:first-child{border-radius:14px 0 0 14px!important;color:#475569!important;}'
      + '.vl-sizing-table td:last-child{border-radius:0 14px 14px 0!important;text-align:right!important;color:#0f172a!important;}'
      + '.vl-footer{position:absolute!important;bottom:0!important;left:0!important;right:0!important;z-index:40!important;background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.5),transparent)!important;padding:40px 16px 16px!important;pointer-events:none!important;}'
      + '.vl-footer-inner{pointer-events:auto!important;}'
      + '.vl-cta{all:unset!important;display:block!important;width:100%!important;text-align:center!important;border-radius:12px!important;padding:14px!important;font-weight:800!important;font-size:15px!important;cursor:pointer!important;background:' + buttonColor + '!important;color:#fff!important;box-shadow:0 4px 12px rgba(0,0,0,.2)!important;margin-bottom:12px!important;}'
      + '.vl-product{display:flex!important;align-items:center!important;gap:12px!important;border-radius:24px!important;border:1px solid ' + modalBorder + '!important;padding:12px!important;background:' + bgColor + '!important;cursor:pointer!important;box-shadow:' + shadow + '!important;}'
      + '.vl-product-img{width:72px!important;height:72px!important;border-radius:16px!important;object-fit:cover!important;background:#e2e8f0!important;flex:0 0 auto!important;}'
      + '.vl-product-info{min-width:0!important;flex:1!important;}'
      + '.vl-product-name{font-weight:800!important;font-size:13px!important;color:' + textColor + '!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}'
      + '.vl-product-price{margin-top:4px!important;font-weight:800!important;font-size:16px!important;color:' + secondary + '!important;}'
      + '.vl-product-actions{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;margin-top:6px!important;}'
      + '.vl-product-btn{all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;border-radius:999px!important;padding:6px 12px!important;background:' + buttonColor + '!important;color:#fff!important;font-size:11px!important;font-weight:800!important;cursor:pointer!important;text-decoration:none!important;white-space:nowrap!important;}'
      + '.vl-product-whatsapp-btn{all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;border-radius:999px!important;padding:6px 12px!important;background:#25d366!important;color:#fff!important;font-size:11px!important;font-weight:800!important;cursor:pointer!important;text-decoration:none!important;white-space:nowrap!important;}'
      + '.vl-product-whatsapp-btn:hover{background:#1ebe5d!important;color:#fff!important;}'
      + '.vl-product-whatsapp-btn:focus{outline:2px solid #128c7e!important;outline-offset:2px!important;}'
      + '@keyframes vlSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}'
      + '.vl-comments-panel-full textarea:focus,.vl-comments-panel-full input:focus{outline:none!important;box-shadow:0 0 0 3px rgba(0,148,235,.15)!important;}'
      + '.vl-comments-panel-full textarea,.vl-comments-panel-full input{font-family:inherit!important;}'
      + '.vl-comments-panel-full button{font-family:inherit!important;}'
      + '.vl-comments-panel-full ::-webkit-scrollbar{width:4px!important;}'
      + '.vl-comments-panel-full ::-webkit-scrollbar-track{background:transparent!important;}'
      + '.vl-comments-panel-full ::-webkit-scrollbar-thumb{background:#cbd5e1!important;border-radius:4px!important;}'
      + '.vl-comments-panel-full{'
      + 'position:absolute!important;'
      + 'top:8px!important;'
      + 'right:8px!important;'
      + 'bottom:8px!important;'
      + 'left:8px!important;'
      + 'width:auto!important;'
      + 'height:auto!important;'
      + 'max-height:none!important;'
      + 'z-index:200!important;'
      + 'display:flex!important;'
      + 'flex-direction:column!important;'
      + 'overflow:hidden!important;'
      + 'background:#fff!important;'
      + 'border:2px solid ' + primary + '!important;'
      + 'border-radius:20px!important;'
      + 'box-shadow:0 12px 30px rgba(0,0,0,.35)!important;'
      + 'padding:0!important;'
      + 'box-sizing:border-box!important;'
      + 'animation:vlSlideUp .25s ease!important;'
      + '}'
      + '.vl-comments-panel-full .vl-panel-header{'
      + 'flex:0 0 48px!important;'
      + 'height:48px!important;'
      + 'min-height:48px!important;'
      + 'width:100%!important;'
      + 'padding:0 14px!important;'
      + 'display:flex!important;'
      + 'align-items:center!important;'
      + 'justify-content:space-between!important;'
      + 'background:#fff!important;'
      + 'border-bottom:1px solid #e2e8f0!important;'
      + 'box-sizing:border-box!important;'
      + '}'
      + '.vl-comments-panel-full .vl-panel-header h3{'
      + 'margin:0!important;padding:0!important;'
      + 'font-family:inherit!important;'
      + 'font-size:16px!important;font-weight:700!important;color:#111!important;'
      + '}'
      + '.vl-comments-panel-full .vl-panel-header button{'
      + 'all:unset!important;box-sizing:border-box!important;'
      + 'width:32px!important;height:32px!important;padding:0!important;'
      + 'border:0!important;border-radius:50%!important;'
      + 'background:#f1f5f9!important;color:#475569!important;'
      + 'display:flex!important;align-items:center!important;justify-content:center!important;'
      + 'cursor:pointer!important;pointer-events:auto!important;'
      + '}'
      + '.vl-comments-panel-full .vl-panel-header button:hover{background:#e2e8f0!important;}'
      + '.vl-comments-panel-full .vl-panel-header button svg{'
      + 'width:20px!important;height:20px!important;display:block!important;'
      + 'pointer-events:none!important;stroke:#475569!important;'
      + 'stroke-width:2.5!important;stroke-linecap:round!important;stroke-linejoin:round!important;'
      + '}'
      + '.vl-comments-panel-full .vl-panel-body{'
      + 'flex:1 1 auto!important;'
      + 'min-height:0!important;'
      + 'width:100%!important;'
      + 'overflow-y:auto!important;'
      + 'overflow-x:hidden!important;'
      + 'padding:8px 16px!important;'
      + 'display:flex!important;'
      + 'flex-direction:column!important;'
      + 'background:#fff!important;'
      + 'box-sizing:border-box!important;'
      + '-webkit-overflow-scrolling:touch!important;'
      + '}'
      + '.vl-comment-card{'
      + 'display:flex!important;'
      + 'flex-direction:row!important;'
      + 'align-items:flex-start!important;'
      + 'gap:10px!important;'
      + 'padding:10px 0!important;'
      + 'border-bottom:1px solid #f1f5f9!important;'
      + 'background:#fff!important;'
      + 'box-sizing:border-box!important;'
      + 'width:100%!important;'
      + '}'
      + '.vl-comment-avatar{'
      + 'width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;'
      + 'display:flex!important;align-items:center!important;justify-content:center!important;'
      + 'border-radius:50%!important;color:#fff!important;font-size:14px!important;'
      + 'font-weight:700!important;flex-shrink:0!important;'
      + '}'
      + '.vl-comment-body{flex:1!important;min-width:0!important;}'
      + '.vl-comment-meta{display:flex!important;align-items:center!important;gap:8px!important;margin-bottom:2px!important;}'
      + '.vl-comment-author{font-weight:700!important;font-size:13px!important;color:#0f172a!important;}'
      + '.vl-comment-date{font-size:11px!important;color:#94a3b8!important;}'
      + '.vl-comment-text{margin:0!important;font-size:14px!important;color:#334155!important;line-height:1.5!important;word-break:break-word!important;}'
      + '.vl-empty-state{'
      + 'display:flex!important;flex-direction:column!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'flex:1!important;min-height:180px!important;padding:20px!important;text-align:center!important;'
      + '}'
      + '.vl-empty-state p{font-size:15px!important;font-weight:700!important;color:#334155!important;margin:0!important;}'
      + '.vl-comments-panel-full .vl-panel-footer{'
      + 'flex:0 0 auto!important;'
      + 'width:100%!important;'
      + 'border-top:1px solid #e2e8f0!important;'
      + 'padding:12px 14px 10px!important;'
      + 'background:#fff!important;'
      + 'box-sizing:border-box!important;'
      + 'display:flex!important;'
      + 'justify-content:center!important;'
      + '}'
      + '.vl-comment-form{'
      + 'padding:16px 18px!important;display:flex!important;'
      + 'flex-direction:column!important;gap:0!important;flex:1!important;'
      + '}'
      + '.vl-comment-form label{'
      + 'display:block!important;font-size:12px!important;'
      + 'font-weight:600!important;color:#64748b!important;margin-bottom:4px!important;'
      + '}'
      + '.vl-comment-form input{'
      + 'display:block!important;width:100%!important;height:40px!important;'
      + 'padding:8px 12px!important;border:1.5px solid #e2e8f0!important;'
      + 'border-radius:10px!important;font-size:14px!important;color:#0f172a!important;'
      + 'outline:none!important;margin-bottom:12px!important;'
      + 'box-sizing:border-box!important;background:#f8fafc!important;'
      + 'font-family:inherit!important;'
      + '}'
      + '.vl-comment-form textarea{'
      + 'display:block!important;width:100%!important;height:70px!important;'
      + 'min-height:70px!important;max-height:70px!important;'
      + 'padding:8px 12px!important;border:1.5px solid #e2e8f0!important;'
      + 'border-radius:10px!important;font-size:14px!important;color:#0f172a!important;'
      + 'resize:none!important;outline:none!important;margin-bottom:8px!important;'
      + 'box-sizing:border-box!important;background:#f8fafc!important;'
      + 'font-family:inherit!important;'
      + '}'
      + '.vl-comment-form input:focus,.vl-comment-form textarea:focus{'
      + 'border-color:' + primary + '!important;'
      + 'box-shadow:0 0 0 2px ' + primary + '33!important;'
      + 'background:#fff!important;'
      + '}'
      + '.vl-form-btn-row{display:flex!important;gap:8px!important;}'
      + '.vl-form-btn-back{'
      + 'flex:1!important;height:40px!important;border:1.5px solid #e2e8f0!important;'
      + 'border-radius:12px!important;background:#fff!important;color:#64748b!important;'
      + 'font-size:14px!important;font-weight:600!important;cursor:pointer!important;'
      + 'font-family:inherit!important;'
      + '}'
      + '.vl-form-btn-send{'
      + 'flex:1!important;height:40px!important;border:none!important;'
      + 'border-radius:12px!important;color:#fff!important;'
      + 'font-size:14px!important;font-weight:700!important;cursor:pointer!important;'
      + 'font-family:inherit!important;'
      + '}'
      + '.vl-form-status{min-height:18px!important;text-align:center!important;font-size:12px!important;margin-top:6px!important;}'
      + '.vl-form-charcount{text-align:right!important;font-size:11px!important;color:#94a3b8!important;margin-bottom:8px!important;}'
      + '.vl-modal.has-comments-open{'
      + 'height:100%!important;'
      + 'max-height:90vh!important;'
      + 'border-radius:36px!important;'
      + '}'
    );
  }

  function buildFloatingCss(appearance, behaviorConfig) {
    behaviorConfig = behaviorConfig || getFloatingBehaviorConfig(appearance);
    var cfg = getFloatingConfig(appearance);
    var primary = getPrimaryColor(appearance);
    var secondary = getSecondaryColor(appearance);
    var borderColor = getBorderColor(appearance);
    var borderBackground = sanitizeCssValue(borderColor, '', 'color') || 'linear-gradient(135deg,' + primary + ',' + secondary + ')';
    var font = getFontFamily(appearance);
    return ':host{all:initial!important;position:fixed!important;top:' + cfg.top + '!important;right:' + cfg.right + '!important;bottom:' + cfg.bottom + '!important;left:' + cfg.left + '!important;z-index:' + cfg.zIndex + '!important;width:' + cfg.width + '!important;min-width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;height:auto!important;overflow:visible!important;background:transparent!important;pointer-events:auto!important;font-family:' + font + '!important;}'
      + buildSharedCss(appearance)
      + '.vl-bubbles{width:' + cfg.width + '!important;display:flex!important;flex-direction:column!important;align-items:' + cfg.alignItems + '!important;justify-content:flex-start!important;gap:10px!important;overflow:visible!important;position:relative!important;}'
      + '.vl-bubble{all:unset!important;position:relative!important;overflow:visible!important;width:' + cfg.width + '!important;min-width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;height:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:4px!important;cursor:pointer!important;pointer-events:auto!important;}'
      + '.vl-ring{pointer-events:none!important;width:' + cfg.width + '!important;height:' + cfg.height + '!important;border-radius:' + cfg.radius + '!important;padding:' + cfg.borderWidth + '!important;overflow:hidden!important;display:block!important;position:relative!important;background:' + borderBackground + '!important;box-shadow:0 12px 30px rgba(15,23,42,.18)!important;}'
      + '.vl-inner{pointer-events:none!important;position:relative!important;width:100%!important;height:100%!important;border-radius:' + cfg.innerRadius + '!important;overflow:hidden!important;background:#000!important;display:block!important;}'
      + '.vl-img{pointer-events:none!important;position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;object-fit:' + behaviorConfig.objectFit + '!important;object-position:center!important;display:block!important;border:none!important;border-radius:' + cfg.innerRadius + '!important;}'
      + '.vl-play-badge{pointer-events:none!important;position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:34px!important;height:34px!important;border-radius:999px!important;background:rgba(15,23,42,.62)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:15px!important;line-height:1!important;box-shadow:0 6px 18px rgba(0,0,0,.25)!important;}'
      + '.vl-play-badge::before{content:""!important;margin-left:3px!important;width:0!important;height:0!important;border-top:8px solid transparent!important;border-bottom:8px solid transparent!important;border-left:12px solid #fff!important;display:block!important;}'
      + '.vl-dismiss{all:unset!important;-webkit-appearance:none!important;appearance:none!important;position:absolute!important;top:-14px!important;right:-14px!important;width:22px!important;height:22px!important;background:transparent!important;color:#000!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;font-weight:900!important;line-height:1!important;cursor:pointer!important;z-index:20!important;pointer-events:auto!important;border-radius:0!important;box-shadow:none!important;outline:none!important;border:none!important;padding:0!important;margin:0!important;text-shadow:0 0 4px rgba(255,255,255,.9)!important;}'
      + '.vl-label{pointer-events:none!important;width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;font-family:' + font + '!important;font-size:11px!important;line-height:12px!important;font-weight:700!important;color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.8)!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;}';
  }

  function pausePreviews() {
    if (!globalShadowRoot) return;
    var vids = globalShadowRoot.querySelectorAll('.vl-bubble video.vl-img');
    for (var i = 0; i < vids.length; i++) { vids[i].pause(); }
  }

  function resumePreviews() {
    if (!globalShadowRoot) return;
    var vids = globalShadowRoot.querySelectorAll('.vl-bubble video.vl-img');
    for (var i = 0; i < vids.length; i++) {
      var p = vids[i].play(); if (p) p.catch(function () {});
    }
  }

function trackMetric(data) {
  if (!hasSupabase) return;
  data = data || {};
  supabaseFetch('metrics', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      store_id: storeId,
      event_type: data.event_type || 'unknown',
      story_id: data.story_id || null,
      video_id: data.video_id || null,
      product_id: data.product_id || null,
      page_url: data.page_url || window.location.href,
      visitor_id: getFingerprint(),
      device_type: getDevice(),
      browser: navigator.userAgent,
      created_at: new Date().toISOString()
    })
  }).catch(function () {});
}

  function buildVideoPlayer(video, storyId, onEnded) {
    var url = getVideoUrl(video);
    console.log('🔍 VIDLYTICS DEBUG:', {
      video_id: video.id,
      source_type: video.source_type || video.sourceType,
      url: url,
      isUpload: video.source_type === 'upload' || video.sourceType === 'upload',
      isDirectVideo: isDirectVideoUrl(url),
      isYouTube: !!extractYouTubeId(url)
    });
    var ytId = extractYouTubeId(url);
    var isUpload = video.source_type === 'upload' || video.sourceType === 'upload';
    var isDirect = isDirectVideoUrl(url);
    var wrapper = createEl('div', 'vl-player');
    if (!isUpload && ytId) {
      var iframe = createEl('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&playsinline=1&rel=0&loop=1&playlist=' + ytId;
      iframe.allow = 'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      wrapper.appendChild(iframe);
      trackMetric({ event_type: 'play', story_id: storyId, video_id: video.id, page_url: window.location.href });
      return wrapper;
    }
    if ((isUpload || isDirect) && url) {
      var media = createEl('video');
      media.controls = false;
      media.preload = 'auto';
      media.setAttribute('playsinline', '');
      media.setAttribute('webkit-playsinline', '');
      media.playsInline = true;
      media.muted = false;
      media.loop = true;
      var thumb = getVideoThumbnail(video);
      if (thumb) media.poster = thumb;
      media.src = url;
      media.addEventListener('play', function () {
        trackMetric({ event_type: 'play', story_id: storyId, video_id: video.id, page_url: window.location.href });
      });
      media.addEventListener('ended', function () {
        if (typeof onEnded === 'function') onEnded();
      });
      wrapper.appendChild(media);
      return wrapper;
    }
    var link = createEl('a');
    link.href = url || '#';
    link.target = '_blank';
    link.textContent = 'Abrir vídeo';
    link.className = 'vl-cta';
    wrapper.appendChild(link);
    return wrapper;
  }

  function getCommentCount(videoId) {
    return getCommentsForVideo(videoId).length;
  }

  function getCommentsForVideo(videoId) {
    return (readCommentsData || []).filter(function (comment) {
      return idsEqual(comment.video_id, videoId);
    });
  }

  function renderCommentItem(comment) {
    var item = createEl('div', 'vl-comment-item');
    var author = createEl('div', 'vl-comment-author');
    author.textContent = comment.user_name || 'Visitante';
    var content = createEl('div', 'vl-comment-content');
    content.textContent = comment.content || '';
    item.appendChild(author);
    item.appendChild(content);
    var replyContent = String(comment.reply_content || comment.replyContent || '').trim();
    var replyStatus = String(comment.reply_status || comment.replyStatus || '').trim().toLowerCase();
    var replyIsVisible = replyContent && (!replyStatus || replyStatus === 'replied' || replyStatus === 'respondido' || replyStatus === 'published' || replyStatus === 'publicado');
    if (replyIsVisible) {
      var reply = createEl('div', 'vl-comment-reply');
      var replyLabel = createEl('div', 'vl-comment-reply-label');
      replyLabel.textContent = 'Resposta da loja';
      var replyText = createEl('div', 'vl-comment-reply-content');
      replyText.textContent = replyContent;
      reply.appendChild(replyLabel);
      reply.appendChild(replyText);
      item.appendChild(reply);
    }
    return item;
  }

  function getCommentEmojis() {
    return ['😎', '👍', '👏', '😱', '🙏', '💪', '🔥', '❤️', '💙', '✨', '🎉', '✅', '⭐', '😢', '😡', '🤔', '👀', '😊', '🥰'];
  }

  function getSizingModelId(video) {
    if (!video) return null;
    return firstDefined(video.model_id, video.modelId, video.sizing_model_id, video.sizingModelId, video.modelo_id, video.modeloId, video.model) || null;
  }

  function createComment(commentData) {
    if (!hasSupabase) return Promise.reject(new Error('Supabase não configurado.'));
    commentData = commentData || {};
    var payload = {
      store_id: storeId,
      video_id: commentData.video_id || null,
      user_name: String(commentData.author_name || '').trim(),
      user_email: commentData.author_email ? String(commentData.author_email).trim() : null,
      content: String(commentData.content || '').trim(),
      status: commentData.status || 'pending'
    };
    if (!payload.user_name) return Promise.reject(new Error('Informe seu nome.'));
    if (!payload.content) return Promise.reject(new Error('Digite um comentário.'));
    return supabaseFetch('comments', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (response.ok) return true;
        return response.text().then(function (rawMessage) {
          var parsed = {};
          try { parsed = JSON.parse(rawMessage || '{}'); } catch (error) {}
          if (response.status === 401) throw new Error('A chave pública ou a URL do Supabase são inválidas.');
          if (response.status === 403 || parsed.code === '42501') throw new Error('Inserção bloqueada pelas políticas RLS da tabela comments.');
          throw new Error(parsed.message || parsed.error_description || parsed.hint || parsed.details || 'Não foi possível enviar o comentário.');
        });
      });
  }

  function getFingerprint() {
    var key = '__vid_fp';
    var stored = localStorage.getItem(key);
    if (stored) return stored;
    var fp = 'fp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, fp);
    return fp;
  }

  function getCommentCountForVideo(videoId) {
    return readCommentsData.filter(function (c) {
      return idsEqual(c.video_id, videoId);
    }).length;
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var date = new Date(dateStr);
    var diffMs = now - date;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHour = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return 'agora';
    if (diffMin < 60) return diffMin + 'min';
    if (diffHour < 24) return diffHour + 'h';
    if (diffDay < 7) return diffDay + 'd';
    if (diffDay < 30) return Math.floor(diffDay / 7) + 'sem';
    return date.toLocaleDateString('pt-BR');
  }

  function toggleLike(video, btnEl) {
    if (!video || !video.id) return;
    var vidId = video.id;
    var isCurrentlyLiked = !!likedVideos[vidId];
    if (isCurrentlyLiked) {
      delete likedVideos[vidId];
      videoLikeCounts[vidId] = Math.max(0, (videoLikeCounts[vidId] || 1) - 1);
      if (hasSupabase) {
        supabaseFetch('video_likes?video_id=eq.' + encodeURIComponent(vidId) + '&user_fingerprint=eq.' + encodeURIComponent(getFingerprint()), { method: 'DELETE' })
          .catch(function () {});
      }
    } else {
      likedVideos[vidId] = true;
      videoLikeCounts[vidId] = (videoLikeCounts[vidId] || 0) + 1;
      if (hasSupabase) {
        supabaseFetch('video_likes', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            video_id: vidId,
            user_fingerprint: getFingerprint(),
            store_id: storeId,
            story_id: currentStories[currentStoryIndex].id,
            page_url: window.location.href,
            created_at: new Date().toISOString()
          })
        }).catch(function () {});
      }
    }

    var isNowLiked = !!likedVideos[vidId];
    var count = videoLikeCounts[vidId] || 0;
    btnEl.innerHTML = svgIcon(isNowLiked ? 'heartFilled' : 'heart');
    btnEl.title = isNowLiked ? 'Descurtir' : 'Curtir';

    var wrapper = btnEl.parentNode;
    if (wrapper && wrapper.classList.contains('vl-social-wrapper')) {
      var countEl = wrapper.querySelector('.vl-social-count');
      if (countEl) {
        countEl.textContent = count > 0 ? count : '';
      }
    }

    trackMetric({
      event_type: isCurrentlyLiked ? 'unlike' : 'like',
      story_id: currentStories[currentStoryIndex].id,
      video_id: vidId,
      page_url: window.location.href
    });
  }

  function openSharePanel(btnEl) {
    var existing = document.getElementById('vl-share-panel');
    if (existing) { existing.remove(); return; }
    var shareUrl = window.location.href;
    var story = currentStories[currentStoryIndex];
    var shareText = story ? (story.title || 'Confira este vídeo!') : 'Confira este vídeo!';
    var panel = createEl('div');
    panel.id = 'vl-share-panel';
    panel.style.cssText = 'position:absolute;bottom:calc(100% + 8px);right:-20px;background:#1e293b;border-radius:12px;padding:8px;min-width:180px;box-shadow:0 10px 25px rgba(0,0,0,0.5);z-index:200;animation:vlFadeIn 0.15s ease;';
    var copyBtn = createEl('button');
    copyBtn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;background:transparent;color:#fff;font-size:14px;cursor:pointer;border-radius:8px;';
    copyBtn.innerHTML = svgIcon('copy') + ' Copiar link';
    copyBtn.onmouseenter = function () { copyBtn.style.background = 'rgba(255,255,255,0.1)'; };
    copyBtn.onmouseleave = function () { copyBtn.style.background = 'transparent'; };
    copyBtn.onclick = function () {
      navigator.clipboard.writeText(shareUrl).then(function () {
        copyBtn.innerHTML = svgIcon('check') + ' Copiado!';
        setTimeout(function () { panel.remove(); }, 1500);
      }).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyBtn.innerHTML = svgIcon('check') + ' Copiado!';
        setTimeout(function () { panel.remove(); }, 1500);
      });
    };
    panel.appendChild(copyBtn);
    var waBtn = createEl('button');
    waBtn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;background:transparent;color:#fff;font-size:14px;cursor:pointer;border-radius:8px;';
    waBtn.innerHTML = svgIcon('whatsapp') + ' WhatsApp';
    waBtn.onmouseenter = function () { waBtn.style.background = 'rgba(255,255,255,0.1)'; };
    waBtn.onmouseleave = function () { waBtn.style.background = 'transparent'; };
    waBtn.onclick = function () {
      window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl), '_blank');
      panel.remove();
    };
    panel.appendChild(waBtn);
    btnEl.style.position = 'relative';
    btnEl.appendChild(panel);
    setTimeout(function () {
      var handler = function (ev) {
        if (!panel.contains(ev.target) && ev.target !== btnEl) {
          panel.remove();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 0);
    trackMetric({
      event_type: 'share',
      story_id: story ? story.id : null,
      page_url: shareUrl
    });
  }

  function openSizingPanel(modelId) {
    if (!modalContent) return;

    var existing = modalContent.querySelector('.vl-sizing-panel-full');

    function restoreVideoView() {
      var currentPanel = modalContent.querySelector('.vl-sizing-panel-full');
      if (currentPanel && currentPanel.parentNode) {
        currentPanel.parentNode.removeChild(currentPanel);
      }
      modalContent.classList.remove('has-comments-open');

      var header = modalContent.querySelector('.vl-header');
      var footer = modalContent.querySelector('.vl-footer');
      var social = modalContent.querySelector('.vl-social');
      if (header) { header.style.display = ''; header.style.visibility = ''; header.style.pointerEvents = ''; }
      if (footer) { footer.style.display = ''; footer.style.visibility = ''; footer.style.pointerEvents = ''; }
      if (social) { social.style.display = ''; social.style.visibility = ''; social.style.pointerEvents = ''; }

      var videoElement = modalContent.querySelector('video');
      if (videoElement) { videoElement.play().catch(function () {}); }
    }

    if (existing) {
      restoreVideoView();
      return;
    }

    var model = readSizingModelsData.find(function (m) {
      return idsEqual(m.id, modelId);
    });
    if (!model) return;

    var videoElement = modalContent.querySelector('video');
    if (videoElement) { videoElement.pause(); }

    var header = modalContent.querySelector('.vl-header');
    var footer = modalContent.querySelector('.vl-footer');
    var social = modalContent.querySelector('.vl-social');
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (social) social.style.display = 'none';

    var primaryColor = getPrimaryColor(currentAppearance);
    var fontFamily = getFontFamily(currentAppearance);

    var panel = createEl('div', 'vl-sizing-panel-full');
    panel.style.cssText = [
      'position:absolute;',
      'z-index:70;',
      'display:flex;',
      'flex-direction:column;',
      'top:50%;',
      'left:50%;',
      'transform:translate(-50%,-50%);',
      'width:calc(100% - 40px);',
      'max-width:340px;',
      'max-height:62%;',
      'overflow:hidden;',
      'background:#fff;',
      'border-radius:24px;',
      'box-shadow:0 18px 50px rgba(0,0,0,.32);',
      'font-family:' + fontFamily + ';',
      'box-sizing:border-box;'
    ].join('');

    var panelHeader = createEl('div');
    panelHeader.style.cssText = [
      'display:flex;',
      'align-items:center;',
      'justify-content:space-between;',
      'padding:18px 18px 8px;',
      'flex-shrink:0;'
    ].join('');

    var panelTitle = createEl('span');
    panelTitle.textContent = 'Medidas da modelo';
    panelTitle.style.cssText = [
      'font-size:11px;',
      'font-weight:900;',
      'letter-spacing:.08em;',
      'text-transform:uppercase;',
      'color:' + primaryColor + ';'
    ].join('');
    panelHeader.appendChild(panelTitle);

    var closeBtn = createEl('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = svgIcon('close');
    closeBtn.style.cssText = [
      'width:36px;',
      'height:36px;',
      'border-radius:999px;',
      'background:#f1f5f9;',
      'display:flex;',
      'align-items:center;',
      'justify-content:center;',
      'cursor:pointer;',
      'border:none;',
      'padding:0;',
      'flex-shrink:0;',
      'color:#475569;'
    ].join('');
    closeBtn.addEventListener('click', function (event) {
      event.preventDefault(); event.stopPropagation(); restoreVideoView();
    });
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    var panelBody = createEl('div');
    panelBody.style.cssText = [
      'flex:1;',
      'overflow-y:auto;',
      'padding:0 18px 18px;',
      '-webkit-overflow-scrolling:touch;'
    ].join('');

    var measures = [];
    try {
      measures = typeof model.measures === 'string'
        ? JSON.parse(model.measures)
        : (model.measures || []);
    } catch (e) {}

    if (measures && measures.length > 0) {
      measures.forEach(function (m) {
        var label = m.name || m.label || '-';
        var val = m.value || m.size || '-';
        var unit = m.unit || '';

        var row = createEl('div');
        row.style.cssText = [
          'display:flex;',
          'justify-content:space-between;',
          'padding:14px 12px;',
          'background:#f6f8fb;',
          'border-radius:14px;',
          'margin-bottom:9px;'
        ].join('');

        var labelSpan = createEl('span');
        labelSpan.textContent = label;
        labelSpan.style.cssText = 'font-weight:800;color:#475569;';
        row.appendChild(labelSpan);

        var valueSpan = createEl('span');
        valueSpan.textContent = val + (unit ? ' ' + unit : '');
        valueSpan.style.cssText = 'font-weight:800;color:#0f172a;text-align:right;';
        row.appendChild(valueSpan);

        panelBody.appendChild(row);
      });
    } else {
      var emptyMsg = createEl('p');
      emptyMsg.textContent = 'Sem medidas cadastradas.';
      emptyMsg.style.cssText = 'font-size:14px;color:#64748b;text-align:center;padding:20px;';
      panelBody.appendChild(emptyMsg);
    }

    panel.appendChild(panelBody);
    modalContent.appendChild(panel);
    modalContent.classList.add('has-comments-open');
  }
  function openCommentsPanel(videoId, storyId) {
    if (!modalContent) return;

    var existing = modalContent.querySelector('.vl-comments-panel-full');

    function restoreVideoView() {
      var currentPanel = modalContent.querySelector('.vl-comments-panel-full');
      if (currentPanel && currentPanel.parentNode) {
        currentPanel.parentNode.removeChild(currentPanel);
      }
      modalContent.classList.remove('has-comments-open');

      var header = modalContent.querySelector('.vl-header');
      var footer = modalContent.querySelector('.vl-footer');
      var social = modalContent.querySelector('.vl-social');
      if (header) { header.style.display = ''; header.style.visibility = ''; header.style.pointerEvents = ''; }
      if (footer) { footer.style.display = ''; footer.style.visibility = ''; footer.style.pointerEvents = ''; }
      if (social) { social.style.display = ''; social.style.visibility = ''; social.style.pointerEvents = ''; }

      var videoElement = modalContent.querySelector('video');
      if (videoElement) { videoElement.play().catch(function () {}); }
    }

    if (existing) {
      restoreVideoView();
      return;
    }

    var videoElement = modalContent.querySelector('video');
    if (videoElement) { videoElement.pause(); }

    var header = modalContent.querySelector('.vl-header');
    var footer = modalContent.querySelector('.vl-footer');
    var social = modalContent.querySelector('.vl-social');
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (social) social.style.display = 'none';

    var primaryColor = getPrimaryColor(currentAppearance);
    var buttonColor = getButtonColor(currentAppearance);
    var fontFamily = getFontFamily(currentAppearance);
    var commentsCount = getCommentCountForVideo(videoId);
    var hasComments = commentsCount > 0;

    var panel = createEl('div', 'vl-comments-panel-full');
    panel.style.cssText = [
      'position:absolute;','top:8px;','right:8px;','bottom:8px;','left:8px;',
      'width:auto;','height:auto;','max-height:none;','z-index:200;',
      'display:flex;','flex-direction:column;','overflow:hidden;',
      'box-sizing:border-box;','background:#fff;',
      'border:2px solid ' + primaryColor + ';','border-radius:20px;',
      'box-shadow:0 12px 30px rgba(0,0,0,.35);','font-family:' + fontFamily + ';'
    ].join('');

    var panelHeader = createEl('div', 'vl-panel-header');
    panelHeader.style.cssText = [
      'display:flex;','align-items:center;','justify-content:space-between;',
      'height:48px;','min-height:48px;','padding:0 14px;',
      'border-bottom:1px solid #e2e8f0;','background:#fff;',
      'box-sizing:border-box;','flex-shrink:0;'
    ].join('');

    var panelTitle = createEl('h3');
    panelTitle.textContent = 'Comentários' + (hasComments ? ' (' + commentsCount + ')' : '');
    panelTitle.style.cssText = 'margin:0;font-size:16px;font-weight:700;color:#111;';
    panelHeader.appendChild(panelTitle);

    var closeBtn = createEl('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = svgIcon('close');
    closeBtn.style.cssText = [
      'background:#f1f5f9;','border:none;','color:#475569;','cursor:pointer;',
      'width:32px;','height:32px;','border-radius:50%;','display:flex;',
      'align-items:center;','justify-content:center;','font-size:18px;',
      'transition:all .15s;','flex-shrink:0;'
    ].join('');
    closeBtn.onmouseenter = function () { closeBtn.style.background = '#e2e8f0'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = '#f1f5f9'; };
    closeBtn.addEventListener('click', function (event) {
      event.preventDefault(); event.stopPropagation(); restoreVideoView();
    });
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    var panelBody = createEl('div', 'vl-panel-body');
    panelBody.style.cssText = [
      'flex:1 1 auto;','min-height:0;','overflow-y:auto;','overflow-x:hidden;',
      'padding:0;','display:flex;','flex-direction:column;',
      'box-sizing:border-box;','-webkit-overflow-scrolling:touch;'
    ].join('');

    var panelFooter = createEl('div', 'vl-panel-footer');
    panelFooter.style.cssText = [
      'flex:0 0 auto;','width:100%;','border-top:1px solid #e2e8f0;',
      'padding:12px 14px 10px;','background:#fff;','box-sizing:border-box;',
      'position:relative;','z-index:6;','display:flex;','justify-content:center;'
    ].join('');

    function renderEmptyState() {
      while (panelBody.firstChild) { panelBody.removeChild(panelBody.firstChild); }

      var emptyWrap = createEl('div', 'vl-empty-state');
      emptyWrap.style.cssText = [
        'display:flex;','flex-direction:column;','align-items:center;',
        'justify-content:center;','flex:1;','min-height:180px;',
        'padding:20px;','text-align:center;'
      ].join('');

      var emptyIcon = createEl('div');
      emptyIcon.innerHTML = svgIcon('comment');
      emptyIcon.style.cssText = 'opacity:.15;margin-bottom:12px;';

      var emptyTitle = createEl('p');
      emptyTitle.textContent = 'Seja o primeiro a comentar';
      emptyTitle.style.cssText = 'font-size:15px;font-weight:700;color:#334155;margin:0 0 16px 0;';

      emptyWrap.appendChild(emptyIcon);
      emptyWrap.appendChild(emptyTitle);
      panelBody.appendChild(emptyWrap);
    }

    function renderCommentList() {
      while (panelBody.firstChild) { panelBody.removeChild(panelBody.firstChild); }

      var videoComments = readCommentsData.filter(function (c) {
        return idsEqual(c.video_id, videoId);
      });

      if (videoComments.length === 0) { renderEmptyState(); return; }

      var listWrap = createEl('div');
      listWrap.style.cssText = 'padding:10px 18px;display:flex;flex-direction:column;gap:10px;flex:1;';

      videoComments.forEach(function (comment) {
        var commentCard = createEl('div', 'vl-comment-card');
        commentCard.style.cssText = 'display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;';

        var avatar = createEl('div', 'vl-comment-avatar');
        avatar.textContent = (comment.user_name || 'V').charAt(0).toUpperCase();
        avatar.style.cssText = 'width:34px;height:34px;border-radius:50%;background:' + primaryColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;';

        var commentBody = createEl('div', 'vl-comment-body');
        commentBody.style.cssText = 'flex:1;min-width:0;';

        var commentMeta = createEl('div', 'vl-comment-meta');
        commentMeta.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:2px;';

        var authorName = createEl('span', 'vl-comment-author');
        authorName.textContent = comment.user_name || 'Visitante';
        authorName.style.cssText = 'font-weight:700;font-size:13px;color:#0f172a;';
        commentMeta.appendChild(authorName);

        if (comment.created_at) {
          var commentDate = createEl('span', 'vl-comment-date');
          commentDate.textContent = formatRelativeTime(comment.created_at);
          commentDate.style.cssText = 'font-size:11px;color:#94a3b8;';
          commentMeta.appendChild(commentDate);
        }

        var commentText = createEl('p', 'vl-comment-text');
        commentText.textContent = comment.content || comment.text || '';
        commentText.style.cssText = 'margin:0;font-size:14px;color:#334155;line-height:1.5;word-break:break-word;';

        commentBody.appendChild(commentMeta);
        commentBody.appendChild(commentText);

        var replyContent = String(comment.reply_content || comment.replyContent || '').trim();
        var replyStatus = String(comment.reply_status || comment.replyStatus || '').trim().toLowerCase();
        var replyIsVisible = replyContent && (!replyStatus || replyStatus === 'replied' || replyStatus === 'respondido' || replyStatus === 'published' || replyStatus === 'publicado');

        if (replyIsVisible) {
          var replyBox = createEl('div');
          replyBox.style.cssText = 'margin-top:8px;padding:8px 12px;background:#f0f9ff;border-left:3px solid ' + primaryColor + ';border-radius:6px;';
          var replyLabel = createEl('div');
          replyLabel.textContent = 'Resposta da loja';
          replyLabel.style.cssText = 'font-size:10px;font-weight:700;color:' + primaryColor + ';margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px;';
          var replyText = createEl('p');
          replyText.textContent = replyContent;
          replyText.style.cssText = 'margin:0;font-size:13px;color:#334155;line-height:1.4;word-break:break-word;';
          replyBox.appendChild(replyLabel);
          replyBox.appendChild(replyText);
          commentBody.appendChild(replyBox);
        }

        commentCard.appendChild(avatar);
        commentCard.appendChild(commentBody);
        listWrap.appendChild(commentCard);
      });

      panelBody.appendChild(listWrap);
    }

    function renderCommentButton() {
      while (panelFooter.firstChild) { panelFooter.removeChild(panelFooter.firstChild); }

      var ctaBtn = createEl('button');
      ctaBtn.type = 'button';
      ctaBtn.textContent = 'Deixe seu comentário';
      ctaBtn.style.cssText = 'width:100%;height:40px;border:none;border-radius:12px;background:' + buttonColor + ';color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:' + fontFamily + ';';
      ctaBtn.onmouseenter = function () { ctaBtn.style.opacity = '.9'; };
      ctaBtn.onmouseleave = function () { ctaBtn.style.opacity = '1'; };
      ctaBtn.onclick = function (e) {
        e.preventDefault(); e.stopPropagation(); renderCommentForm();
      };
      panelFooter.appendChild(ctaBtn);
    }

    function renderCommentForm() {
      while (panelBody.firstChild) { panelBody.removeChild(panelBody.firstChild); }
      while (panelFooter.firstChild) { panelFooter.removeChild(panelFooter.firstChild); }

      var formWrap = createEl('div', 'vl-comment-form');
      formWrap.style.cssText = 'padding:16px 18px;display:flex;flex-direction:column;gap:0;flex:1;';

      var nameLabel = createEl('label');
      nameLabel.textContent = 'Seu nome';
      nameLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;';
      formWrap.appendChild(nameLabel);

      var nameInput = createEl('input');
      nameInput.type = 'text'; nameInput.placeholder = 'Digite seu nome...'; nameInput.maxLength = 80;
      nameInput.style.cssText = 'width:100%;height:40px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;outline:none;transition:border-color .2s;margin-bottom:12px;box-sizing:border-box;background:#f8fafc;font-family:' + fontFamily + ';';
      nameInput.addEventListener('focus', function () {
        nameInput.style.borderColor = primaryColor;
        nameInput.style.boxShadow = '0 0 0 2px ' + primaryColor + '33';
        nameInput.style.background = '#fff';
      });
      nameInput.addEventListener('blur', function () {
        nameInput.style.borderColor = '#e2e8f0';
        nameInput.style.boxShadow = 'none';
        nameInput.style.background = '#f8fafc';
      });
      formWrap.appendChild(nameInput);

      var commentLabel = createEl('label');
      commentLabel.textContent = 'Seu comentário';
      commentLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;';
      formWrap.appendChild(commentLabel);

      var commentTextarea = createEl('textarea');
      commentTextarea.placeholder = 'Escreva seu comentário...';
      commentTextarea.maxLength = 1000; commentTextarea.rows = 3;
      commentTextarea.style.cssText = 'width:100%;height:70px;min-height:70px;max-height:70px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;resize:none;outline:none;transition:border-color .2s;margin-bottom:8px;box-sizing:border-box;background:#f8fafc;font-family:' + fontFamily + ';';
      commentTextarea.addEventListener('focus', function () {
        commentTextarea.style.borderColor = primaryColor;
        commentTextarea.style.boxShadow = '0 0 0 2px ' + primaryColor + '33';
        commentTextarea.style.background = '#fff';
      });
      commentTextarea.addEventListener('blur', function () {
        commentTextarea.style.borderColor = '#e2e8f0';
        commentTextarea.style.boxShadow = 'none';
        commentTextarea.style.background = '#f8fafc';
      });
      formWrap.appendChild(commentTextarea);

      var textareaWrapper = createEl('div');
      textareaWrapper.style.cssText = 'position:relative!important;';

      formWrap.removeChild(commentTextarea);
      commentTextarea.style.paddingRight = '48px';
      textareaWrapper.appendChild(commentTextarea);

      var emojiToggle = createEl('button');
      emojiToggle.type = 'button';
      emojiToggle.textContent = '\uD83D\uDE0A';
      emojiToggle.style.cssText = 'position:absolute!important;right:10px!important;bottom:10px!important;width:32px!important;height:32px!important;border:2px solid #0f172a!important;border-radius:50%!important;background:#fff!important;font-size:18px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;line-height:1!important;z-index:5!important;';

      var emojiGrid = createEl('div');
      emojiGrid.style.cssText = 'display:none!important;position:absolute!important;right:0!important;bottom:48px!important;grid-template-columns:repeat(6,34px)!important;gap:4px!important;padding:8px!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;box-shadow:0 8px 30px rgba(0,0,0,.18)!important;z-index:30!important;max-height:150px!important;overflow-y:auto!important;';

      var emojiList = ['\uD83D\uDE0D','\uD83D\uDD25','\uD83D\uDC4F','\u2764\uFE0F','\uD83D\uDE02','\uD83D\uDE31','\uD83D\uDE4C','\uD83D\uDCAF','\u2728','\uD83D\uDE22','\uD83E\uDD14','\uD83D\uDC4D','\uD83D\uDCAA','\uD83C\uDF89','\uD83D\uDE0A','\uD83E\uDD70','\uD83D\uDE0E','\uD83D\uDE4F','\uD83D\uDC99','\u2B50','\u2705','\uD83D\uDE21','\uD83D\uDC40','\uD83E\uDD29'];

      emojiList.forEach(function (emoji) {
        var emojiBtn = createEl('button');
        emojiBtn.type = 'button';
        emojiBtn.textContent = emoji;
        emojiBtn.style.cssText = 'width:34px!important;height:34px!important;border:none!important;background:transparent!important;border-radius:8px!important;font-size:20px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;';
        emojiBtn.onmousedown = function (ev) {
          ev.preventDefault();
          var start = commentTextarea.selectionStart || commentTextarea.value.length;
          var end = commentTextarea.selectionEnd || commentTextarea.value.length;
          commentTextarea.value = commentTextarea.value.substring(0, start) + emoji + commentTextarea.value.substring(end);
          var newPos = start + emoji.length;
          commentTextarea.focus();
          commentTextarea.setSelectionRange(newPos, newPos);
          charCounter.textContent = commentTextarea.value.length + '/1000';
          emojiGrid.style.display = 'none';
        };
        emojiGrid.appendChild(emojiBtn);
      });

      emojiToggle.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        emojiGrid.style.display = emojiGrid.style.display === 'grid' ? 'none' : 'grid';
      };

      textareaWrapper.appendChild(emojiToggle);
      textareaWrapper.appendChild(emojiGrid);
      formWrap.appendChild(textareaWrapper);

      document.addEventListener('mousedown', function closeEmoji(ev) {
        if (emojiGrid.style.display === 'grid' && !textareaWrapper.contains(ev.target)) {
          emojiGrid.style.display = 'none';
        }
      });

      var charCounter = createEl('div');
      charCounter.style.cssText = 'display:none!important;';
      commentTextarea.addEventListener('input', function () {
        charCounter.textContent = commentTextarea.value.length + '/1000';
      });
      formWrap.appendChild(charCounter);

      var statusMsg = createEl('div', 'vl-form-status');
      formWrap.appendChild(statusMsg);

      panelBody.appendChild(formWrap);

      var btnRow = createEl('div', 'vl-form-btn-row');

      var backBtn = createEl('button', 'vl-form-btn-back');
      backBtn.type = 'button';
      backBtn.textContent = 'Voltar';
      backBtn.style.fontFamily = fontFamily;
      backBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        renderInitialState();
      };
      btnRow.appendChild(backBtn);

      var sendBtn = createEl('button', 'vl-form-btn-send');
      sendBtn.type = 'button';
      sendBtn.textContent = 'Enviar';
      sendBtn.style.background = buttonColor;
      sendBtn.style.fontFamily = fontFamily;
      sendBtn.onmouseenter = function () { sendBtn.style.opacity = '.9'; };
      sendBtn.onmouseleave = function () { sendBtn.style.opacity = '1'; };

      sendBtn.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();

        var name = nameInput.value.trim();
        var text = commentTextarea.value.trim();

        if (!text) {
          statusMsg.textContent = 'Digite um comentário para enviar.';
          statusMsg.style.color = '#ef4444';
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando...';
        sendBtn.style.opacity = '.6';
        statusMsg.textContent = '';

        userCommentedVideos[videoId] = true;
        var commentStatus = autoApproveComments ? 'approved' : 'pending';

        if (hasSupabase) {
          createComment({
            story_id: storyId,
            video_id: videoId,
            author_name: name || 'Visitante',
            content: text,
            status: commentStatus
          })
            .then(function () {
              if (autoApproveComments) {
                readCommentsData.push({
                  video_id: videoId, user_name: name || 'Visitante',
                  content: text, text: text,
                  created_at: new Date().toISOString(), status: 'approved'
                });
                statusMsg.textContent = 'Obrigado pelo seu comentário! ❤️';
                statusMsg.style.color = '#22c55e';
              } else {
                statusMsg.textContent = 'Obrigado pelo seu comentário! Sua mensagem será publicada em breve. 📝';
                statusMsg.style.color = '#f59e0b';
              }
              commentsCount = getCommentCountForVideo(videoId);
              panelTitle.textContent = 'Comentários' + (commentsCount > 0 ? ' (' + commentsCount + ')' : '');
              setTimeout(function () { renderInitialState(); }, 2000);
              trackMetric({ event_type: 'comment', story_id: storyId, video_id: videoId, page_url: window.location.href });
            })
            .catch(function (error) {
              statusMsg.textContent = error && error.message ? error.message : 'Erro ao enviar. Tente novamente.';
              statusMsg.style.color = '#ef4444';
              sendBtn.textContent = 'Enviar';
              sendBtn.disabled = false;
              sendBtn.style.opacity = '1';
            });
          return;
        }

        readCommentsData.push({
          video_id: videoId, user_name: name || 'Visitante',
          content: text, text: text, created_at: new Date().toISOString()
        });
        statusMsg.textContent = 'Obrigado pelo seu comentário!';
        statusMsg.style.color = '#22c55e';
        commentsCount = getCommentCountForVideo(videoId);
        panelTitle.textContent = 'Comentários' + (commentsCount > 0 ? ' (' + commentsCount + ')' : '');
        setTimeout(function () { renderInitialState(); }, 2000);
      };

      btnRow.appendChild(sendBtn);
      formWrap.appendChild(btnRow);
      panelFooter.style.display = 'none';

      setTimeout(function () { nameInput.focus(); }, 200);
    }

    function renderInitialState() {
      commentsCount = getCommentCountForVideo(videoId);
      panelTitle.textContent = 'Comentários' + (commentsCount > 0 ? ' (' + commentsCount + ')' : '');
      if (commentsCount > 0) { renderCommentList(); } else { renderEmptyState(); }
      renderCommentButton();
    }

    renderInitialState();
    panel.appendChild(panelBody);
    panel.appendChild(panelFooter);
    modalContent.appendChild(panel);
    modalContent.classList.add('has-comments-open');
  }

  function closeOverlay() {
    if (overlay) overlay.className = 'vl-overlay';
    if (modalContent) {
      var oldVid = modalContent.querySelector('video');
      if (oldVid) { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); }
      modalContent.innerHTML = '';
    }
    resumePreviews();
  }

  function renderStoryModal() {
    if (!modalContent) return;
    modalContent.innerHTML = '';
    var story = currentStories[currentStoryIndex];
    if (!story) { closeOverlay(); return; }
    var videos = story.videos || [];
    var video = videos[currentVideoIndex];
    var appearanceConfig = normalizeModalAppearanceConfig(currentAppearance);
    var container = createEl('div');

    if (videos.length > 1) {
      var progress = createEl('div', 'vl-progress');
      videos.forEach(function (_, idx) {
        var bar = createEl('div', 'vl-progress-bar');
        var fill = createEl('div', 'vl-progress-fill');
        if (idx < currentVideoIndex) fill.style.width = '100%';
        else fill.style.width = '0%';
        bar.appendChild(fill);
        progress.appendChild(bar);
      });
      container.appendChild(progress);
    }

    var header = createEl('div', 'vl-header');
    var headerLeft = createEl('div', 'vl-header-left');
    if (appearanceConfig.show_title) {
      var title = createEl('div', 'vl-title');
      title.textContent = story.title || '';
      headerLeft.appendChild(title);
    }
    header.appendChild(headerLeft);

    var headerActions = createEl('div', 'vl-header-actions');

    var muteBtn = createEl('button', 'vl-control');
    muteBtn.id = 'vl-mute-btn';
    muteBtn.innerHTML = svgIcon('volume');
    muteBtn.title = 'Mudo';
    muteBtn.onclick = function (e) {
      e.stopPropagation();
      var vid = modalContent.querySelector('video');
      if (!vid) return;
      vid.muted = !vid.muted;
      muteBtn.innerHTML = vid.muted ? svgIcon('volumeOff') : svgIcon('volume');
      muteBtn.title = vid.muted ? 'Ativar som' : 'Mudo';
    };
    headerActions.appendChild(muteBtn);

    var playBtn = createEl('button', 'vl-control');
    playBtn.id = 'vl-play-btn';
    playBtn.innerHTML = svgIcon('pause');
    playBtn.title = 'Pausar';
    playBtn.onclick = function (e) {
      e.stopPropagation();
      var vid = modalContent.querySelector('video');
      if (!vid) return;
      if (vid.paused) {
        vid.play().catch(function () {});
        playBtn.innerHTML = svgIcon('pause');
        playBtn.title = 'Pausar';
      } else {
        vid.pause();
        playBtn.innerHTML = svgIcon('play');
        playBtn.title = 'Reproduzir';
      }
    };
    headerActions.appendChild(playBtn);

    var closeBtn = createEl('button', 'vl-close');
    closeBtn.innerHTML = svgIcon('close');
    closeBtn.title = 'Fechar';
    closeBtn.onclick = function (e) { e.stopPropagation(); closeOverlay(); };
    headerActions.appendChild(closeBtn);

    header.appendChild(headerActions);
    container.appendChild(header);

    var body = createEl('div', 'vl-body');

    if (video) {
      var player = buildVideoPlayer(video, story.id, function () {
        nextStoryOrVideo();
      });
      body.appendChild(player);

      setTimeout(function () {
        var vidEl = player.querySelector('video');
        if (vidEl) {
          vidEl.muted = false;
          vidEl.play().catch(function () {});

          vidEl.addEventListener('play', function () {
            var pb = modalContent.querySelector('#vl-play-btn');
            if (pb) { pb.innerHTML = svgIcon('pause'); pb.title = 'Pausar'; }
          });
          vidEl.addEventListener('pause', function () {
            var pb = modalContent.querySelector('#vl-play-btn');
            if (pb) { pb.innerHTML = svgIcon('play'); pb.title = 'Reproduzir'; }
          });
          vidEl.addEventListener('volumechange', function () {
            var mb = modalContent.querySelector('#vl-mute-btn');
            if (mb) {
              mb.innerHTML = vidEl.muted ? svgIcon('volumeOff') : svgIcon('volume');
              mb.title = vidEl.muted ? 'Ativar som' : 'Mudo';
            }
          });
        }
      }, 200);
    } else {
      var emptyBody = createEl('div');
      emptyBody.style.cssText = 'padding:40px;text-align:center;color:#fff;';
      emptyBody.textContent = 'Nenhum vídeo encontrado.';
      body.appendChild(emptyBody);
    }

    var nav = createEl('div', 'vl-nav');

    var prevArrow = createEl('div', 'vl-nav-arrow vl-nav-arrow-left');
    prevArrow.innerHTML = svgIcon('chevronLeft');
    prevArrow.onclick = function (e) { e.stopPropagation(); prevStoryOrVideo(); };
    nav.appendChild(prevArrow);

    var nextArrow = createEl('div', 'vl-nav-arrow vl-nav-arrow-right');
    nextArrow.innerHTML = svgIcon('chevronRight');
    nextArrow.onclick = function (e) { e.stopPropagation(); nextStoryOrVideo(); };
    nav.appendChild(nextArrow);

    var prevBtn = createEl('button', 'vl-nav-btn vl-nav-prev');
    prevBtn.onclick = function (e) { e.stopPropagation(); prevStoryOrVideo(); };
    var nextBtn = createEl('button', 'vl-nav-btn vl-nav-next');
    nextBtn.onclick = function (e) { e.stopPropagation(); nextStoryOrVideo(); };
    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);

    body.appendChild(nav);

    var social = createEl('div', 'vl-social');

    if (appearanceConfig.show_like_button && video) {
      var vidId = video.id;
      var isLiked = !!likedVideos[vidId];
      var likeCount = videoLikeCounts[vidId] || 0;
      var hasLikes = likeCount > 0;

      var likeWrapper = createEl('div', 'vl-social-wrapper');

      var likeBtn = createEl('button', 'vl-social-btn');
      likeBtn.id = 'vl-like-btn';
      likeBtn.innerHTML = svgIcon(hasLikes ? 'heartFilled' : 'heart');
      likeBtn.title = isLiked ? 'Descurtir' : 'Curtir';

      likeBtn.onclick = function (e) {
        e.stopPropagation();
        toggleLike(video, likeBtn);
      };

      likeWrapper.appendChild(likeBtn);

      var likeCountEl = createEl('span', 'vl-social-count');
      likeCountEl.textContent = likeCount > 0 ? likeCount : '';

      likeWrapper.appendChild(likeCountEl);
      social.appendChild(likeWrapper);
    }

    if (appearanceConfig.show_comment_button && video) {
      var commentCountVal = getCommentCountForVideo(video.id);

      var wrapper = createEl('div', 'vl-social-wrapper');

      var commentBtn = createEl('button', 'vl-social-btn');
      commentBtn.id = 'vl-comment-btn';
      commentBtn.innerHTML = svgIcon(
        commentCountVal > 0 ? 'commentFilled' : 'comment'
      );
      commentBtn.title = 'Comentários';

      commentBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openCommentsPanel(video.id, story.id);
      };

      wrapper.appendChild(commentBtn);

      var commentCountEl = createEl('span', 'vl-social-count');
      commentCountEl.textContent =
        commentCountVal > 0 ? commentCountVal : '';

      wrapper.appendChild(commentCountEl);
      social.appendChild(wrapper);
    }

    if (appearanceConfig.show_share_button) {
      var shareBtn = createEl('button', 'vl-social-btn');
      shareBtn.innerHTML = svgIcon('share');
      shareBtn.title = 'Compartilhar';
      shareBtn.onclick = function (e) {
        e.stopPropagation();
        openSharePanel(shareBtn);
      };
      social.appendChild(shareBtn);
    }

    if (appearanceConfig.show_sizing_button && video) {
      var sModelId = getSizingModelId(video);
      if (sModelId) {
        var sizeBtn = createEl('button', 'vl-social-btn');
        sizeBtn.innerHTML = svgIcon('sizing');
        sizeBtn.title = 'Medidas';
        sizeBtn.onclick = function (e) { e.stopPropagation(); openSizingPanel(sModelId); };
        social.appendChild(sizeBtn);
      }
    }

    body.appendChild(social);
    container.appendChild(body);

var showVerProduto = appearanceConfig.show_product !== false;
// WhatsApp segue o mesmo critério do card de produto — sem flag separada
var showWhatsAppProduto = showVerProduto;

    // 🔍 DEBUG — colar AQUI (depois das declarações)
    var videoProductId = video ? (video.product_id || video.productId) : null;
    var productData = videoProductId ? readProductsData.find(function (p) { return idsEqual(p.id, videoProductId); }) : null;
    console.log('🐛 DEBUG WHATSAPP V2:', {
      showWhatsAppProduto: showWhatsAppProduto,
      storeWhatsappNumber: storeWhatsappNumber,
      videoProductId: videoProductId,
      productDataFound: !!productData,
      productWhatsapp: productData ? (productData.whatsapp_number || productData.whatsappNumber) : null,
      modalConfigRaw: currentAppearance.modal_config
    });
    // FIM DEBUG

    if (showVerProduto || showWhatsAppProduto) {
      var videoProductId = video.product_id || (video.productId) || null;
      var productData = videoProductId ? readProductsData.find(function (p) { return idsEqual(p.id, videoProductId); }) : null;

      if (productData) {
        var priColor = getPrimaryColor(currentAppearance);
        var productUrl = productData.product_url || productData.url || '';

        var footer = createEl('div', 'vl-footer');
        var footerInner = createEl('div', 'vl-footer-inner');

        var prodCard = createEl('div', 'vl-product');
        prodCard.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:14px;background:#fff;';

        var prodImg = createEl('img', 'vl-product-img');
        prodImg.src = getThumbnailFromObject(productData) || '';
        prodImg.alt = productData.name || 'Produto';
        prodImg.style.cssText = 'width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;';
        prodCard.appendChild(prodImg);

        var prodInfo = createEl('div', 'vl-product-info');
        prodInfo.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;';

        var pName = createEl('div', 'vl-product-name');
        pName.textContent = productData.name || 'Produto';
        pName.style.cssText = 'font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        prodInfo.appendChild(pName);

        if (productData.price) {
          var pPrice = createEl('div', 'vl-product-price');
          pPrice.textContent = 'R$ ' + parseFloat(productData.price).toFixed(2).replace('.', ',');
          pPrice.style.cssText = 'font-size:15px;font-weight:800;color:' + priColor + ';';
          prodInfo.appendChild(pPrice);
        }

        var pActions = createEl('div', 'vl-product-actions');
        pActions.style.cssText = 'display:flex;gap:8px;flex-shrink:0;margin-top:4px;';

        if (showVerProduto) {
          var buyBtn = createEl('a', 'vl-product-btn');
          buyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Ver no site';
          buyBtn.href = productUrl || '#';
          buyBtn.target = '_blank';
          buyBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:8px 14px;background:' + priColor + ';color:#fff;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;';
          if (!productUrl) {
            buyBtn.style.opacity = '0.5';
            buyBtn.style.pointerEvents = 'none';
            buyBtn.title = 'URL do produto não cadastrada';
          }
          buyBtn.onclick = function (e) {
            e.stopPropagation();
            trackMetric({ event_type: 'product_click', story_id: story.id, video_id: video ? video.id : null, product_id: productData.id, page_url: window.location.href });
          };
          pActions.appendChild(buyBtn);
        }

        if (showWhatsAppProduto) {
          var waNumber = storeWhatsappNumber || productData.whatsapp_number || productData.whatsappNumber || '';
          if (waNumber) {
            var waNumberClean = waNumber.replace(/\D/g, '');
            var productName = productData.name || 'Produto';

            var waMsgRaw = storeWhatsappMessage || 'Olá! Tenho interesse no produto: {{product_name}}';
            waMsgRaw = waMsgRaw
              .replace(/\{\{story_title\}\}/g, productName)
              .replace(/\{\{product_name\}\}/g, productName)
              .replace(/\{\{product_url\}\}/g, productUrl);

            if (productUrl && waMsgRaw.indexOf(productUrl) === -1) {
              waMsgRaw += '\n\n' + productUrl;
            }

            var waBtn = createEl('a', 'vl-product-whatsapp-btn');
            waBtn.textContent = 'Comprar pelo WhatsApp';
            waBtn.href = 'https://wa.me/' + waNumberClean + '?text=' + encodeURIComponent(waMsgRaw);
            waBtn.target = '_blank';
            waBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;background:#25D366;color:#fff;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;';
            waBtn.onclick = function (e) {
              e.stopPropagation();
              trackMetric({ event_type: 'whatsapp_click', story_id: story.id, video_id: video ? video.id : null, product_id: productData.id, page_url: window.location.href });
            };
            pActions.appendChild(waBtn);
          }
        }

        prodInfo.appendChild(pActions);
        prodCard.appendChild(prodInfo);
        footerInner.appendChild(prodCard);
        footer.appendChild(footerInner);
        container.appendChild(footer);
      }
    }

    modalContent.appendChild(container);
  }

  /* ================================================================
     NAVEGAÇÃO ENTRE STORIES E VÍDEOS
     ================================================================ */

  function nextStoryOrVideo() {
    if (!currentStories || currentStories.length === 0) return;
    var story = currentStories[currentStoryIndex];
    var videos = story ? (story.videos || []) : [];

    if (currentVideoIndex < videos.length - 1) {
      currentVideoIndex++;
    } else if (currentStoryIndex < currentStories.length - 1) {
      currentStoryIndex++;
      currentVideoIndex = 0;
    } else {
      closeOverlay();
      return;
    }

    renderStoryModal();
    trackMetric({
      event_type: 'next_video',
      story_id: currentStories[currentStoryIndex].id,
      video_id: (currentStories[currentStoryIndex].videos || [])[currentVideoIndex]
        ? (currentStories[currentStoryIndex].videos || [])[currentVideoIndex].id
        : null,
      page_url: window.location.href
    });
  }

  function prevStoryOrVideo() {
    if (!currentStories || currentStories.length === 0) return;

    if (currentVideoIndex > 0) {
      currentVideoIndex--;
    } else if (currentStoryIndex > 0) {
      currentStoryIndex--;
      var prevStory = currentStories[currentStoryIndex];
      currentVideoIndex = Math.max(0, (prevStory.videos || []).length - 1);
    } else {
      return;
    }

    renderStoryModal();
  }

  /* ================================================================
     GESTOS DE TOQUE (SWIPE) NO MODAL
     ================================================================ */

  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var SWIPE_THRESHOLD = 50;
  var SWIPE_TIME_LIMIT = 300;

  function attachTouchListeners() {
    if (!modalContent) return;

    modalContent.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    modalContent.addEventListener('touchend', function (e) {
      var touchEndX = e.changedTouches[0].clientX;
      var touchEndY = e.changedTouches[0].clientY;
      var deltaX = touchEndX - touchStartX;
      var deltaY = touchEndY - touchStartY;
      var elapsed = Date.now() - touchStartTime;

      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;
      if (elapsed > SWIPE_TIME_LIMIT) return;

      var absDeltaX = Math.abs(deltaX);
      if (absDeltaX < SWIPE_THRESHOLD) return;

      if (deltaX > 0) {
        prevStoryOrVideo();
      } else {
        nextStoryOrVideo();
      }
    }, { passive: true });
  }

  /* ================================================================
     TECLAS DO TECLADO (SETAS)
     ================================================================ */

  function attachKeyboardListeners() {
    document.addEventListener('keydown', function (e) {
      if (!overlay || !overlay.classList.contains('vl-active')) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextStoryOrVideo();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevStoryOrVideo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
      }
    });
  }

  /* ================================================================
     ABERTURA DO MODAL
     ================================================================ */

function openStoryModal(storyIndex, videoIndex) {
  if (!currentStories || currentStories.length === 0) return;
  if (storyIndex === undefined || storyIndex === null) storyIndex = 0;
  currentStoryIndex = Math.max(0, Math.min(storyIndex, currentStories.length - 1));
  // Usa o videoIndex se fornecido, senão começa do 0
  if (videoIndex !== undefined && videoIndex !== null) {
    var maxVid = (currentStories[currentStoryIndex].videos || []).length - 1;
    currentVideoIndex = Math.max(0, Math.min(videoIndex, maxVid));
  } else {
    currentVideoIndex = 0;
  }
    pausePreviews();

    ensureModalStylesInLightDOM(currentAppearance);

    if (!overlay) {
      overlay = createEl('div', 'vl-overlay');
      overlay.id = 'vl-overlay';
      modalContent = createEl('div', 'vl-modal');
      overlay.appendChild(modalContent);
      document.body.appendChild(overlay);
    }

    overlay.className = 'vl-overlay vl-active';
    renderStoryModal();
    attachTouchListeners();

    trackMetric({
      event_type: 'story_open',
      story_id: currentStories[currentStoryIndex].id,
      page_url: window.location.href
    });
  }

  /* ================================================================
     FUNÇÕES AUXILIARES DE COR
     ================================================================ */

  function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    var g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    var b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha || 1) + ')';
  }

  function getBackgroundColor(appearance) {
    var raw = readAppearanceValue(appearance, ['background_color', 'backgroundColor', 'cor_fundo']);
    return sanitizeCssValue(raw, DEFAULT_APPEARANCE.background_color, 'color') || DEFAULT_APPEARANCE.background_color;
  }

  function getTextColor(appearance) {
    var raw = readAppearanceValue(appearance, ['text_color', 'textColor', 'cor_texto']);
    return sanitizeCssValue(raw, DEFAULT_APPEARANCE.text_color, 'color') || DEFAULT_APPEARANCE.text_color;
  }

  /* ================================================================
     INJEÇÃO DE ESTILOS (CSS) NO SHADOW DOM
     ================================================================ */

  function injectStyles(shadowRoot) {
    if (!shadowRoot) return;

    var styleEl = document.createElement('style');
    styleEl.textContent = getFullCSS();
    shadowRoot.appendChild(styleEl);
  }

  function getFullCSS() {
    var primary = getPrimaryColor(currentAppearance);
    var bgColor = getBackgroundColor(currentAppearance);
    var textColor = getTextColor(currentAppearance);
    var fontFamily = getFontFamily(currentAppearance);

    return [
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      '.vl-container { font-family: ' + fontFamily + '; direction: ltr; text-align: left; width:100%; max-width:100%; overflow:hidden; }',
      '.vl-bubble-list::-webkit-scrollbar { display: none; }',
      '.vl-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 999999; display: none; align-items: center; justify-content: center; overflow: hidden; opacity: 0; transition: opacity 0.3s ease; }',
      '.vl-overlay.vl-active { display: flex; opacity: 1; }',
      '.vl-modal { position: relative; width: 100%; max-width: 420px; height: 100%; max-height: 100dvh; background: #000; overflow: hidden; display: flex; flex-direction: column; }',
      '.vl-progress { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; gap: 4px; z-index: 100; }',
      '.vl-progress-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden; }',
      '.vl-progress-fill { height: 100%; background: #fff; border-radius: 3px; transition: width 0.3s linear; width: 0%; }',
      '.vl-header { position: absolute; top: 20px; left: 16px; right: 16px; z-index: 50; display: flex; align-items: center; justify-content: space-between; }',
      '.vl-header-left { flex: 1; min-width: 0; }',
      '.vl-title { font-size: 14px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.vl-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }',
      '.vl-control { width: 36px; height: 36px; border: none; background: rgba(0,0,0,0.4); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; padding: 0; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }',
      '.vl-close { width: 36px; height: 36px; border: none; background: rgba(0,0,0,0.4); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; padding: 0; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }',
      '.vl-body { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }',
      '.vl-player { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }',
      '.vl-player video { width: 100%; height: 100%; object-fit: contain; }',
      '.vl-player iframe { width: 100%; height: 100%; border: none; }',
      '.vl-cta { color: #fff; font-size: 16px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }',
      '.vl-nav { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 40; pointer-events: none; }',
      '.vl-nav-btn { position: absolute; top: 0; width: 40%; height: 100%; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; -webkit-tap-highlight-color: transparent; }',
      '.vl-nav-prev { left: 0; }',
      '.vl-nav-next { right: 0; }',
      '.vl-nav-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; z-index: 45; pointer-events: auto; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s ease; }',
      '.vl-nav-arrow-left { left: 8px; }',
      '.vl-nav-arrow-right { right: 8px; }',
      '.vl-modal:hover .vl-nav-arrow { opacity: 1; }',
      '@media (hover: none) { .vl-nav-arrow { display: none; } }',
      '.vl-social { position: absolute; right: 8px; bottom: 100px; z-index: 50; display: flex; flex-direction: column; gap: 16px; align-items: center; }',
      '.vl-social-wrapper { display: flex; flex-direction: column; align-items: center; gap: 2px; }',
      '.vl-social-btn { width: 44px; height: 44px; border: none; background: rgba(0,0,0,0.35); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; padding: 0; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); transition: transform 0.15s ease; position: relative; }',
      '.vl-social-btn:active { transform: scale(0.9); }',
      '.vl-social-count { font-size: 11px; font-weight: 700; color: #fff; text-align: center; }',
      '.vl-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px; z-index: 50; }',
      '.vl-footer-inner { width: 100%; }',
      '@keyframes vlFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }',
      '.vl-comments-panel-full { animation: vlFadeIn 0.2s ease; }',
      '.vl-comment-card:last-child { border-bottom: none; }',
      '.vl-sizing-panel-full { animation: vlFadeIn 0.2s ease; }',
      '.vl-form-btn-row { display: flex; gap: 8px; width: 100%; margin-top: 8px; }',
      '.vl-form-btn-back { flex: 1; height: 42px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #fff; color: #64748b; font-size: 14px; font-weight: 700; cursor: pointer; }',
      '.vl-form-btn-send { flex: 2; height: 42px; border: none; border-radius: 12px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }',
      '.vl-carousel-wrapper img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }',
      '.vl-carousel-item { cursor: pointer; }',
      '.vl-carousel-card { outline: none !important; -webkit-backface-visibility: hidden; backface-visibility: hidden; transform: translateZ(0); }',
      '.vl-carousel-card::after, .vl-carousel-card::before { display: none !important; }',
      '@media (max-width: 480px) { .vl-modal { max-width: 100%; border-radius: 0; } .vl-social { right: 4px; bottom: 90px; gap: 12px; } .vl-social-btn { width: 40px; height: 40px; } }'
    ].join('\n');
  }

  /* ================================================================
     ÍCONES SVG
     ================================================================ */

  function svgIcon(name) {
    var icons = {
      'volume': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
      'volumeOff': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
      'play': '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg>',
      'pause': '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>',
      'close': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      'heart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'heartFilled': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'comment': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      'commentFilled': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      'share': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
      'sizing': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path></svg>',
      'whatsapp': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.2.3-.773.966-.947 1.164-.173.198-.347.223-.648.074-.301-.15-1.27-.466-2.418-1.488-.894-.795-1.497-1.776-1.673-2.076-.176-.3-.019-.462.131-.612.135-.135.3-.347.45-.521.15-.174.2-.3.3-.5.1-.2.05-.374-.025-.524-.075-.15-.673-1.617-.923-2.214-.243-.579-.49-.5-.673-.51-.173-.008-.373-.01-.573-.01-.2 0-.524.074-.798.373-.274.3-1.047 1.02-1.047 2.49 0 1.47 1.073 2.893 1.223 3.092.15.2 2.115 3.222 5.124 4.518.715.309 1.274.493 1.71.631.718.228 1.37.196 1.887.119.57-.086 1.767-.722 2.016-1.42.249-.697.249-1.295.174-1.42-.075-.124-.274-.199-.575-.348z"></path></svg>',
      'copy': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      'check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      'chevronLeft': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      'chevronRight': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      'loader': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="20" r="17" opacity="0.2"></circle><path d="M20 3a17 17 0 0 1 17 17" stroke="currentColor"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.8s" repeatCount="indefinite"/></path></svg>'
    };
    return icons[name] || '';
  }

  /* ================================================================
     RENDERIZAÇÃO DAS BOLHAS (STORY BUBBLES)
     ================================================================ */

  function renderBubbles(container) {
    if (!container) return;
    container.innerHTML = '';

    if (!currentStories || currentStories.length === 0) {
      var emptyMsg = createEl('div');
      emptyMsg.textContent = 'Nenhum story disponível.';
      emptyMsg.style.cssText = 'font-size:14px;color:#94a3b8;text-align:center;padding:20px;';
      container.appendChild(emptyMsg);
      return;
    }

    var bubbleSize = 72;
    var bubbleGap = 12;
    var bubbleShowName = true;

    var bubbleList = createEl('div', 'vl-bubble-list');
    bubbleList.style.cssText = 'display:flex;gap:' + bubbleGap + 'px;overflow-x:auto;overflow-y:hidden;padding:4px 4px 10px 4px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;';

    var primaryColor = getPrimaryColor(currentAppearance);
    var fontFamily = getFontFamily(currentAppearance);

    currentStories.forEach(function (story, index) {
      var bubbleWrapper = createEl('div', 'vl-bubble-wrapper');
      bubbleWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;cursor:pointer;min-width:0;';

      var bubble = createEl('div', 'vl-bubble');
      var bubbleSizePx = bubbleSize + 'px';
      bubble.style.cssText = 'width:' + bubbleSizePx + ';height:' + bubbleSizePx + ';border-radius:50%;padding:3px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12);transition:transform .2s ease,box-shadow .2s ease;background:linear-gradient(135deg,' + primaryColor + ',' + adjustColor(primaryColor, -20) + ');';

      var inner = createEl('div', 'vl-bubble-inner');
      inner.style.cssText = 'width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid #fff;';

      var thumbUrl = story.cover_url || story.thumbnail_url || story.cover || story.thumbnail || '';
      if (!thumbUrl && story.videos && story.videos.length > 0) {
        var firstVideo = story.videos[0];
        thumbUrl = getVideoThumbnail(firstVideo);
      }

      if (thumbUrl) {
        var img = createEl('img', 'vl-img');
        img.src = thumbUrl;
        img.alt = story.title || 'Story';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        img.loading = 'lazy';
        img.onerror = function () {
          img.style.display = 'none';
          var fallback = createEl('span');
          fallback.textContent = (story.title || 'S').charAt(0).toUpperCase();
          fallback.style.cssText = 'font-size:' + Math.max(14, bubbleSize * 0.35) + 'px;font-weight:700;color:' + primaryColor + ';';
          inner.appendChild(fallback);
        };
        inner.appendChild(img);
      } else {
        var fallback = createEl('span');
        fallback.textContent = (story.title || 'S').charAt(0).toUpperCase();
        fallback.style.cssText = 'font-size:' + Math.max(14, bubbleSize * 0.35) + 'px;font-weight:700;color:' + primaryColor + ';';
        inner.appendChild(fallback);
      }

      bubble.appendChild(inner);
      bubbleWrapper.appendChild(bubble);

      if (bubbleShowName !== false) {
        var label = createEl('span', 'vl-bubble-label');
        label.textContent = story.title || '';
        label.style.cssText = 'font-size:11px;font-weight:600;color:#334155;max-width:' + (bubbleSize + 20) + 'px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;font-family:' + fontFamily + ';';
        bubbleWrapper.appendChild(label);
      }

      bubbleWrapper.addEventListener('click', function (e) {
        e.preventDefault();
        openStoryModal(index);
      });

      bubbleWrapper.addEventListener('mouseenter', function () {
        bubble.style.transform = 'scale(1.05)';
        bubble.style.boxShadow = '0 4px 14px rgba(0,0,0,.18)';
      });
      bubbleWrapper.addEventListener('mouseleave', function () {
        bubble.style.transform = 'scale(1)';
        bubble.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)';
      });

      bubbleList.appendChild(bubbleWrapper);
    });

    container.appendChild(bubbleList);
  }

function getWidgetDisplayMode(appearance) {
  var mode = readAppearanceValue(appearance, [
    'display_mode', 'displayMode', 'widget_type', 'widgetType', 'mode',
    'tipo_exibicao', 'tipoExibicao'
  ]);
  if (mode) {
    mode = String(mode).trim().toLowerCase();
    if (mode === 'carousel' || mode === 'carrossel') return 'carousel';
    if (mode === 'grid' || mode === 'grade') return 'grid';
    if (mode === 'floating' || mode === 'flutuante') return 'floating';
    if (mode === 'stories' || mode === 'bubbles' || mode === 'bolhas') return 'stories';
  }
  // Fallback: detecta pelo jsonb preenchido
  var carouselCfg = appearance.carousel_config;
  if (carouselCfg) {
    if (typeof carouselCfg === 'string') { try { carouselCfg = JSON.parse(carouselCfg); } catch(e) {} }
    if (carouselCfg && typeof carouselCfg === 'object' && Object.keys(carouselCfg).length > 0) {
      return 'carousel';
    }
  }
  var gridCfg = appearance.grid_config;
  if (gridCfg) {
    if (typeof gridCfg === 'string') { try { gridCfg = JSON.parse(gridCfg); } catch(e) {} }
    if (gridCfg && typeof gridCfg === 'object' && Object.keys(gridCfg).length > 0) {
      return 'grid';
    }
  }
  return 'stories';
}

function enableDragScroll(el) {
  var isDown = false;
  var startX, scrollStart;
  var moved = false;
  var DRAG_THRESHOLD = 2;
  var SPEED = 2.0;
  var currentX = 0;
  var velX = 0;
  var lastX = 0;
  var momentumId = null;
  var cards = el.querySelectorAll('.vl-carousel-item');

  function getX(e) {
    return e.touches ? e.touches[0].pageX : e.pageX;
  }

  function cancelMomentum() {
    if (momentumId) {
      cancelAnimationFrame(momentumId);
      momentumId = null;
    }
    velX = 0;
  }

function startMomentum() {
  cancelMomentum();
  if (Math.abs(velX) < 2) return; // deixa o scroll-snap nativo alinhar, sem forçar via JS
  momentumId = requestAnimationFrame(function animate() {
    velX *= 0.92;
    el.scrollLeft -= velX;
    if (Math.abs(velX) > 0.5) {
      momentumId = requestAnimationFrame(animate);
    }
  });
}

  function snapToNearest() {
    var firstItem = el.querySelector('.vl-carousel-item');
    if (!firstItem) return;
    var itemWidth = firstItem.offsetWidth;
    var track = el.querySelector('.vl-carousel-track');
    var gap = track ? parseFloat(getComputedStyle(track).gap) || 0 : 0;
    var step = itemWidth + gap;
    var targetScroll = Math.round(el.scrollLeft / step) * step;
    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }

function onStart(e) {
  cancelMomentum();
  isDown = true;
  moved = false;
  el.classList.add('is-dragging');
  el.style.cursor = 'grabbing';
  startX = getX(e);
  lastX = startX;
  scrollStart = el.scrollLeft;
  currentX = startX;
  if (e.type === 'mousedown') e.preventDefault(); // 👈 adicionar isso
}

  function onMove(e) {
    if (!isDown) return;
    var x = getX(e);
    var dx = x - startX;

    if (Math.abs(dx) > DRAG_THRESHOLD) {
      moved = true;
    }

    if (moved) {
      e.preventDefault();
      velX = x - lastX;
      lastX = x;
      currentX = x;
      var walk = (startX - x) * SPEED;
      el.scrollLeft = scrollStart + walk;
    }
  }

  function onEnd() {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('is-dragging');
    el.style.cursor = 'grab';

    if (!moved) return;
    startMomentum();
  }

  el.addEventListener('mousedown', onStart);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseup', onEnd);
  el.addEventListener('mouseleave', onEnd);
  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd);
}

function renderCarouselWidget(container, stories, appearance) {
  // Achata todos os vídeos de todas as stories em um array plano,
  // guardando referência ao story e índice do vídeo
  var allVideos = [];
  (stories || []).forEach(function (story, storyIdx) {
    var videos = story.videos || [];
    videos.forEach(function (video, videoIdx) {
      allVideos.push({
        story: story,
        storyIndex: storyIdx,
        video: video,
        videoIndex: videoIdx
      });
    });
  });

  if (allVideos.length === 0) {
    var emptyMsg = createEl('div');
    emptyMsg.textContent = 'Nenhum vídeo disponível.';
    emptyMsg.style.cssText = 'font-size:14px;color:#94a3b8;text-align:center;padding:20px;';
    container.appendChild(emptyMsg);
    return;
  }

var cfg = getCarouselConfig(appearance);
  var primaryColor = getPrimaryColor(appearance);
  var fontFamily = getFontFamily(appearance);
  var sizePx = cfg.size + 'px';
  var gapPx = cfg.spacing + 'px';

  // 🆕 CALCULA LARGURA MÁXIMA BASEADA NOS ITENS VISÍVEIS
  var visibleItems = cfg.visibleItems || 4;
var wrapperPadding = 8; // 4px left + 4px right
var wrapperMaxWidth = Math.min(
  (visibleItems * cfg.size) + ((visibleItems - 1) * cfg.spacing) + wrapperPadding,
  window.innerWidth - 32
);

  // Wrapper com scroll horizontal
  var wrapper = createEl('div', 'vl-carousel-wrapper');
  wrapper.style.cssText = [
    'max-width:' + wrapperMaxWidth + 'px;',
    'margin:0 auto;',
    'overflow-x:auto;',
    'overflow-y:hidden;',
    'padding:12px 4px 10px 4px;',
    '-webkit-overflow-scrolling:touch;',
    'scrollbar-width:none;',
    '-ms-overflow-style:none;',
    'cursor:grab;',
    'margin-top:' + cfg.marginTop + 'px;',
    'margin-bottom:' + cfg.marginBottom + 'px;'
  ].join('');

  var track = createEl('div', 'vl-carousel-track');
track.style.cssText = [
  'display:flex;',
  'gap:' + gapPx + ';',
  'width:max-content;',
  'min-width:100%;'
].join('');

  allVideos.forEach(function (item) {
    var story = item.story;
    var video = item.video;
    var storyIdx = item.storyIndex;
    var videoIdx = item.videoIndex;

var cardItem = createEl('div', 'vl-carousel-item');
cardItem.style.cssText = [
  'flex-shrink:0;',
  'width:' + sizePx + ';',
  'scroll-snap-align:start;',
  'display:flex;',
  'flex-direction:column;',
  'gap:6px;',
  'transition:transform .2s ease;'
].join('');

cardItem.style.cursor = 'pointer';

    var card = createEl('div', 'vl-carousel-card');
    var hasBorder = cfg.borderWidth > 0;
    card.style.cssText = [
      'width:100%;',
      'aspect-ratio:' + cfg.aspectRatio + ';',
      'border-radius:' + cfg.borderRadius + 'px;',
      'overflow:hidden;',
      'position:relative;',
      'background:#000;',
      'outline:none;',
      '-webkit-mask-image:-webkit-radial-gradient(white,black);',
      'mask-image:radial-gradient(white,black);',
      'border:0;',
      (hasBorder
        ? 'box-shadow:inset 0 0 0 ' + cfg.borderWidth + 'px ' + cfg.borderColor + ', 0 2px 10px rgba(0,0,0,.1);'
        : 'box-shadow:none;')
    ].join('');

    // Thumbnail do vídeo (fallback: story cover)
    var thumbUrl = getVideoThumbnail(video) ||
                   story.cover_url || story.thumbnail_url || story.cover || story.thumbnail || '';

    if (thumbUrl) {
      var img = createEl('img');
      img.src = thumbUrl;
      img.alt = video.title || story.title || '';
      img.style.cssText = [
        'width:100%;',
        'height:100%;',
        'object-fit:' + cfg.objectFit + ';',
        'display:block;'
      ].join('');
      img.loading = 'lazy';
      card.appendChild(img);
    }
    
    // Play button overlay
    if (cfg.showPlayButton) {
      var playBadge = createEl('div', 'vl-carousel-play');
      playBadge.style.cssText = [
        'position:absolute;',
        'inset:0;',
        'display:flex;',
        'align-items:center;',
        'justify-content:center;',
        'pointer-events:none;'
      ].join('');
      var playIcon = createEl('div');
      playIcon.style.cssText = [
        'width:36px;',
        'height:36px;',
        'border-radius:50%;',
        'background:rgba(0,0,0,.5);',
        'display:flex;',
        'align-items:center;',
        'justify-content:center;'
      ].join('');
      playIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"></polygon></svg>';
      playBadge.appendChild(playIcon);
      card.appendChild(playBadge);
    }

    cardItem.appendChild(card);

    // Título do story
    if (cfg.showTitle && story.title) {
      var title = createEl('span', 'vl-carousel-title');
      title.textContent = story.title;
      title.style.cssText = [
        'font-size:12px;',
        'font-weight:700;',
        'color:#334155;',
        'white-space:nowrap;',
        'overflow:hidden;',
        'text-overflow:ellipsis;',
        'text-align:center;',
        'font-family:' + fontFamily + ';',
        'max-width:' + sizePx + ';'
      ].join('');
      cardItem.appendChild(title);
    }

    // Produto vinculado ao VÍDEO
    if (cfg.showProduct) {
      var productId = video.product_id || video.productId || null;
      var productData = productId ? readProductsData.find(function (p) { return idsEqual(p.id, productId); }) : null;

      if (productData && productData.name) {
        var prodInfo = createEl('div', 'vl-carousel-product');
        prodInfo.style.cssText = [
          'text-align:center;',
          'font-family:' + fontFamily + ';',
          'max-width:' + sizePx + ';'
        ].join('');

        var pName = createEl('div');
        pName.textContent = productData.name;
        pName.style.cssText = 'font-size:11px;font-weight:600;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        prodInfo.appendChild(pName);

        if (productData.price) {
          var pPrice = createEl('div');
          pPrice.textContent = 'R$ ' + parseFloat(productData.price).toFixed(2).replace('.', ',');
          pPrice.style.cssText = 'font-size:13px;font-weight:800;color:' + primaryColor + ';';
          prodInfo.appendChild(pPrice);
        }

        cardItem.appendChild(prodInfo);
      }
    }

// 🆕 Clique no card: abre o modal completo do StoriesWidget
cardItem.addEventListener('click', function (e) {
  e.preventDefault();
  openStoryModal(item.storyIndex, item.videoIndex);

  trackMetric({
    event_type: 'play',
    story_id: story.id,
    video_id: video.id,
    page_url: window.location.href
  });
});
    // Hover
    cardItem.addEventListener('mouseenter', function () {
      cardItem.style.transform = 'translateY(-6px)';
      if (cfg.borderWidth > 0) {
        card.style.boxShadow = '0 12px 28px rgba(0,0,0,.18)';
      }
    });
    cardItem.addEventListener('mouseleave', function () {
      cardItem.style.transform = 'translateY(0)';
      if (cfg.borderWidth > 0) {
        card.style.boxShadow = '0 2px 10px rgba(0,0,0,.1)';
      } else {
        card.style.boxShadow = 'none';
      }
    });
    track.appendChild(cardItem);
  });

  wrapper.appendChild(track);
  container.appendChild(wrapper);

  enableDragScroll(wrapper);

  console.log('[Vidlytics] Carrossel renderizado com ' + allVideos.length + ' video(s).');
}

function initInlineWidget(options) {
  var targetSelector = options.target || options.anchor || '#vidlytics-stories';
  var placement = String(options.placement || 'beforeend').toLowerCase();
  var targetEl = document.querySelector(targetSelector);

  console.log('[Vidlytics] Seletor:', targetSelector);
  console.log('[Vidlytics] Posicao:', placement);
  console.log('[Vidlytics] Elemento encontrado:', targetEl);

  if (!targetEl) {
    console.warn('[Vidlytics] Container alvo "' + targetSelector + '" nao encontrado.');
    return;
  }

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;';

  if (wrapper.shadowRoot) {
    globalShadowRoot = wrapper.shadowRoot;
  } else {
    globalShadowRoot = wrapper.attachShadow({ mode: 'open' });
  }

  var container = createEl('div', 'vl-container');
  globalShadowRoot.appendChild(container);

  injectStyles(globalShadowRoot);

  if (options.stories && options.stories.length > 0) {
    currentStories = options.stories;
  }
  if (options.products && options.products.length > 0) {
    readProductsData = options.products;
  }
  if (options.sizing_models && options.sizing_models.length > 0) {
    readSizingModelsData = options.sizing_models;
  }
  if (options.comments && options.comments.length > 0) {
    readCommentsData = options.comments;
  }
  if (options.appearance) {
    currentAppearance = options.appearance;
  }

  // Posiciona com insertAdjacentElement
  if (placement === 'beforebegin' || placement === 'afterbegin' || placement === 'beforeend' || placement === 'afterend') {
    targetEl.insertAdjacentElement(placement, wrapper);
  } else if (placement === 'above') {
    targetEl.parentNode.insertBefore(wrapper, targetEl);
  } else {
    targetEl.parentNode.insertBefore(wrapper, targetEl.nextSibling);
  }

  var displayMode = getWidgetDisplayMode(currentAppearance);
  console.log('[Vidlytics] Modo de exibição detectado:', displayMode);

  if (displayMode === 'carousel') {
    renderCarouselWidget(container, currentStories, currentAppearance);
  } else if (displayMode === 'grid') {
    // Por enquanto, fallback para carrossel (grid pode ser adicionado depois)
    renderCarouselWidget(container, currentStories, currentAppearance);
  } else {
    renderBubbles(container);
  }
  attachKeyboardListeners();

  if (options.api) {
    window[options.api] = {
      open: openStoryModal,
      close: closeOverlay,
      next: nextStoryOrVideo,
      prev: prevStoryOrVideo,
      refresh: function () { renderBubbles(container); },
      setStories: function (stories) { currentStories = stories; renderBubbles(container); }
    };
  }

  trackMetric({ event_type: 'widget_init', page_url: window.location.href });

  console.log('[Vidlytics] Bubbles:', container.querySelectorAll('.vl-bubble-wrapper').length);
}

  /* ================================================================
     INICIALIZAÇÃO PRINCIPAL
     ================================================================ */

  function init(options) {
    options = options || {};
    storeId = options.store_id || options.storeId || storeId;
    supabaseUrl = options.supabase_url || options.supabaseUrl || supabaseUrl;
    supabaseAnonKey = options.supabase_key || options.supabaseKey || options.supabaseAnonKey || supabaseAnonKey;
    hasSupabase = !!(supabaseUrl && supabaseAnonKey && storeId);

    storeWhatsappNumber = options.whatsapp_number || options.whatsappNumber || storeWhatsappNumber;
    storeWhatsappMessage = options.whatsapp_message || options.whatsappMessage || storeWhatsappMessage;
    autoApproveComments = options.auto_approve_comments !== undefined
      ? options.auto_approve_comments
      : (options.autoApproveComments !== undefined ? options.autoApproveComments : false);

    if (options.stories) { currentStories = options.stories; }
    if (options.products) { readProductsData = options.products; }
    if (options.sizing_models || options.sizingModels) {
      readSizingModelsData = options.sizing_models || options.sizingModels;
    }
    if (options.comments) { readCommentsData = options.comments; }
    if (options.appearance) { currentAppearance = options.appearance; }

    var mode = String(options.mode || 'inline').toLowerCase();
    if (mode === 'floating') {
      renderFloatingWidget();
    } else {
      initInlineWidget(options);
    }
  }

  /* ================================================================
     AUTO-INICIALIZAÇÃO VIA ATRIBUTO DATA
     ================================================================ */

  function autoInit() {
    var scripts = document.querySelectorAll('script[data-vidlytics-init]');
    scripts.forEach(function (script) {
      try {
        var cfg = JSON.parse(script.getAttribute('data-vidlytics-init') || '{}');
        init(cfg);
      } catch (e) {
        console.error('[Vidlytics] Erro ao parsear configuração:', e);
      }
    });
  }

  /* ================================================================
     ARRASTAR (DRAG) DO WIDGET FLUTUANTE
     ================================================================ */

  function applyDraggable(el, appearance) {
    var behaviorConfig = getFloatingBehaviorConfig(appearance);
    if (!behaviorConfig.allowDrag) return;

    var isDragging = false;
    var startX, startY, initialRight, initialBottom;

    el.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('.vl-dismiss')) return;
      isDragging = true;
      floatingWasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = el.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      el.style.transition = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var dx = startX - e.clientX;
      var dy = startY - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        floatingWasDragged = true;
        el.style.right = (initialRight + dx) + 'px';
        el.style.bottom = (initialBottom + dy) + 'px';
        el.style.left = 'auto';
        el.style.top = 'auto';
      }
    });

    document.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false;
        el.style.transition = 'all 0.3s ease';
      }
    });

    el.addEventListener('touchstart', function (e) {
      if (e.target.closest && e.target.closest('.vl-dismiss')) return;
      if (e.touches.length !== 1) return;
      isDragging = true;
      floatingWasDragged = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      var rect = el.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      el.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!isDragging || e.touches.length !== 1) return;
      var dx = startX - e.touches[0].clientX;
      var dy = startY - e.touches[0].clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        floatingWasDragged = true;
        el.style.right = (initialRight + dx) + 'px';
        el.style.bottom = (initialBottom + dy) + 'px';
        el.style.left = 'auto';
        el.style.top = 'auto';
      }
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (isDragging) {
        isDragging = false;
        el.style.transition = 'all 0.3s ease';
      }
    });
  }

  /* ================================================================
     RENDERIZAÇÃO DO WIDGET FLUTUANTE
     ================================================================ */

  function renderFloatingWidget() {
    if (!currentAppearance) return;

    var mode = (currentAppearance.floating_mode || currentAppearance.floatingMode || 'inline').toLowerCase();
    if (mode === 'inline') return;

    if (!globalShadowRoot) {
      var shadowHost = document.createElement('div');
      shadowHost.id = 'vidlytics-floating-host';
      document.body.appendChild(shadowHost);
      globalShadowRoot = shadowHost.attachShadow({ mode: 'open' });
      injectStyles(globalShadowRoot);
    }

    var existing = globalShadowRoot.querySelector('.vidlytics-floating-widget');
    if (existing) existing.remove();

    var widget = createEl('div', 'vidlytics-floating-widget');
    var primaryColor = getPrimaryColor(currentAppearance);
    var behaviorConfig = getFloatingBehaviorConfig(currentAppearance);

    var posRight = behaviorConfig.position === 'left' ? 'auto' : '16px';
    var posLeft = behaviorConfig.position === 'left' ? '16px' : 'auto';

    widget.style.cssText =
      'position:fixed;' +
      'z-index:999998;' +
      'right:' + posRight + ';' +
      'left:' + posLeft + ';' +
      'bottom:16px;' +
      'width:auto;' +
      'transition:all 0.3s ease;' +
      'display:flex;' +
      'flex-direction:column;' +
      'align-items:flex-end;' +
      'gap:8px;';

    if (mode === 'bubble') {
      if (!currentStories || currentStories.length === 0) return;
      var story = currentStories[0];
      var thumbUrl = story.cover_url || story.thumbnail_url || story.cover || story.thumbnail || '';
      if (!thumbUrl && story.videos && story.videos.length > 0) {
        thumbUrl = getVideoThumbnail(story.videos[0]);
      }

      var bubbleBtn = createEl('div', 'vl-floating-bubble-btn');
      var bubbleSizePx = '64px';
      bubbleBtn.style.cssText =
        'width:' + bubbleSizePx + ';' +
        'height:' + bubbleSizePx + ';' +
        'border-radius:50%;' +
        'padding:3px;' +
        'cursor:pointer;' +
        'background:linear-gradient(135deg,' + primaryColor + ',' + adjustColor(primaryColor, -20) + ');' +
        'box-shadow:0 4px 14px rgba(0,0,0,.2);' +
        'transition:transform 0.2s ease,box-shadow 0.2s ease;';

      var inner = createEl('div');
      inner.style.cssText = 'width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;border:2.5px solid #fff;';

      if (thumbUrl) {
        var img = createEl('img');
        img.src = thumbUrl;
        img.alt = story.title || 'Story';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        img.loading = 'lazy';
        inner.appendChild(img);
      }

      bubbleBtn.appendChild(inner);
      bubbleBtn.addEventListener('click', function () {
        if (floatingWasDragged) { floatingWasDragged = false; return; }
        openStoryModal(0);
      });

      widget.appendChild(bubbleBtn);
      applyDraggable(bubbleBtn, currentAppearance);
    }

    globalShadowRoot.appendChild(widget);
    applyDraggable(widget, currentAppearance);
  }

  /* ================================================================
     ELEMENT PICKER COM storyId
     ================================================================ */

  function initElementPicker(token, storyId) {
    if (!token) return;
    widgetSelectToken = token;

    var overlayEl = document.createElement('div');
    overlayEl.id = 'vl-picker-overlay';
    overlayEl.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'z-index:9999997;background:rgba(0,0,0,.05);cursor:crosshair;';
    document.body.appendChild(overlayEl);

    var bannerEl = document.createElement('div');
    bannerEl.id = 'vl-picker-banner';
    bannerEl.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999998;' +
      'background:#1e293b;color:#fff;padding:12px 20px;' +
      'font-family:sans-serif;font-size:14px;font-weight:600;' +
      'text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.2);';
    bannerEl.textContent = '🎯 Clique no elemento onde o widget de stories será exibido';
    document.body.appendChild(bannerEl);

    var highlightEl = document.createElement('div');
    highlightEl.id = 'vl-picker-highlight';
    highlightEl.style.cssText =
      'position:fixed;z-index:9999996;pointer-events:none;' +
      'border:3px solid #3b82f6;border-radius:4px;' +
      'background:rgba(59,130,246,.08);display:none;transition:all .1s ease;';
    document.body.appendChild(highlightEl);

    var currentEl = null;

    overlayEl.addEventListener('mousemove', function (e) {
      overlayEl.style.display = 'none';
      var el = document.elementFromPoint(e.clientX, e.clientY);
      overlayEl.style.display = '';

      if (!el || el === overlayEl || el === bannerEl || el === highlightEl) return;

      if (el !== currentEl) {
        currentEl = el;
        highlightEl.style.display = '';
        var rect = el.getBoundingClientRect();
        highlightEl.style.top = rect.top + 'px';
        highlightEl.style.left = rect.left + 'px';
        highlightEl.style.width = rect.width + 'px';
        highlightEl.style.height = rect.height + 'px';
      }
    });

    overlayEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var el = currentEl;

      if (!el) {
        overlayEl.style.display = 'none';
        el = document.elementFromPoint(e.clientX, e.clientY);
        overlayEl.style.display = '';
      }

      if (!el || el === bannerEl || el === highlightEl || el === overlayEl) return;

      sendSelector(buildSelector(el), storyId);
      cleanupPicker(overlayEl, bannerEl, highlightEl);
    });

    overlayEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        cleanupPicker(overlayEl, bannerEl, highlightEl);
      }
    });

    overlayEl.setAttribute('tabindex', '0');
    overlayEl.focus();
  }

function sendSelector(selector, storyId) {
  var payload = { selector: selector, token: widgetSelectToken };
  if (storyId) { payload.story_id = storyId; }
  if (storeId) { payload.store_id = storeId; }

  var endpoint = 'https://api.vidlytics.com/widget-selector';
  if (supabaseUrl) {
    endpoint = supabaseUrl.replace(/\/rest\/v1.*/, '') + '/functions/v1/widget-selector';
  }

  console.log('[Vidlytics] Enviando seletor:', payload);

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function (res) {
      return res.json().then(function (data) {
        console.log('[Vidlytics] Resposta:', data);

        if (data.success) {
          alert('✅ Seletor vinculado com sucesso!\n\nVolte para o painel do Vidlytics para continuar.');

          if (window.opener) {
            window.close();
          } else {
            document.body.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;">' +
              '<div style="text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:420px;">' +
              '<div style="font-size:48px;margin-bottom:16px;">✅</div>' +
              '<h2 style="margin:0 0 8px;color:#0f172a;">Seletor vinculado!</h2>' +
              '<p style="color:#64748b;margin:0;">Volte para o painel do <strong>Vidlytics</strong> para continuar.</p>' +
              '</div></div>';
          }
        } else {
          alert('❌ Erro: ' + (data.message || data.error || 'Falha ao salvar.'));
        }
      });
    })
    .catch(function (err) {
      console.error('[Vidlytics] Erro de rede:', err);
      alert('❌ Erro de conexão. Tente novamente.');
    });
}

function cleanupPicker(overlayEl, bannerEl, highlightEl) {
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    if (highlightEl && highlightEl.parentNode) highlightEl.parentNode.removeChild(highlightEl);
    widgetSelectToken = null;
    document.body.style.cursor = '';
  }

  function buildSelector(el) {
    if (!el) return '';
    var path = [];
    while (el && el !== document.body && el !== document.documentElement) {
      var selector = el.tagName ? el.tagName.toLowerCase() : '';
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      }
      if (el.className && typeof el.className === 'string') {
        var classes = el.className.trim().split(/\s+/).filter(function (c) { return c && !c.startsWith('vl-'); });
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      var parent = el.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (s) {
          return s.tagName === el.tagName;
        });
        if (siblings.length > 1) {
          var index = siblings.indexOf(el) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  /* ================================================================
     INICIALIZAÇÃO DO WIDGET (COM story_id DA URL)
     ================================================================ */

function initWidget() {
  var _urlParams = new URLSearchParams(window.location.search);
  var _selectorToken = _urlParams.get('widgetSelectToken') || null;
  var storyIdFromUrl = _urlParams.get('widgetSelectStoryId') || null;

  if (_selectorToken) {
    initElementPicker(_selectorToken, storyIdFromUrl);
    return;
  }

  readAppearance().then(function (appearance) {
    currentAppearance = appearance;

    return readStoreSettings().then(function (settings) {
      autoApproveComments = settings.auto_approve_comments === true || settings.auto_approve_comments === 'true';
      storeWhatsappNumber = settings.whatsapp_number || '';
      storeWhatsappMessage = settings.whatsapp_message || '';
    }).catch(function () {}).then(function () {
      return readStories();
    }).then(function (stories) {
      currentStories = stories || [];

      // 🔧 Buscar story_videos e videos, depois juntar tudo
      console.log('[Vidlytics] Buscando videos vinculados aos stories...');
      return Promise.all([
        readStoryVideos(),
        readVideos()
      ]).then(function (results) {
        var storyVideosData = results[0] || [];
        var videosData = results[1] || [];

        console.log('[Vidlytics] story_videos encontrados:', storyVideosData.length);
        console.log('[Vidlytics] videos encontrados:', videosData.length);

        currentStories = joinStoriesWithVideos(currentStories, storyVideosData, videosData);

        console.log('[Vidlytics] Total de stories com videos:', currentStories.filter(function(s) {
          return s.videos && s.videos.length > 0;
        }).length);

        return readProducts();
      });
    }).then(function (products) {
      readProductsData = products || [];
      return readSizingModels();
    }).then(function (models) {
      readSizingModelsData = models || [];
      return readComments();
    }).then(function (comments) {
      readCommentsData = comments || [];
      return readLikesFromDb();
    }).then(function (likes) {
      likedVideos = likes.likedVideos || {};
      videoLikeCounts = likes.likeCounts || {};

      // 🆕 LER DISPLAY LOCATIONS E INJETAR CARROSSEL NOS SELETORES
      if (!storeId || !hasSupabase) return Promise.resolve();

      return readDisplayLocations().then(function (locations) {
        return readPageRules().then(function (rules) {
          var activeLocations = locations.filter(function (loc) {
            return loc.active !== false && loc.active !== 'false' && loc.active !== 0 && loc.active !== '0';
          });

          activeLocations.forEach(function (location) {
            var locStoryId = location.story_id;
            if (!locStoryId) return;

            var story = currentStories.find(function (s) { return idsEqual(s.id, locStoryId); });
            if (!story) {
              console.warn('[Vidlytics] Story nao encontrada para location:', locStoryId);
              return;
            }

            var storyRules = rules.filter(function (r) {
              return idsEqual(r.story_id, locStoryId);
            });

            if (storyRules.length > 0) {
              var hasMatch = storyRules.some(function (rule) { return matchesRule(rule); });
              if (!hasMatch) {
                console.log('[Vidlytics] Nenhuma regra bateu para location, pulando.');
                return;
              }
            }

            var selector = location.selector;
            var position = location.position || 'beforeend';

            if (selector) {
              console.log('[Vidlytics] Injetando carrossel no seletor:', selector, 'posicao:', position);
              initInlineWidget({
                target: selector,
                placement: position,
                stories: [story],
                products: readProductsData,
                sizing_models: readSizingModelsData,
                comments: readCommentsData,
                appearance: currentAppearance
              });
            }
          });
        });
      });
    }).then(function () {
      // Renderiza widget flutuante se habilitado
      if (enableFloating) {
        renderFloatingWidget();
      }
    }).catch(function (err) {
      console.warn('[Vidlytics] Erro na inicialização:', err);
    });
  }).catch(function (err) {
    console.warn('[Vidlytics] Erro ao carregar aparência:', err);
  });
  }

initWidget();

})();