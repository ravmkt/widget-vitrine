(function () {
  var WIDGET_VERSION = '2026.07.29-35';

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

  var currentAppearance = {};
  var overlay = null;
  var modalContent = null;
  var globalShadowRoot = null;
  var floatingWasDragged = false;
  var floatingWasClosed = false;
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
    carousel_size: '30',
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
    grid_size: '30',
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
    return readAppearanceValue(appearance, ['primary_color', 'primaryColor', 'cor_primaria']) || DEFAULT_APPEARANCE.primary_color;
  }

  function getSecondaryColor(appearance) {
    return readAppearanceValue(appearance, ['secondary_color', 'secondaryColor', 'cor_secundaria']) || DEFAULT_APPEARANCE.secondary_color;
  }

  function getBorderColor(appearance) {
    var jsonbVal = readJsonbConfigValue(appearance, 'floating_config', 'border_color');
    if (jsonbVal && String(jsonbVal).trim() !== '') return jsonbVal;
    var flatVal = readDeviceValue(appearance, 'floating_border_color');
    if (flatVal && String(flatVal).trim() !== '') return flatVal;
    return getPrimaryColor(appearance);
  }

  function getButtonColor(appearance) {
    return readAppearanceValue(appearance, ['button_color', 'buttonColor', 'btn_color', 'cor_botao']) || getPrimaryColor(appearance);
  }

  function getFontFamily(appearance) {
    return readAppearanceValue(appearance, ['font_family', 'fontFamily', 'fonte']) || DEFAULT_APPEARANCE.font_family;
  }

  function normalizeModalAppearanceConfig(appearance) {
    appearance = appearance || {};
    return {
      show_title: readConfigValue(appearance, 'modal_config', 'show_title', 'modal_show_title', true),
      show_play_button: readConfigValue(appearance, 'modal_config', 'show_play_button', 'modal_show_play_button', true),
      show_product: readConfigValue(appearance, 'modal_config', 'show_product', 'modal_show_product', true),
      show_product_button: readConfigValue(appearance, 'modal_config', 'show_product_button', 'modal_show_product_button', true),
      show_like_button: readConfigValue(appearance, 'modal_config', 'show_like_button', 'modal_show_like_button', true),
      show_comment_button: readConfigValue(appearance, 'modal_config', 'show_comment_button', 'modal_show_comment_button', true),
      show_share_button: readConfigValue(appearance, 'modal_config', 'show_share_button', 'modal_show_share_button', true),
      show_whatsapp_button: readConfigValue(appearance, 'modal_config', 'show_whatsapp_button', 'modal_show_whatsapp_button', true),
      show_sizing_button: readConfigValue(appearance, 'modal_config', 'show_sizing_button', 'modal_show_sizing_button', true),
      hide_stories: readConfigValue(appearance, 'modal_config', 'hide_stories', 'modal_hide_stories', false),
      shadow_enabled: readConfigValue(appearance, 'modal_config', 'shadow_enabled', 'modal_shadow_enabled', true),
      border_color: readConfigValue(appearance, 'modal_config', 'border_color', 'modal_border_color', ''),
      border_width: readConfigValue(appearance, 'modal_config', 'border_width', 'modal_border_width', ''),
      border_radius: readConfigValue(appearance, 'modal_config', 'border_radius', 'modal_border_radius', '')
    };
  }

  function trackMetric(metric) {
    metric = metric || {};
    var payload = {
      store_id: storeId || null,
      story_id: metric.story_id || null,
      video_id: metric.video_id || null,
      product_id: metric.product_id || null,
      event_type: String(metric.event_type || 'unknown'),
      page_url: metric.page_url || window.location.href,
      device_type: getDevice(),
      browser: navigator.userAgent,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      metadata: {},
      created_at: new Date().toISOString()
    };
    var fallbackMetrics = getStorageItem('vidlytics_metrics', []);
    if (!Array.isArray(fallbackMetrics)) fallbackMetrics = [];
    fallbackMetrics.push(payload);
    setStorageItem('vidlytics_metrics', fallbackMetrics);
    if (!hasSupabase) return Promise.resolve({ saved: false, local: true, payload: payload });
    return supabaseFetch('metrics', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    })
      .then(function (response) { if (response.ok) return { saved: true, payload: payload }; return { saved: false, payload: payload }; })
      .catch(function () { return { saved: false, payload: payload }; });
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
    return fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&active=is.true');
  }

  function readDisplayLocations() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_display_locations', []));
    return fetchJson('display_locations?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&active=is.true');
  }

  function readLikesFromDb() {
    return Promise.resolve([]);
  }

  function readSizingModels() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_sizing_models', []));
    return fetchJson('sizing_models?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

function readStoreSettings() {
  if (!storeId || !hasSupabase) return Promise.resolve({});
  return supabaseFetch(
    'store_settings?select=auto_approve_comments,whatsapp_number,whatsapp_message&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1',
    { method: 'GET' }
  )
    .then(function (response) { if (!response.ok) return {}; return response.json(); })
    .then(function (data) { return Array.isArray(data) && data.length > 0 ? data[0] : {}; })
    .catch(function () { return {}; });
}

  function matchesRule(rule) {
    if (!rule || rule.active === false) return false;
    var href = window.location.href;
    var path = window.location.pathname || '/';
    var rawCondition = String(firstDefined(rule.condition_type, rule.rule_type, rule.match_type) || '').trim().toLowerCase();
    var conditionType = rawCondition.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (conditionType.indexOf('contem') !== -1 || conditionType === 'url_contains') conditionType = 'contains';
    if (conditionType.indexOf('exata') !== -1 || conditionType === 'url_equals' || conditionType === 'exact') conditionType = 'equals';
    if (conditionType.indexOf('todas') !== -1 || conditionType === 'all') conditionType = 'all_pages';
    if (conditionType.indexOf('inicial') !== -1 || conditionType === 'home') conditionType = 'home_only';
    var value = String(firstDefined(rule.url_pattern, rule.page_url, rule.value) || '').trim();
    if (!conditionType) return true;
    if (!value && conditionType !== 'all_pages' && conditionType !== 'home_only') return false;
    switch (conditionType) {
      case 'all_pages': return true;
      case 'home_only': return path === '/' || path === '/home' || path === '/index.html' || path === '';
      case 'product_pages': return path.indexOf('/product') !== -1 || path.indexOf('/produto') !== -1;
      case 'category_pages': return path.indexOf('/category') !== -1 || path.indexOf('/categoria') !== -1 || path.indexOf('/colecao') !== -1;
      case 'contains': return href.indexOf(value) !== -1 || path.indexOf(value) !== -1;
      case 'equals': return href === value || path === value;
      case 'not_equals': return href !== value && path !== value;
      case 'starts_with': return href.indexOf(value) === 0 || path.indexOf(value) === 0;
      case 'ends_with': return href.endsWith(value) || path.endsWith(value);
      case 'regex': try { return new RegExp(value).test(href); } catch (e) { return false; }
      default: return true;
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

  function isDirectVideoUrl(url) { return url && VIDEO_FILE_REGEX.test(url); }

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
    var shadow = modalConfig.shadow_enabled !== false ? '0 24px 80px rgba(15,23,42,.24)' : 'none';
    return (
      '*,*::before,*::after{box-sizing:border-box!important;}'
      + '.vl-overlay{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(15,23,42,.62)!important;display:none!important;align-items:center!important;justify-content:center!important;z-index:' + cfg.zIndex + '!important;font-family:' + font + '!important;font-size:' + toNumber(fontSize, 14) + 'px!important;}'
      + '.vl-overlay.is-open{display:flex!important;}'
      + '.vl-modal{position:relative!important;width:100%!important;max-width:420px!important;height:100%!important;min-height:0!important;max-height:100vh!important;overflow:hidden!important;background:' + modalBackground + '!important;box-shadow:' + shadow + '!important;display:flex!important;flex-direction:column!important;border-radius:0!important;color:' + modalText + '!important;}'
      + '.vl-modal>div:not(.vl-comments-panel-full):not(.vl-sizing-panel-full){position:relative!important;display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;width:100%!important;height:100%!important;}'
      + '@media(min-width:640px){.vl-modal{height:auto!important;aspect-ratio:9/16!important;max-height:90vh!important;border-radius:36px!important;}}'
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
+ '.vl-social{position:absolute!important;top:78%!important;right:12px!important;transform:translateY(-50%)!important;z-index:45!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:12px!important;}'
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

// CABEÇALHO
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

// CORPO
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

// CARD DE COMENTÁRIO
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

// ESTADO VAZIO
+ '.vl-empty-state{'
+ 'display:flex!important;flex-direction:column!important;'
+ 'align-items:center!important;justify-content:center!important;'
+ 'flex:1!important;min-height:180px!important;padding:20px!important;text-align:center!important;'
+ '}'
+ '.vl-empty-state p{font-size:15px!important;font-weight:700!important;color:#334155!important;margin:0!important;}'

// RODAPÉ
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

// FORMULÁRIO
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

// BOTÕES DO FORM
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
      + '.vl-modal.has-comments-open{'
      + 'height:100%!important;'
      + 'max-height:90vh!important;'
      + 'border-radius:36px!important;'
      + '}'
      + '}'
    );
  }

  function buildFloatingCss(appearance, behaviorConfig) {
    behaviorConfig = behaviorConfig || getFloatingBehaviorConfig(appearance);
    var cfg = getFloatingConfig(appearance);
    var primary = getPrimaryColor(appearance);
    var secondary = getSecondaryColor(appearance);
    var borderColor = getBorderColor(appearance);
    var borderBackground = borderColor ? borderColor : 'linear-gradient(135deg,' + primary + ',' + secondary + ')';
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

  function buildVideoPlayer(video, storyId, onEnded) {
    var url = getVideoUrl(video);
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

  // Atualiza o visual do botão
  var isNowLiked = !!likedVideos[vidId];
  var count = videoLikeCounts[vidId] || 0;
  btnEl.innerHTML = svgIcon(isNowLiked ? 'heartFilled' : 'heart');
  btnEl.title = isNowLiked ? 'Descurtir' : 'Curtir';

  // Atualiza o contador no span irmão (fora do botão)
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

  // ── PAINEL ──
  var panel = createEl('div', 'vl-sizing-panel-full');
  panel.style.cssText = [
    'position:absolute;','top:8px;','right:8px;','bottom:8px;','left:8px;',
    'width:auto;','height:auto;','max-height:none;','z-index:200;',
    'display:flex;','flex-direction:column;','overflow:hidden;',
    'box-sizing:border-box;','background:#fff;',
    'border:2px solid ' + primaryColor + ';','border-radius:20px;',
    'box-shadow:0 12px 30px rgba(0,0,0,.35);','font-family:' + fontFamily + ';',
    'animation:vlSlideUp .25s ease;'
  ].join('');

  // ── CABEÇALHO ──
  var panelHeader = createEl('div', 'vl-panel-header');
  panelHeader.style.cssText = [
    'display:flex;','align-items:center;','justify-content:space-between;',
    'height:48px;','min-height:48px;','padding:0 14px;',
    'border-bottom:1px solid #e2e8f0;','background:#fff;',
    'box-sizing:border-box;','flex-shrink:0;'
  ].join('');

  var panelTitle = createEl('h3');
  panelTitle.textContent = 'Medidas';
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

  // ── CORPO ──
  var panelBody = createEl('div', 'vl-panel-body');
  panelBody.style.cssText = [
    'flex:1 1 auto;','min-height:0;','overflow-y:auto;','overflow-x:hidden;',
    'padding:16px 18px;','display:flex;','flex-direction:column;',
    'box-sizing:border-box;','-webkit-overflow-scrolling:touch;'
  ].join('');

  // Nome da modelo
  var modelName = createEl('div');
  modelName.textContent = model.name || 'Modelo';
  modelName.style.cssText = 'font-size:15px;font-weight:800;color:#0f172a;margin-bottom:2px;';
  panelBody.appendChild(modelName);

  // Tag de tamanho
  if (model.size_name) {
    var sizeTag = createEl('div');
    sizeTag.style.cssText = 'display:inline-block;background:#f1f5f9;color:' + primaryColor + ';font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:20px;align-self:flex-start;';
    sizeTag.textContent = 'Veste: ' + model.size_name;
    panelBody.appendChild(sizeTag);
  } else {
    var spacer = createEl('div');
    spacer.style.cssText = 'height:12px;';
    panelBody.appendChild(spacer);
  }

  // Tabela de medidas
  var measures = [];
  try {
    measures = typeof model.measures === 'string' ? JSON.parse(model.measures) : (model.measures || []);
  } catch (e) {}

  if (measures && measures.length > 0) {
    var table = createEl('table');
    table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:0 6px;';

    measures.forEach(function (m) {
      var label = m.name || m.label || '';
      var val = m.value || '';
      var unit = m.unit || '';
      if (!label || !val) return;

      var tr = createEl('tr');

      var td1 = createEl('td');
      td1.textContent = label;
      td1.style.cssText = 'padding:14px 16px;font-size:14px;font-weight:600;color:#475569;background:#f8fafc;border-radius:12px 0 0 12px;';

      var td2 = createEl('td');
      td2.textContent = val + (unit ? ' ' + unit : '');
      td2.style.cssText = 'padding:14px 16px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;background:#f8fafc;border-radius:0 12px 12px 0;';

      tr.appendChild(td1);
      tr.appendChild(td2);
      table.appendChild(tr);
    });

    panelBody.appendChild(table);
  } else {
    var emptyWrap = createEl('div', 'vl-empty-state');
    emptyWrap.style.cssText = [
      'display:flex;','flex-direction:column;','align-items:center;',
      'justify-content:center;','flex:1;','min-height:160px;',
      'padding:20px;','text-align:center;'
    ].join('');

    var emptyIcon = createEl('div');
    emptyIcon.innerHTML = svgIcon('sizing');
    emptyIcon.style.cssText = 'opacity:.12;margin-bottom:12px;';

    var emptyTitle = createEl('p');
    emptyTitle.textContent = 'Nenhuma medida cadastrada';
    emptyTitle.style.cssText = 'font-size:15px;font-weight:700;color:#334155;margin:0;';

    emptyWrap.appendChild(emptyIcon);
    emptyWrap.appendChild(emptyTitle);
    panelBody.appendChild(emptyWrap);
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

  // ── PAINEL ──
  var panel = createEl('div', 'vl-comments-panel-full');
  panel.style.cssText = [
    'position:absolute;','top:8px;','right:8px;','bottom:8px;','left:8px;',
    'width:auto;','height:auto;','max-height:none;','z-index:200;',
    'display:flex;','flex-direction:column;','overflow:hidden;',
    'box-sizing:border-box;','background:#fff;',
    'border:2px solid ' + primaryColor + ';','border-radius:20px;',
    'box-shadow:0 12px 30px rgba(0,0,0,.35);','font-family:' + fontFamily + ';'
  ].join('');

  // ── CABEÇALHO ──
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

  // ── CORPO (área rolável) ──
var panelBody = createEl('div', 'vl-panel-body');
  panelBody.style.cssText = [
    'flex:1 1 auto;','min-height:0;','overflow-y:auto;','overflow-x:hidden;',
    'padding:0;','display:flex;','flex-direction:column;',
    'box-sizing:border-box;','-webkit-overflow-scrolling:touch;'
  ].join('');

  // ── RODAPÉ ──
var panelFooter = createEl('div', 'vl-panel-footer');
  panelFooter.style.cssText = [
    'flex:0 0 auto;','width:100%;','border-top:1px solid #e2e8f0;',
    'padding:12px 14px 10px;','background:#fff;','box-sizing:border-box;',
    'position:relative;','z-index:6;','display:flex;','justify-content:center;'
  ].join('');

  // ═══════════════════════════════════
  //  FUNÇÕES INTERNAS
  // ═══════════════════════════════════

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

    var emojiRow = createEl('div');
    emojiRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;position:relative;';

    var emojiToggle = createEl('button');
    emojiToggle.type = 'button'; emojiToggle.textContent = '😊';
    emojiToggle.style.cssText = 'width:32px;height:32px;padding:0;border:1px solid #e2e8f0;border-radius:50%;background:#fff;color:#64748b;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;';

    var emojiGrid = createEl('div');
    emojiGrid.style.cssText = 'display:none;position:absolute;left:0;bottom:36px;grid-template-columns:repeat(6,34px);gap:4px;width:max-content;max-width:230px;padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);z-index:30;';

    var emojiList = ['😍','🔥','👏','❤️','😂','😱','🙌','💯','✨','😢','🤔','👍','💪','🎉','😊','🥰','😎','🙏','💙','⭐','✅','😡','👀','🤩'];

    emojiList.forEach(function (emoji) {
      var emojiBtn = createEl('button');
      emojiBtn.type = 'button'; emojiBtn.textContent = emoji;
      emojiBtn.style.cssText = 'width:34px;height:34px;border:none;background:transparent;border-radius:8px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      emojiBtn.onmouseenter = function () { emojiBtn.style.background = '#f1f5f9'; emojiBtn.style.transform = 'scale(1.12)'; };
      emojiBtn.onmouseleave = function () { emojiBtn.style.background = 'transparent'; emojiBtn.style.transform = 'scale(1)'; };
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

    emojiRow.appendChild(emojiToggle);
    emojiRow.appendChild(emojiGrid);
    formWrap.appendChild(emojiRow);

    var charCounter = createEl('div', 'vl-form-charcount');
    charCounter.textContent = '0/1000';
    commentTextarea.addEventListener('input', function () {
      charCounter.textContent = commentTextarea.value.length + '/1000';
    });
    formWrap.appendChild(charCounter);

    var statusMsg = createEl('div', 'vl-form-status');
    formWrap.appendChild(statusMsg);

    panelBody.appendChild(formWrap);

    // ── Botões: Voltar + Enviar ──
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
    panelFooter.appendChild(btnRow);

    document.addEventListener('mousedown', function closeEmoji(ev) {
      if (emojiGrid.style.display === 'grid' && !emojiRow.contains(ev.target)) {
        emojiGrid.style.display = 'none';
        document.removeEventListener('mousedown', closeEmoji);
      }
    });

    setTimeout(function () { nameInput.focus(); }, 200);
  }

  function renderInitialState() {
    commentsCount = getCommentCountForVideo(videoId);
    panelTitle.textContent = 'Comentários' + (commentsCount > 0 ? ' (' + commentsCount + ')' : '');
    if (commentsCount > 0) { renderCommentList(); } else { renderEmptyState(); }
    renderCommentButton();
  }

  // ── INICIALIZA ──
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

    if (appearanceConfig.show_whatsapp_button) {
      var wpBtn = createEl('button', 'vl-social-btn whatsapp');
      wpBtn.innerHTML = svgIcon('whatsapp');
      wpBtn.title = 'WhatsApp';
      wpBtn.onclick = function (e) {
        e.stopPropagation();
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(window.location.href), '_blank');
      };
      social.appendChild(wpBtn);
    }

    body.appendChild(social);
    container.appendChild(body);

if (appearanceConfig.show_product) {
  var videoProductId = video.product_id || (video.productId) || null;
  var productData = videoProductId ? readProductsData.find(function (p) { return idsEqual(p.id, videoProductId); }) : null;

  if (productData) {
    var priColor = (appearanceConfig.primary_color || '#6C5CE7');
    var productUrl = productData.product_url || productData.url || '';

    var footer = createEl('div', 'vl-footer');
    var footerInner = createEl('div', 'vl-footer-inner');

    var prodCard = createEl('div', 'vl-product');
    prodCard.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:14px;background:#fff;';

    // Miniatura
    var prodImg = createEl('img', 'vl-product-img');
    prodImg.src = getThumbnailFromObject(productData) || '';
    prodImg.alt = productData.name || 'Produto';
    prodImg.style.cssText = 'width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;';
    prodCard.appendChild(prodImg);

    // Info: nome + preço + botões
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

    // Botões
    var pActions = createEl('div', 'vl-product-actions');
    pActions.style.cssText = 'display:flex;gap:8px;flex-shrink:0;margin-top:4px;';

    // Botão "Ver no site"
    var buyBtn = createEl('a', 'vl-product-btn');
    buyBtn.textContent = 'Ver no site';
    buyBtn.href = productUrl || '#';
    buyBtn.target = '_blank';
    buyBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;background:' + priColor + ';color:#fff;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;';
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

    // Botão "Comprar pelo WhatsApp"
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

    prodInfo.appendChild(pActions);
    prodCard.appendChild(prodInfo);
    footerInner.appendChild(prodCard);
    footer.appendChild(footerInner);
    container.appendChild(footer);
  }
}

    modalContent.appendChild(container);
  }

  function nextStoryOrVideo() {
    var story = currentStories[currentStoryIndex];
    if (story && story.videos && currentVideoIndex < story.videos.length - 1) {
      currentVideoIndex++; renderStoryModal();
    } else if (currentStoryIndex < currentStories.length - 1) {
      currentStoryIndex++; currentVideoIndex = 0; renderStoryModal();
    } else {
      closeOverlay();
    }
  }

  function prevStoryOrVideo() {
    if (currentVideoIndex > 0) {
      currentVideoIndex--; renderStoryModal();
    } else if (currentStoryIndex > 0) {
      currentStoryIndex--;
      var prevStory = currentStories[currentStoryIndex];
      currentVideoIndex = prevStory && prevStory.videos ? Math.max(0, prevStory.videos.length - 1) : 0;
      renderStoryModal();
    }
  }

  function openStoryViewer(stories, storyIndex, videoIndex) {
    currentStories = stories;
    currentStoryIndex = storyIndex || 0;
    currentVideoIndex = (videoIndex !== undefined && videoIndex !== null) ? videoIndex : 0;

    if (!globalShadowRoot) {
      var shadowData = getOrCreateShadowRoot(currentAppearance || {});
      globalShadowRoot = shadowData.shadow;
      var style = createEl('style');
      style.textContent = buildFloatingCss(currentAppearance || {});
      globalShadowRoot.appendChild(style);
    }

    if (!overlay) {
      overlay = createEl('div', 'vl-overlay');
      modalContent = createEl('div', 'vl-modal');
      overlay.appendChild(modalContent);
      globalShadowRoot.appendChild(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeOverlay();
      });
    }

    pausePreviews();
    overlay.className = 'vl-overlay is-open';
    renderStoryModal();
  }

  function svgIcon(name) {
    var icons = {
      'volume': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
      'volumeOff': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
      'play': '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      'pause': '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      'close': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      'heart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'heartFilled': '<svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'comment': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
'commentFilled': '<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      'share': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
'sizing': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="8" y1="8" x2="12" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/><line x1="12" y1="4" x2="12" y2="20" stroke-width="1" opacity="0.4"/></svg>',
      'whatsapp': '<svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"></path></svg>',
      'copy': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      'check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    };
    return icons[name] || '';
  }

  function applyDraggable(el, appearance) {
    var behaviorConfig = getFloatingBehaviorConfig(appearance);
    if (!behaviorConfig.allowDrag) return;
    var isDragging = false;
    var startX, startY, initialRight, initialBottom;
    el.addEventListener('mousedown', function (e) {
      if (e.target.closest('.vl-dismiss')) return;
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
  }

  function renderInlineWidget(stories, appearance, format) {
    if (!stories || !stories.length) return;

    var allVideoItems = [];
    stories.forEach(function (story, sIdx) {
      var videos = story.videos || [];
      videos.forEach(function (video, vIdx) {
        allVideoItems.push({ story: story, storyIndex: sIdx, video: video, videoIndex: vIdx });
      });
    });
    if (!allVideoItems.length) return;

    var cfg;
    if (format === 'grid' || format === 'grade') { cfg = getGridConfig(appearance); cfg.isGrid = true; }
    else { cfg = getCarouselConfig(appearance); cfg.isGrid = false; }

    var itemsVisiveis = cfg.isGrid ? cfg.columns : cfg.visibleItems;
    var espacamento = cfg.spacing;
    var corPrimaria = appearance.primary_color || appearance.button_color || '#0094EB';
    var corTexto = appearance.text_color || '#0F172A';
    var fonte = appearance.font_family || 'Inter, sans-serif';

    var cardSizeVw = cfg.size;
    var cardWidth = cardSizeVw + 'vw';
    var cardSizePx = Math.round(cardSizeVw * window.innerWidth / 100);
    var minCardWidth = Math.min(30, cardSizePx) + 'px';
    var boxBorderRadius = cfg.shape === 'circle' ? '50%' : cfg.borderRadius + 'px';

    var effectiveItems = (cfg.autoCenter && allVideoItems.length < itemsVisiveis) ? allVideoItems.length : itemsVisiveis;
    var totalGap = espacamento * (effectiveItems - 1);
    var containerMaxWidth = 'min(100vw, calc((' + cardWidth + ' * ' + effectiveItems + ') + ' + totalGap + 'px + 8px))';

    var dbSelector = appearance.css_selector || appearance.inline_selector || appearance.display_selector || appearance.selector || '';
    var selectorsToTry = [];
    if (dbSelector) selectorsToTry.push(dbSelector);
    selectorsToTry.push('#vidlytics-carousel-root'); selectorsToTry.push('#instory-root');
    selectorsToTry.push('.category-content'); selectorsToTry.push('#main');
    selectorsToTry.push('main'); selectorsToTry.push('[role="main"]'); selectorsToTry.push('body');

    var maxRetries = 25, currentRetries = 0;

    var renderInterval = setInterval(function () {
      var targetDiv = null; var usedSelector = ''; currentRetries++;
      for (var i = 0; i < selectorsToTry.length; i++) { try { targetDiv = document.querySelector(selectorsToTry[i]); if (targetDiv) { usedSelector = selectorsToTry[i]; break; } } catch (e) {} }
      if (!targetDiv) { if (currentRetries >= maxRetries) { clearInterval(renderInterval); } return; }
      clearInterval(renderInterval);

      var wrapperId = 'vl-carousel-wrapper-final';
      var widgetContainer = document.getElementById(wrapperId);
      if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        widgetContainer.id = wrapperId;
        var wrapperCss = 'max-width:' + containerMaxWidth + ';margin:20px auto;display:block;clear:both;overflow:visible;';
        if (cfg.autoCenter && allVideoItems.length < itemsVisiveis) {
          wrapperCss = 'display:flex;justify-content:center;max-width:' + containerMaxWidth + ';margin:20px auto;clear:both;overflow:visible;';
        }
        widgetContainer.style.cssText = wrapperCss;
        if (usedSelector.indexOf('.flex-.between') !== -1 && targetDiv.parentNode) {
          targetDiv.parentNode.insertBefore(widgetContainer, targetDiv.nextSibling);
        } else { targetDiv.appendChild(widgetContainer); }
      }

      widgetContainer.innerHTML = '';
      var gapPx = espacamento;
      var overflowX = cfg.isGrid ? 'hidden' : 'auto';

      var estilo = document.createElement('style');
      estilo.textContent = [
        '#' + wrapperId + ' { font-family: ' + fonte + ', sans-serif; overflow: visible !important; }',
        '#' + wrapperId + ' * { box-sizing: border-box !important; }',
        '.vl-slider-container {',
        '  display: flex !important; flex-wrap: ' + (cfg.isGrid ? 'wrap' : 'nowrap') + ' !important;',
        '  gap: ' + gapPx + 'px;',
        '  overflow-x: ' + overflowX + ' !important; overflow-y: hidden !important;',
        '  scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;',
        '  scrollbar-width: none !important; -ms-overflow-style: none !important;',
        '  padding: 0 4px; width: 100%; max-width: 100%;',
        '  cursor: ' + (cfg.isGrid ? 'auto' : 'grab') + '; user-select: none; -webkit-user-select: none;',
        (cfg.autoCenter && allVideoItems.length < itemsVisiveis ? 'justify-content: center;' : ''),
        '}',
        '.vl-slider-container::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }',
        '.vl-slider-container:active { cursor: grabbing; }',
        '.vl-slider-container.dragging { cursor: grabbing !important; scroll-snap-type: none !important; }',
        '.vl-card-item {',
        '  all: unset; display: flex !important; flex-direction: column; cursor: pointer;',
        '  scroll-snap-align: start; flex: 0 0 ' + cardWidth + ' !important;',
        '  min-width: ' + minCardWidth + '; max-width: ' + cardWidth + ';',
        '  position: relative; transition: transform 0.2s ease; user-select: none; -webkit-user-select: none;',
        '  pointer-events: auto;',
        '}',
        '.vl-card-item:hover { transform: translateY(-2px); }',
        '@media (max-width: 768px) { .vl-card-item { flex: 0 0 min(45vw, ' + cardWidth + ') !important; min-width: 40px; max-width: 48vw; } }',
        '.vl-media-box {',
        '  position: relative; width: 100%; aspect-ratio: ' + cfg.aspectRatio + ';',
        '  border-radius: ' + boxBorderRadius + '; overflow: hidden; background: #000;',
        '  border: ' + cfg.borderWidth + 'px solid ' + cfg.borderColor + ';',
        '}',
        '.vl-card-item:hover .vl-media-box { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }',
        '.vl-media-box img, .vl-media-box video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: ' + cfg.objectFit + '; pointer-events: none; }',
        '.vl-title-text {',
        '  margin-top: 8px; font-size: 12px; font-weight: 600; color: ' + corTexto + '; text-align: center;',
        '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
        '  display: ' + (cfg.showTitle ? 'block' : 'none') + '; width: 100%; padding: 0 4px;',
        '}',
        '.vl-play-btn-overlay {',
        '  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
        '  width: 38px; height: 38px; background: rgba(0,0,0,0.6); border-radius: 50%;',
        '  display: ' + (cfg.showPlayButton ? 'flex' : 'none') + '; align-items: center; justify-content: center;',
        '  pointer-events: none; color: #fff;',
        '}',
        '.vl-card-item:hover .vl-play-btn-overlay { background: ' + corPrimaria + '; transform: translate(-50%, -50%) scale(1.1); }',
        '.vl-play-btn-overlay svg { width: 18px; height: 18px; fill: white; margin-left: 2px; }'
      ].join('\n');
      widgetContainer.appendChild(estilo);

      var slider = document.createElement('div');
      slider.className = 'vl-slider-container';

      allVideoItems.forEach(function (item) {
        var story = item.story; var video = item.video;
        var storyIndex = item.storyIndex; var videoIndex = item.videoIndex;
        var videoUrl = video ? (video.video_url || video.videoUrl || video.url || video.file_url || '') : '';
        var cover = video ? (video.thumbnail_url || video.cover_url || video.thumbnailUrl || video.coverUrl || '') : '';
        var card = document.createElement('button'); card.className = 'vl-card-item';
        var mediaWrap = document.createElement('div'); mediaWrap.className = 'vl-media-box';
        var isVideo = videoUrl && (videoUrl.indexOf('.mp4') !== -1 || videoUrl.indexOf('.webm') !== -1 || videoUrl.indexOf('.mov') !== -1 || videoUrl.indexOf('.m3u8') !== -1);
        var mediaEl;
        if (isVideo) { mediaEl = document.createElement('video'); mediaEl.src = videoUrl; if (cover) mediaEl.poster = cover; mediaEl.muted = true; mediaEl.loop = true; mediaEl.autoplay = true; mediaEl.setAttribute('playsinline', ''); }
        else { mediaEl = document.createElement('img'); mediaEl.src = cover || videoUrl; mediaEl.loading = 'lazy'; }
        mediaWrap.appendChild(mediaEl);
        var playIcon = document.createElement('div'); playIcon.className = 'vl-play-btn-overlay'; playIcon.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'; mediaWrap.appendChild(playIcon);
        card.appendChild(mediaWrap);
        if (cfg.showTitle) { var titulo = document.createElement('span'); titulo.className = 'vl-title-text'; titulo.textContent = story.title || story.name || 'Ver Vídeo'; card.appendChild(titulo); }
        card.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          openStoryViewer(stories, storyIndex, videoIndex);
        });
        slider.appendChild(card);
      });

      widgetContainer.appendChild(slider);

      if (!cfg.isGrid) {
        (function () {
          var isDown = false, startX = 0, scrollLeft = 0, moved = false, velX = 0, momentumID;
          slider.addEventListener('mousedown', function (e) { isDown = true; moved = false; slider.classList.add('dragging'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; cancelMomentum(); e.preventDefault(); });
          slider.addEventListener('mouseleave', function () { if (isDown) { isDown = false; slider.classList.remove('dragging'); startMomentum(); } });
          slider.addEventListener('mouseup', function () { if (isDown) { isDown = false; slider.classList.remove('dragging'); startMomentum(); } });
          slider.addEventListener('mousemove', function (e) { if (!isDown) return; e.preventDefault(); var x = e.pageX - slider.offsetLeft; var walk = (x - startX) * 1.5; velX = walk; slider.scrollLeft = scrollLeft - walk; if (Math.abs(walk) > 3) moved = true; });
          slider.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
          slider.addEventListener('touchstart', function (e) { isDown = true; moved = false; startX = e.touches[0].pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; cancelMomentum(); }, { passive: false });
          slider.addEventListener('touchend', function () { isDown = false; startMomentum(); });
          slider.addEventListener('touchmove', function (e) { if (!isDown) return; var x = e.touches[0].pageX - slider.offsetLeft; var walk = (x - startX) * 1.5; slider.scrollLeft = scrollLeft - walk; if (Math.abs(walk) > 3) moved = true; }, { passive: false });
          function startMomentum() { cancelMomentum(); if (Math.abs(velX) < 2) return; momentumID = requestAnimationFrame(function animate() { velX *= 0.92; slider.scrollLeft -= velX; if (Math.abs(velX) > 0.5) { momentumID = requestAnimationFrame(animate); } }); }
          function cancelMomentum() { if (momentumID) { cancelAnimationFrame(momentumID); momentumID = null; } velX = 0; }
        })();
      }
    }, 300);
  }

  function renderFloating(stories, appearance) {
    if (!stories || !stories.length || floatingWasClosed) return;
    if (!enableFloating) return;

    var shadowData = getOrCreateShadowRoot(appearance);
    var shadow = shadowData.shadow;
    var host = shadowData.host;

    var style = createEl('style');
    style.textContent = buildFloatingCss(appearance);
    shadow.appendChild(style);

    var container = createEl('div', 'vl-bubbles');
    var behavior = getFloatingBehaviorConfig(appearance);

    stories.forEach(function (story, index) {
      var bubbleVideo = null;
      if (story.videos && story.videos.length > 0) { bubbleVideo = story.videos[0]; }

      var videoUrl = bubbleVideo ? getVideoUrl(bubbleVideo) : '';
      var cover = getStoryThumbnail(story, bubbleVideo, null);

      var bubble = createEl('button', 'vl-bubble');
      var ring = createEl('div', 'vl-ring');
      var inner = createEl('div', 'vl-inner');

      var mediaEl;
      if (videoUrl && isDirectVideoUrl(videoUrl)) {
        mediaEl = createEl('video', 'vl-img');
        mediaEl.src = videoUrl;
        if (cover) mediaEl.poster = cover;
        mediaEl.muted = true;
        mediaEl.defaultMuted = true;
        mediaEl.loop = true;
        mediaEl.autoplay = true;
        mediaEl.setAttribute('playsinline', '');
        mediaEl.setAttribute('webkit-playsinline', '');
        mediaEl.style.pointerEvents = 'none';
      } else {
        mediaEl = createEl('img', 'vl-img');
        if (cover) mediaEl.src = cover;
        mediaEl.style.pointerEvents = 'none';
      }

      mediaEl.loading = 'lazy';
      inner.appendChild(mediaEl);

      if (behavior.showPlayButton) {
        var badge = createEl('span', 'vl-play-badge');
        inner.appendChild(badge);
      }

      ring.appendChild(inner);

      if (behavior.allowClose) {
        var dismiss = createEl('button', 'vl-dismiss');
        dismiss.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        dismiss.addEventListener('click', function (e) {
          e.stopPropagation();
          host.remove();
          floatingWasClosed = true;
        });
        bubble.appendChild(dismiss);
      }

      bubble.appendChild(ring);

      var showFloatingTitle = toBoolean(
        readConfigValue(appearance, 'floating_config', 'show_title', 'floating_show_title', true),
        true
      );
      if (showFloatingTitle) {
        var label = createEl('span', 'vl-label');
        label.textContent = story.title || '';
        bubble.appendChild(label);
      }

      bubble.addEventListener('click', function (e) {
        if (e.target.closest('.vl-dismiss')) return;
        if (floatingWasDragged) { floatingWasDragged = false; return; }
        openStoryViewer(stories, index, 0);
      });

      container.appendChild(bubble);
    });

    applyDraggable(host, appearance);
    shadow.appendChild(container);
  }

  function initWidget() {
    if (!hasSupabase && !storeId) return;

    Promise.all([
      readAppearance(),
      readStories(),
      readStoryVideos(),
      readVideos(),
      readStoryProducts(),
      readProducts(),
      readComments(),
      readSizingModels(),
      readLikesFromDb(),
      readStoreSettings(),
      readPageRules(),
      readDisplayLocations()
    ]).then(function (results) {
      var appearance = results[0];
      var stories = results[1];
      var storyVideos = results[2];
      var videos = results[3];
      readStoryProductsData = results[4];
      readProductsData = results[5];
      window.__vidlytics_debug_story_products = readStoryProductsData;
window.__vidlytics_debug_products = readProductsData;

      readCommentsData = results[6];
      readSizingModelsData = results[7];
      readLikeCounts = results[8];
      var storeSettings = results[9];
      var pageRules = results[10];
      var locations = results[11];

      if (storeSettings && storeSettings.auto_approve_comments !== undefined) {
        autoApproveComments = !!storeSettings.auto_approve_comments;
      }

storeWhatsappNumber = storeSettings.whatsapp_number || storeSettings.whatsappNumber || '';
storeWhatsappMessage = storeSettings.whatsapp_message || storeSettings.whatsappMessage || '';

      currentAppearance = appearance;

      window.__vidlytics_debug_show_product = appearance.show_product;


      if (!stories || stories.length === 0) return;

      function storyMatchesCurrentPage(story) {
        var locs = locations.filter(function (l) { return idsEqual(l.story_id, story.id); });
        var rules = pageRules.filter(function (r) { return idsEqual(r.story_id, story.id); });
        if (locs.length > 0) return locs.some(matchesRule);
        if (rules.length > 0) return rules.some(matchesRule);
        var globalRules = pageRules.filter(function (r) { return !r.story_id; });
        if (globalRules.length > 0) return globalRules.some(matchesRule);
        return matchesUrl(appearance);
      }

      var validStories = stories.filter(storyMatchesCurrentPage);
      if (!validStories || validStories.length === 0) return;

      validStories.forEach(function (story) {
        var rels = storyVideos.filter(function (sv) { return idsEqual(sv.story_id, story.id); });
        story.videos = rels.map(function (r) {
          return videos.find(function (v) { return idsEqual(v.id, r.video_id); }) || {};
        }).filter(function (video) { return video && Object.keys(video).length > 0; });
      });

      var widgetFormat = 'floating_widget';
      for (var i = 0; i < validStories.length; i += 1) {
        var storyFormat = String(firstDefined(
          validStories[i].format, validStories[i].display_format, validStories[i].displayFormat,
          validStories[i].visual_style, validStories[i].visualStyle, 'floating_widget'
        )).toLowerCase();
        if (storyFormat.indexOf('carousel') !== -1 || storyFormat.indexOf('carrossel') !== -1) { widgetFormat = 'carousel'; break; }
        if (storyFormat.indexOf('grid') !== -1 || storyFormat.indexOf('grade') !== -1) { widgetFormat = 'grid'; break; }
        if (storyFormat.indexOf('floating') !== -1 || storyFormat.indexOf('flutuante') !== -1 || storyFormat.indexOf('widget') !== -1) { widgetFormat = 'floating_widget'; }
      }

      if (widgetFormat === 'carousel' || widgetFormat === 'grid') {
        renderInlineWidget(validStories, appearance, widgetFormat);
      } else {
        renderFloating(validStories, appearance);
      }
    }).catch(function (err) {
      console.error('VIDLYTICS: Erro ao inicializar widget:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
