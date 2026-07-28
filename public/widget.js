(function () {
  var WIDGET_VERSION = '2026.07.28-02';

  console.info(
    '%cVidlytics Widget carregado — versão ' + WIDGET_VERSION,
    'color: #22c55e; font-weight: bold; font-size: 13px;'
  );

  var globalConfig =
    window.VIDLYTICS_CONFIG ||
    window.vidlyticsConfig ||
    {};

  var config =
    globalConfig.config ||
    globalConfig;

  var widgetsCfg =
    globalConfig.widgets ||
    globalConfig.widgetsConfig ||
    {};

  var supabaseUrl = String(
    globalConfig.supabaseUrl ||
    config.supabaseUrl ||
    ''
  ).replace(/\/+$/, '');

  var supabaseAnonKey =
    globalConfig.supabaseAnonKey ||
    globalConfig.anonKey ||
    config.supabaseAnonKey ||
    config.anonKey ||
    '';

  var storeId =
    globalConfig.storeId ||
    config.storeId ||
    '';

  var hasSupabase = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    storeId
  );

  if (
    window.__vidlytics_widget_loaded_version ===
    WIDGET_VERSION
  ) {
    return;
  }

  window.__vidlytics_widget_loaded_version =
    WIDGET_VERSION;

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

  var DEFAULT_APPEARANCE = {
    // ── Floating ──
    floating_position: 'bottom-right',
    floating_shape: 'portrait',
    floating_top: 20,
    floating_bottom: 20,
    floating_side: 20,
    floating_width: 80,
    floating_height: 142,
    floating_border_radius: 12,
    floating_border_width: 2,
    floating_border_color: '#0094EB',
    floating_object_fit: 'cover',
    floating_z_index: 2147483647,
    floating_show_play_button: true,
    floating_draggable: false,
    floating_closable: true,
    floating_show_title: true,

    // ── Visual ──
    primary_color: '#0094EB',
    secondary_color: '#0094EB',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    font_family: 'Inter, system-ui, sans-serif',
    font_size: '14',

    // ── Modal / Player ──
    show_title: true,
    show_play_button: true,
    show_product: true,
    show_product_button: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_whatsapp_button: true,
    show_sizing_button: true,
    hide_stories: false,
    shadow_enabled: true,

    // ── Carrossel ──
    carousel_format: 'portrait',
    carousel_size: 80,
    carousel_gap: 16,
    carousel_visible_items: 4,
    carousel_display_mode: 'preview',
    carousel_border_color: '#0094EB',
    carousel_border_width: 2,
    carousel_border_radius: 12,
    carousel_object_fit: 'cover',
    carousel_margin_top: 0,
    carousel_margin_bottom: 0,
    carousel_show_title: false,
    carousel_show_product: true,
    carousel_show_play_button: true,
    carousel_auto_center: false,

    // ── Grade ──
    grid_format: 'portrait',
    grid_size: 80,
    grid_columns: 4,
    grid_rows: 1,
    grid_gap: 16,
    grid_border_color: '#0094EB',
    grid_border_width: 2,
    grid_border_radius: 12,
    grid_object_fit: 'cover',
    grid_show_title: false
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

  function safeInt(value, fallback) {
    var num = parseInt(value);
    return isNaN(num) ? fallback : num;
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
    appearance = appearance || {};
    var rawShowPlayButton = firstDefined(appearance.floating_show_play_button, appearance.floatingShowPlayButton, appearance.show_play_button, appearance.showPlayButton);
    var rawAllowDrag = firstDefined(appearance.floating_draggable, appearance.floatingDraggable, appearance.allow_drag, appearance.allowDrag, appearance.draggable);
    var rawAllowClose = firstDefined(appearance.floating_closable, appearance.floatingClosable, appearance.allow_close, appearance.allowClose, appearance.closable);
    var rawObjectFit = firstDefined(appearance.floating_object_fit, appearance.floatingObjectFit, appearance.object_fit, appearance.objectFit);

    return {
      objectFit: rawObjectFit || DEFAULT_APPEARANCE.floating_object_fit,
      showPlayButton: toBoolean(rawShowPlayButton, true),
      allowDrag: toBoolean(rawAllowDrag, false),
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
    return fetch(supabaseUrl + '/rest/v1/' + path, { method: options.method || 'GET', headers: headers, body: options.body || undefined, cache: 'no-store' });
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

  function createComment(commentData) {
    if (!hasSupabase) return Promise.reject(new Error('Supabase não configurado.'));
    commentData = commentData || {};
    var payload = { store_id: storeId, story_id: commentData.story_id || null, video_id: commentData.video_id || null, author_name: String(commentData.author_name || '').trim(), author_email: commentData.author_email ? String(commentData.author_email).trim() : null, content: String(commentData.content || '').trim(), status: 'pending', active: true };
    if (!payload.author_name) return Promise.reject(new Error('Informe seu nome.'));
    if (!payload.content) return Promise.reject(new Error('Digite um comentário.'));

    return supabaseFetch('comments', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) })
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
    var usefulNames = [ 'floating_position', 'floating_shape', 'floating_width', 'floating_height', 'floating_radius', 'floating_top', 'floating_bottom', 'floating_side', 'primary_color', 'secondary_color' ];
    for (var i = 0; i < usefulNames.length; i += 1) { if (readAppearanceValue(appearance, [usefulNames[i]]) !== undefined) return true; }
    return false;
  }

  function extractAppearanceFromItem(item, allowDirectFields) {
    if (!item) return {}; var merged = {};
    [ item.appearance, item.aparencia, item.appearance_config, item.appearanceConfig, item.widget_appearance, item.widgetAppearance, item.widget_config, item.widgetConfig, item.settings, item.config, item.style, item.styles, item.data, item.metadata, item.customization, item.customization_config, item.theme, item.theme_config, item.floating, item.floating_config, item.floatingConfig, item.floatingAppearance, item.floating_video, item.floatingVideo, item.floatingVideoConfig, item.floatingVideoAppearance, item.carousel_config, item.carouselConfig, item.grid_config, item.gridConfig, item.player_config, item.playerConfig, item.modal_config, item.modalConfig, item.colors_config, item.colorsConfig ].forEach(function (src) { flattenAppearanceInto(merged, src, 0); });

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

  function tryTable(tableName) {
    if (!storeId || !hasSupabase) return Promise.resolve(null);
    var query = tableName + '?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1';
    return supabaseFetch(query, { method: 'GET' })
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) return data[0];
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  // ✅ CORRIGIDO: busca apenas da tabela unificada "appearance"
  function fetchDbAppearance() {
    if (!storeId || !hasSupabase) return Promise.resolve({});
    return tryTable('appearance').then(function (dbAppearance) {
      return normalizeAppearanceItem(dbAppearance || {});
    });
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
    if (shape === 'square') { defaultWidth = 80; defaultHeight = 80; }
    if (shape === 'circle') { defaultWidth = 80; defaultHeight = 80; }

    var widthNumber = toNumber(getValue(['floating_width', 'width'], defaultWidth), defaultWidth);
    var heightNumber = toNumber(getValue(['floating_height', 'height'], defaultHeight), defaultHeight);
    if (shape === 'square' || shape === 'circle') heightNumber = widthNumber;

    var borderWidthNumber = toNumber(getValue(['floating_border_width', 'border_width'], DEFAULT_APPEARANCE.floating_border_width), DEFAULT_APPEARANCE.floating_border_width);
    var radiusNumber = toNumber(getValue(['floating_border_radius', 'floating_radius', 'border_radius', 'radius'], DEFAULT_APPEARANCE.floating_border_radius), DEFAULT_APPEARANCE.floating_border_radius);
    if (shape === 'circle') radiusNumber = 999;

    var topNumber = toNumber(getValue(['floating_top', 'top'], DEFAULT_APPEARANCE.floating_top), DEFAULT_APPEARANCE.floating_top);
    var bottomNumber = toNumber(getValue(['floating_bottom', 'bottom'], DEFAULT_APPEARANCE.floating_bottom), DEFAULT_APPEARANCE.floating_bottom);
    var sideNumber = toNumber(getValue(['floating_side', 'side'], DEFAULT_APPEARANCE.floating_side), DEFAULT_APPEARANCE.floating_side);
    var zIndexNumber = toNumber(getValue(['floating_z_index', 'z_index', 'zIndex'], DEFAULT_APPEARANCE.floating_z_index), DEFAULT_APPEARANCE.floating_z_index);

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
    appearance = appearance || {};

    if (appearance.appearance && typeof appearance.appearance === 'object') {
      appearance = appearance.appearance;
    }

    if (appearance.data && typeof appearance.data === 'object') {
      appearance = appearance.data;
    }

    function parseConfig(value) {
      if (!value) return {};
      if (typeof value === 'string') { try { return JSON.parse(value); } catch (e) { return {}; } }
      if (typeof value === 'object') return value;
      return {};
    }

    var modalConfig = parseConfig(
      appearance.modal_config ||
      appearance.modalConfig ||
      appearance.player_config ||
      appearance.playerConfig
    );

    function getBoolean(keys, fallback) {
      var i; var value;
      for (i = 0; i < keys.length; i++) {
        value = modalConfig[keys[i]];
        if (value !== undefined && value !== null && value !== '') return value === true || value === 'true' || value === 1 || value === '1';
      }
      for (i = 0; i < keys.length; i++) {
        value = appearance[keys[i]];
        if (value !== undefined && value !== null && value !== '') return value === true || value === 'true' || value === 1 || value === '1';
      }
      return fallback;
    }

    return {
      show_title: getBoolean(['show_title', 'showTitle'], true),
      show_play_button: getBoolean(['show_play_button', 'showPlayButton'], true),
      show_product: getBoolean(['show_product', 'showProduct'], true),
      show_product_button: getBoolean(['show_product_button', 'showProductButton'], true),
      show_like_button: getBoolean(['show_like_button', 'showLikeButton'], true),
      show_comment_button: getBoolean(['show_comment_button', 'showCommentsButton', 'show_comments_button'], true),
      show_share_button: getBoolean(['show_share_button', 'showShareButton'], true),
      show_whatsapp_button: getBoolean(['show_whatsapp_button', 'showWhatsappButton'], true),
      show_sizing_button: getBoolean(['show_sizing_button', 'showSizingButton'], true),
      hide_stories: getBoolean(['hide_stories', 'hideStories'], false),
      shadow_enabled: getBoolean(['shadow_enabled', 'shadowEnabled'], true)
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
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
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

    return supabaseFetch('metrics', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) })
      .then(function (response) { if (response.ok) return { saved: true, payload: payload }; return { saved: false, payload: payload }; })
      .catch(function () { return { saved: false, payload: payload }; });
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
  function readComments() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_comments', []));
    var query = 'comments?select=id,store_id,story_id,video_id,author_name,content,status,active,created_at,reply_content,replied_at,reply_status&store_id=eq.' + encodeURIComponent(storeId) + '&status=eq.approved&active=eq.true&order=created_at.asc';
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
    if (!storeId || !hasSupabase) return Promise.resolve([]);
    var params = new URLSearchParams();
    params.set('select', 'video_id,visitor_id');
    params.set('store_id', 'eq.' + String(storeId).trim());
    return supabaseFetch('video_likes?' + params.toString(), { method: 'GET' })
      .then(function (response) { if (!response.ok) return []; return response.json(); })
      .then(function (data) { return Array.isArray(data) ? data : []; })
      .catch(function () { return []; });
  }

  function readSizingModels() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_sizing_models', []));
    return fetchJson('sizing_models?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }
