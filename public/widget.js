(function () {
    var WIDGET_VERSION = '2026.07.21-08';

  console.info(
    '%cVidlytics Widget carregado — versão ' + WIDGET_VERSION,
    'color: #22c55e; font-weight: bold; font-size: 13px;'
  );

  window.VIDLYTICS_WIDGET_VERSION = WIDGET_VERSION;

  console.log(
    'VIDLYTICS WIDGET CARREGADO - FIX LOOP + NO AUTO CLOSE - 202607161909'
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

  var VIDLYTICS_WIDGET_VERSION =
    'yampi-conversion-202607190001';

  if (
    window.__vidlytics_widget_loaded_version ===
    VIDLYTICS_WIDGET_VERSION
  ) {
    return;
  }

  window.__vidlytics_widget_loaded_version =
    VIDLYTICS_WIDGET_VERSION;

  try {
    var oldRoot = document.getElementById('vidlytics-widget-root');
    if (oldRoot) oldRoot.remove();
    var oldCarousel = document.getElementById('vidlytics-carousel-root');
    if (oldCarousel) oldCarousel.remove();
  } catch (e) {}

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
  var readCommentsData = [];
  var readSizingModelsData = [];
  var readLikeCounts = {}; // Mapeia videoId -> total real de curtidas

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
    appearance = appearance || {};
    var rawShowPlayButton = firstDefined(appearance.floating_show_play_button, appearance.floatingShowPlayButton, appearance.show_play_button, appearance.showPlayButton);
    var rawAllowDrag = firstDefined(appearance.floating_draggable, appearance.floatingDraggable, appearance.allow_drag, appearance.allowDrag, appearance.draggable);
    var rawAllowClose = firstDefined(appearance.floating_closable, appearance.floatingClosable, appearance.allow_close, appearance.allowClose, appearance.closable);
    var rawObjectFit = firstDefined(appearance.floating_object_fit, appearance.floatingObjectFit, appearance.object_fit, appearance.objectFit);
    
    return {
      objectFit: rawObjectFit || 'cover',
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
  if (!hasSupabase) {
    return Promise.reject(
      new Error('Supabase não configurado.')
    );
  }

  options = options || {};

  var headers = {
    'apikey': supabaseAnonKey,
    'Authorization': 'Bearer ' + supabaseAnonKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  };

  if (options.headers) {
    Object.keys(options.headers).forEach(function (key) {
      headers[key] = options.headers[key];
    });
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
  if (!hasSupabase) {
    return Promise.reject(
      new Error('Supabase não configurado.')
    );
  }

  commentData = commentData || {};

  var payload = {
    store_id: storeId,
    story_id: commentData.story_id || null,
    video_id: commentData.video_id || null,
    author_name: String(commentData.author_name || '').trim(),
    author_email: commentData.author_email
      ? String(commentData.author_email).trim()
      : null,
    content: String(commentData.content || '').trim(),
    status: 'pending',
    active: true
  };

  if (!payload.author_name) {
    return Promise.reject(
      new Error('Informe seu nome.')
    );
  }

  if (!payload.content) {
    return Promise.reject(
      new Error('Digite um comentário.')
    );
  }

  return supabaseFetch('comments', {
    method: 'POST',
    headers: {
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  })
    .then(function (response) {
      if (response.ok) {
        return true;
      }

      return response.text().then(function (rawMessage) {
        var parsed = {};

        try {
          parsed = JSON.parse(rawMessage || '{}');
        } catch (error) {
          parsed = {};
        }

        console.error(
          'Erro completo ao enviar comentário para o Supabase:',
          {
            status: response.status,
            statusText: response.statusText,
            body: rawMessage,
            payload: payload
          }
        );

        if (response.status === 401) {
          throw new Error(
            'A chave pública ou a URL do Supabase são inválidas.'
          );
        }

        if (
          response.status === 403 ||
          parsed.code === '42501'
        ) {
          throw new Error(
            'Inserção bloqueada pelas políticas RLS da tabela comments.'
          );
        }

        throw new Error(
          parsed.message ||
          parsed.error_description ||
          parsed.hint ||
          parsed.details ||
          'Não foi possível enviar o comentário.'
        );
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
      // Prioriza a que estiver marcada como is_default=true
      var path = tableName + '?select=*&store_id=eq.' + encodeURIComponent(storeId) + (extraQuery || '') + '&order=is_default.desc,updated_at.desc.nullslast,created_at.desc.nullslast&limit=1';
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
      console.info('[Vidlytics] Aparência carregada', {
        url: finalAppearance.url || '',
        type: finalAppearance.type || '',
        storeId: storeId,
        pathname: window.location.pathname,
        href: window.location.href
      });
      return normalizeAppearanceItem(finalAppearance);
    }).catch(function () {
      var finalAppearance = {};
      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, storageAppearance);
      console.info('[Vidlytics] Aparência carregada via fallback', {
        url: finalAppearance.url || '',
        type: finalAppearance.type || '',
        storeId: storeId,
        pathname: window.location.pathname,
        href: window.location.href
      });
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
  appearance = appearance || {};

  // Em algumas APIs a aparência pode estar embrulhada nesses objetos.
  if (appearance.appearance && typeof appearance.appearance === 'object') {
    appearance = appearance.appearance;
  }

  if (appearance.data && typeof appearance.data === 'object') {
    appearance = appearance.data;
  }

  function parseConfig(value) {
    if (!value) return {};

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.warn('[Vidlytics] modal_config inválido:', value);
        return {};
      }
    }

    if (typeof value === 'object') {
      return value;
    }

    return {};
  }

  var modalConfig = parseConfig(
    appearance.modal_config ||
    appearance.modalConfig ||
    appearance.player_config ||
    appearance.playerConfig
  );

  function getBoolean(keys, fallback) {
    var i;
    var value;

    // Primeiro procura no modal_config JSON.
    for (i = 0; i < keys.length; i++) {
      value = modalConfig[keys[i]];

      if (value !== undefined && value !== null && value !== '') {
        return value === true || value === 'true' || value === 1 || value === '1';
      }
    }

    // Depois procura diretamente na linha de widget_appearances.
    for (i = 0; i < keys.length; i++) {
      value = appearance[keys[i]];

      if (value !== undefined && value !== null && value !== '') {
        return value === true || value === 'true' || value === 1 || value === '1';
      }
    }

    return fallback;
  }

  return {
    show_title: getBoolean(['show_title', 'showTitle'], true),
    show_play_button: getBoolean(['show_play_button', 'showPlayButton'], true),
    show_product: getBoolean(['show_product', 'showProduct'], true),
    show_product_button: getBoolean(['show_product_button', 'showProductButton'], true),
    show_like_button: getBoolean(['show_like_button', 'showLikeButton'], true),
    show_comment_button: getBoolean(['show_comment_button', 'showCommentsButton'], true),
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

  /*
   * Mantém uma cópia local apenas como contingência.
   * O dashboard deve ler a tabela metrics no Supabase.
   */
  var fallbackMetrics = getStorageItem('vidlytics_metrics', []);

  if (!Array.isArray(fallbackMetrics)) {
    fallbackMetrics = [];
  }

  fallbackMetrics.push(payload);
  setStorageItem('vidlytics_metrics', fallbackMetrics);

  if (!hasSupabase) {
    console.warn(
      '[Vidlytics] Métrica salva somente localmente: Supabase não configurado.',
      payload
    );

    return Promise.resolve({
      saved: false,
      local: true,
      payload: payload
    });
  }

  return supabaseFetch('metrics', {
    method: 'POST',
    headers: {
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  })
    .then(function (response) {
      if (response.ok) {
        console.info(
          '[Vidlytics] Métrica registrada no Supabase:',
          payload.event_type
        );
        return { saved: true, payload: payload };
      }

      return response.text().then(function (rawMessage) {
        console.error(
          '[Vidlytics] Erro ao registrar métrica no Supabase:',
          {
            status: response.status,
            body: rawMessage,
            event_type: payload.event_type
          }
        );
        return { saved: false, payload: payload };
      });
    })
    .catch(function (error) {
      console.error(
        '[Vidlytics] A métrica não foi salva no Supabase:',
        error
      );
      return { saved: false, payload: payload };
    });
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
  if (!storeId || !hasSupabase) {
    return Promise.resolve(getStorageItem('vidlytics_comments', []));
  }

  var query =
    'comments?select=id,store_id,story_id,video_id,author_name,content,status,active,created_at,reply_content,replied_at,reply_status' +
    '&store_id=eq.' +
    encodeURIComponent(storeId) +
    '&status=eq.approved' +
    '&active=eq.true' +
    '&order=created_at.asc';

  return fetchJson(query);
}

function readPageRules() {
  if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_page_rules', []));
  return fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&active=is.true');
}

function readDisplayLocations() {
  if (!storeId || !hasSupabase) {
    return Promise.resolve(getStorageItem('vidlytics_display_locations', []));
  }
  return fetchJson(
    'display_locations?select=*&store_id=eq.' +
    encodeURIComponent(storeId) +
    '&active=is.true'
  );
}

  function readLikesFromDb() {
  if (!storeId || !hasSupabase) {
    console.warn(
      '[Vidlytics] readLikesFromDb: Supabase ou storeId ausente.',
      {
        storeId: storeId,
        hasSupabase: hasSupabase
      }
    );

    return Promise.resolve([]);
  }

  /*
   * URLSearchParams evita erros como:
   * - &amp;
   * - barras invertidas (\)
   * - parâmetros concatenados incorretamente
   */
  var params = new URLSearchParams();

params.set('select', 'video_id,visitor_id');
  params.set('store_id', 'eq.' + String(storeId).trim());

  var path = 'video_likes?' + params.toString();

  console.log(
    '[Vidlytics] Consultando curtidas no Supabase:',
    path
  );

  return supabaseFetch(path, { method: 'GET' })
    .then(function (response) {
      if (!response.ok) {
        return response.text().then(function (rawMessage) {
          console.error(
            '[Vidlytics] Falha ao ler video_likes:',
            {
              status: response.status,
              statusText: response.statusText,
              body: rawMessage,
              path: path
            }
          );

          return [];
        });
      }

      return response.json();
    })
    .then(function (data) {
      var likes = Array.isArray(data) ? data : [];

      console.log(
        '[Vidlytics] Curtidas carregadas do banco:',
        {
          total: likes.length,
          likes: likes
        }
      );

      return likes;
    })
    .catch(function (error) {
      console.error(
        '[Vidlytics] Erro inesperado ao ler video_likes:',
        error
      );

      return [];
    });
}

  function readSizingModels() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_sizing_models', []));
    return fetchJson('sizing_models?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  // ============================================================
  // 🟢 FUNÇÃO CORRIGIDA — matchesRule com suporte completo
  // Inclui: not_equals, starts_with, ends_with, regex
  // e usa os nomes reais das colunas do banco
  // ============================================================
  function matchesRule(rule) {
  if (!rule || rule.active === false) return false;

  var href = window.location.href;
  var path = window.location.pathname || '/';

  var conditionType = String(
    firstDefined(
      rule.condition_type,
      rule.rule_type,
      rule.match_type
    ) || ''
  ).trim();

  var value = String(
    firstDefined(
      rule.url_pattern,
      rule.page_url,
      rule.value
    ) || ''
  ).trim();

  if (!conditionType) return true;

  switch (conditionType) {
    case 'all_pages':
      return true;
    case 'home_only':
      return path === '/' || path === '/home' || path === '/index.html' || path === '';
    case 'product_pages':
      return path.indexOf('/product') !== -1 || path.indexOf('/produto') !== -1;
    case 'category_pages':
      return path.indexOf('/category') !== -1 || path.indexOf('/categoria') !== -1 || path.indexOf('/colecao') !== -1;
    case 'contains':
      return href.indexOf(value) !== -1 || path.indexOf(value) !== -1;
    case 'equals':
      return href === value || path === value;
    case 'not_equals':
      return href !== value && path !== value;
    case 'starts_with':
      return href.indexOf(value) === 0 || path.indexOf(value) === 0;
    case 'ends_with':
      return href.endsWith(value) || path.endsWith(value);
    case 'regex':
      try { return new RegExp(value).test(href); } catch (e) { return false; }
    default:
      console.warn('[Vidlytics] condition_type desconhecido:', conditionType);
      return true;
  }
}


  function matchesUrl(appearance) {
    if (!appearance) return true;
    var rawUrl = firstDefined(appearance.url, appearance.pageUrl, appearance.page_url);
    if (!rawUrl || String(rawUrl).trim() === '') return true; // vazio = todas as páginas

    var pattern = String(rawUrl).trim().toLowerCase();
    var href = window.location.href.toLowerCase();
    var path = (window.location.pathname || '/').toLowerCase();
    var search = (window.location.search || '').toLowerCase();
    var fullPath = (path + search).replace(/\/+$/, '');

    // Suporta múltiplas URLs separadas por vírgula
    var patterns = pattern.split(',').map(function (p) { return p.trim(); }).filter(Boolean);

    return patterns.some(function (p) {
      var normalizedPattern = p.replace(/\/+$/, '').replace(/^https?:\/\/[^/]+/i, '');
      if (!normalizedPattern) return false;

      if (normalizedPattern === '/' || normalizedPattern === 'all' || normalizedPattern === 'todas' || normalizedPattern === 'all_pages') {
        return true;
      }

      return (
        href.indexOf(normalizedPattern) !== -1 ||
        fullPath.indexOf(normalizedPattern) !== -1 ||
        path.indexOf(normalizedPattern) !== -1 ||
        normalizedPattern.indexOf(path) !== -1
      );
    });
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

  function getYouTubeThumbnail(url) {
    var id = extractYouTubeId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function getThumbnailFromObject(obj) {
    if (!obj) return '';
    var meta = parseJsonIfNeeded(firstDefined(obj.metadata, obj.meta, obj.extra, obj.data, {}));
    return normalizeMediaUrl(firstDefined(
      obj.thumbnail_url,
      obj.thumbnailUrl,
      obj.thumbnail,
      obj.cover_url,
      obj.coverUrl,
      obj.cover,
      obj.poster_url,
      obj.posterUrl,
      obj.poster,
      obj.image_url,
      obj.imageUrl,
      obj.image,
      obj.url,
      obj.src,
      meta.thumbnail_url,
      meta.thumbnailUrl,
      meta.thumbnail,
      meta.cover_url,
      meta.coverUrl,
      meta.cover,
      meta.poster_url,
      meta.posterUrl,
      meta.poster,
      meta.image_url,
      meta.imageUrl,
      meta.image,
      meta.url,
      meta.src,
      ''
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
  var primary = getPrimaryColor(appearance);
  var secondary = getSecondaryColor(appearance);
  var buttonColor = getButtonColor(appearance);

  var textColor =
    readAppearanceValue(appearance, ['text_color', 'textColor']) || '#0f172a';

  var bgColor =
    readAppearanceValue(appearance, ['background_color', 'backgroundColor']) ||
    '#ffffff';

  var modalBackground =
    readAppearanceValue(appearance, [
      'modal_background_color',
      'modalBackgroundColor',
      'background_color',
      'backgroundColor'
    ]) || bgColor;

  var modalText =
    readAppearanceValue(appearance, [
      'modal_text_color',
      'modalTextColor',
      'text_color',
      'textColor'
    ]) || textColor;

  var modalBorder =
    readAppearanceValue(appearance, [
      'modal_border_color',
      'modalBorderColor'
    ]) || 'rgba(15,23,42,.12)';

  var modalMuted =
    readAppearanceValue(appearance, [
      'modal_muted_color',
      'modalMutedColor'
    ]) || '#64748b';

  var font = getFontFamily(appearance);

  var fontSize =
    readAppearanceValue(appearance, ['font_size', 'fontSize']) || '14';

  var modalConfig = normalizeModalAppearanceConfig(appearance);

  var shadow =
    modalConfig.shadow_enabled !== false
      ? '0 24px 80px rgba(15,23,42,.24)'
      : 'none';

  return (
    '*,*::before,*::after{box-sizing:border-box!important;}'

    /* OVERLAY */
    + '.vl-overlay{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;'
    + 'background:rgba(15,23,42,.62)!important;display:none!important;align-items:center!important;justify-content:center!important;'
    + 'z-index:' + cfg.zIndex + '!important;font-family:' + font + '!important;'
    + 'font-size:' + toNumber(fontSize, 14) + 'px!important;}'

    + '.vl-overlay.is-open{display:flex!important;}'

    /* MODAL */
    + '.vl-modal{position:relative!important;width:100%!important;max-width:420px!important;'
    + 'height:100%!important;min-height:0!important;max-height:100vh!important;overflow:hidden!important;'
    + 'background:' + modalBackground + '!important;'
    + 'box-shadow:' + shadow + '!important;display:flex!important;flex-direction:column!important;'
    + 'border-radius:0!important;color:' + modalText + '!important;}'

    + '.vl-modal>div{position:relative!important;display:flex!important;'
    + 'flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;'
    + 'width:100%!important;height:100%!important;}'

    + '@media(min-width:640px){'
    + '.vl-modal{height:auto!important;aspect-ratio:9/16!important;'
    + 'max-height:90vh!important;border-radius:36px!important;}'
    + '}'

    /* PROGRESS */
    + '.vl-progress{position:absolute!important;top:12px!important;left:0!important;right:0!important;'
    + 'z-index:50!important;display:flex!important;gap:6px!important;padding:0 16px!important;}'

    + '.vl-progress-bar{height:2px!important;flex:1!important;border-radius:999px!important;'
    + 'background:rgba(255,255,255,.25)!important;overflow:hidden!important;}'

    + '.vl-progress-fill{height:100%!important;border-radius:999px!important;'
    + 'background:' + primary + '!important;transition:width .3s ease!important;}'

    /* HEADER DO STORIES */
    + '.vl-header{position:absolute!important;top:0!important;left:0!important;right:0!important;'
    + 'z-index:40!important;width:100%!important;display:flex!important;'
    + 'align-items:flex-start!important;justify-content:space-between!important;'
    + 'padding:20px 16px 16px!important;'
    + 'background:linear-gradient(to bottom,rgba(0,0,0,.7),transparent)!important;'
    + 'pointer-events:none!important;}'

    + '.vl-header-left{display:flex!important;flex-direction:column!important;gap:2px!important;'
    + 'min-width:0!important;flex:1!important;padding-right:48px!important;pointer-events:auto!important;}'

    + '.vl-title{font-weight:800!important;color:#fff!important;font-size:13px!important;'
    + 'white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;'
    + 'text-shadow:0 1px 3px rgba(0,0,0,.5)!important;}'

    + '.vl-count{font-size:10px!important;font-weight:700!important;'
    + 'color:rgba(255,255,255,.65)!important;text-transform:uppercase!important;}'

    + '.vl-header-actions{display:flex!important;align-items:center!important;'
    + 'gap:8px!important;pointer-events:auto!important;flex-shrink:0!important;}'

    + '.vl-control,.vl-close{all:unset!important;box-sizing:border-box!important;'
    + 'flex-shrink:0!important;width:32px!important;height:32px!important;border-radius:999px!important;'
    + 'background:rgba(0,0,0,.4)!important;backdrop-filter:blur(12px)!important;'
    + 'display:flex!important;align-items:center!important;justify-content:center!important;'
    + 'cursor:pointer!important;color:#fff!important;pointer-events:auto!important;'
    + 'border:1px solid rgba(255,255,255,.8)!important;}'

    + '.vl-control:hover,.vl-close:hover{background:rgba(0,0,0,.6)!important;}'

    + '.vl-control svg,.vl-close svg{width:18px!important;height:18px!important;'
    + 'display:block!important;pointer-events:none!important;fill:none!important;'
    + 'stroke:currentColor!important;stroke-width:1.7!important;'
    + 'stroke-linecap:round!important;stroke-linejoin:round!important;}'

    /* VÍDEO */
    + '.vl-body{position:relative!important;display:block!important;flex:1 1 auto!important;'
    + 'width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;}'

    + '.vl-player{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;'
    + 'min-height:100%!important;z-index:1!important;background:#000!important;}'

    + '.vl-player video,.vl-player iframe{position:absolute!important;top:0!important;left:0!important;'
    + 'width:100%!important;height:100%!important;border:0!important;display:block!important;'
    + 'object-fit:cover!important;visibility:visible!important;opacity:1!important;z-index:2!important;}'

    /* NAVEGAÇÃO */
    + '.vl-nav{position:absolute!important;inset:0!important;display:flex!important;z-index:30!important;}'
    + '.vl-nav-btn{all:unset!important;height:100%!important;cursor:pointer!important;}'
    + '.vl-nav-prev{width:30%!important;}'
    + '.vl-nav-next{width:70%!important;}'

    /* AÇÕES SOCIAIS */
    + '.vl-social{position:absolute!important;top:61%!important;right:12px!important;'
    + 'transform:translateY(-50%)!important;z-index:45!important;display:flex!important;'
    + 'flex-direction:column!important;align-items:center!important;gap:12px!important;}'

    + '.vl-social-btn{all:unset!important;width:36px!important;height:36px!important;'
    + 'min-width:36px!important;min-height:36px!important;border-radius:999px!important;'
    + 'border:1px solid rgba(255,255,255,.8)!important;background:rgba(0,0,0,.1)!important;'
    + 'backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;'
    + 'justify-content:center!important;color:#fff!important;cursor:pointer!important;'
    + 'flex-shrink:0!important;padding:0!important;}'

    + '.vl-social-btn svg{width:18px!important;height:18px!important;}'
    + '.vl-social-btn:hover{background:rgba(0,0,0,.25)!important;}'

    + '.vl-social-count{font-size:10px!important;font-weight:800!important;color:#fff!important;'
    + 'text-shadow:0 1px 2px rgba(0,0,0,.5)!important;margin-top:-8px!important;line-height:1!important;}'

    + '.vl-social-btn.whatsapp{background:#25d366!important;border-color:#25d366!important;}'

    /* PAINEL DE COMENTÁRIOS — CORES CONTROLADAS PELA APARÊNCIA */
   + '.vl-comments-panel{'
+ 'position:absolute!important;'
+ 'z-index:70!important;'
+ 'display:none!important;'
+ 'flex-direction:column!important;'
+ 'top:50%!important;'
+ 'left:50%!important;'
+ 'transform:translate(-50%,-50%)!important;'
+ 'width:calc(100% - 40px)!important;'
+ 'max-width:306px!important;'
+ 'max-height:72%!important;'
+ 'overflow:hidden!important;'
+ 'background:' + modalBackground + '!important;'
+ 'padding:18px!important;'
+ 'color:' + modalText + '!important;'
+ 'border-radius:24px!important;'
+ 'box-shadow:0 18px 50px rgba(0,0,0,.32)!important;'
+ '}'


    + '.vl-comments-panel.is-open{display:flex!important;}'

    + '.vl-comments-header{display:flex!important;align-items:center!important;'
+ 'justify-content:space-between!important;padding:0 0 14px!important;'
+ 'border-bottom:1px solid ' + modalBorder + '!important;}'


    + '.vl-comments-title{font-size:17px!important;font-weight:800!important;'
    + 'color:' + modalText + '!important;}'

    + '.vl-comments-close{all:unset!important;width:36px!important;height:36px!important;'
    + 'border-radius:999px!important;background:' + modalBorder + '!important;'
    + 'display:flex!important;align-items:center!important;justify-content:center!important;'
    + 'cursor:pointer!important;color:' + modalText + '!important;font-size:20px!important;}'

    + '.vl-comments-close:hover{background:' + primary + '!important;color:#fff!important;}'

    + '.vl-comments-list{flex:1!important;min-height:0!important;overflow-y:auto!important;padding:14px 0!important;}'


    + '.vl-comment-item{padding:12px!important;margin-bottom:10px!important;'
    + 'border-radius:14px!important;background:' + modalBorder + '!important;}'

    + '.vl-comment-author{font-size:12px!important;font-weight:800!important;'
    + 'color:' + primary + '!important;margin-bottom:5px!important;}'

    + '.vl-comment-content{font-size:14px!important;line-height:1.45!important;'
    + 'color:' + modalText + '!important;word-break:break-word!important;}'

    + '.vl-comment-reply{margin-top:10px!important;padding:10px 12px!important;'
    + 'border-left:3px solid ' + primary + '!important;border-radius:8px!important;'
    + 'background:' + modalBorder + '!important;}'

    + '.vl-comment-reply-label{font-size:11px!important;font-weight:800!important;'
    + 'color:' + primary + '!important;margin-bottom:4px!important;}'

    + '.vl-comment-reply-content{font-size:13px!important;line-height:1.4!important;'
    + 'color:' + modalText + '!important;word-break:break-word!important;}'

    + '.vl-comments-empty{padding:40px 10px!important;text-align:center!important;'
    + 'font-size:14px!important;color:' + modalMuted + '!important;}'

    + '.vl-comments-form{display:flex!important;flex-direction:column!important;gap:8px!important;'
    + 'border-top:1px solid ' + modalBorder + '!important;padding-top:14px!important;}'

    + '.vl-comments-input{all:unset!important;width:100%!important;box-sizing:border-box!important;'
    + 'border-radius:11px!important;background:' + modalBorder + '!important;'
    + 'color:' + modalText + '!important;padding:11px!important;font-size:14px!important;'
    + 'border:1px solid transparent!important;}'

    + '.vl-comments-input:focus{border-color:' + primary + '!important;}'

    + '.vl-comments-input::placeholder{color:' + modalMuted + '!important;}'

    + '.vl-comments-textarea{min-height:76px!important;resize:none!important;}'
        + '.vl-comments-editor{position:relative!important;width:100%!important;}'

    + '.vl-comments-editor .vl-comments-textarea{'
    + 'display:block!important;width:100%!important;'
    + 'padding-right:52px!important;'
    + '}'

    + '.vl-emoji-button{all:unset!important;'
    + 'position:absolute!important;right:10px!important;bottom:10px!important;'
    + 'width:32px!important;height:32px!important;'
    + 'border:2px solid ' + modalText + '!important;'
    + 'border-radius:999px!important;'
    + 'background:' + modalBackground + '!important;'
    + 'color:' + modalText + '!important;'
    + 'display:flex!important;align-items:center!important;'
    + 'justify-content:center!important;'
    + 'font-size:19px!important;line-height:1!important;'
    + 'cursor:pointer!important;z-index:4!important;}'

    + '.vl-emoji-button:hover{'
    + 'background:' + modalBorder + '!important;'
    + 'transform:scale(1.04)!important;}'

    + '.vl-emoji-picker{'
    + 'position:absolute!important;right:0!important;'
    + 'bottom:calc(100% + 8px)!important;'
    + 'width:100%!important;max-height:150px!important;'
    + 'overflow-y:auto!important;'
    + 'display:none!important;'
    + 'grid-template-columns:repeat(6,1fr)!important;'
    + 'gap:7px!important;padding:10px!important;'
    + 'background:' + modalBackground + '!important;'
    + 'border:1px solid ' + modalBorder + '!important;'
    + 'border-radius:16px!important;'
    + 'box-shadow:0 12px 35px rgba(15,23,42,.18)!important;'
    + 'z-index:20!important;}'

    + '.vl-emoji-picker.is-open{display:grid!important;}'

    + '.vl-emoji-item{all:unset!important;'
    + 'width:100%!important;min-height:32px!important;'
    + 'display:flex!important;align-items:center!important;'
    + 'justify-content:center!important;'
    + 'border-radius:9px!important;font-size:22px!important;'
    + 'line-height:1!important;cursor:pointer!important;}'

    + '.vl-emoji-item:hover{'
    + 'background:' + modalBorder + '!important;'
    + 'transform:scale(1.12)!important;}'


    + '.vl-comments-submit{all:unset!important;box-sizing:border-box!important;width:100%!important;'
    + 'text-align:center!important;border-radius:11px!important;padding:12px!important;'
    + 'background:' + buttonColor + '!important;color:#fff!important;font-size:14px!important;'
    + 'font-weight:800!important;cursor:pointer!important;}'

    + '.vl-comments-submit:hover{filter:brightness(.95)!important;}'
    + '.vl-comments-submit:disabled{opacity:.6!important;cursor:wait!important;}'

    + '.vl-comments-feedback{min-height:18px!important;text-align:center!important;'
    + 'font-size:12px!important;color:' + modalMuted + '!important;}'

        /* PAINEL DE MEDIDAS — CARD FLUTUANTE */
    + '.vl-sizing-panel{'
    + 'position:absolute!important;'
    + 'z-index:70!important;'
    + 'display:none!important;'
    + 'flex-direction:column!important;'
    + 'top:50%!important;'
    + 'left:50%!important;'
    + 'transform:translate(-50%,-50%)!important;'
    + 'width:calc(100% - 40px)!important;'
    + 'max-width:340px!important;'
    + 'max-height:62%!important;'
    + 'overflow:hidden!important;'
    + 'background:' + modalBackground + '!important;'
    + 'padding:0!important;'
    + 'color:' + modalText + '!important;'
    + 'border-radius:24px!important;'
    + 'box-shadow:0 18px 50px rgba(0,0,0,.32)!important;'
    + '}'

    + '.vl-sizing-panel.is-open{display:flex!important;}'

    + '.vl-sizing-header{'
    + 'display:flex!important;'
    + 'align-items:center!important;'
    + 'justify-content:space-between!important;'
    + 'padding:18px 18px 8px!important;'
    + 'border:0!important;'
    + '}'

    + '.vl-sizing-title{'
    + 'font-size:11px!important;'
    + 'font-weight:900!important;'
    + 'letter-spacing:.08em!important;'
    + 'text-transform:uppercase!important;'
    + 'color:' + primary + '!important;'
    + '}'

    + '.vl-sizing-close{'
    + 'all:unset!important;'
    + 'width:36px!important;'
    + 'height:36px!important;'
    + 'border-radius:999px!important;'
    + 'background:#f1f5f9!important;'
    + 'display:flex!important;'
    + 'align-items:center!important;'
    + 'justify-content:center!important;'
    + 'cursor:pointer!important;'
    + 'color:#334155!important;'
    + 'font-size:25px!important;'
    + 'line-height:1!important;'
    + '}'

    + '.vl-sizing-close:hover{'
    + 'background:' + primary + '!important;'
    + 'color:#fff!important;'
    + '}'

    + '.vl-sizing-content{'
    + 'flex:1!important;'
    + 'overflow-y:auto!important;'
    + 'padding:0 18px 18px!important;'
    + '}'

    + '.vl-sizing-table{'
    + 'width:100%!important;'
    + 'border-collapse:separate!important;'
    + 'border-spacing:0 9px!important;'
    + 'margin:6px 0 0!important;'
    + 'font-size:14px!important;'
    + '}'

    + '.vl-sizing-table thead{display:none!important;}'

    + '.vl-sizing-table td{'
    + 'padding:14px 12px!important;'
    + 'border:0!important;'
    + 'background:#f6f8fb!important;'
    + 'font-weight:800!important;'
    + 'color:' + modalText + '!important;'
    + '}'

    + '.vl-sizing-table td:first-child{'
    + 'border-radius:14px 0 0 14px!important;'
    + 'color:#475569!important;'
    + '}'

    + '.vl-sizing-table td:last-child{'
    + 'border-radius:0 14px 14px 0!important;'
    + 'text-align:right!important;'
    + 'color:#0f172a!important;'
    + '}'

    /* RODAPÉ */
    + '.vl-footer{position:absolute!important;bottom:0!important;left:0!important;right:0!important;'
    + 'z-index:40!important;background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.5),transparent)!important;'
    + 'padding:40px 16px 16px!important;pointer-events:none!important;}'

    + '.vl-footer-inner{pointer-events:auto!important;}'

    + '.vl-cta{all:unset!important;display:block!important;width:100%!important;text-align:center!important;'
    + 'border-radius:12px!important;padding:14px!important;font-weight:800!important;font-size:15px!important;'
    + 'cursor:pointer!important;background:' + buttonColor + '!important;color:#fff!important;'
    + 'box-shadow:0 4px 12px rgba(0,0,0,.2)!important;margin-bottom:12px!important;}'

    + '.vl-product{display:flex!important;align-items:center!important;gap:12px!important;'
    + 'border-radius:24px!important;border:1px solid ' + modalBorder + '!important;'
    + 'padding:12px!important;background:' + bgColor + '!important;cursor:pointer!important;'
    + 'box-shadow:' + shadow + '!important;}'

    + '.vl-product-img{width:72px!important;height:72px!important;border-radius:16px!important;'
    + 'object-fit:cover!important;background:#e2e8f0!important;flex:0 0 auto!important;}'

    + '.vl-product-info{min-width:0!important;flex:1!important;}'

    + '.vl-product-name{font-weight:800!important;font-size:13px!important;'
    + 'color:' + textColor + '!important;white-space:nowrap!important;overflow:hidden!important;'
    + 'text-overflow:ellipsis!important;}'

    + '.vl-product-price{margin-top:4px!important;font-weight:800!important;font-size:16px!important;'
    + 'color:' + secondary + '!important;}'

    + '.vl-product-actions{display:flex!important;align-items:center!important;gap:8px!important;'
    + 'flex-wrap:wrap!important;margin-top:6px!important;}'

    + '.vl-product-btn{all:unset!important;display:inline-flex!important;align-items:center!important;'
    + 'justify-content:center!important;gap:4px!important;border-radius:999px!important;'
    + 'padding:6px 12px!important;background:' + buttonColor + '!important;color:#fff!important;'
    + 'font-size:11px!important;font-weight:800!important;cursor:pointer!important;'
    + 'text-decoration:none!important;white-space:nowrap!important;}'

    + '.vl-product-whatsapp-btn{all:unset!important;display:inline-flex!important;'
    + 'align-items:center!important;justify-content:center!important;gap:4px!important;'
    + 'border-radius:999px!important;padding:6px 12px!important;background:#25d366!important;'
    + 'color:#fff!important;font-size:11px!important;font-weight:800!important;cursor:pointer!important;'
    + 'text-decoration:none!important;white-space:nowrap!important;}'

    + '.vl-product-whatsapp-btn:hover{background:#1ebe5d!important;color:#fff!important;}'
    + '.vl-product-whatsapp-btn:focus{outline:2px solid #128c7e!important;outline-offset:2px!important;}'
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
    var ytId = extractYouTubeId(url);
    var isUpload = video.source_type === 'upload' || video.sourceType === 'upload';
    var isDirect = isDirectVideoUrl(url);
    var wrapper = createEl('div', 'vl-player');

    // YouTube com loop
    if (!isUpload && ytId) {
      var iframe = createEl('iframe');
      // ✅ LOOP: adicionado &loop=1&playlist=VIDEO_ID
      iframe.src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&playsinline=1&rel=0&loop=1&playlist=' + ytId;
      iframe.allow = 'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      wrapper.appendChild(iframe);

      // Rastreia play para YouTube
      trackMetric({ event_type: 'play', story_id: storyId, video_id: video.id, page_url: window.location.href });

      return wrapper;
    }

    if ((isUpload || isDirect) && url) {
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.minHeight = '300px';
      wrapper.style.overflow = 'hidden';

      var media = createEl('video');
      
      media.controls = false;
      media.preload = 'auto';
      media.setAttribute('playsinline', '');
      media.setAttribute('webkit-playsinline', '');
      media.playsInline = true;
      media.muted = false;
      // ✅ LOOP: vídeo repete infinitamente, NUNCA dispara o evento 'ended'
      media.loop = true;

      media.style.position = 'absolute';
      media.style.top = '0';
      media.style.left = '0';
      media.style.width = '100%';
      media.style.height = '100%';
      media.style.objectFit = 'cover';
      media.style.zIndex = '1';

      var thumb = getVideoThumbnail(video);
      if (thumb) media.poster = thumb;

      media.src = url;

      media.addEventListener('play', function () {
        trackMetric({ event_type: 'play', story_id: storyId, video_id: video.id, page_url: window.location.href });
      });

      // O evento 'ended' NUNCA será disparado com loop=true,
      // então o nextVideo() nunca será chamado e o modal NUNCA fecha sozinho.
      // Mas mantemos o listener por segurança.
      media.addEventListener('ended', function() {
        if (typeof onEnded === 'function') onEnded();
      });

      wrapper.appendChild(media);
      return wrapper;
    }

    // Fallback
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
  author.textContent = comment.author_name || 'Visitante';

  var content = createEl('div', 'vl-comment-content');
  content.textContent = comment.content || '';

  item.appendChild(author);
  item.appendChild(content);

  var replyContent = String(
    comment.reply_content ||
    comment.replyContent ||
    ''
  ).trim();

  var replyStatus = String(
    comment.reply_status ||
    comment.replyStatus ||
    ''
  ).trim().toLowerCase();

  var replyIsVisible =
    replyContent &&
    (
      !replyStatus ||
      replyStatus === 'replied' ||
      replyStatus === 'responded' ||
      replyStatus === 'respondido' ||
      replyStatus === 'answered' ||
      replyStatus === 'published' ||
      replyStatus === 'publicado'
    );

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
  return [
    '😎', '👍', '👏', '😱', '🙏', '💪',
    '🔥', '❤️', '💙', '✨', '🎉', '✅',
    '⭐', '😢', '😡', '🤔', '👀', '😊',
    '🥰'
  ];
}

function getSizingModelId(video) {
  if (!video) return null;

  return firstDefined(
    video.model_id,
    video.modelId,
    video.sizing_model_id,
    video.sizingModelId,
    video.modelo_id,
    video.modeloId,
    video.model
  ) || null;
}

function openSizingPanel(modelId) {
  if (!modalContent) return;

  var model = readSizingModelsData.find(function (m) {
    return idsEqual(m.id, modelId);
  });

  if (!model) return;

  var oldPanel = modalContent.querySelector('.vl-sizing-panel');
  if (oldPanel) oldPanel.remove();

  var panel = createEl('div', 'vl-sizing-panel');
  panel.className = 'vl-sizing-panel is-open';

  var header = createEl('div', 'vl-sizing-header');
  var title = createEl('div', 'vl-sizing-title');
  title.textContent = 'Medidas da modelo';

  var closeButton = createEl('button', 'vl-sizing-close');
  closeButton.type = 'button';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = function() { panel.remove(); };

  header.appendChild(title);
  header.appendChild(closeButton);
  panel.appendChild(header);

  var content = createEl('div', 'vl-sizing-content');

  // Nome da modelo/tamanho
  var modelName = createEl('div');
  modelName.style.fontWeight = '800';
  modelName.style.fontSize = '15px';
  modelName.style.marginBottom = '4px';
  modelName.textContent = model.name || 'Modelo';
  content.appendChild(modelName);

  if (model.size_name) {
    var sizeLabel = createEl('div');
    sizeLabel.style.fontSize = '12px';
    sizeLabel.style.color = getPrimaryColor(currentAppearance);
    sizeLabel.style.fontWeight = '700';
    sizeLabel.style.marginBottom = '16px';
    sizeLabel.textContent = 'Veste tamanho: ' + model.size_name;
    content.appendChild(sizeLabel);
  }

  // Tabela de medidas
  var measures = [];
  try {
    measures = typeof model.measures === 'string' ? JSON.parse(model.measures) : (model.measures || []);
  } catch (e) {}

  if (measures && measures.length > 0) {
    var table = createEl('table', 'vl-sizing-table');
    var thead = createEl('thead');
    var trHead = createEl('tr');
    var th1 = createEl('th'); th1.textContent = 'Medida';
    var th2 = createEl('th'); th2.textContent = 'Valor';
    trHead.appendChild(th1); trHead.appendChild(th2);
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = createEl('tbody');
    measures.forEach(function (m) {
      var label = m.name || m.label || '';
      var val = m.value || '';
      var unit = m.unit || '';
      if (!label || !val) return;
      
      var tr = createEl('tr');
      var td1 = createEl('td'); td1.textContent = label;
      var td2 = createEl('td'); td2.textContent = val + (unit ? ' ' + unit : '');
      tr.appendChild(td1); tr.appendChild(td2);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    content.appendChild(table);
  } else {
    var empty = createEl('div');
    empty.style.textAlign = 'center';
    empty.style.padding = '20px';
    empty.style.fontSize = '14px';
    empty.style.opacity = '0.6';
    empty.textContent = 'Nenhuma medida cadastrada para esta modelo.';
    content.appendChild(empty);
  }

  panel.appendChild(content);
  modalContent.appendChild(panel);
}

function openCommentsPanel(videoId, storyId) {
  if (!modalContent) return;

  var oldPanel = modalContent.querySelector('.vl-comments-panel');
  if (oldPanel) oldPanel.remove();

  var panel = createEl('div', 'vl-comments-panel');
  panel.className = 'vl-comments-panel is-open';

  var header = createEl('div', 'vl-comments-header');

  var title = createEl('div', 'vl-comments-title');
  title.textContent = 'Comentários';

  var closeButton = createEl('button', 'vl-comments-close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fechar comentários');
  closeButton.innerHTML = '&times;';

  header.appendChild(title);
  header.appendChild(closeButton);

  var list = createEl('div', 'vl-comments-list');
  var comments = getCommentsForVideo(videoId);

  if (!comments.length) {
    var empty = createEl('div', 'vl-comments-empty');
    empty.textContent = 'Ainda não há comentários neste vídeo.';
    list.appendChild(empty);
  } else {
    comments.forEach(function (comment) {
      list.appendChild(renderCommentItem(comment));
    });
  }

  var form = createEl('form', 'vl-comments-form');

  var nameInput = createEl('input', 'vl-comments-input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Seu nome';
  nameInput.maxLength = 100;
  nameInput.required = true;
  nameInput.autocomplete = 'name';

    var editor = createEl('div', 'vl-comments-editor');

  var contentInput = createEl(
    'textarea',
    'vl-comments-input vl-comments-textarea'
  );

  contentInput.placeholder = 'Escreva um comentário...';
  contentInput.maxLength = 1000;
  contentInput.required = true;

  var emojiButton = createEl('button', 'vl-emoji-button');
  emojiButton.type = 'button';
  emojiButton.textContent = '☺️';
  emojiButton.setAttribute('aria-label', 'Adicionar emoji');
  emojiButton.title = 'Adicionar emoji';

  var emojiPicker = createEl('div', 'vl-emoji-picker');

  getCommentEmojis().forEach(function (emoji) {
    var emojiItem = createEl('button', 'vl-emoji-item');

    emojiItem.type = 'button';
    emojiItem.textContent = emoji;
    emojiItem.setAttribute('aria-label', 'Adicionar ' + emoji);

    emojiItem.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      var start = contentInput.selectionStart || contentInput.value.length;
      var end = contentInput.selectionEnd || contentInput.value.length;

      var before = contentInput.value.substring(0, start);
      var after = contentInput.value.substring(end);

      contentInput.value = before + emoji + after;

      var nextPosition = start + emoji.length;

      contentInput.focus();
      contentInput.setSelectionRange(nextPosition, nextPosition);

      emojiPicker.classList.remove('is-open');
    });

    emojiPicker.appendChild(emojiItem);
  });

  emojiButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    emojiPicker.classList.toggle('is-open');

    if (emojiPicker.classList.contains('is-open')) {
      contentInput.focus();
    }
  });

  editor.appendChild(contentInput);
  editor.appendChild(emojiButton);
  editor.appendChild(emojiPicker);

    document.addEventListener('click', function closeEmojiPicker(event) {
    if (
      emojiPicker.classList.contains('is-open') &&
      !editor.contains(event.target)
    ) {
      emojiPicker.classList.remove('is-open');
      document.removeEventListener('click', closeEmojiPicker);
    }
  });


  var feedback = createEl('div', 'vl-comments-feedback');

  var submit = createEl('button', 'vl-comments-submit');
  submit.type = 'submit';
  submit.textContent = 'Enviar comentário';

  form.appendChild(nameInput);
    form.appendChild(editor);

  form.appendChild(feedback);
  form.appendChild(submit);

  panel.appendChild(header);
  panel.appendChild(list);
  panel.appendChild(form);
  modalContent.appendChild(panel);

  closeButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    panel.remove();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopPropagation();

    var authorName = nameInput.value.trim();
    var content = contentInput.value.trim();

    if (!authorName || !content) {
      feedback.textContent = 'Preencha seu nome e seu comentário.';
      return;
    }

    submit.disabled = true;
    feedback.textContent = 'Enviando...';

    createComment({
      story_id: storyId || null,
      video_id: videoId || null,
      author_name: authorName,
      content: content
    }).then(function () {
      contentInput.value = '';
      feedback.textContent =
        'Comentário enviado. Ele aparecerá após aprovação da loja.';

      trackMetric({
        event_type: 'comment',
        story_id: storyId || null,
        video_id: videoId || null,
        page_url: window.location.href
      });
    }).catch(function (error) {
      feedback.textContent =
        error && error.message
          ? error.message
          : 'Não foi possível enviar o comentário.';
    }).finally(function () {
      submit.disabled = false;
    });
  });

  trackMetric({
    event_type: 'comment_open',
    story_id: storyId || null,
    video_id: videoId || null,
    page_url: window.location.href
  });
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

  function svgIcon(name) {
  var icons = {
    play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>',

    pause: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',

    mute: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m19 9-6 6m0-6 6 6"/></svg>',

    unmute: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',

    heart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6z"/></svg>',

    heartFilled: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6z"/></svg>',

    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',

    measure: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21 21 3"/><path d="M7 17 5 15M11 13 9 11M15 9l-2-2M19 5l-2-2"/></svg>',

    whatsapp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z"/><path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z"/></svg>',

    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',

    comment: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.6 9.6 0 0 1-4-.8L3 21l1.8-4.5A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z"></path></svg>'
  };

  return icons[name] || '';
}

function copyShareUrl(url) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(url);
  }

  return new Promise(function (resolve, reject) {
    try {
      var input = document.createElement('textarea');

      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      document.body.appendChild(input);
      input.select();

      var copied = document.execCommand('copy');

      document.body.removeChild(input);

      if (copied) {
        resolve();
      } else {
        reject(new Error('Não foi possível copiar o link.'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

function openCustomShareModal(data) {
  if (!modalContent) return;

  var oldSharePanel = modalContent.querySelector('.vl-share-panel');
  if (oldSharePanel) oldSharePanel.remove();

  var shareUrl = data.url || window.location.href;
  var shareTitle = data.title || 'Story';
  var shareText = data.text || 'Confira este conteúdo';

  var panel = createEl('div', 'vl-share-panel');

  panel.style.position = 'absolute';
  panel.style.zIndex = '100';
  panel.style.left = '50%';
  panel.style.top = '50%';
  panel.style.width = 'calc(100% - 40px)';
  panel.style.maxWidth = '340px';
  panel.style.transform = 'translate(-50%, -50%)';
  panel.style.padding = '20px';
  panel.style.borderRadius = '24px';
  panel.style.background = '#ffffff';
  panel.style.color = '#0f172a';
  panel.style.boxShadow = '0 18px 50px rgba(0,0,0,.35)';
  panel.style.fontFamily = getFontFamily(currentAppearance);

  var header = createEl('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';
  header.style.marginBottom = '16px';

  var title = createEl('strong');
  title.textContent = 'Compartilhar';
  title.style.fontSize = '18px';

  var closeBtn = createEl('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Fechar compartilhamento');

  closeBtn.style.width = '36px';
  closeBtn.style.height = '36px';
  closeBtn.style.border = '0';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.background = '#f1f5f9';
  closeBtn.style.color = '#0f172a';
  closeBtn.style.fontSize = '26px';
  closeBtn.style.lineHeight = '1';
  closeBtn.style.cursor = 'pointer';

  closeBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    panel.remove();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  var description = createEl('p');
  description.textContent = 'Escolha como deseja compartilhar este conteúdo.';
  description.style.margin = '0 0 16px';
  description.style.fontSize = '13px';
  description.style.color = '#64748b';

  var actions = createEl('div');
  actions.style.display = 'grid';
  actions.style.gridTemplateColumns = '1fr 1fr';
  actions.style.gap = '10px';

  function createShareButton(label, background, onClick) {
    var button = createEl('button');

    button.type = 'button';
    button.textContent = label;

    button.style.border = '0';
    button.style.borderRadius = '12px';
    button.style.padding = '12px 10px';
    button.style.background = background;
    button.style.color = '#ffffff';
    button.style.fontWeight = '800';
    button.style.cursor = 'pointer';

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    return button;
  }

  var whatsappMessage = shareText + '\n' + shareUrl;

  actions.appendChild(
    createShareButton('WhatsApp', '#25D366', function () {
      trackMetric({
        event_type: 'share_whatsapp',
        page_url: window.location.href
      });

      window.open(
        'https://wa.me/?text=' + encodeURIComponent(whatsappMessage),
        '_blank',
        'noopener,noreferrer'
      );
    })
  );

  actions.appendChild(
    createShareButton('Facebook', '#1877F2', function () {
      trackMetric({
        event_type: 'share_facebook',
        page_url: window.location.href
      });

      window.open(
        'https://www.facebook.com/sharer/sharer.php?u=' +
          encodeURIComponent(shareUrl),
        '_blank',
        'noopener,noreferrer'
      );
    })
  );

  actions.appendChild(
    createShareButton('X / Twitter', '#0f172a', function () {
      trackMetric({
        event_type: 'share_twitter',
        page_url: window.location.href
      });

      window.open(
        'https://twitter.com/intent/tweet?text=' +
          encodeURIComponent(shareText) +
          '&url=' +
          encodeURIComponent(shareUrl),
        '_blank',
        'noopener,noreferrer'
      );
    })
  );

  actions.appendChild(
    createShareButton(
  'Copiar link',
  getPrimaryColor(currentAppearance),
  function () {
    copyShareUrl(shareUrl)
      .then(function () {
        trackMetric({
          event_type: 'share_copy_link',
          story_id: data.story_id || null,
          video_id: data.video_id || null,
          page_url: shareUrl
        });

        alert('Link copiado com sucesso!');
      })
      .catch(function () {
        window.prompt('Copie o link abaixo:', shareUrl);
      });
  }
)

  );

  panel.appendChild(header);
  panel.appendChild(description);
  panel.appendChild(actions);

  modalContent.appendChild(panel);
}

function shareStory(story, video) {
  var shareUrl = window.location.href;

  var shareData = {
    title: story.title || story.name || 'Story',
    text: 'Olha esse conteúdo: ' + (story.title || story.name || ''),
    url: shareUrl
  };

  trackMetric({
    event_type: 'share_open',
    story_id: story.id || null,
    video_id: video.id || null,
    page_url: shareUrl
  });

  /*
   * Em celular, tenta abrir a janela nativa do navegador/sistema.
   * Se não existir ou ocorrer erro, abre a janela personalizada.
   */
  if (navigator.share) {
    navigator.share(shareData)
      .then(function () {
        trackMetric({
          event_type: 'share_native',
          story_id: story.id || null,
          video_id: video.id || null,
          page_url: shareUrl
        });
      })
      .catch(function () {
        openCustomShareModal(shareData);
      });

    return;
  }

  openCustomShareModal(shareData);
}

function getVisitorId() {
  var storageKey = 'vidlytics_visitor_id';
  var visitorId = getStorageItem(storageKey, '');

  if (visitorId && typeof visitorId === 'string' && visitorId.length > 5) {
    return visitorId;
  }

  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    visitorId = window.crypto.randomUUID();
  } else {
    visitorId =
      'visitor_' +
      Date.now() +
      '_' +
      Math.random().toString(36).slice(2);
  }

  setStorageItem(storageKey, visitorId);

  return visitorId;
}

function createVideoLike(videoId) {
  if (!hasSupabase || !storeId || !videoId) {
    console.error('[Vidlytics] createVideoLike: dados insuficientes', { hasSupabase: hasSupabase, storeId: storeId, videoId: videoId });
    return Promise.reject(new Error('Não foi possível registrar a curtida.'));
  }

  var visitorId = getVisitorId();
  var payload = {
    store_id: storeId,
    video_id: videoId,
    visitor_id: visitorId
  };

  console.log('[Vidlytics] createVideoLike POST /rest/v1/video_likes', payload);

  return supabaseFetch('video_likes', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload)
  }).then(function (response) {
    console.log('[Vidlytics] createVideoLike resposta:', response.status, response.ok);

    if (response.ok) {
      readLikeCounts[videoId] = (readLikeCounts[videoId] || 0) + 1;
      return { alreadyLiked: false };
    }

    return response.text().then(function (rawMessage) {
      // 409 = já existe esse like no banco (constraint única).
      // Trata como sucesso, apenas sincroniza o estado local.
      if (response.status === 409) {
        console.warn('[Vidlytics] createVideoLike: like já existia no banco (409). Sincronizando estado.');
        return { alreadyLiked: true };
      }

      console.error('[Vidlytics] createVideoLike erro:', {
        status: response.status,
        body: rawMessage,
        payload: payload
      });

      throw new Error(
        response.status === 403
          ? 'A política RLS bloqueou a curtida.'
          : response.status === 400
            ? 'Dados inválidos para curtida.'
            : 'Não foi possível salvar a curtida.'
      );
    });
  });
}


function removeVideoLike(videoId) {

  if (!hasSupabase || !storeId || !videoId) {
    return Promise.reject(new Error('Não foi possível remover a curtida.'));
  }

  var visitorId = getVisitorId();

  return supabaseFetch(
    'video_likes?' +
    'store_id=eq.' + encodeURIComponent(storeId) +
    '&video_id=eq.' + encodeURIComponent(videoId) +
    '&visitor_id=eq.' + encodeURIComponent(visitorId),
    {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    }
  ).then(function (response) {
    if (response.ok) {
      readLikeCounts[videoId] = Math.max(0, (readLikeCounts[videoId] || 0) - 1);
      return true;
    }

    return response.text().then(function (rawMessage) {
      console.error('[Vidlytics] removeVideoLike erro:', {
        status: response.status,
        body: rawMessage
      });

      throw new Error(
        response.status === 403
          ? 'A política RLS bloqueou a remoção da curtida.'
          : 'Não foi possível remover a curtida.'
      );
    });
  });
}

function checkIfVisitorLiked(videoId, dbLikesRaw) {
  var visitorId = getVisitorId();

  if (!Array.isArray(dbLikesRaw)) return false;

  return dbLikesRaw.some(function (row) {
    return (
      idsEqual(row.video_id, videoId) &&
      idsEqual(row.visitor_id, visitorId)
    );
  });
}


  function openStory(storiesList, initialStoryIndex, storyVideoMap, activeVideos, storyProducts, products, initialVideoIndex) {
    if (!overlay || !modalContent || !storiesList || !storiesList.length) return;

    pausePreviews();

    var currentStoryIndex = typeof initialStoryIndex === 'number' ? initialStoryIndex : 0;
    var currentVideoIndex = 0;

    var isMuted = false;
    var isPlaying = true;
    var liked = false;
    var likeCount = 0;
    var viewedVideos = {};

    /* Read likes from localStorage */
    var likes = getStorageItem('vidlytics_likes', {});
    if (!likes || typeof likes !== 'object') likes = {};
    var currentVisitorId = getVisitorId();


    function getOrderedVideos(s) {
      var relations = (storyVideoMap.get(s.id) || []).slice().sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); });
      return relations.map(function (rel) {
        return activeVideos.find(function (v) {
          return idsEqual(v.id, rel.video_id) && v.active !== false && rel.active !== false;
        });
      }).filter(Boolean);
    }

    var initialStory = storiesList[currentStoryIndex];
    var initialRels = (storyVideoMap.get(initialStory.id) || []).slice().sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); });
    if (typeof initialVideoIndex === 'number' && initialVideoIndex >= 0 && initialVideoIndex < initialRels.length) {
      currentVideoIndex = initialVideoIndex;
    } else {
      var coverIndex = -1;
      initialRels.forEach(function (rel, index) { if (rel.is_cover && coverIndex === -1) coverIndex = index; });
      currentVideoIndex = coverIndex >= 0 ? coverIndex : 0;
    }

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
      if (currentVideoIndex < 0 || currentVideoIndex >= orderedVideos.length) {
        currentVideoIndex = 0;
      }
      var video = orderedVideos[currentVideoIndex]; if (!video) return;

/*
 * Registra uma visualização somente uma vez por vídeo,
 * durante a sessão atual do player.
 */
if (!viewedVideos[video.id]) {
  viewedVideos[video.id] = true;

  trackMetric({
    event_type: 'view',
    story_id: story.id,
    video_id: video.id,
    page_url: window.location.href
  }).catch(function (error) {
    console.warn('[Vidlytics] Falha ao registrar visualização:', error);
  });
}

      var oldVid = modalContent.querySelector('video');
      if (oldVid) { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); }

      var modalConfig = normalizeModalAppearanceConfig(currentAppearance);
      console.log('[Vidlytics] currentAppearance:', currentAppearance);
console.log('[Vidlytics] modalConfig normalizado:', modalConfig);

      modalContent.innerHTML = '';

      /* ===== PROGRESS BARS ===== */
      if (modalConfig.hide_stories !== true) {
        var progress = createEl('div', 'vl-progress');
        orderedVideos.forEach(function (v, idx) {
          var bar = createEl('div', 'vl-progress-bar');
          var fill = createEl('div', 'vl-progress-fill');
          if (idx < currentVideoIndex) fill.style.width = '100%';
          else if (idx === currentVideoIndex) fill.style.width = '33%';
          else fill.style.width = '0%';
          bar.appendChild(fill);
          progress.appendChild(bar);
        });
        modalContent.appendChild(progress);
      }

      /* ===== HEADER ===== */
      var header = createEl('div', 'vl-header');
      var headerLeft = createEl('div', 'vl-header-left');

      if (modalConfig.show_title !== false) {
        var title = createEl('div', 'vl-title'); title.textContent = story.title || story.name || 'Story';
        var count = createEl('div', 'vl-count');
        count.textContent = (currentVideoIndex + 1) + '/' + orderedVideos.length;
        headerLeft.appendChild(title); headerLeft.appendChild(count);
      }
      header.appendChild(headerLeft);

           var headerActions = createEl('div', 'vl-header-actions');

      // Botão de mute/unmute
      var muteBtn = createEl('button', 'vl-control');
      muteBtn.type = 'button';
      muteBtn.innerHTML = svgIcon(isMuted ? 'mute' : 'unmute');
      muteBtn.setAttribute(
        'aria-label',
        isMuted ? 'Ativar som' : 'Desativar som'
      );

      // Botão de play/pause
      if (modalConfig.show_play_button !== false) {
        var playBtn = createEl('button', 'vl-control');
        playBtn.type = 'button';
        playBtn.innerHTML = svgIcon(isPlaying ? 'pause' : 'play');
        playBtn.setAttribute(
          'aria-label',
          isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'
        );
        headerActions.appendChild(playBtn);
      }

      // Botão de fechar
      var closeBtn = createEl('button', 'vl-close');
      closeBtn.type = 'button';
      closeBtn.innerHTML = svgIcon('close');

      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      });

      // Ordem visual: controles à esquerda e fechar à direita
      headerActions.appendChild(muteBtn);

      header.appendChild(headerActions);
      header.appendChild(closeBtn);

      modalContent.appendChild(header);



      /* ===== BODY ===== */
      var body = createEl('div', 'vl-body');

      /* Navigation tap zones */
      var nav = createEl('div', 'vl-nav');
      var prevBtn = createEl('button', 'vl-nav-btn vl-nav-prev'); prevBtn.type = 'button'; prevBtn.addEventListener('click', prevVideo);
      var nextBtn = createEl('button', 'vl-nav-btn vl-nav-next'); nextBtn.type = 'button'; nextBtn.addEventListener('click', nextVideo);
      nav.appendChild(prevBtn); nav.appendChild(nextBtn);
      body.appendChild(nav);

      /* Video player */
      var playerNode = buildVideoPlayer(video, story.id, nextVideo);
      body.insertBefore(playerNode, body.firstChild);

      /* ===== SOCIAL ACTIONS (right side) ===== */
      var social = createEl('div', 'vl-social');
      var hasSocial = false;

      /* Like */
if (modalConfig.show_like_button !== false) {
  var videoId = video.id;
  var likedFromDb = checkIfVisitorLiked(videoId, window.__vidlytics_db_likes_raw || []);
liked = likedFromDb;

// sincroniza o localStorage com a verdade do banco
likes[videoId] = { liked: liked };
setStorageItem('vidlytics_likes', likes);

  // Contagem real do banco de dados para ESTE vídeo específico
  var baseCount = readLikeCounts[videoId] || 0;
  likeCount = baseCount;

  console.log('[Vidlytics] Like button init:', { videoId: videoId, liked: liked, baseCount: baseCount, readLikeCounts: readLikeCounts });

  var likeBtn = createEl('button', 'vl-social-btn');
  likeBtn.type = 'button';
  likeBtn.setAttribute(
    'aria-label',
    liked ? 'Remover curtida' : 'Curtir vídeo'
  );
  likeBtn.innerHTML = liked
    ? svgIcon('heartFilled')
    : svgIcon('heart');

  var likeCountEl = createEl('span', 'vl-social-count');
  likeCountEl.textContent = String(likeCount);

  var isSavingLike = false;

  likeBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (isSavingLike) {
      return;
    }

    isSavingLike = true;
    likeBtn.style.opacity = '0.6';
    likeBtn.style.cursor = 'wait';

    var wasLiked = liked;

    console.log('[Vidlytics] Like click:', { videoId: videoId, wasLiked: wasLiked, action: wasLiked ? 'removeVideoLike' : 'createVideoLike' });

    var request = wasLiked
      ? removeVideoLike(videoId)
      : createVideoLike(videoId);

    request
      .then(function (result) {
  console.log('[Vidlytics] Like request SUCESSO', result);

  liked = wasLiked ? false : true;


        likes[videoId] = {
          liked: liked
        };

        setStorageItem('vidlytics_likes', likes);

        likeBtn.innerHTML = liked
          ? svgIcon('heartFilled')
          : svgIcon('heart');

        likeBtn.setAttribute(
          'aria-label',
          liked ? 'Remover curtida' : 'Curtir vídeo'
        );

        likeCount = Math.max(
          0,
          Number(likeCountEl.textContent || 0) + (liked ? 1 : -1)
        );

        likeCountEl.textContent = String(likeCount);

        trackMetric({
          event_type: liked ? 'like' : 'unlike',
          story_id: story.id,
          video_id: videoId,
          page_url: window.location.href
        }).catch(function (error) {
          console.warn(
            '[Vidlytics] A curtida foi salva, mas a métrica falhou:',
            error
          );
        });
      })
      .catch(function (error) {
        console.error('[Vidlytics] Like request FALHOU:', error);

        alert(
          error && error.message
            ? error.message
            : 'Não foi possível registrar sua curtida. Tente novamente.'
        );
      })
      .finally(function () {
        isSavingLike = false;
        likeBtn.style.opacity = '1';
        likeBtn.style.cursor = 'pointer';
      });
  });

  social.appendChild(likeBtn);
  social.appendChild(likeCountEl);

  hasSocial = true;
}


      /* Comentários */
if (modalConfig.show_comment_button !== false) {
  var commentsBtn = createEl('button', 'vl-social-btn');
  commentsBtn.type = 'button';
  commentsBtn.innerHTML = svgIcon('comment');
  commentsBtn.setAttribute('aria-label', 'Comentários');
  commentsBtn.title = 'Comentários';

  var commentCountEl = createEl('span', 'vl-social-count');
  commentCountEl.textContent = String(getCommentCount(video.id));

  commentsBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    openCommentsPanel(video.id, story.id);
  });

  social.appendChild(commentsBtn);
  social.appendChild(commentCountEl);
  hasSocial = true;
}

/* Compartilhar */
if (modalConfig.show_share_button !== false) {
  var shareBtn = createEl('button', 'vl-social-btn');

  shareBtn.type = 'button';
  shareBtn.innerHTML = svgIcon('share');
  shareBtn.setAttribute('aria-label', 'Compartilhar');
  shareBtn.title = 'Compartilhar';

  shareBtn.addEventListener('pointerdown', function (event) {
    event.stopPropagation();
  });

  shareBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    /*
     * Prioridade:
     * 1. Produto vinculado diretamente ao vídeo.
     * 2. Produto vinculado ao Story.
     * 3. Compartilhamento institucional da loja/site.
     */
    var linkedProduct = null;

    /* Produto que já venha como objeto dentro do vídeo */
    if (video.product && typeof video.product === 'object') {
      linkedProduct = video.product;
    }

    /* Produto relacionado por product_id no vídeo */
    if (
      !linkedProduct &&
      video.product_id &&
      Array.isArray(products)
    ) {
      linkedProduct = products.find(function (product) {
        return idsEqual(product.id, video.product_id);
      });
    }

    /* Compatibilidade com variações de campos no vídeo */
    if (
      !linkedProduct &&
      Array.isArray(products)
    ) {
      var videoProductId = firstDefined(
        video.product_id,
        video.productId,
        video.linked_product_id,
        video.linkedProductId
      );

      if (videoProductId) {
        linkedProduct = products.find(function (product) {
          return idsEqual(product.id, videoProductId);
        });
      }
    }

    /* Produto que já venha como objeto dentro do Story */
    if (
      !linkedProduct &&
      story.product &&
      typeof story.product === 'object'
    ) {
      linkedProduct = story.product;
    }

    /* Produto relacionado via story_products */
    if (
      !linkedProduct &&
      Array.isArray(storyProducts) &&
      Array.isArray(products)
    ) {
      var storyProductRelation = storyProducts.find(function (relation) {
        return idsEqual(relation.story_id, story.id);
      });

      if (storyProductRelation) {
        linkedProduct = products.find(function (product) {
          return idsEqual(product.id, storyProductRelation.product_id);
        });
      }
    }

    linkedProduct = linkedProduct || {};

    var productTitle =
      linkedProduct.name ||
      linkedProduct.title ||
      linkedProduct.product_name ||
      '';

    var productUrl =
      linkedProduct.product_url ||
      linkedProduct.product_link ||
      linkedProduct.productLink ||
      linkedProduct.permalink ||
      linkedProduct.url ||
      linkedProduct.link ||
      linkedProduct.href ||
      '';

    /* Converte links relativos, como /produto/camiseta, para URL completa */
    if (
      productUrl &&
      productUrl.indexOf('http://') !== 0 &&
      productUrl.indexOf('https://') !== 0
    ) {
      productUrl =
        window.location.origin +
        (productUrl.charAt(0) === '/' ? '' : '/') +
        productUrl;
    }

    var hasProduct = Boolean(productTitle && productUrl);

    /*
     * Se há produto, compartilha produto + URL da página dele.
     * Se não há, compartilha uma mensagem institucional + home.
     */
    var shareTitle = hasProduct
      ? productTitle
      : 'Conheça nossos produtos';

    var shareText = hasProduct
      ? 'Olha esse produto que eu encontrei: ' + productTitle
      : 'Olha só os produtos da nossa loja!';

    var shareUrl = hasProduct
      ? productUrl
      : window.location.origin + '/';

    trackMetric({
      event_type: 'share_open',
      story_id: story.id || null,
      video_id: video.id || null,
      product_id: linkedProduct.id || null,
      page_url: shareUrl
    });

    openCustomShareModal({
      title: shareTitle,
      text: shareText,
      url: shareUrl,
      story_id: story.id || null,
      video_id: video.id || null,
      product_id: linkedProduct.id || null
    });
  });

  social.appendChild(shareBtn);
  hasSocial = true;
}
  
var sizingModelId = getSizingModelId(video);

if (
  sizingModelId &&
  modalConfig.show_sizing_button !== false
) {

  var measureBtn = createEl('button', 'vl-social-btn');

  measureBtn.type = 'button';
  measureBtn.innerHTML = svgIcon('measure');
  measureBtn.setAttribute('aria-label', 'Ver medidas da modelo');
  measureBtn.title = 'Medidas';

  measureBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    openSizingPanel(sizingModelId);

    trackMetric({
      event_type: 'sizing_open',
      story_id: story.id,
      video_id: video.id,
      page_url: window.location.href
    });
  });

  social.appendChild(measureBtn);
  hasSocial = true;
}


/* WhatsApp — compartilhar produto com amigo */
if (modalConfig.show_whatsapp_button !== false) {
  var waBtn = createEl('button', 'vl-social-btn whatsapp');

  waBtn.type = 'button';
  waBtn.innerHTML = svgIcon('whatsapp');
  waBtn.setAttribute('aria-label', 'Compartilhar produto no WhatsApp');
  waBtn.title = 'Compartilhar produto no WhatsApp';

  waBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var linkedProduct = null;

    /*
     * 1. Produto diretamente dentro do Story
     */
    if (story.product && typeof story.product === 'object') {
      linkedProduct = story.product;
    }

    /*
     * 2. Procura o produto relacionado pelo story_products
     *
     * storyProducts normalmente contém os vínculos:
     * {
     *   story_id: '...',
     *   product_id: '...'
     * }
     */
    if (
      !linkedProduct &&
      Array.isArray(storyProducts) &&
      Array.isArray(products)
    ) {
      var storyProductRelation = storyProducts.find(function (relation) {
        return idsEqual(relation.story_id, story.id);
      });

      if (storyProductRelation) {
        linkedProduct = products.find(function (product) {
          return idsEqual(product.id, storyProductRelation.product_id);
        });
      }
    }

    /*
     * 3. Procura pelo product_id existente no Story
     */
    if (
      !linkedProduct &&
      story.product_id &&
      Array.isArray(products)
    ) {
      linkedProduct = products.find(function (product) {
        return idsEqual(product.id, story.product_id);
      });
    }

    /*
     * 4. Compatibilidade com casos em que storyProducts
     * já contém os dados completos do produto
     */
    if (
      !linkedProduct &&
      Array.isArray(storyProducts)
    ) {
      linkedProduct = storyProducts.find(function (item) {
        return (
          idsEqual(item.story_id, story.id) &&
          (
            item.name ||
            item.title ||
            item.product_name ||
            item.product_url ||
            item.url
          )
        );
      });
    }

    /*
     * 5. Se houver somente um produto relacionado ao Story
     */
    if (
      !linkedProduct &&
      Array.isArray(storyProducts) &&
      storyProducts.length === 1
    ) {
      var onlyRelation = storyProducts[0];

      if (Array.isArray(products) && onlyRelation.product_id) {
        linkedProduct = products.find(function (product) {
          return idsEqual(product.id, onlyRelation.product_id);
        });
      }

      if (!linkedProduct) {
        linkedProduct = onlyRelation;
      }
    }

    linkedProduct = linkedProduct || {};

    /*
     * Nome do produto
     */
    var productTitle =
      linkedProduct.name ||
      linkedProduct.title ||
      linkedProduct.product_name ||
      story.product_name ||
      story.product_title ||
      (
        story.product &&
        (
          story.product.name ||
          story.product.title ||
          story.product.product_name
        )
      ) ||
      story.title ||
      'Produto';

    /*
     * URL pública do produto
     */
    var productUrl =
      linkedProduct.product_url ||
      linkedProduct.product_link ||
      linkedProduct.productLink ||
      linkedProduct.permalink ||
      linkedProduct.url ||
      linkedProduct.link ||
      linkedProduct.href ||
      story.product_url ||
      story.product_link ||
      story.productLink ||
      story.url ||
      (
        story.product &&
        (
          story.product.product_url ||
          story.product.product_link ||
          story.product.link ||
          story.product.permalink ||
          story.product.url
        )
      ) ||
      '';

    /*
     * Converte URL relativa em URL absoluta
     */
    if (
      productUrl &&
      productUrl.indexOf('http://') !== 0 &&
      productUrl.indexOf('https://') !== 0
    ) {
      productUrl =
        window.location.origin +
        (productUrl.charAt(0) === '/' ? '' : '/') +
        productUrl;
    }

    /*
     * Mensagem para compartilhar com um amigo.
     *
     * Esta NÃO é uma mensagem de atendimento.
     */
    var shareMessage =
      'Olha esse produto, ' +
      productTitle +
      ', achei lindo!' +
      (productUrl ? '\n' + productUrl : '');

    /*
     * Sem número fixo: o usuário escolherá com quem compartilhar.
     */
    var whatsappUrl =
      'https://wa.me/?text=' +
      encodeURIComponent(shareMessage);

    trackMetric({
      event_type: 'whatsapp_share',
      story_id: story.id,
      video_id: video.id,
      product_id: linkedProduct.id || null,
      page_url: window.location.href
    });

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  });

  social.appendChild(waBtn);
  hasSocial = true;
}



      if (hasSocial) body.appendChild(social);

      /* ===== FOOTER / PRODUCT ===== */
      var activeProducts = storyProducts
        .filter(function (sp) { return idsEqual(sp.story_id, story.id); })
        .map(function (sp) { return products.find(function (product) { return idsEqual(product.id, sp.product_id); }); })
        .filter(function (product) { return product && (product.active === undefined || product.active); });

      if (activeProducts.length && modalConfig.show_product !== false) {
        var footer = createEl('div', 'vl-footer');
        var footerInner = createEl('div', 'vl-footer-inner');
        var product = activeProducts[0];

        var productCard = createEl('div', 'vl-product');
        var productImg = createEl('img', 'vl-product-img');
        productImg.src = normalizeMediaUrl(product.image_url || product.imageUrl || '');
        productImg.alt = product.name || '';

        var productInfo = createEl('div', 'vl-product-info');
        var productName = createEl('div', 'vl-product-name');
        productName.textContent = product.name || '';
        var productPrice = createEl('div', 'vl-product-price');
        productPrice.textContent = Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        productInfo.appendChild(productName);
        productInfo.appendChild(productPrice);

                /*
         * Área dos botões do produto
         */
        var productActions = createEl('div', 'vl-product-actions');

        /*
         * URL pública do produto
         */
        var productUrl =
          product.product_url ||
          product.product_link ||
          product.productLink ||
          product.permalink ||
          product.url ||
          product.link ||
          product.href ||
          '';

        /*
         * Caso a URL seja relativa, transforma em URL absoluta
         */
        if (
          productUrl &&
          productUrl.indexOf('http://') !== 0 &&
          productUrl.indexOf('https://') !== 0
        ) {
          productUrl =
            window.location.origin +
            (productUrl.charAt(0) === '/' ? '' : '/') +
            productUrl;
        }

        /*
         * Nome do produto
         */
        var productTitle =
          product.name ||
          product.title ||
          product.product_name ||
          'este produto';

        /*
         * Botão Ver produto
         */
        if (modalConfig.show_product_button !== false && productUrl) {
          var productBtn = createEl('span', 'vl-product-btn');
          productBtn.textContent = 'Ver produto';

          productActions.appendChild(productBtn);
        }

        /*
         * Anexa parâmetros de rastreamento na URL do produto
         * para atribuir a venda ao vídeo/visitor.
         */
        var trackingParams = 'vly_v=' + encodeURIComponent(video.id) +
          '&vly_s=' + encodeURIComponent(storeId) +
          '&vly_p=' + encodeURIComponent(product.id || '') +
          '&vly_u=' + encodeURIComponent(getVisitorId());

        if (productUrl.indexOf('?') === -1) {
          productUrl = productUrl + '?' + trackingParams;
        } else {
          productUrl = productUrl + '&' + trackingParams;
        }

        /*
         * Botão Comprar pelo WhatsApp
         */
        var productWhatsappBtn = createEl(
          'a',
          'vl-product-whatsapp-btn'
        );

        var whatsappMessage =
          'Oi, tenho interesse nesse produto: ' +
          productTitle +
          (productUrl ? '\n' + productUrl : '');

        var whatsappNumber = '554599629702';

        productWhatsappBtn.href =
          'https://wa.me/' +
          whatsappNumber +
          '?text=' +
          encodeURIComponent(whatsappMessage);

        productWhatsappBtn.target = '_blank';
        productWhatsappBtn.rel = 'noopener noreferrer';
        productWhatsappBtn.textContent = 'Comprar pelo WhatsApp';

        productWhatsappBtn.setAttribute(
          'aria-label',
          'Comprar ' + productTitle + ' pelo WhatsApp'
        );

        productWhatsappBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          trackMetric({
            event_type: 'whatsapp_product_click',
            story_id: story.id,
            video_id: video.id,
            product_id: product.id,
            page_url: window.location.href
          });

          window.open(
            productWhatsappBtn.href,
            '_blank',
            'noopener,noreferrer'
          );
        });

        productActions.appendChild(productWhatsappBtn);
        productInfo.appendChild(productActions);

        productCard.appendChild(productImg);
        productCard.appendChild(productInfo);


                productCard.addEventListener('click', function (e) {
          e.stopPropagation();

          trackMetric({
            event_type: 'product_click',
            story_id: story.id,
            video_id: video.id,
            product_id: product.id,
            page_url: window.location.href
          });

          if (productUrl) {
            window.open(
              productUrl,
              '_blank',
              'noopener,noreferrer'
            );
          }
        });


        footerInner.appendChild(productCard);
        footer.appendChild(footerInner);
        body.appendChild(footer);
      }

      if (story.cta_enabled && story.cta_url) {
        var ctaFooter = createEl('div', 'vl-footer');
        var ctaInner = createEl('div', 'vl-footer-inner');
        var ctaBtn = createEl('button', 'vl-cta');
        ctaBtn.type = 'button';
        ctaBtn.textContent = story.cta_text || 'Saiba mais';
        ctaBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          trackMetric({ event_type: story.cta_type === 'whatsapp' ? 'whatsapp_click' : 'cta_click', story_id: story.id, video_id: video.id, page_url: window.location.href });
          window.open(story.cta_url, '_blank', 'noopener,noreferrer');
        });
        ctaInner.appendChild(ctaBtn);
        ctaFooter.appendChild(ctaInner);
        body.appendChild(ctaFooter);
      }

      modalContent.appendChild(body);
      overlay.className = 'vl-overlay is-open';

            /* Auto-play e controles do vídeo */
      var newVid = playerNode.querySelector('video');

      if (newVid) {
        // Estado inicial
        newVid.muted = isMuted;
        newVid.loop = true;

        // Atualiza o botão quando o vídeo começa
        newVid.addEventListener('play', function () {
  isPlaying = true;

  if (playBtn) {
    playBtn.innerHTML = svgIcon('pause');
    playBtn.setAttribute('aria-label', 'Pausar vídeo');
  }
});

newVid.addEventListener('pause', function () {
  isPlaying = false;

  if (playBtn) {
    playBtn.innerHTML = svgIcon('play');
    playBtn.setAttribute('aria-label', 'Reproduzir vídeo');
  }
});


        // Atualiza o botão quando o volume muda
        newVid.addEventListener('volumechange', function () {
          isMuted = newVid.muted || newVid.volume === 0;

          muteBtn.innerHTML = svgIcon(isMuted ? 'mute' : 'unmute');
          muteBtn.setAttribute(
            'aria-label',
            isMuted ? 'Ativar som' : 'Desativar som'
          );
        });

        // Botão de mute/unmute
        muteBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          newVid.muted = !newVid.muted;

          if (!newVid.muted && newVid.volume === 0) {
            newVid.volume = 1;
          }

          isMuted = newVid.muted || newVid.volume === 0;

          muteBtn.innerHTML = svgIcon(isMuted ? 'mute' : 'unmute');
          muteBtn.setAttribute(
            'aria-label',
            isMuted ? 'Ativar som' : 'Desativar som'
          );
        });

        // Botão de play/pause
        if (playBtn) {
  playBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (newVid.paused) {
      var playPromise = newVid.play();

      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function (error) {
          console.warn('Vidlytics Play Block:', error);
        });
      }
    } else {
      newVid.pause();
    }
  });
}


        // Reprodução automática
        var playPromise = newVid.play();

        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function (error) {
            console.warn('Vidlytics Play Block:', error);
           });
        }
      }
    }

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
style.textContent = buildFloatingCss(appearance, behaviorConfig);




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
    });

    shadow.appendChild(style);
    shadow.appendChild(bubbles);
    shadow.appendChild(overlay);

    if (behaviorConfig.allowDrag) setupFloatingDrag(shadowData.host, bubbles);
  }

function ensureHostAt(el) {
  // Cria um host isolado via Shadow DOM dentro/ao lado do elemento destino
  var host = document.createElement('div');
  host.className = 'vidlytics-inline-host';
  var shadow = host.attachShadow({ mode: 'open' });
  return { host: host, shadow: shadow };
}

function buildInlineCss(appearance, mode) {
  var font = getFontFamily(appearance);
  return (
    '*,*::before,*::after{box-sizing:border-box!important;}'
    + ':host{all:initial!important;display:block!important;font-family:' + font + '!important;}'
    + '.vl-inline{width:100%!important;display:block!important;}'
    + (mode === 'grid'
      ? '.vl-list{display:grid!important;gap:12px!important;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))!important;}'
      : '.vl-list{display:flex!important;gap:10px!important;overflow-x:auto!important;padding:4px!important;scrollbar-width:thin!important;}'
    )
    + '.vl-card{all:unset!important;display:flex!important;flex-direction:column!important;gap:6px!important;cursor:pointer!important;width:140px!important;flex:0 0 auto!important;}'
    + '.vl-thumb{width:100%!important;aspect-ratio:9/16!important;border-radius:16px!important;object-fit:cover!important;background:#000!important;box-shadow:0 6px 18px rgba(15,23,42,.18)!important;}'
    + '.vl-caption{font-size:12px!important;font-weight:800!important;color:#0f172a!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important;}'
  );
}

function renderInlineWidgetAt(targetEl, mode, stories, storyVideoMap, activeVideos) {
  try {
    var mount;
    try {
      mount = ensureHostAt(targetEl);
    } catch (e) {
      // Fallback sem Shadow (casos de CSP estrita)
      var host = document.createElement('div');
      host.className = 'vidlytics-inline-fallback';
      targetEl.appendChild(host);
      mount = { host: host, shadow: host }; // "shadow" aponta para o host
    }

    var style = document.createElement('style');
    style.textContent = buildInlineCss(currentAppearance, mode);

    var wrap = document.createElement('div');
    wrap.className = 'vl-inline';

    var list = document.createElement('div');
    list.className = 'vl-list';

    stories.forEach(function (story, index) {
      var relations = (storyVideoMap.get(story.id) || []).slice().sort(function(a,b){return Number(a.position||0)-Number(b.position||0)});
      var coverRel = relations.find(function(r){return r.is_cover}) || relations[0] || null;
      var coverVideo = coverRel ? activeVideos.find(function(v){return idsEqual(v.id, coverRel.video_id)}) : null;
      var thumb = getStoryThumbnail(story, coverVideo, coverRel);

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'vl-card';

      var img = document.createElement('img');
      img.className = 'vl-thumb';
      img.src = thumb || '';
      img.alt = story.title || story.name || 'Story';

      var caption = document.createElement('div');
      caption.className = 'vl-caption';
      caption.textContent = story.title || story.name || '';

      card.appendChild(img);
      card.appendChild(caption);

      card.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openStory(stories, index, storyVideoMap, activeVideos, readStoryProductsData, readProductsData);
      });

      list.appendChild(card);
    });

    wrap.appendChild(list);

    if (mount.shadow !== mount.host) {
      mount.shadow.appendChild(style);
      mount.shadow.appendChild(wrap);
    } else {
      mount.shadow.appendChild(wrap);
      // Estilo inline sem shadow
      if (!document.getElementById('vidlytics-inline-style')) {
        style.id = 'vidlytics-inline-style';
        document.head.appendChild(style);
      }
    }

    return mount.host;
  } catch (e) {
    console.error('[Vidlytics] Falha ao montar inline widget:', e);
  }
}

