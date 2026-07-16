/**
 * Vidlytics Widget — widget.js
 * Correção: Loop no vídeo + sem fechamento automático
 */
(function () {
  console.log('VIDLYTICS WIDGET CARREGADO - FIX LOOP + NO AUTO CLOSE - 202607161500');

  var VIDLYTICS_WIDGET_VERSION = 'appearance-widget-loop-no-autoclose-202607161500';

  if (window.__vidlytics_widget_loaded_version === VIDLYTICS_WIDGET_VERSION) return;

  try {
    var oldRoot = document.getElementById('vidlytics-widget-root');
    if (oldRoot) oldRoot.remove();
    var oldCarousel = document.getElementById('vidlytics-carousel-root');
    if (oldCarousel) oldCarousel.remove();
  } catch (e) {}

  window.__vidlytics_widget_loaded_version = VIDLYTICS_WIDGET_VERSION;

  var config = window.VIDLYTICS_CONFIG || {};
  var storeId = config.storeId || config.lojaId || config.licenseId || null;
  var supabaseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  var supabaseAnonKey = config.supabaseAnonKey || '';
  var widgetsCfg = config.widgets || {};
  var hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

  var enableFloating = widgetsCfg.floatingVideo !== undefined ? widgetsCfg.floatingVideo : config.floatingVideo !== false;
  var enableCarousel = widgetsCfg.carousel !== undefined ? widgetsCfg.carousel : config.carousel !== false;

  var currentAppearance = {};
  var overlay = null;
  var modalContent = null;
  var globalShadowRoot = null; 
  var floatingWasDragged = false;
  var floatingWasClosed = false; 
  var readStoryProductsData = [];
  var readProductsData = [];

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var DEFAULT_APPEARANCE = {
    floating_position: 'bottom-right', floating_shape: 'portrait', floating_top: 20, floating_bottom: 24, floating_side: 20,
    floating_width: 85, floating_height: 151, floating_border_radius: 12, floating_border_width: 2, floating_object_fit: 'cover',
    z_index: 2147483647, primary_color: '#0094EB', secondary_color: '#EC4899', text_color: '#0f172a',
    font_family: 'Inter, system-ui, sans-serif', show_title: true, show_product: true, hide_stories: false, shadow_enabled: true,
    show_play_button: false, allow_drag: false, allow_close: true
  };

  function createEl(tag, className) { var el = document.createElement(tag); if (className) el.className = className; return el; }

  function setImportant(el, prop, value) {
    if (!el || value === undefined || value === null || value === '') return;
    try { el.style.setProperty(prop, String(value), 'important'); } catch (e) { el.style[prop] = value; }
  }

  function firstDefined() {
    for (var i = 0; i < arguments.length; i += 1) { if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i]; }
    return undefined;
  }

  function idsEqual(a, b) { if (a === undefined || a === null || b === undefined || b === null) return false; return String(a) === String(b); }
  function isPlainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function parseJsonIfNeeded(value) {
    if (!value) return {}; if (isPlainObject(value)) return value;
    if (typeof value === 'string') {
      var trimmed = value.trim(); if (!trimmed || (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[')) return {};
      try { var parsed = JSON.parse(trimmed); return isPlainObject(parsed) ? parsed : {}; } catch (e) { return {}; }
    }
    return {};
  }

  function normalizeKey(value) { return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, '-').replace(/\s+/g, '-'); }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (value === true || value === 1 || value === '1') return true;
    if (typeof value === 'string') { var norm = value.trim().toLowerCase(); if (norm === 'true') return true; if (norm === 'false') return false; }
    if (value === false || value === 0 || value === '0') return false;
    return fallback;
  }

  function getFloatingBehaviorConfig(appearance) {
    var config = getFloatingConfig(appearance) || {};
    var rawShowPlayButton = firstDefined(config.showPlayButton, config.show_play_button);
    var rawAllowDrag = firstDefined(config.allowDrag, config.allow_drag);
    var rawAllowClose = firstDefined(config.allowClose, config.allow_close);
    return {
      objectFit: config.objectFit || config.object_fit || 'cover',
      showPlayButton: toBoolean(rawShowPlayButton, false),
      allowDrag: toBoolean(rawAllowDrag, true),
      allowClose: toBoolean(rawAllowClose, true)
    };
  }

  function normalizeMediaUrl(url) {
    if (!url) return ''; var value = String(url).trim(); if (!value) return '';
    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('data:') === 0 || value.indexOf('blob:') === 0) return value;
    if (value.indexOf('//') === 0) return window.location.protocol + value;
    if (value.charAt(0) === '/' && supabaseUrl) return supabaseUrl + value;
    return value;
  }

  function getStorageItem(key, fallback) {
    try { var item = localStorage.getItem(key); if (!item) return fallback; try { return JSON.parse(item); } catch (e) { return item; } } catch (e2) { return fallback; }
  }
  function setStorageItem(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  function supabaseFetch(path, options) {
    if (!hasSupabase) return Promise.reject(new Error('No Supabase config'));
    var headers = { apikey: supabaseAnonKey, Authorization: 'Bearer ' + supabaseAnonKey, 'Content-Type': 'application/json' };
    if (options && options.headers) { Object.keys(options.headers).forEach(function (key) { headers[key] = options.headers[key]; }); }
    return fetch(supabaseUrl + '/rest/v1/' + path, { method: (options && options.method) || 'GET', headers: headers, body: options && options.body ? options.body : undefined });
  }

  function fetchJson(path) {
    return supabaseFetch(path, { method: 'GET' })
      .then(function (response) { if (!response.ok) return []; return response.json(); })
      .then(function (data) { return Array.isArray(data) ? data : []; })
      .catch(function () { return []; });
  }

  function flattenAppearanceInto(target, source, depth) {
    if (depth === undefined) depth = 0; if (depth > 12 || !source) return target;
    if (typeof source === 'string') source = parseJsonIfNeeded(source);
    if (!isPlainObject(source)) return target;
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value === undefined || value === null || value === '') return;
      if (isPlainObject(value)) { flattenAppearanceInto(target, value, depth + 1); return; }
      if (typeof value === 'string') {
        var parsed = parseJsonIfNeeded(value);
        if (isPlainObject(parsed) && Object.keys(parsed).length) { flattenAppearanceInto(target, parsed, depth + 1); return; }
      }
      target[key] = value;
    });
    return target;
  }

  function normalizeAppearanceItem(item) {
    var merged = {}; flattenAppearanceInto(merged, item || {}, 0);
    delete merged.storageAppearance; delete merged.configAppearance; delete merged.dbAppearance; delete merged.widgetsAppearance; delete merged.widgetsAparencia;
    return merged;
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
    for (var i = 0; i < names.length; i += 1) { if (appearance[names[i]] !== undefined && appearance[names[i]] !== null && appearance[names[i]] !== '') return appearance[names[i]]; }
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

  function getConfigAppearance() {
    var merged = {};
    [ config.appearance, config.aparencia, config.appearanceConfig, config.appearance_config, config.floating, config.floatingConfig, config.floatingAppearance, config.floatingVideoConfig, config.floatingVideoAppearance, config.floating_video, widgetsCfg.appearance, widgetsCfg.aparencia, widgetsCfg.appearanceConfig, widgetsCfg.appearance_config, widgetsCfg.floating, widgetsCfg.floatingConfig, widgetsCfg.floatingAppearance, widgetsCfg.floatingVideoConfig, widgetsCfg.floatingVideoAppearance, widgetsCfg.floating_video ].forEach(function (src) { flattenAppearanceInto(merged, src, 0); });
    return normalizeAppearanceItem(merged);
  }

  function getStorageAppearance() {
    var merged = {};
    var keys = [ 'vidlytics_appearance', 'vidlytics_appearance_' + storeId, 'vidlytics_aparencia', 'vidlytics_aparencia_' + storeId, 'vidlytics_widget_appearance', 'vidlytics_widget_appearance_' + storeId, 'vidlytics_config', 'vidlytics_config_' + storeId, 'VIDLYTICS_APPEARANCE', 'VIDLYTICS_CONFIG' ];
    keys.forEach(function (key) { flattenAppearanceInto(merged, getStorageItem(key, {}), 0); });
    return normalizeAppearanceItem(merged);
  }

  function appearanceHasUsefulData(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    var usefulNames = [ 'floating_position', 'floatingPosition', 'position', 'posicao', 'posição', 'widget_position', 'widgetPosition', 'placement', 'floating_video_position', 'floatingVideoPosition', 'floating_shape', 'floatingShape', 'shape', 'form', 'forma', 'formato', 'widget_shape', 'widgetShape', 'floating_video_shape', 'floatingVideoShape', 'floating_width', 'floatingWidth', 'width', 'largura', 'widget_width', 'widgetWidth', 'floating_video_width', 'floatingVideoWidth', 'floating_height', 'floatingHeight', 'height', 'altura', 'widget_height', 'widgetHeight', 'floating_radius', 'floatingRadius', 'border_radius', 'borderRadius', 'radius', 'raio', 'widget_radius', 'widgetRadius', 'floating_top', 'floatingTop', 'top', 'top_spacing', 'topSpacing', 'spacing_top', 'spacingTop', 'floating_bottom', 'floatingBottom', 'bottom', 'bottom_spacing', 'bottomSpacing', 'spacing_bottom', 'spacingBottom', 'floating_side', 'floatingSide', 'side', 'left_spacing', 'leftSpacing', 'right_spacing', 'rightSpacing', 'distance_top', 'distanceTop', 'distancia_superior', 'distanciaSuperior', 'distance_bottom', 'distanceBottom', 'distancia_inferior', 'distanciaInferior', 'distance_side', 'distanceSide', 'distancia_lateral', 'distanciaLateral', 'floating_border_width', 'floatingBorderWidth', 'border_width', 'borderWidth', 'largura_borda', 'larguraBorda', 'primary_color', 'primaryColor', 'secondary_color', 'secondaryColor', 'border_color', 'borderColor', 'color', 'text_color', 'textColor', 'font_family', 'fontFamily', 'background_color', 'backgroundColor', 'button_color', 'buttonColor', 'show_title', 'showTitle', 'show_product', 'showProduct', 'hide_stories', 'hideStories', 'shadow_enabled', 'shadowEnabled', 'floating_config', 'floatingConfig', 'floating_border_radius', 'floatingBorderRadius', 'widget_border_radius', 'widgetBorderRadius', 'widget_radius', 'widgetRadius', 'border_radius', 'borderRadius', 'floating_object_fit', 'floatingObjectFit', 'object_fit', 'objectFit', 'image_fit', 'imageFit', 'fit', 'show_play_button', 'showPlayButton', 'show_player_button', 'showPlayerButton', 'play_button_enabled', 'playButtonEnabled', 'allow_drag', 'allowDrag', 'draggable', 'drag_enabled', 'dragEnabled', 'permitir_arrastar', 'allow_close', 'allowClose', 'closable', 'close_enabled', 'closeEnabled', 'show_close_button', 'showCloseButton', 'permitir_fechar', 'floating_show_play_button', 'floatingShowPlayButton', 'show_floating_play_button', 'showFloatingPlayButton', 'allow_floating_drag', 'allowFloatingDrag', 'floating_allow_drag', 'floatingAllowDrag', 'floating_drag_enabled', 'floatingDragEnabled', 'allow_floating_close', 'allowFloatingClose', 'floating_allow_close', 'floatingAllowClose', 'floating_close_enabled', 'floatingCloseEnabled' ];
    for (var i = 0; i < usefulNames.length; i += 1) { if (readAppearanceValue(appearance, [usefulNames[i]]) !== undefined) return true; }
    return false;
  }

  function extractAppearanceFromItem(item, allowDirectFields) {
    if (!item) return {}; var merged = {};
    [ item.appearance, item.aparencia, item.appearance_config, item.appearanceConfig, item.widget_appearance, item.widgetAppearance, item.widget_config, item.widgetConfig, item.settings, item.config, item.style, item.styles, item.data, item.metadata, item.customization, item.customization_config, item.theme, item.theme_config, item.floating, item.floating_config, item.floatingConfig, item.floatingAppearance, item.floating_video, item.floatingVideo, item.floatingVideoConfig, item.floatingVideoAppearance ].forEach(function (src) { flattenAppearanceInto(merged, src, 0); });

    if (allowDirectFields) {
      if (firstDefined(item.widget_shape, item.shape)) merged.shape = firstDefined(item.widget_shape, item.shape);
      if (firstDefined(item.widget_size, item.size)) merged.size = firstDefined(item.widget_size, item.size);
      if (firstDefined(item.shadow_enabled, item.shadowEnabled) !== undefined) merged.shadow_enabled = firstDefined(item.shadow_enabled, item.shadowEnabled);
      if (firstDefined(item.font_family, item.fontFamily)) merged.font_family = firstDefined(item.font_family, item.fontFamily);
      if (firstDefined(item.floating_shape, item.floatingShape)) merged.floating_shape = firstDefined(item.floating_shape, item.floatingShape);
      if (firstDefined(item.floating_width, item.floatingWidth)) merged.floating_width = firstDefined(item.floating_width, item.floatingWidth);
      if (firstDefined(item.floating_height, item.floatingHeight)) merged.floating_height = firstDefined(item.floating_height, item.floatingHeight);
      var directRadius = firstDefined(item.floating_radius, item.floatingRadius, item.floating_border_radius, item.floatingBorderRadius, item.widget_radius, item.widgetRadius, item.border_radius, item.borderRadius, item.radius, item.raio);
      if (directRadius !== undefined) merged.floating_radius = directRadius;
      if (firstDefined(item.floating_position, item.floatingPosition)) merged.floating_position = firstDefined(item.floating_position, item.floatingPosition);
      if (firstDefined(item.floating_top, item.floatingTop)) merged.floating_top = firstDefined(item.floating_top, item.floatingTop);
      if (firstDefined(item.floating_bottom, item.floatingBottom)) merged.floating_bottom = firstDefined(item.floating_bottom, item.floatingBottom);
      if (firstDefined(item.floating_side, item.floatingSide)) merged.floating_side = firstDefined(item.floating_side, item.floatingSide);
      var directBorderColor = firstDefined(item.floating_border_color, item.floatingBorderColor, item.border_color, item.borderColor, item.cor_borda);
      if (directBorderColor !== undefined) merged.border_color = directBorderColor;
      var directObjectFit = firstDefined(item.floating_object_fit, item.floatingObjectFit, item.object_fit, item.objectFit, item.fit);
      if (directObjectFit !== undefined) merged.object_fit = directObjectFit;
      var directShowPlayButton = firstDefined(item.show_play_button, item.showPlayButton, item.play_button_enabled, item.mostrar_play);
      if (directShowPlayButton !== undefined && directShowPlayButton !== null) merged.show_play_button = toBoolean(directShowPlayButton, false);
      var directAllowDrag = firstDefined(item.allow_drag, item.allowDrag, item.draggable, item.drag_enabled);
      if (directAllowDrag !== undefined && directAllowDrag !== null) merged.allow_drag = toBoolean(directAllowDrag, false);
      var directAllowClose = firstDefined(item.allow_close, item.allowClose, item.closable, item.close_enabled, item.show_close_button);
      if (directAllowClose !== undefined && directAllowClose !== null) merged.allow_close = toBoolean(directAllowClose, false);
      flattenAppearanceInto(merged, item, 0);
    }
    return normalizeAppearanceItem(merged);
  }

  function fetchDbAppearance() {
    if (!storeId || !hasSupabase) return Promise.resolve({});
    function tryTable(tableName, extraQuery) {
      var path = tableName + '?select=*&store_id=eq.' + encodeURIComponent(storeId) + (extraQuery || '') + '&order=updated_at.desc.nullslast,created_at.desc.nullslast&limit=1';
      return fetchJson(path).then(function (items) {
        if (!items || !items.length) return null;
        var appearance = extractAppearanceFromItem(items[0], true);
        return appearanceHasUsefulData(appearance) ? appearance : null;
      });
    }
    return tryTable('widget_appearances').then(function (appearance) {
      if (appearance) return appearance; return tryTable('appearances');
    }).then(function (appearance) { return appearance || {}; });
  }

  function readAppearance() {
    var configAppearance = normalizeAppearanceItem(getConfigAppearance());
    var storageAppearance = normalizeAppearanceItem(getStorageAppearance());
    return fetchDbAppearance().then(function (dbAppearance) {
      var finalAppearance = {};
      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, storageAppearance);
      if (appearanceHasUsefulData(dbAppearance)) mergeObject(finalAppearance, dbAppearance);
      return normalizeAppearanceItem(finalAppearance);
    }).catch(function () {
      var finalAppearance = {};
      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, storageAppearance);
      return normalizeAppearanceItem(finalAppearance);
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

  function toNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    var parsed = Number(String(value).trim().replace('px', '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function px(value, fallback) {
    if (value === undefined || value === null || value === '') value = fallback !== undefined ? fallback : 0;
    if (typeof value === 'string') { var trimmed = value.trim(); if (trimmed === 'auto' || trimmed.indexOf('px') !== -1 || trimmed.indexOf('%') !== -1 || trimmed.indexOf('vh') !== -1 || trimmed.indexOf('vw') !== -1) return trimmed; }
    return toNumber(value, fallback !== undefined ? fallback : 0) + 'px';
  }

  function getFloatingConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    function getValue(names, fallback) { var value = readAppearanceValue(appearance, names); return (value !== undefined && value !== null && value !== '') ? value : fallback; }

    var position = normalizeFloatingPosition(getValue(['floating_position', 'position'], DEFAULT_APPEARANCE.floating_position));
    var shape = normalizeFloatingShape(getValue(['floating_shape', 'shape'], DEFAULT_APPEARANCE.floating_shape));

    var defaultWidth = DEFAULT_APPEARANCE.floating_width;
    var defaultHeight = DEFAULT_APPEARANCE.floating_height;
    if (shape === 'square') { defaultWidth = 96; defaultHeight = 96; }
    if (shape === 'circle') { defaultWidth = 88; defaultHeight = 88; }

    var widthNumber = toNumber(getValue(['floating_width', 'width'], defaultWidth), defaultWidth);
    var heightNumber = toNumber(getValue(['floating_height', 'height'], defaultHeight), defaultHeight);
    if (shape === 'square' || shape === 'circle') heightNumber = widthNumber;

    var borderWidthNumber = toNumber(getValue(['floating_border_width', 'border_width'], DEFAULT_APPEARANCE.floating_border_width), DEFAULT_APPEARANCE.floating_border_width);
    var radiusNumber = toNumber(getValue(['floating_border_radius', 'floating_radius', 'border_radius', 'radius'], DEFAULT_APPEARANCE.floating_border_radius), DEFAULT_APPEARANCE.floating_border_radius);
    if (shape === 'circle') radiusNumber = 999;

    var topNumber = toNumber(getValue(['floating_top', 'top'], DEFAULT_APPEARANCE.floating_top), DEFAULT_APPEARANCE.floating_top);
    var bottomNumber = toNumber(getValue(['floating_bottom', 'bottom'], DEFAULT_APPEARANCE.floating_bottom), DEFAULT_APPEARANCE.floating_bottom);
    var sideNumber = toNumber(getValue(['floating_side', 'side'], DEFAULT_APPEARANCE.floating_side), DEFAULT_APPEARANCE.floating_side);
    var zIndexNumber = toNumber(getValue(['z_index', 'zIndex'], DEFAULT_APPEARANCE.z_index), DEFAULT_APPEARANCE.z_index);

    var objectFitRaw = getValue(['floating_object_fit', 'object_fit'], DEFAULT_APPEARANCE.floating_object_fit);
    var objectFit = String(objectFitRaw || 'cover').trim().toLowerCase().replace(/_/g, '-');

    var top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignItems = 'flex-end';
    if (position === 'top-left') { top = px(topNumber); left = px(sideNumber); alignItems = 'flex-start'; }
    if (position === 'top-right') { top = px(topNumber); right = px(sideNumber); alignItems = 'flex-end'; }
    if (position === 'bottom-left') { bottom = px(bottomNumber); left = px(sideNumber); alignItems = 'flex-start'; }
    if (position === 'bottom-right') { bottom = px(bottomNumber); right = px(sideNumber); alignItems = 'flex-end'; }

    return {
      position: position, shape: shape, top: top, right: right, bottom: bottom, left: left,
      width: px(widthNumber), height: px(heightNumber), borderWidth: px(borderWidthNumber),
      radius: shape === 'circle' ? '999px' : px(radiusNumber),
      innerRadius: shape === 'circle' ? '999px' : px(Math.max(0, radiusNumber - borderWidthNumber)),
      zIndex: zIndexNumber, alignItems: alignItems, objectFit: objectFit
    };
  }

  function getPrimaryColor(appearance) { return readAppearanceValue(appearance, ['primary_color', 'primaryColor', 'cor_primaria']) || DEFAULT_APPEARANCE.primary_color; }
  function getSecondaryColor(appearance) { return readAppearanceValue(appearance, ['secondary_color', 'secondaryColor', 'cor_secundaria']) || DEFAULT_APPEARANCE.secondary_color; }
  function getBorderColor(appearance) { return readAppearanceValue(appearance, ['floating_border_color', 'border_color', 'borderColor', 'cor_borda']); }
  function getButtonColor(appearance) { return readAppearanceValue(appearance, ['button_color', 'buttonColor', 'btn_color', 'cor_botao']) || getPrimaryColor(appearance); }
  function getFontFamily(appearance) { return readAppearanceValue(appearance, ['font_family', 'fontFamily', 'fonte']) || DEFAULT_APPEARANCE.font_family; }

  function normalizeModalAppearanceConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    return {
      show_title: toBoolean(firstDefined(appearance.show_title, appearance.showTitle), DEFAULT_APPEARANCE.show_title),
      show_product: toBoolean(firstDefined(appearance.show_product, appearance.showProduct), DEFAULT_APPEARANCE.show_product)
    };
  }

  function trackMetric(metric) {
    var fallbackMetrics = getStorageItem('vidlytics_metrics', []);
    if (!Array.isArray(fallbackMetrics)) fallbackMetrics = [];
    fallbackMetrics.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2),
      store_id: storeId, story_id: metric.story_id || null, video_id: metric.video_id || null, product_id: metric.product_id || null,
      event_type: metric.event_type, page_url: metric.page_url || window.location.href,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop', created_at: new Date().toISOString()
    });
    setStorageItem('vidlytics_metrics', fallbackMetrics);
    return Promise.resolve();
  }

  function readStories() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_stories', []));
    return fetchJson('stories?select=*&store_id=eq.' + encodeURIComponent(storeId)).then(function (items) {
      return items.filter(function (story) { return ('status' in story ? story.status === 'active' : true) && ('active' in story ? story.active !== false : true); });
    });
  }

  function readStoryVideos() { return (!storeId || !hasSupabase) ? Promise.resolve(getStorageItem('vidlytics_story_videos', [])) : fetchJson('story_videos?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readVideos() { return (!storeId || !hasSupabase) ? Promise.resolve(getStorageItem('vidlytics_videos', [])) : fetchJson('videos?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readStoryProducts() { return (!storeId || !hasSupabase) ? Promise.resolve(getStorageItem('vidlytics_story_products', [])) : fetchJson('story_products?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readProducts() { return (!storeId || !hasSupabase) ? Promise.resolve(getStorageItem('vidlytics_products', [])) : fetchJson('products?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readPageRules() { return (!storeId || !hasSupabase) ? Promise.resolve(getStorageItem('vidlytics_page_rules', [])) : fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId)); }

  function matchesRule(rule) {
    var href = window.location.href, path = window.location.pathname || '/', value = String(rule.value || '');
    switch (rule.condition_type) {
      case 'all_pages': return true;
      case 'home_only': return path === '/' || path === '/home' || path === '/index.html' || path === '';
      case 'product_pages': return path.indexOf('/product') !== -1 || path.indexOf('/produto') !== -1;
      case 'category_pages': return path.indexOf('/category') !== -1 || path.indexOf('/categoria') !== -1 || path.indexOf('/colecao') !== -1;
      case 'contains': return href.indexOf(value) !== -1;
      case 'equals': return href === value;
      default: return true;
    }
  }

  function getVideoUrl(video) {
    if (!video) return '';
    return normalizeMediaUrl(firstDefined(video.video_url, video.videoUrl, video.url, video.source_url, video.sourceUrl, video.file_url, video.fileUrl, video.video, video.src, ''));
  }

  function isDirectVideoUrl(url) { return url && VIDEO_FILE_REGEX.test(url); }

  function extractYouTubeId(url) {
    if (!url) return '';
    try {
      var parsed = new URL(String(url).trim()), host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname.indexOf('/shorts/') === 0) return parsed.pathname.split('/')[2] || '';
        if (parsed.pathname.indexOf('/embed/') === 0) return parsed.pathname.replace(/^\/embed\//, '').split('/')[0] || '';
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
      }
    } catch (e) { return ''; }
    return '';
  }

  function isNativeVideo(video) {
  var url = getVideoUrl(video);
  if (!url) return false;

  var sourceType = String(
    video.source_type || video.sourceType || ''
  ).trim().toLowerCase();

  if (sourceType === 'upload') return true;

  if (url.indexOf('supabase.co/storage') !== -1) return true;

  if (isDirectVideoUrl(url)) return true;

  return false;
}

  function getYouTubeThumbnail(url) {
    var id = extractYouTubeId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function getThumbnailFromObject(obj) {
    if (!obj) return '';
    var meta = parseJsonIfNeeded(firstDefined(obj.metadata, obj.meta, obj.extra, obj.data, {}));
    return normalizeMediaUrl(firstDefined(obj.thumbnail_url, obj.thumbnailUrl, obj.thumbnail, obj.poster_url, obj.posterUrl, obj.poster, obj.cover_url, obj.coverUrl, obj.cover, obj.image_url, obj.imageUrl, obj.image, meta.thumbnail_url, meta.thumbnailUrl, meta.poster_url, meta.cover_url, meta.image_url, '') || '');
  }

  function getVideoThumbnail(video) {
  if (!video) return '';

  var direct = getThumbnailFromObject(video);
  if (direct) return direct;

  var sourceType = String(
    video.source_type || video.sourceType || ''
  ).trim().toLowerCase();

  if (sourceType !== 'upload') {
    return getYouTubeThumbnail(getVideoUrl(video));
  }

  return '';
}

  function getStoryThumbnail(story, coverVideo, coverRelation) {
    return getThumbnailFromObject(story) || getThumbnailFromObject(coverRelation) || getVideoThumbnail(coverVideo) || '';
  }

  function applyHostPosition(host, appearance) {
    var cfg = getFloatingConfig(appearance || currentAppearance);
    setImportant(host, 'position', 'fixed'); setImportant(host, 'top', cfg.top);
    setImportant(host, 'right', cfg.right); setImportant(host, 'bottom', cfg.bottom);
    setImportant(host, 'left', cfg.left); setImportant(host, 'z-index', cfg.zIndex);
    setImportant(host, 'width', cfg.width); setImportant(host, 'min-width', cfg.width);
    setImportant(host, 'max-width', cfg.width); setImportant(host, 'height', 'auto');
    setImportant(host, 'overflow', 'visible'); setImportant(host, 'background', 'transparent');
    setImportant(host, 'border', '0'); setImportant(host, 'box-shadow', 'none');
    setImportant(host, 'pointer-events', 'auto'); setImportant(host, 'transform', 'none');
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
  var buttonColor = getButtonColor(appearance);
  var font = getFontFamily(appearance);

  return '*,*::before,*::after{box-sizing:border-box!important;}'
    + '.vl-overlay{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,0.7)!important;display:none!important;align-items:center!important;justify-content:center!important;z-index:' + cfg.zIndex + '!important;font-family:' + font + '!important;}'
    + '.vl-overlay.is-open{display:flex!important;}'
    + '.vl-modal{width:100%!important;max-width:480px!important;max-height:90vh!important;position:relative!important;overflow:hidden!important;background:transparent!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;}'
    + '.vl-header{position:absolute!important;top:0!important;left:0!important;right:0!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;padding:20px 16px!important;background:linear-gradient(to bottom,rgba(0,0,0,.6),transparent)!important;z-index:20!important;border:none!important;pointer-events:none!important;}'
    + '.vl-header-left{display:flex!important;flex-direction:column!important;gap:4px!important;pointer-events:auto!important;}'
    + '.vl-title{font-weight:800!important;color:#fff!important;font-size:16px!important;text-shadow:0 1px 3px rgba(0,0,0,.5)!important;text-transform:uppercase!important;}'
    + '.vl-count{font-size:13px!important;color:rgba(255,255,255,.9)!important;font-weight:600!important;}'
    + '.vl-close{all:unset!important;width:32px!important;height:32px!important;border-radius:50%!important;border:1px solid rgba(255,255,255,.5)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;line-height:1!important;cursor:pointer!important;color:#fff!important;background:rgba(0,0,0,.3)!important;backdrop-filter:blur(4px)!important;pointer-events:auto!important;}'
    + '.vl-body{flex:1!important;width:100%!important;position:relative!important;background:transparent!important;aspect-ratio:9/16!important;}'
    + '.vl-player{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;background:transparent!important;z-index:1!important;}'
    + '.vl-player video,.vl-player iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:0!important;display:block!important;object-fit:cover!important;z-index:2!important;background:#000!important;}'
+ '.vl-nav{position:absolute!important;inset:0!important;display:flex!important;z-index:5!important;background:transparent!important;pointer-events:none!important;}'
+ '.vl-nav-btn{all:unset!important;height:100%!important;cursor:pointer!important;}'
+ '.vl-nav-prev{width:25%!important;}'
+ '.vl-nav-next{width:25%!important;margin-left:auto!important;}'
    + '.vl-footer{position:absolute!important;bottom:24px!important;left:16px!important;right:16px!important;z-index:20!important;display:flex!important;flex-direction:column!important;gap:12px!important;pointer-events:none!important;}'
    + '.vl-cta{all:unset!important;display:block!important;width:100%!important;text-align:center!important;border-radius:12px!important;padding:14px!important;font-weight:800!important;font-size:15px!important;cursor:pointer!important;background:' + buttonColor + '!important;color:#fff!important;box-shadow:0 4px 12px rgba(0,0,0,.2)!important;pointer-events:auto!important;}'
    + '.vl-product{display:flex!important;align-items:center!important;gap:12px!important;border-radius:16px!important;padding:12px!important;background:#fff!important;cursor:pointer!important;box-shadow:0 8px 24px rgba(0,0,0,.15)!important;pointer-events:auto!important;}'
    + '.vl-product-img{width:60px!important;height:60px!important;border-radius:10px!important;object-fit:cover!important;background:#e2e8f0!important;flex:0 0 auto!important;}'
    + '.vl-product-info{min-width:0!important;flex:1!important;}'
    + '.vl-product-name{font-weight:800!important;font-size:13px!important;color:#0f172a!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-transform:uppercase!important;}'
    + '.vl-product-price{margin-top:2px!important;font-weight:800!important;font-size:15px!important;color:#000!important;}'
   + '.vl-product-btn{background:#00c853!important;color:#fff!important;font-size:11px!important;font-weight:800!important;padding:4px 10px!important;border-radius:6px!important;display:inline-block!important;margin-top:4px!important;text-transform:uppercase!important;}'
+ '.vl-controls{position:absolute!important;left:16px!important;right:16px!important;bottom:16px!important;z-index:40!important;display:flex!important;align-items:center!important;gap:8px!important;pointer-events:none!important;}'
+ '.vl-control-btn{all:unset!important;width:38px!important;height:38px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.68)!important;color:#fff!important;font-size:16px!important;cursor:pointer!important;pointer-events:auto!important;backdrop-filter:blur(5px)!important;box-shadow:0 4px 12px rgba(0,0,0,.25)!important;}'
+ '.vl-control-btn:hover{background:rgba(15,23,42,.9)!important;transform:scale(1.05)!important;}'
+ '.vl-control-spacer{flex:1!important;}'
+ '.vl-like-active{background:#ec4899!important;}'
+ '.vl-share-status{color:#fff!important;font-size:12px!important;font-weight:700!important;text-shadow:0 1px 3px #000!important;opacity:0!important;transition:opacity .2s!important;}'
+ '.vl-share-status.is-visible{opacity:1!important;}';
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
      + '.vl-bubble{all:unset!important;width:' + cfg.width + '!important;min-width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;height:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:4px!important;cursor:pointer!important;overflow:visible!important;pointer-events:auto!important;}'
      + '.vl-ring{pointer-events:none!important;width:' + cfg.width + '!important;height:' + cfg.height + '!important;border-radius:' + cfg.radius + '!important;padding:' + cfg.borderWidth + '!important;overflow:hidden!important;display:block!important;position:relative!important;background:' + borderBackground + '!important;box-shadow:0 12px 30px rgba(15,23,42,.18)!important;}'
      + '.vl-inner{pointer-events:none!important;width:100%!important;height:100%!important;border-radius:' + cfg.innerRadius + '!important;overflow:hidden!important;background:#000!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:800!important;font-size:24px!important;color:#fff!important;}'
      + '.vl-img{pointer-events:none!important;width:100%!important;height:100%!important;object-fit:' + behaviorConfig.objectFit + '!important;object-position:center!important;display:block!important;border-radius:' + cfg.innerRadius + '!important;}'
      + '.vl-play-badge{pointer-events:none!important;position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:34px!important;height:34px!important;border-radius:999px!important;background:rgba(15,23,42,.62)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:15px!important;line-height:1!important;box-shadow:0 6px 18px rgba(0,0,0,.25)!important;}'
      + '.vl-play-badge::before{content:""!important;margin-left:3px!important;width:0!important;height:0!important;border-top:8px solid transparent!important;border-bottom:8px solid transparent!important;border-left:12px solid #fff!important;display:block!important;}'
      + '.vl-dismiss{all:unset!important;position:absolute!important;top:-10px!important;right:-10px!important;width:24px!important;height:24px!important;border-radius:999px!important;background:#0f172a!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;font-weight:800!important;line-height:1!important;cursor:pointer!important;z-index:3!important;box-shadow:0 6px 18px rgba(0,0,0,.25)!important;pointer-events:auto!important;}'
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
      var p = vids[i].play(); if (p) p.catch(function(){});
    }
  }

  // ================================================================
  // 🔄 FUNÇÃO CORRIGIDA — LOOP ATIVADO + SEM FECHAMENTO AUTOMÁTICO
  // ================================================================
  function buildVideoPlayer(video, storyId, onEnded) {
  var url = getVideoUrl(video);
  var wrapper = createEl('div', 'vl-player');

  var sourceType = String(
    video.source_type || video.sourceType || ''
  ).trim().toLowerCase();

  var isNative =
    sourceType === 'upload' ||
    (url && url.indexOf('supabase.co/storage') !== -1) ||
    (typeof isDirectVideoUrl === 'function' && isDirectVideoUrl(url));

  if (isNative && url) {
    var media = createEl('video');

    media.controls = true;
    media.preload = 'auto';
    media.playsInline = true;
    media.loop = true;
    media.muted = false;

    media.setAttribute('playsinline', '');
    media.setAttribute('webkit-playsinline', '');

    var thumbnail =
      typeof getVideoThumbnail === 'function'
        ? getVideoThumbnail(video)
        : '';

    if (thumbnail) {
      media.poster = thumbnail;
    }

    media.src = url;

    media.addEventListener('play', function () {
      if (typeof trackMetric === 'function') {
        trackMetric({
          event_type: 'play',
          story_id: storyId,
          video_id: video.id,
          page_url: window.location.href
        });
      }
    });

    media.addEventListener('ended', function () {
      if (typeof onEnded === 'function') {
        onEnded();
      }
    });

    wrapper.appendChild(media);
    return wrapper;
  }

  var youtubeId =
    typeof extractYouTubeId === 'function'
      ? extractYouTubeId(url)
      : null;

  if (youtubeId) {
    var iframe = createEl('iframe');

    iframe.src =
      'https://www.youtube.com/embed/' +
      encodeURIComponent(youtubeId) +
      '?autoplay=1&playsinline=1&rel=0&loop=1&playlist=' +
      encodeURIComponent(youtubeId);

    iframe.allow =
      'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

    iframe.allowFullscreen = true;

    wrapper.appendChild(iframe);
    return wrapper;
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

  function openStory(storiesList, initialStoryIndex, storyVideoMap, activeVideos, storyProducts, products) {
    if (!overlay || !modalContent || !storiesList || !storiesList.length) return;

    pausePreviews(); 

    var currentStoryIndex = initialStoryIndex || 0;
    var currentVideoIndex = 0;

    function getOrderedVideos(s) {
      var relations = (storyVideoMap.get(s.id) || []).slice().sort(function(a,b) { return Number(a.position || 0) - Number(b.position || 0); });
      return relations.map(function(rel) { return activeVideos.find(function(v) { return idsEqual(v.id, rel.video_id); }); }).filter(Boolean);
    }

    var initialStory = storiesList[currentStoryIndex];
    var initialRels = (storyVideoMap.get(initialStory.id) || []).slice().sort(function(a,b) { return Number(a.position || 0) - Number(b.position || 0); });
    initialRels.forEach(function (rel, index) { if (rel.is_cover) currentVideoIndex = index; });

    function nextVideo() {
      var s = storiesList[currentStoryIndex]; var vids = getOrderedVideos(s);
      if (currentVideoIndex < vids.length - 1) { currentVideoIndex++; renderCurrent(); } 
      else if (currentStoryIndex < storiesList.length - 1) { currentStoryIndex++; currentVideoIndex = 0; renderCurrent(); } 
      else { closeOverlay(); }
    }

    function prevVideo() {
      if (currentVideoIndex > 0) { currentVideoIndex--; renderCurrent(); } 
      else if (currentStoryIndex > 0) {
        currentStoryIndex--; var prevS = storiesList[currentStoryIndex]; var prevVids = getOrderedVideos(prevS);
        currentVideoIndex = Math.max(0, prevVids.length - 1); renderCurrent();
      }
    }

    function renderCurrent() {
      var story = storiesList[currentStoryIndex]; if (!story) return;
      var orderedVideos = getOrderedVideos(story); if (!orderedVideos.length) { nextVideo(); return; }
      var video = orderedVideos[currentVideoIndex]; if (!video) return;

      var oldVid = modalContent.querySelector('video');
      if (oldVid) { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); }

      var modalConfig = normalizeModalAppearanceConfig(currentAppearance);
      modalContent.innerHTML = '';

      var header = createEl('div', 'vl-header');
      var headerLeft = createEl('div', 'vl-header-left');

      if (modalConfig.show_title !== false) {
        var title = createEl('div', 'vl-title'); title.textContent = story.title || story.name || 'Story';
        var count = createEl('div', 'vl-count'); count.textContent = (currentVideoIndex + 1) + '/' + orderedVideos.length;
        headerLeft.appendChild(title); headerLeft.appendChild(count);
      }
      header.appendChild(headerLeft);

      var closeBtn = createEl('button', 'vl-close');
      closeBtn.type = 'button';
      closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeOverlay(); });
      header.appendChild(closeBtn);

      var body = createEl('div', 'vl-body');
      
      var nav = createEl('div', 'vl-nav');
      var prevBtn = createEl('button', 'vl-nav-btn vl-nav-prev'); prevBtn.type = 'button'; prevBtn.addEventListener('click', prevVideo);
      var nextBtn = createEl('button', 'vl-nav-btn vl-nav-next'); nextBtn.type = 'button'; nextBtn.addEventListener('click', nextVideo);
      nav.appendChild(prevBtn); nav.appendChild(nextBtn);
      body.appendChild(nav);

      var footer = createEl('div', 'vl-footer');
      var activeProducts = storyProducts
        .filter(function (sp) { return idsEqual(sp.story_id, story.id); })
        .map(function (sp) { return products.find(function (product) { return idsEqual(product.id, sp.product_id); }); })
        .filter(function (product) { return product && (product.active === undefined || product.active); });

      if (activeProducts.length && modalConfig.show_product !== false) {
        var product = activeProducts[0];
        var productCard = createEl('div', 'vl-product');
        var productImg = createEl('img', 'vl-product-img');
        productImg.src = normalizeMediaUrl(product.image_url || product.imageUrl || ''); productImg.alt = product.name || '';

        var productInfo = createEl('div', 'vl-product-info');
        var productName = createEl('div', 'vl-product-name'); productName.textContent = product.name || '';
        var productPrice = createEl('div', 'vl-product-price'); productPrice.textContent = Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        var productBtn = createEl('div', 'vl-product-btn'); productBtn.textContent = 'Ver Produto';

        productInfo.appendChild(productName); productInfo.appendChild(productPrice); productInfo.appendChild(productBtn);
        productCard.appendChild(productImg); productCard.appendChild(productInfo);

        productCard.addEventListener('click', function (e) {
          e.stopPropagation();
          trackMetric({ event_type: 'product_click', story_id: story.id, video_id: video.id, product_id: product.id, page_url: window.location.href });
          if (product.product_url) window.open(product.product_url, '_blank', 'noopener,noreferrer');
        });
        footer.appendChild(productCard);
      }

      if (story.cta_enabled && story.cta_url) {
        var ctaBtn = createEl('button', 'vl-cta');
        ctaBtn.type = 'button'; ctaBtn.textContent = story.cta_text || 'Saiba mais';
        ctaBtn.addEventListener('click', function (e) {
          e.stopPropagation(); trackMetric({ event_type: story.cta_type === 'whatsapp' ? 'whatsapp_click' : 'cta_click', story_id: story.id, video_id: video.id, page_url: window.location.href });
          window.open(story.cta_url, '_blank', 'noopener,noreferrer');
        });
        footer.appendChild(ctaBtn);
      }

      if (footer.childNodes.length > 0) body.appendChild(footer);
      
      var playerNode = buildVideoPlayer(video, story.id, nextVideo);

body.insertBefore(playerNode, body.firstChild);
      var playerNode = buildVideoPlayer(video, story.id, nextVideo);
body.insertBefore(playerNode, body.firstChild);

var controls = createEl('div', 'vl-controls');

var playBtn = createEl('button', 'vl-control-btn');
playBtn.type = 'button';
playBtn.setAttribute('aria-label', 'Reproduzir/Pausar');
playBtn.textContent = '▶';

var muteBtn = createEl('button', 'vl-control-btn');
muteBtn.type = 'button';
muteBtn.setAttribute('aria-label', 'Ativar/Desativar Som');
muteBtn.textContent = '🔇';

var likeBtn = createEl('button', 'vl-control-btn');
likeBtn.type = 'button';
likeBtn.setAttribute('aria-label', 'Curtir');
likeBtn.textContent = '♡';

var spacer = createEl('span', 'vl-control-spacer');

var shareBtn = createEl('button', 'vl-control-btn');
shareBtn.type = 'button';
shareBtn.setAttribute('aria-label', 'Compartilhar');
shareBtn.textContent = '↗';

var shareStatus = createEl('span', 'vl-share-status');
shareStatus.textContent = 'Link copiado';

controls.appendChild(playBtn);
controls.appendChild(muteBtn);
controls.appendChild(likeBtn);
controls.appendChild(spacer);
controls.appendChild(shareStatus);
controls.appendChild(shareBtn);

body.appendChild(controls);


// Controles visuais do player
var controls = createEl('div', 'vl-controls');

var playButton = createEl('button', 'vl-control-btn');
playButton.type = 'button';
playButton.setAttribute('aria-label', 'Reproduzir ou pausar');
playButton.textContent = '▶';

var muteButton = createEl('button', 'vl-control-btn');
muteButton.type = 'button';
muteButton.setAttribute('aria-label', 'Ativar ou desativar som');
muteButton.textContent = '🔇';

var likeButton = createEl('button', 'vl-control-btn');
likeButton.type = 'button';
likeButton.setAttribute('aria-label', 'Curtir vídeo');
likeButton.textContent = '♡';

var spacer = createEl('span', 'vl-control-spacer');

var shareButton = createEl('button', 'vl-control-btn');
shareButton.type = 'button';
shareButton.setAttribute('aria-label', 'Compartilhar vídeo');
shareButton.textContent = '↗';

var shareStatus = createEl('span', 'vl-share-status');
shareStatus.textContent = 'Link copiado';

controls.appendChild(playButton);
controls.appendChild(muteButton);
controls.appendChild(likeButton);
controls.appendChild(spacer);
controls.appendChild(shareStatus);
controls.appendChild(shareButton);

body.appendChild(controls);

var newVid = playerNode.querySelector('video');

if (newVid) {
  playButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (newVid.paused) {
      newVid.play().catch(function () {});
      playButton.textContent = 'Ⅱ';
    } else {
      newVid.pause();
      playButton.textContent = '▶';
    }
  });

  muteButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    newVid.muted = !newVid.muted;
    muteButton.textContent = newVid.muted ? '🔇' : '🔊';
  });

  newVid.addEventListener('play', function () {
    playButton.textContent = 'Ⅱ';
  });

  newVid.addEventListener('pause', function () {
    playButton.textContent = '▶';
  });
} else {
  // O iframe do YouTube não pode ser controlado diretamente
  // sem utilizar a API oficial do YouTube.
  playButton.style.display = 'none';
  muteButton.style.display = 'none';
}

likeButton.addEventListener('click', function (event) {
  event.preventDefault();
  event.stopPropagation();

  var active = likeButton.classList.toggle('vl-like-active');
  likeButton.textContent = active ? '♥' : '♡';

  trackMetric({
    event_type: active ? 'like' : 'unlike',
    story_id: story.id,
    video_id: video.id,
    page_url: window.location.href
  });
});

shareButton.addEventListener('click', function (event) {
  event.preventDefault();
  event.stopPropagation();

  var shareUrl = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: story.title || story.name || 'Vídeo',
      url: shareUrl
    }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(function () {
      shareStatus.classList.add('is-visible');

      setTimeout(function () {
        shareStatus.classList.remove('is-visible');
      }, 1800);
    });
  }

  trackMetric({
    event_type: 'share',
    story_id: story.id,
    video_id: video.id,
    page_url: window.location.href
  });
});

modalContent.appendChild(header);
modalContent.appendChild(body);
     
      overlay.className = 'vl-overlay is-open';

                renderCurrent();
  }

  function setupFloatingDrag(host, handle) {
    if (!host || !handle) return;
    var dragging = false, moved = false;
    var startX = 0, startY = 0, startLeft = 0, startTop = 0;
    var hostWidth = 0, hostHeight = 0;

    setImportant(handle, 'touch-action', 'none');

    handle.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target && event.target.classList && event.target.classList.contains('vl-dismiss')) return;

      var rect = host.getBoundingClientRect();
      dragging = true; moved = false;
      startX = event.clientX; startY = event.clientY;
      startLeft = rect.left; startTop = rect.top;
      hostWidth = rect.width; hostHeight = rect.height;
    });

    window.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX, dy = event.clientY - startY;

      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      if (!moved) return;

      event.preventDefault(); floatingWasDragged = true;

      var nextLeft = Math.max(0, Math.min(window.innerWidth - hostWidth, startLeft + dx));
      var nextTop = Math.max(0, Math.min(window.innerHeight - hostHeight, startTop + dy));

      setImportant(host, 'left', px(nextLeft)); setImportant(host, 'top', px(nextTop));
      setImportant(host, 'right', 'auto'); setImportant(host, 'bottom', 'auto');
      setImportant(host, 'position', 'fixed');
    }, { passive: false });

    function stop() { dragging = false; setTimeout(function() { floatingWasDragged = false; }, 100); }
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop);
  }

  function renderFloatingBubbles(stories, storyVideoMap, activeVideos) {
    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);
    var behaviorConfig = getFloatingBehaviorConfig(appearance);

    if (floatingWasClosed) return;

    var shadowData = getOrCreateShadowRoot(appearance);
var shadow = shadowData.shadow;

var style = createEl('style');
style.textContent = buildFloatingCss(appearance, behaviorConfig) + `
  html, body {
    height: 100% !important;
    margin: 0 !important;
  }
  .vl-header,
  .vl-body > .vl-nav,
  .vl-footer {
    position: relative;
    z-index: 10;
  }
  .vl-close {
    position: relative;
    z-index: 20;
  }
`;




    var bubbles = createEl('div', 'vl-bubbles');

    if (behaviorConfig.allowClose) {
      var dismissButton = createEl('button', 'vl-dismiss');
      dismissButton.type = 'button';
      dismissButton.textContent = '×';
      dismissButton.addEventListener('click', function (event) {
        event.preventDefault(); event.stopPropagation();
        floatingWasClosed = true; 
        if (shadowData && shadowData.host) shadowData.host.remove();
      });
      bubbles.appendChild(dismissButton);
    }

    overlay = createEl('div', 'vl-overlay');
    var modal = createEl('div', 'vl-modal');
    modalContent = createEl('div');

    modal.appendChild(modalContent);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeOverlay(); });

    stories.forEach(function (story, index) {
      var relations = (storyVideoMap.get(story.id) || []).slice().sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); });
      var coverRelation = relations.find(function (item) { return item.is_cover; }) || relations[0] || null;
      var coverVideo = coverRelation ? activeVideos.find(function (video) { return idsEqual(video.id, coverRelation.video_id); }) : null;
      var thumb = getStoryThumbnail(story, coverVideo, coverRelation);

      var bubble = createEl('button', 'vl-bubble'); bubble.type = 'button';
      var ring = createEl('div', 'vl-ring'); var inner = createEl('div', 'vl-inner');

      var videoUrl = coverVideo ? getVideoUrl(coverVideo) : '';
      var isDirect = isDirectVideoUrl(videoUrl);
      var isUpload = coverVideo && (coverVideo.source_type === 'upload' || coverVideo.sourceType === 'upload');

      if ((isDirect || isUpload) && videoUrl) {
        var vidPreview = createEl('video', 'vl-img');
        vidPreview.src = videoUrl;
        vidPreview.autoplay = true; vidPreview.muted = true; vidPreview.loop = true; vidPreview.playsInline = true;
        vidPreview.setAttribute('playsinline', 'playsinline'); vidPreview.setAttribute('webkit-playsinline', 'webkit-playsinline');
        
        if (thumb) vidPreview.poster = thumb;
        var playPromise = vidPreview.play();
        if (playPromise !== undefined) {
          playPromise.catch(function() { if (thumb) { var fbImg = createEl('img', 'vl-img'); fbImg.src = thumb; inner.innerHTML = ''; inner.appendChild(fbImg); } });
        }
        inner.appendChild(vidPreview);
      } else if (thumb) {
        var img = createEl('img', 'vl-img'); img.src = thumb; img.loading = 'lazy';
        img.onerror = function () { inner.innerHTML = ''; inner.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase(); };
        inner.appendChild(img);
      } else {
        inner.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
      }

      ring.appendChild(inner);
      if (behaviorConfig.showPlayButton) { var playBadge = createEl('span', 'vl-play-badge'); ring.appendChild(playBadge); }
      bubble.appendChild(ring);

      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'vl-label'); label.textContent = story.title || story.name || 'Story'; bubble.appendChild(label);
      }

      bubble.addEventListener('click', function (event) {
        if (floatingWasDragged) { event.preventDefault(); event.stopPropagation(); return; }
        openStory(stories, index, storyVideoMap, activeVideos, readStoryProductsData, readProductsData);
      });

      bubbles.appendChild(bubble);
      trackMetric({ event_type: 'view', story_id: story.id, video_id: coverVideo ? coverVideo.id : null, page_url: window.location.href });
    });

    shadow.appendChild(style);
    shadow.appendChild(bubbles);
    shadow.appendChild(overlay);

    if (behaviorConfig.allowDrag) setupFloatingDrag(shadowData.host, bubbles);
  }

  function renderCarousel(stories, storyVideoMap, activeVideos) {} 
  
  function forceHostPosition() {
    if (floatingWasDragged || floatingWasClosed) return;
    var host = document.getElementById('vidlytics-widget-root');
    if (!host) return;
    applyHostPosition(host, currentAppearance || {});
  }

  function renderWidget() {
    return Promise.all([ readAppearance(), readStories(), readStoryVideos(), readVideos(), readStoryProducts(), readProducts(), readPageRules() ])
      .then(function (results) {
      currentAppearance = normalizeAppearanceItem(results[0] || {});
      var modalConfig = normalizeModalAppearanceConfig(currentAppearance);
      var stories = results[1] || [], storyVideos = results[2] || [], videos = results[3] || [];
      var storyProducts = results[4] || [], products = results[5] || [], pageRules = results[6] || [];

      readStoryProductsData = storyProducts; readProductsData = products;
      if (!stories.length || modalConfig.hide_stories) return;

      var activeVideos = videos.filter(function (video) {
        return ('status' in video ? video.status === 'active' : true) && ('active' in video ? video.active !== false : true) && Boolean(getVideoUrl(video));
      });
      if (!activeVideos.length) return;

      var storyVideoMap = new Map();
      storyVideos.forEach(function (item) {
        if (!storyVideoMap.has(item.story_id)) storyVideoMap.set(item.story_id, []);
        storyVideoMap.get(item.story_id).push(item);
      });

      var storiesWithVideos = stories.filter(function (story) {
        return (storyVideoMap.get(story.id) || []).some(function (rel) { return activeVideos.some(function (v) { return idsEqual(v.id, rel.video_id); }); });
      });
      if (!storiesWithVideos.length) return;

      var applicableStories = storiesWithVideos.filter(function (story) {
        var rulesForStory = pageRules.filter(function (rule) { return idsEqual(rule.story_id, story.id); });
        return !rulesForStory.length || rulesForStory.some(matchesRule);
      });
      if (!applicableStories.length) return;

      if (enableFloating) renderFloatingBubbles(applicableStories, storyVideoMap, activeVideos);
      if (enableCarousel) renderCarousel(applicableStories, storyVideoMap, activeVideos);

      forceHostPosition(); setTimeout(forceHostPosition, 100); setTimeout(forceHostPosition, 500); setTimeout(forceHostPosition, 1500);
    }).catch(function (error) { console.error('Erro no Vidlytics Widget:', error); });
  }

  function initMutationObserver() {
    if (!window.MutationObserver) return;
    var scheduled = false;
    var observer = new MutationObserver(function (mutations) {
      var shouldForce = false;
      mutations.forEach(function (m) { if (m.type === 'childList' || (m.type === 'attributes' && m.target && m.target.id === 'vidlytics-widget-root')) shouldForce = true; });
      if (shouldForce && !scheduled) { scheduled = true; setTimeout(function () { scheduled = false; forceHostPosition(); }, 150); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  function init() { try { initMutationObserver(); renderWidget(); } catch (error) { console.error('Vidlytics Widget: erro', error); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
