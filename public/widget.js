(function () {
  var WIDGET_VERSION = '2026.07.28-20';

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

  var currentStories = [];
  var currentStoryIndex = 0;
  var currentVideoIndex = 0;

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  // ═══════════════════════════════════════════════════════════════
  // 🆕 NOVA ESTRUTURA: 62 colunas planas
  // ═══════════════════════════════════════════════════════════════
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
    carousel_size: '80',
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
    grid_size: '80',
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
    var device = getDevice();
    var sameAll = configObj.same_for_all;
    if (sameAll === true || sameAll === undefined || sameAll === null) {
      if (configObj.desktop && configObj.desktop[fieldName] !== undefined &&
          configObj.desktop[fieldName] !== null && configObj.desktop[fieldName] !== '') {
        return configObj.desktop[fieldName];
      }
      if (configObj.mobile && configObj.mobile[fieldName] !== undefined &&
          configObj.mobile[fieldName] !== null && configObj.mobile[fieldName] !== '') {
        return configObj.mobile[fieldName];
      }
      return fallback;
    }
    var deviceConfig = configObj[device];
    if (deviceConfig && deviceConfig[fieldName] !== undefined &&
        deviceConfig[fieldName] !== null && deviceConfig[fieldName] !== '') {
      return deviceConfig[fieldName];
    }
    var otherDevice = device === 'mobile' ? 'desktop' : 'mobile';
    var otherConfig = configObj[otherDevice];
    if (otherConfig && otherConfig[fieldName] !== undefined &&
        otherConfig[fieldName] !== null && otherConfig[fieldName] !== '') {
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
      if (JSONB_KEYS.indexOf(key) !== -1) {
        target[key] = value;
        return;
      }
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

  // ═══ CONTINUA NA PARTE 2 ═══
  // ═══ CONTINUAÇÃO DA PARTE 1 ═══

  // ═══════════════════════════════════════════════════════════════
  // SUPABASE FETCH
  // ═══════════════════════════════════════════════════════════════

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
          var row = data[0];
          console.log('🔍 fetchDbAppearance — appearances (nova):', row);
          return normalizeAppearanceItem(row);
        }
        return tryLegacyTable();
      })
      .catch(function () {
        return tryLegacyTable();
      });

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
            console.log('🔍 fetchDbAppearance — widget_appearances (legado):', data[0]);
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

      console.log('🔍 readAppearance — FINAL:', {
        same_appearance_all_devices: finalAppearance.same_appearance_all_devices,
        floating_position: readJsonbConfigValue(finalAppearance, 'floating_config', 'floating_position'),
        floating_shape: readJsonbConfigValue(finalAppearance, 'floating_config', 'shape'),
        floating_size: readJsonbConfigValue(finalAppearance, 'floating_config', 'width'),
        floating_border_color: readJsonbConfigValue(finalAppearance, 'floating_config', 'border_color'),
        floating_border_width: readJsonbConfigValue(finalAppearance, 'floating_config', 'border_style'),
        primary_color: finalAppearance.primary_color,
        device: getDevice()
      });

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

    var position = normalizeFloatingPosition(
      rcv('floating_position', 'floating_position', DEFAULT_APPEARANCE.floating_position)
    );
    var shape = normalizeFloatingShape(
      rcv('shape', 'floating_shape', DEFAULT_APPEARANCE.floating_shape)
    );

    var sizeNumber = toNumber(rcv('width', 'floating_size', '80'), 80);
    var widthNumber = sizeNumber;
    var heightNumber;

    if (shape === 'square' || shape === 'circle') {
      heightNumber = widthNumber;
    } else {
      heightNumber = Math.round(widthNumber * 16 / 9);
    }

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

    console.log('🔍 getFloatingConfig — RESULTADO:', {
      position: position, shape: shape,
      top: top, right: right, bottom: bottom, left: left,
      width: px(widthNumber), height: px(heightNumber),
      borderWidth: px(borderWidthNumber),
      radius: shape === 'circle' ? '999px' : px(radiusNumber),
      objectFit: objectFit, zIndex: zIndexNumber
    });

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
    var sizeNumber = toNumber(rcv('width', 'carousel_size', '80'), 80);
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
    var sizeNumber = toNumber(rcv('width', 'grid_size', '80'), 80);
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

  // ═══ CONTINUA NA PARTE 3 ═══
