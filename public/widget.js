(function () {
  var WIDGET_VERSION = '2026.07.23-05';

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
  var readLikeCounts = {};

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

      for (i = 0; i < keys.length; i++) {
        value = modalConfig[keys[i]];

        if (value !== undefined && value !== null && value !== '') {
          return value === true || value === 'true' || value === 1 || value === '1';
        }
      }

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
    if (!rawUrl || String(rawUrl).trim() === '') return true;

    var pattern = String(rawUrl).trim().toLowerCase();
    var href = window.location.href.toLowerCase();
    var path = (window.location.pathname || '/').toLowerCase();
    var search = (window.location.search || '').toLowerCase();
    var fullPath = (path + search).replace(/\/+$/, '');

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

      /* PAINEL DE COMENTÁRIOS */
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

      /* PAINEL DE MEDIDAS */
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

      media.addEventListener('ended', function() {
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
      play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
