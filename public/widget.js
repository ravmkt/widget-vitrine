/**
 * Vidlytics Widget — widget.js
 * Correção: aparência controlada pela seção Aparência do aplicativo
 * Consulta widget_appearances.store_id com fallback para appearances.store_id
 * Versão: 202607141900
 */
(function () {
  console.log('VIDLYTICS WIDGET CARREGADO - APARÊNCIA VIA widget_appearances - 202607151435');

var VIDLYTICS_WIDGET_VERSION = 'appearance-widget-appearances-only-202607151435';

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

  var enableFloating =
    widgetsCfg.floatingVideo !== undefined
      ? widgetsCfg.floatingVideo
      : config.floatingVideo !== false;

  var enableCarousel =
    widgetsCfg.carousel !== undefined
      ? widgetsCfg.carousel
      : config.carousel !== false;

  var currentAppearance = {};
  var overlay = null;
  var modalContent = null;
    var floatingWasDragged = false;
var floatingWasClosed = false;
  var readStoryProductsData = [];
  var readProductsData = [];

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var DEFAULT_APPEARANCE = {
  floating_position: 'bottom-right',
  floating_shape: 'portrait',
  floating_top: 20,
  floating_bottom: 24,
  floating_side: 20,
  floating_width: 85,
  floating_height: 151,
  floating_border_radius: 12,
  floating_border_width: 2,
  floating_object_fit: 'cover',
  z_index: 2147483647,
  primary_color: '#0094EB',
  secondary_color: '#EC4899',
  text_color: '#0f172a',
  font_family: 'Inter, system-ui, sans-serif',
  show_title: true,
  show_product: true,
  hide_stories: false,
  shadow_enabled: true,
  show_play_button: false,
  allow_drag: false,
  allow_close: false
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
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') {
        return arguments[i];
      }
    }

    return undefined;
  }

  function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
  }

  function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function parseJsonIfNeeded(value) {
    if (!value) return {};

    if (isPlainObject(value)) return value;

    if (typeof value === 'string') {
      var trimmed = value.trim();

      if (!trimmed) return {};
      if (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[') return {};

      try {
        var parsed = JSON.parse(trimmed);
        return isPlainObject(parsed) ? parsed : {};
      } catch (e) {
        return {};
      }
    }

    return {};
  }

  function normalizeKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/_/g, '-')
      .replace(/\s+/g, '-');
  }

  function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  var str = String(value).trim().toLowerCase();

  if (
    str === 'true' ||
    str === '1' ||
    str === 'yes' ||
    str === 'sim' ||
    str === 'on' ||
    str === 'enabled' ||
    str === 'enable' ||
    str === 'ativo' ||
    str === 'ativado'
  ) {
    return true;
  }

  if (
    str === 'false' ||
    str === '0' ||
    str === 'no' ||
    str === 'nao' ||
    str === 'não' ||
    str === 'off' ||
    str === 'disabled' ||
    str === 'disable' ||
    str === 'inativo' ||
    str === 'desativado'
  ) {
    return false;
  }

  return fallback;
}


  function normalizeMediaUrl(url) {
    if (!url) return '';

    var value = String(url).trim();

    if (!value) return '';
    if (value.indexOf('http://') === 0) return value;
    if (value.indexOf('https://') === 0) return value;
    if (value.indexOf('data:') === 0) return value;
    if (value.indexOf('blob:') === 0) return value;
    if (value.indexOf('//') === 0) return window.location.protocol + value;
    if (value.charAt(0) === '/' && supabaseUrl) return supabaseUrl + value;

    return value;
  }

  function getStorageItem(key, fallback) {
    try {
      var item = localStorage.getItem(key);
      if (!item) return fallback;

      try {
        return JSON.parse(item);
      } catch (e) {
        return item;
      }
    } catch (e2) {
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

  function fetchJson(path) {
    return supabaseFetch(path, { method: 'GET' })
      .then(function (response) {
        if (!response.ok) {
          console.warn('VIDLYTICS FETCH ERRO:', path, response.status, response.statusText);
          return [];
        }

        return response.json();
      })
      .then(function (data) {
        return Array.isArray(data) ? data : [];
      })
      .catch(function (error) {
        console.warn('VIDLYTICS FETCH CATCH:', path, error);
        return [];
      });
  }

  function flattenAppearanceInto(target, source, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 12) return target;
    if (!source) return target;

    if (typeof source === 'string') {
      source = parseJsonIfNeeded(source);
    }

    if (!isPlainObject(source)) return target;

    Object.keys(source).forEach(function (key) {
      var value = source[key];

      if (value === undefined || value === null || value === '') return;

      if (isPlainObject(value)) {
        flattenAppearanceInto(target, value, depth + 1);
        return;
      }

      if (typeof value === 'string') {
        var parsed = parseJsonIfNeeded(value);

        if (isPlainObject(parsed) && Object.keys(parsed).length) {
          flattenAppearanceInto(target, parsed, depth + 1);
          return;
        }
      }

      target[key] = value;
    });

    return target;
  }

  function normalizeAppearanceItem(item) {
    var merged = {};

    flattenAppearanceInto(merged, item || {}, 0);

    delete merged.storageAppearance;
    delete merged.configAppearance;
    delete merged.dbAppearance;
    delete merged.widgetsAppearance;
    delete merged.widgetsAparencia;

    return merged;
  }

  function mergeObject(target, source) {
    source = normalizeAppearanceItem(source || {});

    Object.keys(source).forEach(function (key) {
      var value = source[key];

      if (value !== undefined && value !== null && value !== '') {
        target[key] = value;
      }
    });

    return target;
  }

  function readAppearanceValue(appearance, names) {
    appearance = normalizeAppearanceItem(appearance || {});

    for (var i = 0; i < names.length; i += 1) {
      if (
        appearance[names[i]] !== undefined &&
        appearance[names[i]] !== null &&
        appearance[names[i]] !== ''
      ) {
        return appearance[names[i]];
      }
    }

    var normalizedNames = names.map(function (name) {
      return normalizeKey(name);
    });

    var keys = Object.keys(appearance);

    for (var k = 0; k < keys.length; k += 1) {
      var currentKey = keys[k];

      if (normalizedNames.indexOf(normalizeKey(currentKey)) !== -1) {
        if (
          appearance[currentKey] !== undefined &&
          appearance[currentKey] !== null &&
          appearance[currentKey] !== ''
        ) {
          return appearance[currentKey];
        }
      }
    }

    return undefined;
  }

  function getConfigAppearance() {
    var merged = {};

    [
      config.appearance,
      config.aparencia,
      config.appearanceConfig,
      config.appearance_config,
      config.floating,
      config.floatingConfig,
      config.floatingAppearance,
      config.floatingVideoConfig,
      config.floatingVideoAppearance,
      config.floating_video,
      widgetsCfg.appearance,
      widgetsCfg.aparencia,
      widgetsCfg.appearanceConfig,
      widgetsCfg.appearance_config,
      widgetsCfg.floating,
      widgetsCfg.floatingConfig,
      widgetsCfg.floatingAppearance,
      widgetsCfg.floatingVideoConfig,
      widgetsCfg.floatingVideoAppearance,
      widgetsCfg.floating_video
    ].forEach(function (src) {
      flattenAppearanceInto(merged, src, 0);
    });

    return normalizeAppearanceItem(merged);
  }

  function getStorageAppearance() {
    var merged = {};
    var keys = [
      'vidlytics_appearance',
      'vidlytics_appearance_' + storeId,
      'vidlytics_aparencia',
      'vidlytics_aparencia_' + storeId,
      'vidlytics_widget_appearance',
      'vidlytics_widget_appearance_' + storeId,
      'vidlytics_config',
      'vidlytics_config_' + storeId,
      'VIDLYTICS_APPEARANCE',
      'VIDLYTICS_CONFIG'
    ];

    keys.forEach(function (key) {
      flattenAppearanceInto(merged, getStorageItem(key, {}), 0);
    });

    return normalizeAppearanceItem(merged);
  }

  function appearanceHasUsefulData(appearance) {
  appearance = normalizeAppearanceItem(appearance || {});

  var usefulNames = [
    'floating_position',
    'floatingPosition',
    'position',
    'posicao',
    'posição',
    'widget_position',
    'widgetPosition',
    'placement',
    'floating_video_position',
    'floatingVideoPosition',

    'floating_shape',
    'floatingShape',
    'shape',
    'form',
    'forma',
    'formato',
    'widget_shape',
    'widgetShape',
    'floating_video_shape',
    'floatingVideoShape',

    'floating_width',
    'floatingWidth',
    'width',
    'largura',
    'widget_width',
    'widgetWidth',
    'floating_video_width',
    'floatingVideoWidth',

    'floating_height',
    'floatingHeight',
    'height',
    'altura',
    'widget_height',
    'widgetHeight',
    'floating_video_height',
    'floatingVideoHeight',

    'floating_radius',
    'floatingRadius',
    'border_radius',
    'borderRadius',
    'radius',
    'raio',
    'widget_radius',
    'widgetRadius',

    'floating_top',
    'floatingTop',
    'top',
    'top_spacing',
    'topSpacing',
    'spacing_top',
    'spacingTop',

    'floating_bottom',
    'floatingBottom',
    'bottom',
    'bottom_spacing',
    'bottomSpacing',
    'spacing_bottom',
    'spacingBottom',

    'floating_side',
    'floatingSide',
    'side',
    'left_spacing',
    'leftSpacing',
    'right_spacing',
    'rightSpacing',

    'distance_top',
    'distanceTop',
    'distancia_superior',
    'distanciaSuperior',
    'distance_bottom',
    'distanceBottom',
    'distancia_inferior',
    'distanciaInferior',
    'distance_side',
    'distanceSide',
    'distancia_lateral',
    'distanciaLateral',

    'floating_border_width',
    'floatingBorderWidth',
    'border_width',
    'borderWidth',
    'largura_borda',
    'larguraBorda',

    'primary_color',
    'primaryColor',
    'secondary_color',
    'secondaryColor',
    'border_color',
    'borderColor',
    'color',
    'text_color',
    'textColor',
    'font_family',
    'fontFamily',

    'background_color',
    'backgroundColor',
    'button_color',
    'buttonColor',

    'show_title',
    'showTitle',
    'show_product',
    'showProduct',
    'hide_stories',
    'hideStories',
    'shadow_enabled',
    'shadowEnabled',

    'floating_config',
'floatingConfig',

'floating_border_radius',
'floatingBorderRadius',
'widget_border_radius',
'widgetBorderRadius',
'widget_radius',
'widgetRadius',
'border_radius',
'borderRadius',

'floating_object_fit',
'floatingObjectFit',
'object_fit',
'objectFit',
'image_fit',
'imageFit',
'fit',

'show_play_button',
'showPlayButton',
'show_player_button',
'showPlayerButton',
'play_button_enabled',
'playButtonEnabled',

'allow_drag',
'allowDrag',
'draggable',
'drag_enabled',
'dragEnabled',
'permitir_arrastar',

'allow_close',
'allowClose',
'closable',
'close_enabled',
'closeEnabled',
'show_close_button',
'showCloseButton',
'permitir_fechar',

'floating_show_play_button',
'floatingShowPlayButton',
'show_floating_play_button',
'showFloatingPlayButton',

'allow_floating_drag',
'allowFloatingDrag',
'floating_allow_drag',
'floatingAllowDrag',
'floating_drag_enabled',
'floatingDragEnabled',

'allow_floating_close',
'allowFloatingClose',
'floating_allow_close',
'floatingAllowClose',
'floating_close_enabled',
'floatingCloseEnabled'
    
  ];

  for (var i = 0; i < usefulNames.length; i += 1) {
    var value = readAppearanceValue(appearance, [usefulNames[i]]);

    if (value !== undefined && value !== null && value !== '') {
      return true;
    }
  }

  return false;
}
  

  function extractAppearanceFromItem(item, allowDirectFields) {
  if (!item) return {};

  var merged = {};

  [
    item.appearance,
    item.aparencia,
    item.appearance_config,
    item.appearanceConfig,
    item.widget_appearance,
    item.widgetAppearance,
    item.widget_config,
    item.widgetConfig,
    item.settings,
    item.config,
    item.style,
    item.styles,
    item.data,
    item.metadata,
    item.customization,
    item.customization_config,
    item.theme,
    item.theme_config,
    item.floating,
    item.floating_config,
    item.floatingConfig,
    item.floatingAppearance,
    item.floating_video,
    item.floatingVideo,
    item.floatingVideoConfig,
    item.floatingVideoAppearance
  ].forEach(function (src) {
    flattenAppearanceInto(merged, src, 0);
  });

  /**
   * CAMPOS DIRETOS DA TABELA appearances
   *
   * No seu banco:
   * widget_shape
   * widget_size
   * shadow_enabled
   * font_family
   */
  if (allowDirectFields) {
    if (firstDefined(item.widget_shape, item.shape)) {
      merged.shape = firstDefined(item.widget_shape, item.shape);
      merged.widget_shape = firstDefined(item.widget_shape, item.shape);
    }

    if (firstDefined(item.widget_size, item.size)) {
      merged.size = firstDefined(item.widget_size, item.size);
      merged.widget_size = firstDefined(item.widget_size, item.size);
    }

    if (firstDefined(item.shadow_enabled, item.shadowEnabled) !== undefined) {
      merged.shadow = firstDefined(item.shadow_enabled, item.shadowEnabled);
      merged.shadow_enabled = firstDefined(item.shadow_enabled, item.shadowEnabled);
      merged.shadowEnabled = firstDefined(item.shadow_enabled, item.shadowEnabled);
    }

    if (firstDefined(item.font_family, item.fontFamily)) {
      merged.fontFamily = firstDefined(item.font_family, item.fontFamily);
      merged.font_family = firstDefined(item.font_family, item.fontFamily);
    }

    /**
     * CAMPOS DIRETOS DA TABELA widget_appearances
     *
     * No seu banco:
     * floating_shape
     * floating_width
     * floating_height
     * floating_radius
     */
    if (firstDefined(item.floating_shape, item.floatingShape)) {
      merged.shape = firstDefined(item.floating_shape, item.floatingShape);
      merged.widget_shape = firstDefined(item.floating_shape, item.floatingShape);
      merged.floating_shape = firstDefined(item.floating_shape, item.floatingShape);
    }

    if (firstDefined(item.floating_width, item.floatingWidth)) {
      merged.width = firstDefined(item.floating_width, item.floatingWidth);
      merged.floating_width = firstDefined(item.floating_width, item.floatingWidth);
    }

    if (firstDefined(item.floating_height, item.floatingHeight)) {
      merged.height = firstDefined(item.floating_height, item.floatingHeight);
      merged.floating_height = firstDefined(item.floating_height, item.floatingHeight);
    }

    var directRadius = firstDefined(
  item.floating_radius,
  item.floatingRadius,
  item.floating_border_radius,
  item.floatingBorderRadius,
  item.widget_radius,
  item.widgetRadius,
  item.widget_border_radius,
  item.widgetBorderRadius,
  item.border_radius,
  item.borderRadius,
  item.radius,
  item.raio
);

if (directRadius !== undefined) {
  merged.radius = directRadius;
  merged.borderRadius = directRadius;
  merged.border_radius = directRadius;
  merged.widget_radius = directRadius;
  merged.widget_border_radius = directRadius;
  merged.floating_radius = directRadius;
  merged.floating_border_radius = directRadius;
}

    if (firstDefined(item.floating_position, item.floatingPosition)) {
      merged.position = firstDefined(item.floating_position, item.floatingPosition);
      merged.floating_position = firstDefined(item.floating_position, item.floatingPosition);
    }

    if (firstDefined(item.floating_top, item.floatingTop)) {
      merged.top = firstDefined(item.floating_top, item.floatingTop);
      merged.floating_top = firstDefined(item.floating_top, item.floatingTop);
    }

    if (firstDefined(item.floating_bottom, item.floatingBottom)) {
      merged.bottom = firstDefined(item.floating_bottom, item.floatingBottom);
      merged.floating_bottom = firstDefined(item.floating_bottom, item.floatingBottom);
    }

    if (firstDefined(item.floating_side, item.floatingSide)) {
      merged.side = firstDefined(item.floating_side, item.floatingSide);
      merged.floating_side = firstDefined(item.floating_side, item.floatingSide);
    }

    var directBorderColor = firstDefined(
  item.floating_border_color,
  item.floatingBorderColor,
  item.floating_video_border_color,
  item.floatingVideoBorderColor,
  item.widget_border_color,
  item.widgetBorderColor,
  item.border_color,
  item.borderColor,
  item.cor_borda,
  item.corDaBorda,
  item.cor_da_borda
);

if (directBorderColor !== undefined) {
  merged.floating_border_color = directBorderColor;
  merged.border_color = directBorderColor;
  merged.borderColor = directBorderColor;
  merged.widget_border_color = directBorderColor;
}

var directObjectFit = firstDefined(
  item.floating_object_fit,
  item.floatingObjectFit,
  item.object_fit,
  item.objectFit,
  item.image_fit,
  item.imageFit,
  item.media_fit,
  item.mediaFit,
  item.thumbnail_fit,
  item.thumbnailFit,
  item.fit
);

if (directObjectFit !== undefined) {
  merged.floating_object_fit = directObjectFit;
  merged.object_fit = directObjectFit;
  merged.objectFit = directObjectFit;
}

var directShowPlayButton = firstDefined(
  item.show_play_button,
  item.showPlayButton,

  item.show_player_button,
  item.showPlayerButton,

  item.play_button_enabled,
  item.playButtonEnabled,

  item.floating_play_button,
  item.floatingPlayButton,

  item.floating_show_play_button,
  item.floatingShowPlayButton,

  item.show_floating_play_button,
  item.showFloatingPlayButton,

  item.player_button,
  item.playerButton,

  item.mostrar_play,
  item.mostrarPlay,
  item.mostrar_botao_play,
  item.mostrarBotaoPlay
);

if (directShowPlayButton !== undefined) {
  merged.show_play_button = directShowPlayButton;
  merged.showPlayButton = directShowPlayButton;
  merged.show_player_button = directShowPlayButton;
  merged.play_button_enabled = directShowPlayButton;
  merged.floating_play_button = directShowPlayButton;
  merged.floating_show_play_button = directShowPlayButton;
  merged.show_floating_play_button = directShowPlayButton;
}


var directAllowDrag = firstDefined(
  item.allow_drag,
  item.allowDrag,

  item.draggable,

  item.drag_enabled,
  item.dragEnabled,

  item.floating_draggable,
  item.floatingDraggable,

  item.allow_floating_drag,
  item.allowFloatingDrag,

  item.floating_allow_drag,
  item.floatingAllowDrag,

  item.floating_drag_enabled,
  item.floatingDragEnabled,

  item.permitir_arrastar,
  item.permitirArrastar,
  item.arrastar,
  item.arrastavel
);

if (directAllowDrag !== undefined) {
  merged.allow_drag = directAllowDrag;
  merged.allowDrag = directAllowDrag;
  merged.draggable = directAllowDrag;
  merged.drag_enabled = directAllowDrag;
  merged.floating_draggable = directAllowDrag;
  merged.allow_floating_drag = directAllowDrag;
  merged.floating_allow_drag = directAllowDrag;
  merged.floating_drag_enabled = directAllowDrag;
}


var directAllowClose = firstDefined(
  item.allow_close,
  item.allowClose,

  item.closable,

  item.close_enabled,
  item.closeEnabled,

  item.show_close_button,
  item.showCloseButton,

  item.floating_close_button,
  item.floatingCloseButton,

  item.allow_floating_close,
  item.allowFloatingClose,

  item.floating_allow_close,
  item.floatingAllowClose,

  item.floating_close_enabled,
  item.floatingCloseEnabled,

  item.permitir_fechar,
  item.permitirFechar,
  item.fechar,
  item.fechavel
);

if (directAllowClose !== undefined) {
  merged.allow_close = directAllowClose;
  merged.allowClose = directAllowClose;
  merged.closable = directAllowClose;
  merged.close_enabled = directAllowClose;
  merged.show_close_button = directAllowClose;
  merged.floating_close_button = directAllowClose;
  merged.allow_floating_close = directAllowClose;
  merged.floating_allow_close = directAllowClose;
  merged.floating_close_enabled = directAllowClose;
}


    flattenAppearanceInto(merged, item, 0);
  }

  var floatingConfig = parseJsonIfNeeded(
    firstDefined(
      item.floating_config,
      item.floatingConfig,
      item.config && item.config.floating_config,
      item.config && item.config.floatingConfig,
      item.settings && item.settings.floating_config,
      item.settings && item.settings.floatingConfig
    )
  );

  if (isPlainObject(floatingConfig)) {
    var device = window.innerWidth < 768 ? 'mobile' : 'desktop';

    if (isPlainObject(floatingConfig.desktop)) {
      flattenAppearanceInto(merged, floatingConfig.desktop, 0);
    }

    if (isPlainObject(floatingConfig[device])) {
      flattenAppearanceInto(merged, floatingConfig[device], 0);
    }
  }

  return normalizeAppearanceItem(merged);
}



  function fetchDbAppearance() {
  if (!storeId || !hasSupabase) return Promise.resolve({});

  function tryTable(tableName, extraQuery) {
    var path =
      tableName +
      '?select=*' +
      '&store_id=eq.' + encodeURIComponent(storeId) +
      (extraQuery || '') +
      '&order=updated_at.desc.nullslast,created_at.desc.nullslast' +
      '&limit=1';

    console.log('VIDLYTICS DB APARÊNCIA');
    console.log('TABLE:', tableName);
    console.log('PATH:', path);

    return fetchJson(path).then(function (items) {
      if (!items || !items.length) return null;

      var item = items[0];
      var appearance = extractAppearanceFromItem(item, true);

      console.log('VIDLYTICS DB APARÊNCIA RAW:', item);
      console.log('VIDLYTICS DB APARÊNCIA NORMALIZADA:', appearance);

      return appearanceHasUsefulData(appearance) ? appearance : null;
    });
  }

  return tryTable('widget_appearances')
    .then(function (appearance) {
      if (appearance) return appearance;

      return tryTable('appearances');
    })
    .then(function (appearance) {
      return appearance || {};
    });
}



  function readAppearance() {
    var configAppearance = normalizeAppearanceItem(getConfigAppearance());
    var storageAppearance = normalizeAppearanceItem(getStorageAppearance());

    function buildFinalAppearance(dbAppearance) {
      var finalAppearance = {};

      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, storageAppearance);

      if (appearanceHasUsefulData(dbAppearance)) {
        mergeObject(finalAppearance, dbAppearance);
      }

      finalAppearance = normalizeAppearanceItem(finalAppearance);

      console.log('VIDLYTICS CONFIG APARÊNCIA:', configAppearance);
      console.log('VIDLYTICS STORAGE APARÊNCIA:', storageAppearance);
      console.log('VIDLYTICS DB APARÊNCIA:', dbAppearance || {});
      console.log('VIDLYTICS APARÊNCIA FINAL APLICADA:', finalAppearance);
      console.log('VIDLYTICS FLOATING CONFIG FINAL:', getFloatingConfig(finalAppearance));
      console.log('VIDLYTICS BORDER COLOR FINAL:', getBorderColor(finalAppearance));


      return finalAppearance;
    }

    return fetchDbAppearance()
      .then(function (dbAppearance) {
        return buildFinalAppearance(dbAppearance || {});
      })
      .catch(function (error) {
        console.warn('Vidlytics Widget: erro ao carregar aparência do banco:', error);
        return buildFinalAppearance({});
      });
  }

  function normalizeFloatingPosition(value) {
    var key = normalizeKey(value);

    if (
      key === 'fixed-top-left' ||
      key === 'top-left' ||
      key === 'left-top' ||
      key === 'superior-esquerda' ||
      key === 'canto-superior-esquerdo'
    ) {
      return 'top-left';
    }

    if (
      key === 'fixed-top-right' ||
      key === 'top-right' ||
      key === 'right-top' ||
      key === 'superior-direita' ||
      key === 'canto-superior-direito'
    ) {
      return 'top-right';
    }

    if (
      key === 'fixed-bottom-left' ||
      key === 'bottom-left' ||
      key === 'left' ||
      key === 'left-bottom' ||
      key === 'inferior-esquerda' ||
      key === 'canto-inferior-esquerdo'
    ) {
      return 'bottom-left';
    }

    if (
      key === 'fixed-bottom-right' ||
      key === 'bottom-right' ||
      key === 'right' ||
      key === 'right-bottom' ||
      key === 'inferior-direita' ||
      key === 'canto-inferior-direito'
    ) {
      return 'bottom-right';
    }

    return DEFAULT_APPEARANCE.floating_position;
  }

  function normalizeFloatingShape(value) {
    var key = normalizeKey(value);

    if (
      key === 'square' ||
      key === 'quadrado' ||
      key === 'rectangle' ||
      key === 'retangular'
    ) {
      return 'square';
    }

    if (
      key === 'portrait' ||
      key === 'retrato' ||
      key === 'vertical' ||
      key === '9-16' ||
      key === '9:16'
    ) {
      return 'portrait';
    }

    if (
      key === 'circle' ||
      key === 'circulo' ||
      key === 'circular' ||
      key === 'redondo'
    ) {
      return 'circle';
    }

    return DEFAULT_APPEARANCE.floating_shape;
  }

  function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  var normalized = String(value)
    .trim()
    .replace('px', '')
    .replace(',', '.');

  var parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback) {
  return toBoolean(value, fallback);
}

function px(value, fallback) {
  if (value === undefined || value === null || value === '') {
    value = fallback !== undefined ? fallback : 0;
  }

  if (typeof value === 'string') {
    var trimmed = value.trim();

    if (
      trimmed === 'auto' ||
      trimmed.indexOf('px') !== -1 ||
      trimmed.indexOf('%') !== -1 ||
      trimmed.indexOf('vh') !== -1 ||
      trimmed.indexOf('vw') !== -1 ||
      trimmed.indexOf('rem') !== -1 ||
      trimmed.indexOf('em') !== -1
    ) {
      return trimmed;
    }
  }

  var num = toNumber(value, fallback !== undefined ? fallback : 0);

  return num + 'px';
}

  function getFloatingConfig(appearance) {
  appearance = appearance || {};

  function normalizeValue(value) {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
  }

  function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    var normalized = normalizeValue(value);

    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'sim' ||
      normalized === 's' ||
      normalized === 'on' ||
      normalized === 'ativo' ||
      normalized === 'ativado'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no' ||
      normalized === 'nao' ||
      normalized === 'não' ||
      normalized === 'n' ||
      normalized === 'off' ||
      normalized === 'inativo' ||
      normalized === 'desativado'
    ) {
      return false;
    }

    return defaultValue;
  }

  function getValue(names, fallback) {
    if (typeof readAppearanceValue === 'function') {
      return readAppearanceValue(appearance, names, fallback);
    }

    for (var i = 0; i < names.length; i++) {
      var name = names[i];

      if (
        Object.prototype.hasOwnProperty.call(appearance, name) &&
        appearance[name] !== undefined &&
        appearance[name] !== null &&
        appearance[name] !== ''
      ) {
        return appearance[name];
      }
    }

    return fallback;
  }

  var defaultPosition = DEFAULT_APPEARANCE.floating_position || 'bottom_right';
  var defaultObjectFit = DEFAULT_APPEARANCE.floating_object_fit || 'cover';
  var defaultShowPlayButton = DEFAULT_APPEARANCE.show_play_button !== false;
  var defaultAllowDrag = DEFAULT_APPEARANCE.allow_drag !== false;
  var defaultAllowClose = DEFAULT_APPEARANCE.allow_close !== false;

  var positionValue = getValue(
    [
      'floating_position',
      'floatingPosition',
      'position',
      'posicao',
      'posição',
      'video_position',
      'videoPosition',
      'widget_position',
      'widgetPosition'
    ],
    defaultPosition
  );

  var objectFitValue = getValue(
    [
      'floating_object_fit',
      'floatingObjectFit',
      'object_fit',
      'objectFit',
      'fit',
      'video_fit',
      'videoFit'
    ],
    defaultObjectFit
  );

  var showPlayButtonValue = getValue(
    [
      'show_play_button',
      'showPlayButton',
      'floating_show_play_button',
      'floatingShowPlayButton',
      'play_button',
      'playButton',
      'mostrar_botao_play',
      'mostrarBotaoPlay',
      'mostrar_play'
    ],
    defaultShowPlayButton
  );

  var allowDragValue = getValue(
    [
      'allow_drag',
      'allowDrag',
      'floating_allow_drag',
      'floatingAllowDrag',
      'draggable',
      'arrastavel',
      'arrastável',
      'permitir_arrastar',
      'permitirArrastar'
    ],
    defaultAllowDrag
  );

  var allowCloseValue = getValue(
    [
      'allow_close',
      'allowClose',
      'floating_allow_close',
      'floatingAllowClose',
      'close_button',
      'closeButton',
      'floating_close_button',
      'floatingCloseButton',
      'permitir_fechar',
      'permitirFechar'
    ],
    defaultAllowClose
  );

  var normalizedPosition = normalizeValue(positionValue);

  var positionMap = {
    'top_left': 'top_left',
    'top_right': 'top_right',
    'bottom_left': 'bottom_left',
    'bottom_right': 'bottom_right',

    'superior_esquerda': 'top_left',
    'superior_direita': 'top_right',
    'inferior_esquerda': 'bottom_left',
    'inferior_direita': 'bottom_right',

    'esquerda_superior': 'top_left',
    'direita_superior': 'top_right',
    'esquerda_inferior': 'bottom_left',
    'direita_inferior': 'bottom_right'
  };

  var position = positionMap[normalizedPosition] || defaultPosition;

  var normalizedObjectFit = normalizeValue(objectFitValue).replace(/_/g, '-');

  var allowedObjectFit = [
    'cover',
    'contain',
    'fill',
    'none',
    'scale-down'
  ];

  var objectFit = allowedObjectFit.indexOf(normalizedObjectFit) !== -1
    ? normalizedObjectFit
    : defaultObjectFit;

  var showPlayButton = parseBoolean(showPlayButtonValue, defaultShowPlayButton);
  var allowDrag = parseBoolean(allowDragValue, defaultAllowDrag);
  var allowClose = parseBoolean(allowCloseValue, defaultAllowClose);

  return {
    position: position,
    objectFit: objectFit,
    showPlayButton: showPlayButton,
    allowDrag: allowDrag,
    allowClose: allowClose
  };
}

  function getFloatingBehaviorConfig(appearance) {
  appearance = normalizeAppearanceItem(appearance || {});

  var objectFit = String(
    readAppearanceValue(appearance, [
      'object_fit',
      'objectFit',
      'video_object_fit',
      'videoObjectFit',
      'fit',
      'ajuste',
      'floating_object_fit',
      'floatingObjectFit'
    ]) || DEFAULT_APPEARANCE.object_fit || 'cover'
  ).toLowerCase();

  if (['cover', 'contain', 'fill', 'none', 'scale-down'].indexOf(objectFit) === -1) {
    objectFit = 'cover';
  }

  var showPlayButton = toBool(
    readAppearanceValue(appearance, [
      'show_play_button',
      'showPlayButton',
      'play_button',
      'playButton',
      'mostrar_play',
      'mostrarPlay',
      'exibir_play',
      'exibirPlay'
    ]),
    DEFAULT_APPEARANCE.show_play_button
  );

  var allowDrag = toBool(
    readAppearanceValue(appearance, [
      'allow_drag',
      'allowDrag',
      'draggable',
      'drag',
      'permitir_arrastar',
      'permitirArrastar'
    ]),
    DEFAULT_APPEARANCE.allow_drag
  );

  var allowClose = toBool(
    readAppearanceValue(appearance, [
      'allow_close',
      'allowClose',
      'show_close',
      'showClose',
      'close_button',
      'closeButton',
      'floating_close_button',
      'floatingCloseButton',
      'permitir_fechar',
      'permitirFechar'
    ]),
    DEFAULT_APPEARANCE.allow_close
  );

  return {
    objectFit: objectFit,
    showPlayButton: showPlayButton,
    allowDrag: allowDrag,
    allowClose: allowClose
  };
}

function getPrimaryColor(appearance) {
  return (
    readAppearanceValue(appearance, [
      'color',
      'border_color',
      'borderColor',
      'primary_color',
      'primaryColor',
      'cor_primaria',
      'corPrimaria',
      'cor_borda'
    ]) || DEFAULT_APPEARANCE.primary_color
  );
}

function getSecondaryColor(appearance) {
  return (
    readAppearanceValue(appearance, [
      'secondary_color',
      'secondaryColor',
      'background_color',
      'backgroundColor',
      'bg_color',
      'bgColor',
      'cor_secundaria',
      'corSecundaria',
      'cor_fundo'
    ]) || DEFAULT_APPEARANCE.secondary_color
  );
}

  function getBorderColor(appearance) {
  return readAppearanceValue(appearance, [
    'floating_border_color',
    'floatingBorderColor',
    'floating_video_border_color',
    'floatingVideoBorderColor',

    'border_color',
    'borderColor',
    'border-color',

    'widget_border_color',
    'widgetBorderColor',

    'cor_borda',
    'corDaBorda',
    'cor_da_borda'
  ]);
}

function getBackgroundColor(appearance) {
  return (
    readAppearanceValue(appearance, [
      'background_color',
      'backgroundColor',
      'bg_color',
      'bgColor',
      'modal_background',
      'modalBackground',
      'modal_background_color',
      'modalBackgroundColor',
      'cor_fundo'
    ]) || '#ffffff'
  );
}

function getButtonColor(appearance) {
  return (
    readAppearanceValue(appearance, [
      'button_color',
      'buttonColor',
      'btn_color',
      'btnColor',
      'cta_color',
      'ctaColor',
      'cor_botao'
    ]) || getPrimaryColor(appearance)
  );
}

  function getTextColor(appearance) {
    return (
      readAppearanceValue(appearance, [
        'text_color',
        'textColor',
        'cor_texto'
      ]) || DEFAULT_APPEARANCE.text_color
    );
  }

  function getFontFamily(appearance) {
    return (
      readAppearanceValue(appearance, [
        'font_family',
        'fontFamily',
        'fonte'
      ]) || DEFAULT_APPEARANCE.font_family
    );
  }

  function normalizeModalAppearanceConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});

    return {
      show_title: toBoolean(
        firstDefined(appearance.show_title, appearance.showTitle),
        DEFAULT_APPEARANCE.show_title
      ),
      show_product: toBoolean(
        firstDefined(appearance.show_product, appearance.showProduct),
        DEFAULT_APPEARANCE.show_product
      ),
      hide_stories: toBoolean(
        firstDefined(appearance.hide_stories, appearance.hideStories),
        DEFAULT_APPEARANCE.hide_stories
      ),
      shadow_enabled: toBoolean(
        firstDefined(appearance.shadow_enabled, appearance.shadowEnabled),
        DEFAULT_APPEARANCE.shadow_enabled
      )
    };
  }

  function trackMetric(metric) {
    var fallbackMetrics = getStorageItem('vidlytics_metrics', []);

    if (!Array.isArray(fallbackMetrics)) fallbackMetrics = [];

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
      device_type: metric.device_type || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      browser: metric.browser || navigator.userAgent,
      referrer: metric.referrer || document.referrer || null,
      created_at: new Date().toISOString()
    };

    fallbackMetrics.push(nextMetric);
    setStorageItem('vidlytics_metrics', fallbackMetrics);

    return Promise.resolve();
  }

  function readStories() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_stories', []));

    return fetchJson('stories?select=*&store_id=eq.' + encodeURIComponent(storeId))
      .then(function (items) {
        return items.filter(function (story) {
          var statusOk = 'status' in story ? story.status === 'active' : true;
          var activeOk = 'active' in story ? story.active !== false : true;
          var visibleOk = 'visible' in story ? story.visible !== false : true;

          return statusOk && activeOk && visibleOk;
        });
      });
  }

  function readStoryVideos() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_story_videos', []));
    return fetchJson('story_videos?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readVideos() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_videos', []));
    return fetchJson('videos?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readStoryProducts() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_story_products', []));
    return fetchJson('story_products?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readProducts() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_products', []));
    return fetchJson('products?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function readPageRules() {
    if (!storeId || !hasSupabase) return Promise.resolve(getStorageItem('vidlytics_page_rules', []));
    return fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId));
  }

  function matchesRule(rule) {
    var href = window.location.href;
    var path = window.location.pathname || '/';
    var value = String(rule.value || '');

    switch (rule.condition_type) {
      case 'all_pages':
        return true;

      case 'home_only':
        return path === '/' || path === '/home' || path === '/index.html' || path === '';

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

      if (host === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0] || '';

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname.indexOf('/shorts/') === 0) return parsed.pathname.split('/')[2] || '';
        if (parsed.pathname.indexOf('/embed/') === 0) return parsed.pathname.replace(/^\/embed\//, '').split('/')[0] || '';
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
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

    var meta = parseJsonIfNeeded(firstDefined(obj.metadata, obj.meta, obj.extra, obj.data, obj.settings, obj.config, {}));

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

    return {
      host: host,
      shadow: host.attachShadow({ mode: 'open' })
    };
  }

function buildSharedCss(appearance) {
  var cfg = getFloatingConfig(appearance);
  var bgColor = getBackgroundColor(appearance);
  var buttonColor = getButtonColor(appearance);
  var text = getTextColor(appearance);
  var font = getFontFamily(appearance);
  var modalConfig = normalizeModalAppearanceConfig(appearance);

  return ''
    + '*,*::before,*::after{box-sizing:border-box!important;}'
    + '.vl-overlay{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(15,23,42,.7)!important;display:none!important;align-items:center!important;justify-content:center!important;padding:20px!important;z-index:' + cfg.zIndex + '!important;font-family:' + font + '!important;}'
    + '.vl-overlay.is-open{display:flex!important;}'
    + '.vl-modal{width:min(92vw,420px)!important;max-height:88vh!important;overflow:hidden!important;background:' + bgColor + '!important;border-radius:24px!important;box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 24px 80px rgba(15,23,42,.3)' : 'none') + '!important;display:flex!important;flex-direction:column!important;}'
    + '.vl-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:14px 16px!important;border-bottom:1px solid #e2e8f0!important;}'
    + '.vl-title{font-weight:800!important;color:' + text + '!important;font-size:14px!important;}'
    + '.vl-count{font-size:12px!important;color:#64748b!important;}'
    + '.vl-close{all:unset!important;font-size:28px!important;line-height:1!important;cursor:pointer!important;color:' + text + '!important;}'
    + '.vl-body{padding:16px!important;display:grid!important;gap:12px!important;overflow:auto!important;}'
    + '.vl-player{width:100%!important;aspect-ratio:9/16!important;border-radius:18px!important;overflow:hidden!important;background:#000!important;}'
    + '.vl-player video,.vl-player iframe{width:100%!important;height:100%!important;border:0!important;display:block!important;object-fit:cover!important;}'
    + '.vl-nav{display:flex!important;gap:10px!important;}'
    + '.vl-btn{all:unset!important;flex:1!important;text-align:center!important;border-radius:999px!important;padding:10px 14px!important;font-weight:800!important;font-size:13px!important;cursor:pointer!important;background:#e2e8f0!important;color:#0f172a!important;}'
    + '.vl-btn-primary{background:' + buttonColor + '!important;color:#fff!important;}'
    + '.vl-product{display:flex!important;align-items:center!important;gap:12px!important;border:1px solid #e2e8f0!important;border-radius:18px!important;padding:12px!important;background:#fff!important;cursor:pointer!important;}'
    + '.vl-product-img{width:72px!important;height:72px!important;border-radius:14px!important;object-fit:cover!important;background:#e2e8f0!important;flex:0 0 auto!important;}'
    + '.vl-product-info{min-width:0!important;flex:1!important;}'
    + '.vl-product-name{font-weight:800!important;font-size:14px!important;color:#0f172a!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}'
    + '.vl-product-price{margin-top:4px!important;font-weight:800!important;font-size:16px!important;color:#7c3aed!important;}';
}

function buildFloatingCss(appearance, behaviorConfig) {
  behaviorConfig = behaviorConfig || getFloatingBehaviorConfig(appearance);
    var cfg = getFloatingConfig(appearance);
    var primary = getPrimaryColor(appearance);
var secondary = getSecondaryColor(appearance);
var borderColor = getBorderColor(appearance);
var borderBackground = borderColor
  ? borderColor
  : 'linear-gradient(135deg,' + primary + ',' + secondary + ')';

var text = getTextColor(appearance);
var font = getFontFamily(appearance);
var modalConfig = normalizeModalAppearanceConfig(appearance);

  return ''
      + ':host{all:initial!important;position:fixed!important;top:' + cfg.top + '!important;right:' + cfg.right + '!important;bottom:' + cfg.bottom + '!important;left:' + cfg.left + '!important;z-index:' + cfg.zIndex + '!important;width:' + cfg.width + '!important;min-width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;height:auto!important;overflow:visible!important;background:transparent!important;pointer-events:auto!important;font-family:' + font + '!important;}'
      + buildSharedCss(appearance)
      + '.vl-bubbles{width:' + cfg.width + '!important;display:flex!important;flex-direction:column!important;align-items:' + cfg.alignItems + '!important;justify-content:flex-start!important;gap:10px!important;overflow:visible!important;position:relative!important;}'
      + '.vl-bubble{all:unset!important;width:' + cfg.width + '!important;min-width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;height:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:4px!important;cursor:pointer!important;overflow:visible!important;pointer-events:auto!important;}'
      + '.vl-ring{width:' + cfg.width + '!important;height:' + cfg.height + '!important;min-width:' + cfg.width + '!important;min-height:' + cfg.height + '!important;max-width:' + cfg.width + '!important;max-height:' + cfg.height + '!important;border-radius:' + cfg.radius + '!important;padding:' + cfg.borderWidth + '!important;overflow:hidden!important;display:block!important;position:relative!important;background:' + borderBackground + '!important;box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 12px 30px rgba(15,23,42,.18)' : 'none') + '!important;}'
      + '.vl-inner{width:100%!important;height:100%!important;border-radius:' + cfg.innerRadius + '!important;overflow:hidden!important;background:#e2e8f0!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:800!important;font-size:24px!important;color:' + text + '!important;}'
      + '.vl-img{width:100%!important;height:100%!important;object-fit:' + behaviorConfig.objectFit + '!important;object-position:center!important;display:block!important;border-radius:' + cfg.innerRadius + '!important;}'
      + '.vl-play-badge{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:34px!important;height:34px!important;border-radius:999px!important;background:rgba(15,23,42,.62)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:15px!important;line-height:1!important;box-shadow:0 6px 18px rgba(0,0,0,.25)!important;pointer-events:none!important;}'
+ '.vl-play-badge::before{content:""!important;margin-left:3px!important;width:0!important;height:0!important;border-top:8px solid transparent!important;border-bottom:8px solid transparent!important;border-left:12px solid #fff!important;display:block!important;}'
+ '.vl-dismiss{all:unset!important;position:absolute!important;top:-10px!important;right:-10px!important;width:24px!important;height:24px!important;border-radius:999px!important;background:#0f172a!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;font-weight:800!important;line-height:1!important;cursor:pointer!important;z-index:3!important;box-shadow:0 6px 18px rgba(0,0,0,.25)!important;}'
    + '.vl-label{width:' + cfg.width + '!important;max-width:' + cfg.width + '!important;font-family:' + font + '!important;font-size:11px!important;line-height:12px!important;font-weight:700!important;color:' + text + '!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;}';
  }

  function buildVideoPlayer(video, storyId) {
    var url = getVideoUrl(video);
    var ytId = extractYouTubeId(url);
    var isUpload = video.source_type === 'upload' || video.sourceType === 'upload';
    var isDirect = isDirectVideoUrl(url);
    var wrapper = createEl('div', 'vl-player');

    if (!isUpload && ytId) {
      var iframe = createEl('iframe');
      iframe.src = getYouTubeEmbedUrl(url);
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.title = video.title || video.name || 'Vídeo';
      wrapper.appendChild(iframe);

      return wrapper;
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

      return wrapper;
    }

    var link = createEl('a');
    link.href = url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir vídeo';
    link.className = 'vl-btn vl-btn-primary';
    wrapper.appendChild(link);

    return wrapper;
  }

  function closeOverlay() {
    if (overlay) overlay.className = 'vl-overlay';
    if (modalContent) modalContent.innerHTML = '';
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

    var currentIndex = 0;

    relations.forEach(function (rel, index) {
      if (rel.is_cover) currentIndex = index;
    });

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
      body.appendChild(buildVideoPlayer(video, story.id));

      var nav = createEl('div', 'vl-nav');

      var prevBtn = createEl('button', 'vl-btn');
      prevBtn.type = 'button';
      prevBtn.textContent = 'Anterior';
      prevBtn.disabled = currentIndex === 0;

      if (currentIndex === 0) prevBtn.style.opacity = '0.5';

      prevBtn.addEventListener('click', function () {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderCurrent();
        }
      });

      var nextBtn = createEl('button', 'vl-btn vl-btn-primary');
      nextBtn.type = 'button';
      nextBtn.textContent = currentIndex === orderedVideos.length - 1 ? 'Fechar' : 'Próximo';

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

      if (story.cta_enabled && story.cta_url) {
        var ctaBtn = createEl('button', 'vl-btn vl-btn-primary');
        ctaBtn.type = 'button';
        ctaBtn.textContent = story.cta_text || 'Saiba mais';

        ctaBtn.addEventListener('click', function () {
          trackMetric({
            event_type: story.cta_type === 'whatsapp' ? 'whatsapp_click' : 'cta_click',
            story_id: story.id,
            video_id: video.id,
            product_id: activeProducts[0] ? activeProducts[0].id : null,
            page_url: window.location.href
          });

          window.open(story.cta_url, '_blank', 'noopener,noreferrer');
        });

        body.appendChild(ctaBtn);
      }

      if (activeProducts.length && modalConfig.show_product !== false) {
        var product = activeProducts[0];
        var productCard = createEl('div', 'vl-product');

        var productImg = createEl('img', 'vl-product-img');
        productImg.src = normalizeMediaUrl(product.image_url || product.imageUrl || '');
        productImg.alt = product.name || '';

        var productInfo = createEl('div', 'vl-product-info');

        var productName = createEl('div', 'vl-product-name');
        productName.textContent = product.name || '';

        var productPrice = createEl('div', 'vl-product-price');
        productPrice.textContent = Number(product.price || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });

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

  function setupFloatingDrag(host, handle) {
  if (!host || !handle) return;

  var dragging = false;
  var moved = false;
  var startX = 0;
  var startY = 0;
  var startLeft = 0;
  var startTop = 0;
  var hostWidth = 0;
  var hostHeight = 0;
  var activePointerId = null;

  setImportant(handle, 'touch-action', 'none');

  handle.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;

    if (
      event.target &&
      event.target.classList &&
      event.target.classList.contains('vl-dismiss')
    ) {
      return;
    }

    var rect = host.getBoundingClientRect();

    dragging = true;
    moved = false;
    activePointerId = event.pointerId;

    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    hostWidth = rect.width;
    hostHeight = rect.height;

    try {
      handle.setPointerCapture(event.pointerId);
    } catch (e) {}
  });

  handle.addEventListener('pointermove', function (event) {
    if (!dragging) return;

    var dx = event.clientX - startX;
    var dy = event.clientY - startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      moved = true;
    }

    if (!moved) return;

    event.preventDefault();
    
    floatingWasDragged = true;

    var nextLeft = startLeft + dx;
    var nextTop = startTop + dy;

    nextLeft = Math.max(0, Math.min(window.innerWidth - hostWidth, nextLeft));
    nextTop = Math.max(0, Math.min(window.innerHeight - hostHeight, nextTop));

    setImportant(host, 'left', px(nextLeft));
    setImportant(host, 'top', px(nextTop));
    setImportant(host, 'right', 'auto');
    setImportant(host, 'bottom', 'auto');
    setImportant(host, 'position', 'fixed');
  });

  function stop() {
    dragging = false;

    try {
      if (activePointerId !== null) {
        handle.releasePointerCapture(activePointerId);
      }
    } catch (e) {}

    activePointerId = null;
  }

  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

function getFloatingClosedStorageKey() {
  return 'vidlytics_floating_closed_' + String(storeId || 'default');
}

  function renderFloatingBubbles(stories, storyVideoMap, activeVideos) {
  var appearance = currentAppearance || {};
  var modalConfig = normalizeModalAppearanceConfig(appearance);
  var behaviorConfig = getFloatingBehaviorConfig(appearance);

    if (
  behaviorConfig.allowClose &&
  toBoolean(getStorageItem(getFloatingClosedStorageKey(), false), false)
) {
  floatingWasClosed = true;
  return;
}

    console.log('VIDLYTICS FLOATING BEHAVIOR FINAL:', behaviorConfig);
    var floatingCfg = getFloatingConfig(appearance);
  var shadowData = getOrCreateShadowRoot(appearance);
  var shadow = shadowData.shadow;


    var style = createEl('style');
    style.textContent = buildFloatingCss(appearance, behaviorConfig);

    var bubbles = createEl('div', 'vl-bubbles');

    if (behaviorConfig.allowClose) {
  var dismissButton = createEl('button', 'vl-dismiss');
  dismissButton.type = 'button';
  dismissButton.setAttribute('aria-label', 'Fechar widget');
  dismissButton.textContent = '×';

  dismissButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    floatingWasClosed = true;
setStorageItem(getFloatingClosedStorageKey(), true);
setImportant(shadowData.host, 'display', 'none');
});

  bubbles.appendChild(dismissButton);
}


    overlay = createEl('div', 'vl-overlay');

    var modal = createEl('div', 'vl-modal');
    modalContent = createEl('div');

    modal.appendChild(modalContent);
    overlay.appendChild(modal);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeOverlay();
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

      setImportant(ring, 'border-radius', floatingCfg.radius);
setImportant(ring, 'overflow', 'hidden');

setImportant(inner, 'border-radius', floatingCfg.innerRadius);
setImportant(inner, 'overflow', 'hidden');

      if (thumb) {
        var img = createEl('img', 'vl-img');
        img.src = thumb;
        img.alt = story.title || story.name || 'Story';
        img.loading = 'lazy';

        setImportant(img, 'border-radius', floatingCfg.innerRadius);
setImportant(img, 'object-fit', behaviorConfig.objectFit);
setImportant(img, 'overflow', 'hidden');

        img.onerror = function () {
          inner.innerHTML = '';
          inner.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
        };

        inner.appendChild(img);
      } else {
        inner.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
      }

      ring.appendChild(inner);

if (behaviorConfig.showPlayButton) {
  var playBadge = createEl('span', 'vl-play-badge');
  playBadge.setAttribute('aria-hidden', 'true');
  ring.appendChild(playBadge);
}

bubble.appendChild(ring);


      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'vl-label');
        label.textContent = story.title || story.name || 'Story';
        bubble.appendChild(label);
      }

      bubble.addEventListener('click', function (event) {
  if (floatingWasDragged) {
    event.preventDefault();
    event.stopPropagation();

    setTimeout(function () {
      floatingWasDragged = false;
    }, 100);

    return;
  }

  openStory(story, storyVideoMap, activeVideos, readStoryProductsData, readProductsData);
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

if (behaviorConfig.allowDrag) {
  setupFloatingDrag(shadowData.host, bubbles);
}
}

function renderCarousel(stories, storyVideoMap, activeVideos) {

    var existing = document.getElementById('vidlytics-carousel-root');
    if (existing) existing.remove();

    var appearance = currentAppearance || {};
    var modalConfig = normalizeModalAppearanceConfig(appearance);
var behaviorConfig = getFloatingBehaviorConfig(appearance);
var buttonColor = getButtonColor(appearance);
var text = getTextColor(appearance);
var font = getFontFamily(appearance);


    var host = createEl('div', 'vidlytics-carousel-root');
    host.id = 'vidlytics-carousel-root';

    var shadow = host.attachShadow({ mode: 'open' });

    var style = createEl('style');
    style.textContent =
      ':host{all:initial!important;display:block!important;position:static!important;width:100%!important;max-width:100%!important;height:auto!important;z-index:auto!important;font-family:' + font + '!important;}'
      + buildSharedCss(appearance)
      + '.carousel{font-family:' + font + '!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;padding:12px 16px!important;display:flex!important;gap:14px!important;scroll-snap-type:x mandatory!important;-webkit-overflow-scrolling:touch!important;}'
      + '.card{all:unset!important;cursor:pointer!important;flex-shrink:0!important;scroll-snap-align:start!important;display:flex!important;flex-direction:column!important;gap:6px!important;}'
      + '.media{width:120px!important;height:180px!important;border-radius:16px!important;overflow:hidden!important;background:#e2e8f0!important;display:grid!important;place-items:center!important;font-weight:800!important;font-size:24px!important;color:#64748b!important;box-shadow:' + (modalConfig.shadow_enabled !== false ? '0 10px 24px rgba(15,23,42,.14)' : 'none') + '!important;border:2px solid ' + buttonColor + '!important;}'
      + '.media img{width:100%!important;height:100%!important;object-fit:' + behaviorConfig.objectFit + '!important;display:block!important;}'
      + '.label{max-width:120px!important;font-size:12px!important;font-weight:700!important;color:' + text + '!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}';

    var container = createEl('div', 'carousel');
    var carouselOwnsOverlay = false;

    if (!overlay || !modalContent) {
      overlay = createEl('div', 'vl-overlay');

      var modal = createEl('div', 'vl-modal');
      modalContent = createEl('div');

      modal.appendChild(modalContent);
      overlay.appendChild(modal);

      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeOverlay();
      });

      carouselOwnsOverlay = true;
    }

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
          mediaBox.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
        };

        mediaBox.appendChild(img);
      } else {
        mediaBox.textContent = (story.title || story.name || 'S').slice(0, 1).toUpperCase();
      }

      card.appendChild(mediaBox);

      if (modalConfig.show_title !== false) {
        var label = createEl('span', 'label');
        label.textContent = story.title || story.name || 'Story';
        card.appendChild(label);
      }

      card.addEventListener('click', function () {
        openStory(story, storyVideoMap, activeVideos, readStoryProductsData, readProductsData);
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

    if (carouselOwnsOverlay) shadow.appendChild(overlay);

    document.body.appendChild(host);
  }

  function forceHostPosition() {
  if (floatingWasDragged || floatingWasClosed) return;

  var host = document.getElementById('vidlytics-widget-root');
  if (!host) return;

  applyHostPosition(host, currentAppearance || {});
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
        currentAppearance = normalizeAppearanceItem(results[0] || {});

        console.log('VIDLYTICS APARÊNCIA CARREGADA:', currentAppearance);
        console.log('VIDLYTICS FLOATING CONFIG:', getFloatingConfig(currentAppearance));

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
          renderFloatingBubbles(applicableStories, storyVideoMap, activeVideos);
        }

        if (enableCarousel) {
          renderCarousel(applicableStories, storyVideoMap, activeVideos);
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
        if (mutation.type === 'childList') shouldForce = true;

        if (
          mutation.type === 'attributes' &&
          mutation.target &&
          mutation.target.id === 'vidlytics-widget-root'
        ) {
          shouldForce = true;
        }
      });

      if (shouldForce) scheduleForce();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  function init() {
  try {
    initMutationObserver();
    renderWidget();

    setTimeout(forceHostPosition, 300);
    setTimeout(forceHostPosition, 1000);
    setTimeout(forceHostPosition, 3000);
    setTimeout(forceHostPosition, 5000);
  } catch (error) {
    console.error('Vidlytics Widget: erro ao inicializar widget', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