function renderIntoDisplayLocations(mode, locations, stories, storyVideoMap, activeVideos) {
  if (!Array.isArray(locations) || !locations.length) return;

  locations.forEach(function (loc) {
    if (!loc || !loc.selector || loc.active === false) return;

    var nodes;
    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll(loc.selector));
    } catch (e) {
      console.warn('[Vidlytics] Selector inválido:', loc.selector, e);
      nodes = [];
    }

    nodes.forEach(function (node) {
      var host = renderInlineWidgetAt(node, mode, stories, storyVideoMap, activeVideos);

      if (!host) return;

      switch (loc.position) {
        case 'before':
          node.parentNode && node.parentNode.insertBefore(host, node);
          break;
        case 'after':
          node.parentNode && node.parentNode.insertBefore(host, node.nextSibling);
          break;
        case 'prepend':
          node.insertBefore(host, node.firstChild);
          break;
        case 'append':
        default:
          node.appendChild(host);
      }
    });
  });
}

function getOrCreateCarouselShadowRoot() {
  var existing = document.getElementById('vidlytics-carousel-root');
  if (existing && existing.shadowRoot) {
    existing.shadowRoot.innerHTML = '';
  }
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  var host = createEl('div', 'vidlytics-carousel-root');
  host.id = 'vidlytics-carousel-root';

  setImportant(host, 'display', 'block');
  setImportant(host, 'position', 'relative');
  setImportant(host, 'z-index', '1');
  setImportant(host, 'width', '100%');
  setImportant(host, 'max-width', '100%');
  setImportant(host, 'min-width', '0');
  setImportant(host, 'height', 'auto');
  setImportant(host, 'margin', '0');
  setImportant(host, 'padding', '0');
  setImportant(host, 'overflow', 'visible');
  setImportant(host, 'background', 'transparent');

  var shadow = host.attachShadow({ mode: 'open' });

  return {
    host: host,
    shadow: shadow
  };
}

function insertCarouselHostBySelector(host, locations) {
  if (!host) return;

  var header =
    document.querySelector('header') ||
    document.querySelector('[role="banner"]') ||
    document.querySelector('#menu') ||
    document.querySelector('.menu');

  if (header && header.parentNode) {
    if (header.nextSibling) {
      header.parentNode.insertBefore(host, header.nextSibling);
    } else {
      header.parentNode.appendChild(host);
    }
    return;
  }

  var main = document.querySelector('main');
  if (main && main.parentNode) {
    main.parentNode.insertBefore(host, main);
    return;
  }

  if (document.body) {
    document.body.insertBefore(host, document.body.firstChild);
  }
}





function renderCarousel(stories, storyVideoMap, activeVideos, dbLocations) {  // ← adiciona o 4º parâmetro
    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);
    var shadowData = getOrCreateCarouselShadowRoot();
    insertCarouselHostBySelector(shadowData.host, dbLocations);  // ← passa dbLocations aqui


    var shadow = shadowData.shadow;

    var style = createEl('style');
    style.textContent =
      buildSharedCss(appearance) +
      buildCarouselCss(appearance)

    var wrap = createEl('div', 'vl-carousel-wrap');
    var header = createEl('div', 'vl-carousel-header');
    var title = createEl('div', 'vl-carousel-title');

    title.textContent =
      currentAppearance.name ||
      currentAppearance.title ||
      'Stories';

    header.appendChild(title);
    wrap.appendChild(header);

    var carousel = createEl('div', 'vl-carousel');
    carousel.setAttribute('data-vidlytics-drag-scroll', 'true');

    stories.forEach(function (story, index) {
      var relations = (storyVideoMap.get(story.id) || [])
        .slice()
        .sort(function (a, b) {
          return Number(a.position || 0) - Number(b.position || 0);
        });

      relations.forEach(function (relation) {
        var video = activeVideos.find(function (item) {
          return idsEqual(item.id, relation.video_id);
        });

        if (!video || video.active === false || relation.active === false) {
          return;
        }

        var thumb = getStoryThumbnail(story, video, relation) || getVideoThumbnail(video);
        var labelText = firstDefined(video.title, video.name, video.video_title, story.title, story.name, 'Story');
        var card = createEl('button', 'vl-carousel-card');
        var inner = createEl('div', 'vl-carousel-inner');
        var media = createEl('div', 'vl-carousel-media');
        var openIndex = relations.findIndex(function (item) {
          return idsEqual(item.video_id, relation.video_id) && Number(item.position || 0) === Number(relation.position || 0);
        });

        if (openIndex < 0) openIndex = 0;

        card.type = 'button';
        card.setAttribute('aria-label', labelText);

        if (thumb) {
          var img = createEl('img', 'vl-carousel-video');
          img.src = thumb;
          img.alt = labelText;
          img.loading = 'lazy';
          img.onerror = (function (cardMedia, currentStory, currentVideo, currentRelation, imageEl, fallbackText, imageUrl) {
            return function () {
              if (window.VIDLYTICS_DEBUG) {
                console.log('[Vidlytics] thumbnail load failed', {
                  storyId: currentStory && currentStory.id,
                  videoId: currentVideo && currentVideo.id,
                  relationId: currentRelation && currentRelation.id,
                  url: imageUrl
                });
              }
              if (imageEl && imageEl.parentNode) {
                imageEl.parentNode.removeChild(imageEl);
              }
              if (!cardMedia.querySelector('.vl-carousel-fallback')) {
                var fallback = createEl('div', 'vl-carousel-fallback');
                fallback.textContent = fallbackText;
                cardMedia.appendChild(fallback);
              }
            };
          }(media, story, video, relation, img, (story.title || story.name || 'S').slice(0, 1).toUpperCase(), thumb));
          media.appendChild(img);
        } else {
          var fallback = createEl('div', 'vl-carousel-fallback');
          fallback.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
          media.appendChild(fallback);
        }

        inner.appendChild(media);
        card.appendChild(inner);

        if (modalConfig.show_title !== false) {
          var label = createEl('span', 'vl-carousel-label');
          label.textContent = labelText;
          card.appendChild(label);
        }

        card.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (window.VIDLYTICS_DEBUG) {
            console.log('[Vidlytics] carousel click', { storyId: story.id, videoId: relation.video_id, videoIndex: openIndex });
          }
          openStory(stories, index, storyVideoMap, activeVideos, readStoryProductsData, readProductsData, openIndex);
        });

        card.addEventListener('pointerdown', function (event) {
          event.stopPropagation();
        });

        card.addEventListener('dragstart', function (event) {
          event.preventDefault();
        });

        carousel.appendChild(card);
      });
    });

    wrap.appendChild(carousel);

    shadow.innerHTML = '';
    shadow.appendChild(style);
    shadow.appendChild(wrap);
  }

  function renderGrid(stories, storyVideoMap, activeVideos) {

    var appearance = currentAppearance || {};

    var shadowData = getOrCreateShadowRoot(appearance);
    var shadow = shadowData.shadow;

    var style = createEl('style');
    style.textContent = buildGridCss(appearance) + buildSharedCss(appearance) + '.vl-grid-wrap{width:min(100%,1200px)!important;margin:0 auto!important;padding:24px 16px!important;display:flex!important;flex-direction:column!important;gap:16px!important;}.vl-grid-card{display:flex!important;flex-direction:column!important;gap:8px!important;cursor:pointer!important;}.vl-grid-img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}'

    var wrap = createEl('div', 'vl-grid-wrap');
    var header = createEl('div', 'vl-grid-header');
    var title = createEl('div', 'vl-grid-title');
    title.textContent = currentAppearance.name || 'Stories';
    header.appendChild(title);
    wrap.appendChild(header);

    var grid = createEl('div', 'vl-grid');
    stories.forEach(function (story, index) {
      var relations = (storyVideoMap.get(story.id) || []).slice().sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); });
      var coverRelation = relations.find(function (item) { return item.is_cover; }) || relations[0] || null;
      var coverVideo = coverRelation ? activeVideos.find(function (video) { return idsEqual(video.id, coverRelation.video_id); }) : null;
      var thumb = getStoryThumbnail(story, coverVideo, coverRelation);
      var card = createEl('button', 'vl-grid-card');
      card.type = 'button';

      var media = createEl('div', 'vl-grid-media');
      if (thumb) {
        var img = createEl('img', 'vl-grid-img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        media.appendChild(img);
      } else {
        media.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
      }

      var label = createEl('div', 'vl-grid-label');
      label.textContent = story.title || story.name || 'Story';

      card.appendChild(media);
      card.appendChild(label);
      card.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openStory(stories, index, storyVideoMap, activeVideos, readStoryProductsData, readProductsData);
      });
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    shadow.appendChild(style);
    shadow.appendChild(wrap);
  }

  function buildGridCss(appearance) {
    var font = getFontFamily(appearance);
    var gridConfig = parseJsonIfNeeded(firstDefined(appearance.grid_config, appearance.gridConfig, {})) || {};
    var gap = toNumber(firstDefined(gridConfig.gap, gridConfig.grid_gap), 16);
    var columns = Math.max(1, toNumber(firstDefined(gridConfig.columns, gridConfig.grid_columns), 3));
    var cardRadius = '18px';

    return (
      '.vl-grid-wrap{width:100%!important;display:flex!important;flex-direction:column!important;gap:16px!important;font-family:' + font + '!important;}' +
      '.vl-grid-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;}' +
      '.vl-grid-title{font-size:18px!important;font-weight:800!important;color:#0f172a!important;}' +
      '.vl-grid{display:grid!important;grid-template-columns:repeat(' + columns + ',minmax(0,1fr))!important;gap:' + gap + 'px!important;width:100%!important;}' +

      '@media (max-width: 768px){.vl-grid{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important;}}' +
      '.vl-grid-card{all:unset!important;display:flex!important;flex-direction:column!important;gap:8px!important;cursor:pointer!important;}' +
      '.vl-grid-media{position:relative!important;width:100%!important;aspect-ratio:9/16!important;border-radius:' + cardRadius + '!important;overflow:hidden!important;background:#e2e8f0!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:24px!important;font-weight:800!important;color:#0f172a!important;box-shadow:0 10px 24px rgba(15,23,42,.12)!important;}' +
      '.vl-grid-img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}' +
      '.vl-grid-label{font-size:12px!important;line-height:1.2!important;font-weight:700!important;text-align:center!important;color:#0f172a!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}'
    );
  }

  function buildCarouselCss(appearance) {
    var font = getFontFamily(appearance);
    var carouselConfig = parseJsonIfNeeded(
      firstDefined(appearance.carousel_config, appearance.carouselConfig, {})
    ) || {};

    var gap = toNumber(firstDefined(carouselConfig.gap, carouselConfig.carousel_gap), 16);
    var visibleItems = Math.max(2, toNumber(firstDefined(carouselConfig.visible_items, carouselConfig.carousel_visible_items), 4));
    var cardWidth = 'clamp(180px, ' + Math.floor(100 / visibleItems) + 'vw, 280px)';

    return (
      '.vl-carousel-wrap{width:100%!important;max-width:none!important;margin:0!important;padding:24px 0!important;box-sizing:border-box!important;background:transparent!important;font-family:' + font + '!important;}' +

      '.vl-carousel-wrap .vl-carousel-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;margin-bottom:16px!important;}' +
      '.vl-carousel-wrap .vl-carousel-title{font-size:18px!important;font-weight:800!important;color:#0f172a!important;}' +
      '.vl-carousel-wrap .vl-carousel{width:100%!important;display:flex!important;flex-flow:row nowrap!important;justify-content:flex-start!important;align-items:flex-start!important;gap:' + gap + 'px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important;cursor:grab!important;box-sizing:border-box!important;padding:8px 0!important;scroll-snap-type:x mandatory!important;touch-action:pan-x!important;}' +

      '.vl-carousel-wrap .vl-carousel-card{display:flex!important;flex:0 0 ' + cardWidth + '!important;width:' + cardWidth + '!important;min-width:' + cardWidth + '!important;max-width:' + cardWidth + '!important;flex-direction:column!important;gap:8px!important;box-sizing:border-box!important;cursor:pointer!important;scroll-snap-align:start!important;}' +
      '.vl-carousel-wrap .vl-carousel-inner{position:relative!important;width:100%!important;aspect-ratio:9 / 16!important;overflow:hidden!important;border-radius:20px!important;background:#e2e8f0!important;box-shadow:0 10px 24px rgba(15,23,42,.12)!important;}' +
      '.vl-carousel-wrap .vl-carousel-media{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;}' +
      '.vl-carousel-wrap .vl-carousel-video{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}' +
      '.vl-carousel-wrap .vl-carousel-label{width:100%!important;max-width:100%!important;font-size:12px!important;line-height:1.2!important;font-weight:700!important;color:#0f172a!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;}' +
      '@media (max-width: 768px){.vl-carousel-wrap .vl-carousel{justify-content:flex-start!important;}.vl-carousel-wrap .vl-carousel-card{flex-basis:clamp(160px, 72vw, 220px)!important;width:clamp(160px, 72vw, 220px)!important;min-width:clamp(160px, 72vw, 220px)!important;max-width:clamp(160px, 72vw, 220px)!important;}}' +
      '.vl-carousel-wrap .vl-carousel::-webkit-scrollbar{display:none!important;}'
    );
  }

  function forceHostPosition() {
    if (floatingWasDragged || floatingWasClosed) return;
    var host = document.getElementById('vidlytics-widget-root');
    if (!host) return;
    applyHostPosition(host, currentAppearance || {});
  }

  function renderWidget() {
    try {
      var existingRoot = document.getElementById('vidlytics-widget-root');
      if (existingRoot) existingRoot.remove();
      var existingCarouselRoot = document.getElementById('vidlytics-carousel-root');
      if (existingCarouselRoot) existingCarouselRoot.remove();
    } catch (e) {}

  return Promise.all([
    readAppearance(),
    readStories(),
    readStoryVideos(),
    readVideos(),
    readStoryProducts(),
    readProducts(),
    readPageRules(),
    readComments(),
    readLikesFromDb(),
    readSizingModels(),
    readDisplayLocations()
  ])
  .then(function (results) {
    currentAppearance = normalizeAppearanceItem(results[0] || {});

    var modalConfig = normalizeModalAppearanceConfig(currentAppearance);

    var stories = results[1] || [];
    var storyVideos = results[2] || [];
    var videos = results[3] || [];
    var storyProducts = results[4] || [];
    var products = results[5] || [];
    var pageRules = results[6] || [];
    readCommentsData = results[7] || [];
    var dbLikes = results[8] || [];
    window.__vidlytics_db_likes_raw = dbLikes;
    readSizingModelsData = results[9] || [];
    var displayLocations = results[10] || [];

    readLikeCounts = {};
    dbLikes.forEach(function (item) {
      if (item.video_id) readLikeCounts[item.video_id] = (readLikeCounts[item.video_id] || 0) + 1;
    });

    readStoryProductsData = storyProducts;
    readProductsData = products;

    if (!stories.length) return;

    var activeVideos = videos.filter(function (video) {
      return (
        ('status' in video ? video.status === 'active' : true) &&
        ('active' in video ? video.active !== false : true) &&
        Boolean(getVideoUrl(video))
      );
    });
    if (!activeVideos.length) return;

    var storyVideoMap = new Map();
    storyVideos.forEach(function (item) {
      if (!storyVideoMap.has(item.story_id)) storyVideoMap.set(item.story_id, []);
      storyVideoMap.get(item.story_id).push(item);
    });

    // Métrica de view do widget
    trackMetric({ event_type: 'view' });

    var storiesWithVideos = stories.filter(function (story) {
      return (storyVideoMap.get(story.id) || []).some(function (rel) {
        return activeVideos.some(function (video) {
          return idsEqual(video.id, rel.video_id);
        });
      });
    });
    if (!storiesWithVideos.length) return;

    // Aplica regras de página (page_rules)
    var applicableStories = storiesWithVideos.filter(function (story) {
      var rulesForStory = pageRules.filter(function (rule) {
        return (rule.active !== false) && (rule.story_id == null || idsEqual(rule.story_id, story.id));
      });
      return !rulesForStory.length || rulesForStory.some(matchesRule);
    });
    if (!applicableStories.length) return;

    // Filtro de URL específica (campo `url` da aparência)
    if (!matchesUrl(currentAppearance)) {
      console.info('[Vidlytics] Widget não exibido: URL atual não corresponde à configuração (url="' + (currentAppearance.url || '') + '").');
      return;
    }

    // Determinar modo: prioriza o `format` do story, depois o `type` da aparência
    var storyFormat = '';
    if (applicableStories.length > 0 && applicableStories[0].format) {
      storyFormat = String(applicableStories[0].format).toLowerCase();
    }

    var rawType = firstDefined(currentAppearance.type, currentAppearance.widget_type, currentAppearance.viewMode);
    var rawMode =
      storyFormat ||
      rawType ||
      (widgetsCfg && widgetsCfg.viewMode) ||
      (config && config.viewMode) ||
      (enableFloating ? 'floating' : (enableCarousel ? 'carousel' : 'grid'));

    var mode = String(rawMode || 'floating').toLowerCase();

    // Normaliza: floating_widget -> floating
    if (mode === 'floating_widget') mode = 'floating';

    console.info('[Vidlytics] Modo de renderização:', mode, '| story format:', storyFormat, '| appearance type:', rawType || '(não definido)');

    if (mode === 'floating') {
      renderFloatingBubbles(applicableStories, storyVideoMap, activeVideos);
      forceHostPosition();
      setTimeout(forceHostPosition, 100);
      setTimeout(forceHostPosition, 500);
      setTimeout(forceHostPosition, 1500);
    } else if (mode === 'carousel') {
      renderCarousel(
        applicableStories,
        storyVideoMap,
        activeVideos,
         displayLocations 
      );
    }

  })

  .catch(function (error) {
    console.error('Erro no Vidlytics Widget:', error);
  });
}



    function initMutationObserver() {
    if (!window.MutationObserver) return;
    var scheduled = false;
    var observer = new MutationObserver(function (mutations) {
      var shouldForce = false;
      mutations.forEach(function (m) {
        if (m.type === 'childList' || (m.type === 'attributes' && m.target && m.target.id === 'vidlytics-widget-root')) {
          shouldForce = true;
        }
      });
      if (shouldForce && !scheduled) {
        scheduled = true;
        setTimeout(function () {
          scheduled = false;
          forceHostPosition();
        }, 150);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  var bootstrapStarted = false;
  var bootstrapObserver = null;
  var bootstrapTimer = null;

  function scheduleRender() {
    if (bootstrapTimer) {
      clearTimeout(bootstrapTimer);
    }

    bootstrapTimer = setTimeout(function () {
      renderWidget();
    }, 50);
  }

  function observeUrlChanges() {
    if (bootstrapObserver || !window.MutationObserver) return;

    var lastHref = window.location.href;

    bootstrapObserver = new MutationObserver(function () {
      var currentHref = window.location.href;

      if (currentHref !== lastHref) {
        lastHref = currentHref;
        scheduleRender();
      }
    });

    bootstrapObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: false
    });

    window.addEventListener('popstate', scheduleRender);
    window.addEventListener('hashchange', scheduleRender);

    var pushState = history.pushState;
    var replaceState = history.replaceState;

    history.pushState = function () {
      var result = pushState.apply(history, arguments);
      scheduleRender();
      return result;
    };

    history.replaceState = function () {
      var result = replaceState.apply(history, arguments);
      scheduleRender();
      return result;
    };
  }

  function bootstrap() {
    try {
      if (bootstrapStarted) return;
      bootstrapStarted = true;
      renderWidget();
      initMutationObserver();
      observeUrlChanges();
      window.addEventListener('resize', forceHostPosition);
      window.addEventListener('orientationchange', forceHostPosition);
    } catch (e) {
      console.error('[Vidlytics] Erro no bootstrap', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
  })();
