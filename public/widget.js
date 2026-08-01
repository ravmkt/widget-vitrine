(function () {
  var WIDGET_VERSION = '2026.08.01-00';

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

  // ──────────────────────────────────────────────────────────
  // 🔧 NOVO: Detecção do parâmetro de sessão para seletor visual
  // ──────────────────────────────────────────────────────────
  var _urlParams = new URLSearchParams(window.location.search);
  var _selectorToken = _urlParams.get('widgetSelectToken') || _urlParams.get('myhub_selector_session');

  if (_selectorToken) {
    initElementPicker(_selectorToken);
    return; // ← NÃO carrega o widget normal
  }
  // ──────────────────────────────────────────────────────────

  if (window.__vidlytics_widget_loaded_version === WIDGET_VERSION) return;
  window.__vidlytics_widget_loaded_version = WIDGET_VERSION;

  try {
    var oldRoot = document.getElementById('vidlytics-widget-root');
    if (oldRoot) oldRoot.remove();
    var oldCarousel = document.getElementById('vidlytics-carousel-root');
    if (oldCarousel) oldCarousel.remove();
  } catch (e) {}

  // ──────────────────────────────────────────────────────────
  // 🔧 NOVO: Função do seletor visual de elementos
  // ──────────────────────────────────────────────────────────
  function initElementPicker(token) {
    // Polyfill para CSS.escape
    if (typeof CSS === 'undefined' || !CSS.escape) {
      (function () {
        var e = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g;
        var f = function (a, b) { return b ? '\\' + ('0000' + b.charCodeAt(0).toString(16)).slice(-4) : '\\' + a; };
        window.CSS = window.CSS || {};
        window.CSS.escape = function (a) { return String(a).replace(e, f); };
      })();
    }

    // Banner informativo flutuante
    var banner = document.createElement('div');
    banner.id = 'vl-selector-banner';
    banner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:2147483647;',
      'background:#1e293b;color:#fff;padding:12px 20px;',
      'font-family:system-ui,sans-serif;font-size:14px;',
      'display:flex;align-items:center;justify-content:space-between;',
      'box-shadow:0 4px 24px rgba(0,0,0,.3);'
    ].join('');
    banner.innerHTML = '<span>🎯 <b>Modo Seletor:</b> Clique no elemento desejado e pressione <b>Enter</b> para confirmar. <b>Esc</b> para cancelar.</span><button id="vl-picker-cancel" style="background:#ef4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:700;">Cancelar</button>';
    document.body.appendChild(banner);

    document.getElementById('vl-picker-cancel').addEventListener('click', cleanup);

    // CSS do highlight
    var pickerStyle = document.createElement('style');
    pickerStyle.id = 'vl-selector-style';
    pickerStyle.innerHTML = '.vl-picker-highlight{outline:3px dashed #fd7e14!important;cursor:crosshair!important;}.vl-picker-selected{outline:3px solid #22c55e!important;}';
    document.head.appendChild(pickerStyle);

    var elementoSelecionado = null;

    function generateSelector(el) {
      if (el.id) return '#' + CSS.escape(el.id);
      var path = [];
      var current = el;
      while (current && current.nodeType === 1 && current !== document.body && current !== document.documentElement) {
        var selector = current.tagName.toLowerCase();
        if (current.id) {
          path.unshift('#' + CSS.escape(current.id));
          break;
        }
        if (current.className && typeof current.className === 'string') {
          var classes = current.className.trim().split(/\s+/)
            .filter(function (c) { return c && !c.startsWith('vl-picker'); })
            .slice(0, 2);
          if (classes.length) {
            selector += '.' + classes.map(function (c) { return CSS.escape(c); }).join('.');
          }
        }
        var parent = current.parentNode;
        if (parent) {
          var siblings = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === current.tagName; });
          if (siblings.length > 1) {
            selector += ':nth-child(' + (Array.prototype.indexOf.call(parent.children, current) + 1) + ')';
          }
        }
        path.unshift(selector);
        current = current.parentNode;
        if (path.length > 8) break;
      }
      return path.join(' > ');
    }

    function cleanup() {
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('mouseout', onMouseOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      if (banner.parentNode) banner.remove();
      if (pickerStyle.parentNode) pickerStyle.remove();
      if (elementoSelecionado) {
        elementoSelecionado.classList.remove('vl-picker-selected', 'vl-picker-highlight');
      }
    }

    function onMouseOver(e) {
      if (e.target === banner || banner.contains(e.target)) return;
      if (e.target !== elementoSelecionado) e.target.classList.add('vl-picker-highlight');
    }

    function onMouseOut(e) {
      if (e.target !== elementoSelecionado) e.target.classList.remove('vl-picker-highlight');
    }

    function onClick(e) {
      if (e.target === banner || banner.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (elementoSelecionado) elementoSelecionado.classList.remove('vl-picker-selected');
      elementoSelecionado = e.target;
      elementoSelecionado.classList.add('vl-picker-selected');
      banner.querySelector('span').innerHTML = '🎯 <b>Elemento selecionado!</b> Pressione <b>Enter</b> para confirmar ou clique em outro. <b>Esc</b> cancela.';
    }

    function onKeyDown(e) {
      if (e.key === 'Enter' && elementoSelecionado) {
        e.preventDefault();
        var selector = generateSelector(elementoSelecionado);
        banner.querySelector('span').innerHTML = '⏳ Enviando seletor...';

        fetch('https://api.myhub.ia/v1/widget/select-element', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: token,
            selector: selector,
            url: window.location.href,
            store_id: storeId || ''
          })
        }).then(function (r) { return r.json(); })
          .then(function () {
            banner.style.background = '#22c55e';
            banner.querySelector('span').innerHTML = '✅ <b>Seletor capturado:</b> <code style="background:rgba(255,255,255,.2);padding:2px 6px;border-radius:4px;">' + selector + '</code>';
            setTimeout(function () { cleanup(); }, 4000);
          })
          .catch(function () {
            // Fallback: postMessage para a janela que abriu
            if (window.opener) {
              window.opener.postMessage({
                type: 'WIDGET_SELECTOR_RESULT',
                session_token: token,
                selector: selector,
                url: window.location.href
              }, '*');
            }
            banner.style.background = '#22c55e';
            banner.querySelector('span').innerHTML = '✅ <b>Seletor:</b> <code style="background:rgba(255,255,255,.2);padding:2px 6px;border-radius:4px;">' + selector + '</code> — Pode fechar esta aba.';
            setTimeout(function () { cleanup(); }, 6000);
          });
      }
      if (e.key === 'Escape') {
        cleanup();
      }
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }
  // ──────────────────────────────────────────────────────────

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
          if (rule.active === false || rule.active === 'false' || rule.active === 0 || rule.active === '0') return false;
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
          if (location.active === false || location.active === 'false' || location.active === 0 || location.active === '0') return false;
          return true;
        });
      });
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

    // Se condition_type está vazio mas existe url_pattern, assume "contains"
    if (!conditionType && value) {
      conditionType = 'contains';
    }

    // Normalização
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
      // Se tem algum valor mas não foi reconhecido, tenta como "contains"
      conditionType = 'contains';
    }

    // Sem condition_type e sem value = não aparece
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

  // 🔧 CORREÇÃO 1: Aceita URLs do storage do Supabase mesmo sem extensão
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

  function applyHostPosition(hostElement, anchorElement, position) {
    if (!hostElement || !anchorElement) return;
    var rect = anchorElement.getBoundingClientRect();
    var hostRect = hostElement.getBoundingClientRect();

    position = (position || 'after').toLowerCase();

    var top = rect.bottom + window.scrollY;
    var left = rect.left + window.scrollX;

    switch (position) {
      case 'before':
      case 'above':
        top = rect.top + window.scrollY - hostRect.height;
        break;

      case 'after':
      case 'below':
        top = rect.bottom + window.scrollY;
        break;

      case 'left':
        top = rect.top + window.scrollY + (rect.height / 2) - (hostRect.height / 2);
        left = rect.left + window.scrollX - hostRect.width;
        break;

      case 'right':
        top = rect.top + window.scrollY + (rect.height / 2) - (hostRect.height / 2);
        left = rect.right + window.scrollX;
        break;

      case 'replace':
        top = rect.top + window.scrollY;
        left = rect.left + window.scrollX;
        break;

      case 'prepend':
        top = rect.top + window.scrollY;
        left = rect.left + window.scrollX;
        break;

      case 'append':
        top = rect.top + window.scrollY + rect.height - hostRect.height;
        left = rect.left + window.scrollX;
        break;

      default:
        break;
    }

    hostElement.style.position = 'absolute';
    hostElement.style.top = px(top);
    hostElement.style.left = px(left);
    hostElement.style.zIndex = '2147483646';
  }

  function getOrCreateShadowRoot(containerId, cssText, defaultStyles) {
    if (!containerId) {
      containerId = 'vidlytics-shadow-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }

    var existing = document.getElementById(containerId);
    if (existing && existing.shadowRoot) {
      return { root: existing.shadowRoot, container: existing, containerId: containerId };
    }

    var container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = defaultStyles || 'position:relative;display:block;width:100%;';
    document.body.appendChild(container);

    if (container.shadowRoot) {
      return { root: container.shadowRoot, container: container, containerId: containerId };
    }

    var shadowRoot;
    try {
      shadowRoot = container.attachShadow({ mode: 'open' });
    } catch (e) {
      shadowRoot = container;
    }

    var styleEl = document.createElement('style');
    styleEl.textContent = cssText || '';
    shadowRoot.appendChild(styleEl);

    return { root: shadowRoot, container: container, containerId: containerId };
  }

  var SHARED_CSS_CACHE = null;

  function buildSharedCss(appearance) {
    if (SHARED_CSS_CACHE) return SHARED_CSS_CACHE;

    var primaryColor = getPrimaryColor(appearance);
    var secondaryColor = getSecondaryColor(appearance);
    var buttonColor = getButtonColor(appearance);
    var fontFamily = getFontFamily(appearance);
    var borderColor = getBorderColor(appearance);

    SHARED_CSS_CACHE = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");',
      '',
      ':host {',
      '  all: initial;',
      '  font-family: ' + (fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif") + ';',
      '  font-size: 14px;',
      '  line-height: 1.5;',
      '  color: #1e293b;',
      '  box-sizing: border-box;',
      '}',
      '',
      '*, *::before, *::after {',
      '  box-sizing: inherit;',
      '  margin: 0;',
      '  padding: 0;',
      '}',
      '',
      '.vl-btn {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 6px;',
      '  padding: 8px 16px;',
      '  border: none;',
      '  border-radius: 8px;',
      '  font-family: inherit;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  cursor: pointer;',
      '  transition: all 0.2s ease;',
      '  user-select: none;',
      '  outline: none;',
      '}',
      '',
      '.vl-btn:hover { opacity: 0.9; transform: translateY(-1px); }',
      '.vl-btn:active { transform: translateY(0); opacity: 0.8; }',
      '',
      '.vl-btn-primary {',
      '  background: ' + (buttonColor || primaryColor || '#0094EB') + ';',
      '  color: #ffffff;',
      '}',
      '',
      '.vl-btn-secondary {',
      '  background: #f1f5f9;',
      '  color: #334155;',
      '  border: 1px solid #e2e8f0;',
      '}',
      '',
      '.vl-btn-whatsapp {',
      '  background: #25D366;',
      '  color: #ffffff;',
      '}',
      '',
      '.vl-btn-icon {',
      '  width: 36px;',
      '  height: 36px;',
      '  padding: 0;',
      '  border-radius: 50%;',
      '  background: rgba(255,255,255,0.15);',
      '  color: #ffffff;',
      '  font-size: 18px;',
      '}',
      '',
      '.vl-btn-icon:hover { background: rgba(255,255,255,0.25); }',
      '',
      '.vl-modal-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483646;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.85);',
      '  backdrop-filter: blur(8px);',
      '  -webkit-backdrop-filter: blur(8px);',
      '  animation: vlFadeIn 0.25s ease;',
      '}',
      '',
      '@keyframes vlFadeIn {',
      '  from { opacity: 0; }',
      '  to { opacity: 1; }',
      '}',
      '',
      '@keyframes vlSlideUp {',
      '  from { opacity: 0; transform: translateY(20px) scale(0.98); }',
      '  to { opacity: 1; transform: translateY(0) scale(1); }',
      '}',
      '',
      '@keyframes vlPulse {',
      '  0%, 100% { transform: scale(1); }',
      '  50% { transform: scale(1.05); }',
      '}',
      '',
      '.vl-video-container {',
      '  position: relative;',
      '  width: 100%;',
      '  overflow: hidden;',
      '  background: #000;',
      '  border-radius: inherit;',
      '}',
      '',
      '.vl-video-container video,',
      '.vl-video-container iframe {',
      '  display: block;',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: cover;',
      '  border: none;',
      '  border-radius: inherit;',
      '}',
      '',
      '.vl-play-overlay {',
      '  position: absolute;',
      '  inset: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.3);',
      '  cursor: pointer;',
      '  transition: background 0.2s ease;',
      '}',
      '',
      '.vl-play-overlay:hover { background: rgba(0,0,0,0.45); }',
      '',
      '.vl-play-icon {',
      '  width: 48px;',
      '  height: 48px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(255,255,255,0.9);',
      '  border-radius: 50%;',
      '  color: #1e293b;',
      '  font-size: 24px;',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.3);',
      '  transition: transform 0.2s ease;',
      '}',
      '',
      '.vl-play-overlay:hover .vl-play-icon { transform: scale(1.1); }',
      '',
      '.vl-loader {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 24px;',
      '}',
      '',
      '.vl-spinner {',
      '  width: 32px;',
      '  height: 32px;',
      '  border: 3px solid #e2e8f0;',
      '  border-top-color: ' + (primaryColor || '#0094EB') + ';',
      '  border-radius: 50%;',
      '  animation: vlSpin 0.7s linear infinite;',
      '}',
      '',
      '@keyframes vlSpin {',
      '  to { transform: rotate(360deg); }',
      '}',
      '',
      '.vl-error {',
      '  text-align: center;',
      '  padding: 24px;',
      '  color: #94a3b8;',
      '  font-size: 13px;',
      '}',
      '',
      '.vl-sr-only {',
      '  position: absolute;',
      '  width: 1px;',
      '  height: 1px;',
      '  padding: 0;',
      '  margin: -1px;',
      '  overflow: hidden;',
      '  clip: rect(0,0,0,0);',
      '  white-space: nowrap;',
      '  border: 0;',
      '}',
      '',
      '.vl-badge {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  padding: 4px 10px;',
      '  border-radius: 99px;',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  background: ' + (primaryColor || '#0094EB') + ';',
      '  color: #ffffff;',
      '}',
      '',
      '.vl-badge--live {',
      '  animation: vlPulse 1.5s ease-in-out infinite;',
      '}'
    ].join('\n');

    return SHARED_CSS_CACHE;
  }

  function buildFloatingCss(appearance) {
    var floatingConfig = getFloatingConfig(appearance);
    var primaryColor = getPrimaryColor(appearance);

    return [
      buildSharedCss(appearance),
      '',
      '.vl-floating-wrapper {',
      '  position: fixed;',
      '  z-index: ' + floatingConfig.zIndex + ';',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: ' + floatingConfig.alignItems + ';',
      '  top: ' + floatingConfig.top + ';',
      '  right: ' + floatingConfig.right + ';',
      '  bottom: ' + floatingConfig.bottom + ';',
      '  left: ' + floatingConfig.left + ';',
      '  pointer-events: none;',
      '}',
      '',
      '.vl-floating-wrapper > * {',
      '  pointer-events: auto;',
      '}',
      '',
      '.vl-floating-container {',
      '  position: relative;',
      '  width: ' + floatingConfig.width + ';',
      '  height: ' + floatingConfig.height + ';',
      '  border-radius: ' + floatingConfig.radius + ';',
      '  overflow: hidden;',
      '  cursor: pointer;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15);',
      '  transition: transform 0.3s ease, box-shadow 0.3s ease;',
      '}',
      '',
      '.vl-floating-container:hover {',
      '  transform: scale(1.03);',
      '  box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2);',
      '}',
      '',
      '.vl-floating-close {',
      '  position: absolute;',
      '  top: 8px;',
      '  right: 8px;',
      '  z-index: 10;',
      '  width: 28px;',
      '  height: 28px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.5);',
      '  color: #ffffff;',
      '  border: none;',
      '  border-radius: 50%;',
      '  font-size: 14px;',
      '  cursor: pointer;',
      '  transition: background 0.2s ease;',
      '  opacity: 0;',
      '}',
      '',
      '.vl-floating-container:hover .vl-floating-close {',
      '  opacity: 1;',
      '}',
      '',
      '.vl-floating-close:hover {',
      '  background: rgba(239,68,68,0.8);',
      '}',
      '',
      '.vl-floating-border {',
      '  position: absolute;',
      '  inset: 0;',
      '  border: ' + floatingConfig.borderWidth + ' solid ' + primaryColor + ';',
      '  border-radius: ' + floatingConfig.radius + ';',
      '  pointer-events: none;',
      '  z-index: 2;',
      '}',
      '',
      '.vl-floating-label {',
      '  margin-top: 8px;',
      '  padding: 4px 12px;',
      '  background: ' + primaryColor + ';',
      '  color: #ffffff;',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  border-radius: 99px;',
      '  white-space: nowrap;',
      '}'
    ].join('\n');
  }

  function buildCarouselCss(appearance) {
    var carouselConfig = getCarouselConfig(appearance);
    var primaryColor = getPrimaryColor(appearance);

    return [
      buildSharedCss(appearance),
      '',
      '.vl-carousel-wrapper {',
      '  width: 100%;',
      '  margin: ' + px(carouselConfig.marginTop) + ' 0 ' + px(carouselConfig.marginBottom) + ' 0;',
      '  position: relative;',
      '}',
      '',
      '.vl-carousel-track {',
      '  display: flex;',
      '  gap: ' + px(carouselConfig.spacing) + ';',
      '  overflow-x: auto;',
      '  scroll-behavior: smooth;',
      '  scrollbar-width: none;',
      '  -ms-overflow-style: none;',
      '  padding: 4px 0;',
      '}',
      '',
      '.vl-carousel-track::-webkit-scrollbar { display: none; }',
      '',
      '.vl-carousel-item {',
      '  flex-shrink: 0;',
      '  cursor: pointer;',
      '  transition: transform 0.25s ease, box-shadow 0.25s ease;',
      '  border-radius: ' + px(carouselConfig.borderRadius) + ';',
      '  overflow: hidden;',
      '  position: relative;',
      '}',
      '',
      '.vl-carousel-item:hover {',
      '  transform: translateY(-4px);',
      '  box-shadow: 0 8px 24px rgba(0,0,0,0.2);',
      '}',
      '',
      '.vl-carousel-item--active {',
      '  outline: ' + px(carouselConfig.borderWidth) + ' solid ' + carouselConfig.borderColor + ';',
      '  outline-offset: -' + px(carouselConfig.borderWidth) + ';',
      '}',
      '',
      '.vl-carousel-thumb {',
      '  width: 100%;',
      '  display: block;',
      '  background: #0f172a;',
      '  position: relative;',
      '  overflow: hidden;',
      '}',
      '',
      '.vl-carousel-thumb img,',
      '.vl-carousel-thumb video {',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: ' + carouselConfig.objectFit + ';',
      '  display: block;',
      '}',
      '',
      '.vl-carousel-play-icon {',
      '  position: absolute;',
      '  inset: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.15);',
      '}',
      '',
      '.vl-carousel-play-icon::after {',
      '  content: "▶";',
      '  font-size: 18px;',
      '  color: #ffffff;',
      '  text-shadow: 0 2px 8px rgba(0,0,0,0.4);',
      '}',
      '',
      '.vl-carousel-title {',
      '  padding: 8px 4px 0;',
      '  font-size: 12px;',
      '  font-weight: 500;',
      '  color: #475569;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '',
      '.vl-carousel-nav {',
      '  position: absolute;',
      '  top: 50%;',
      '  transform: translateY(-50%);',
      '  z-index: 5;',
      '  width: 36px;',
      '  height: 36px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(255,255,255,0.9);',
      '  border: 1px solid #e2e8f0;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
      '  transition: all 0.2s ease;',
      '  font-size: 16px;',
      '  color: #334155;',
      '}',
      '',
      '.vl-carousel-nav:hover {',
      '  background: #ffffff;',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.15);',
      '}',
      '',
      '.vl-carousel-nav--prev { left: -16px; }',
      '.vl-carousel-nav--next { right: -16px; }',
      '.vl-carousel-nav:disabled {',
      '  opacity: 0.4;',
      '  cursor: default;',
      '}'
    ].join('\n');
  }

  function buildGridCss(appearance) {
    var gridConfig = getGridConfig(appearance);

    return [
      buildSharedCss(appearance),
      '',
      '.vl-grid-wrapper {',
      '  width: 100%;',
      '}',
      '',
      '.vl-grid-container {',
      '  display: grid;',
      '  grid-template-columns: repeat(' + gridConfig.columns + ', 1fr);',
      '  gap: ' + px(gridConfig.spacing) + ';',
      '}',
      '',
      '.vl-grid-item {',
      '  cursor: pointer;',
      '  transition: transform 0.25s ease;',
      '  border-radius: ' + px(gridConfig.borderRadius) + ';',
      '  overflow: hidden;',
      '  position: relative;',
      '}',
      '',
      '.vl-grid-item:hover {',
      '  transform: translateY(-2px);',
      '}',
      '',
      '.vl-grid-item--active {',
      '  outline: ' + px(gridConfig.borderWidth) + ' solid ' + gridConfig.borderColor + ';',
      '  outline-offset: -' + px(gridConfig.borderWidth) + ';',
      '}',
      '',
      '.vl-grid-thumb {',
      '  width: 100%;',
      '  background: #0f172a;',
      '  position: relative;',
      '  overflow: hidden;',
      '}',
      '',
      '.vl-grid-thumb img,',
      '.vl-grid-thumb video {',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: ' + gridConfig.objectFit + ';',
      '  display: block;',
      '}',
      '',
      '.vl-grid-play-icon {',
      '  position: absolute;',
      '  inset: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.15);',
      '}',
      '',
      '.vl-grid-play-icon::after {',
      '  content: "▶";',
      '  font-size: 18px;',
      '  color: #ffffff;',
      '  text-shadow: 0 2px 8px rgba(0,0,0,0.4);',
      '}',
      '',
      '.vl-grid-title {',
      '  padding: 6px 4px 0;',
      '  font-size: 11px;',
      '  font-weight: 500;',
      '  color: #64748b;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}'
    ].join('\n');
  }

  function buildModalCss(appearance) {
    var primaryColor = getPrimaryColor(appearance);
    var modalConfig = normalizeModalAppearanceConfig(appearance);

    var cssParts = [
      buildSharedCss(appearance),
      '',
      '.vl-modal-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483646;',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.88);',
      '  backdrop-filter: blur(12px);',
      '  -webkit-backdrop-filter: blur(12px);',
      '  animation: vlFadeIn 0.2s ease;',
      '}',
      '',
      '.vl-modal-container {',
      '  position: relative;',
      '  width: 90vw;',
      '  max-width: 450px;',
      '  max-height: 90vh;',
      '  display: flex;',
      '  flex-direction: column;',
      '  background: #ffffff;',
      '  border-radius: 20px;',
      '  overflow: hidden;',
      '  animation: vlSlideUp 0.3s ease;',
    ];

    if (modalConfig.shadow_enabled) {
      cssParts.push(
        '  box-shadow: 0 24px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25);'
      );
    }

    if (modalConfig.border_color && modalConfig.border_width) {
      cssParts.push(
        '  border: ' + px(modalConfig.border_width) + ' solid ' + modalConfig.border_color + ';'
      );
    }

    if (modalConfig.border_radius) {
      cssParts.push(
        '  border-radius: ' + px(modalConfig.border_radius) + ';'
      );
    }

    cssParts.push(
      '}',
      '',
      '.vl-modal-close {',
      '  position: absolute;',
      '  top: 12px;',
      '  right: 12px;',
      '  z-index: 10;',
      '  width: 32px;',
      '  height: 32px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0,0,0,0.4);',
      '  color: #ffffff;',
      '  border: none;',
      '  border-radius: 50%;',
      '  font-size: 18px;',
      '  cursor: pointer;',
      '  transition: background 0.2s ease;',
      '}',
      '',
      '.vl-modal-close:hover {',
      '  background: rgba(239,68,68,0.8);',
      '}',
      '',
      '.vl-modal-media {',
      '  position: relative;',
      '  width: 100%;',
      '  background: #000;',
      '  overflow: hidden;',
      '  flex-shrink: 0;',
      '}',
      '',
      '.vl-modal-media video,',
      '.vl-modal-media iframe {',
      '  display: block;',
      '  width: 100%;',
      '  height: 100%;',
      '  border: none;',
      '}',
      '',
      '.vl-modal-info {',
      '  padding: 16px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 12px;',
      '  max-height: 40vh;',
      '  overflow-y: auto;',
      '}',
      '',
      '.vl-modal-title {',
      '  font-size: 16px;',
      '  font-weight: 700;',
      '  color: #0f172a;',
      '  line-height: 1.3;',
      '}',
      '',
      '.vl-modal-product {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  padding: 12px;',
      '  background: #f8fafc;',
      '  border-radius: 12px;',
      '  border: 1px solid #e2e8f0;',
      '}',
      '',
      '.vl-modal-product-img {',
      '  width: 56px;',
      '  height: 56px;',
      '  border-radius: 8px;',
      '  object-fit: cover;',
      '  flex-shrink: 0;',
      '  background: #e2e8f0;',
      '}',
      '',
      '.vl-modal-product-info {',
      '  flex: 1;',
      '  min-width: 0;',
      '}',
      '',
      '.vl-modal-product-name {',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: #1e293b;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '',
      '.vl-modal-product-price {',
      '  font-size: 15px;',
      '  font-weight: 700;',
      '  color: ' + primaryColor + ';',
      '  margin-top: 2px;',
      '}',
      '',
      '.vl-modal-actions {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 8px;',
      '}',
      '',
      '.vl-modal-actions .vl-btn {',
      '  flex: 1;',
      '  min-width: 60px;',
      '}',
      '',
      '.vl-modal-comments {',
      '  border-top: 1px solid #e2e8f0;',
      '  padding: 16px;',
      '  max-height: 200px;',
      '  overflow-y: auto;',
      '}',
      '',
      '.vl-comment {',
      '  display: flex;',
      '  gap: 10px;',
      '  padding: 8px 0;',
      '  border-bottom: 1px solid #f1f5f9;',
      '}',
      '',
      '.vl-comment:last-child { border-bottom: none; }',
      '',
      '.vl-comment-avatar {',
      '  width: 32px;',
      '  height: 32px;',
      '  border-radius: 50%;',
      '  background: ' + primaryColor + ';',
      '  color: #ffffff;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  flex-shrink: 0;',
      '}',
      '',
      '.vl-comment-body { flex: 1; min-width: 0; }',
      '',
      '.vl-comment-author {',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: #334155;',
      '}',
      '',
      '.vl-comment-text {',
      '  font-size: 12px;',
      '  color: #64748b;',
      '  margin-top: 2px;',
      '  word-break: break-word;',
      '}'
    );

    return cssParts.join('\n');
  }

  // ─── MEDIA CONTROLS ────────────────────────────

  var globalActiveVideo = null;
  var globalActiveVideoPaused = false;

  function pauseAllOtherVideos(exceptElement) {
    var allVideos = document.querySelectorAll('video');
    for (var i = 0; i < allVideos.length; i++) {
      if (allVideos[i] !== exceptElement && !allVideos[i].paused) {
        allVideos[i].pause();
      }
    }
    var allIframes = document.querySelectorAll('iframe');
    for (var j = 0; j < allIframes.length; j++) {
      try {
        allIframes[j].contentWindow && allIframes[j].contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          '*'
        );
      } catch (e) {}
    }
  }

  function createVideoElement(src, options) {
    options = options || {};
    var video = document.createElement('video');
    video.src = src;
    video.loop = Boolean(options.loop);
    video.muted = Boolean(options.muted || options.autoplay);
    video.playsInline = Boolean(options.playsInline !== false);
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = options.preload || 'metadata';

    if (options.autoplay) {
      video.autoplay = true;
    }
    if (options.controls !== false) {
      video.controls = true;
    }

    video.style.cssText = 'display:block;width:100%;height:100%;object-fit:' + (options.objectFit || 'cover') + ';';

    return video;
  }

  function createYouTubeEmbed(videoId, options) {
    options = options || {};

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;height:100%;background:#000;';

    var iframe = document.createElement('iframe');
    var src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) +
      '?autoplay=' + (options.autoplay ? '1' : '0') +
      '&mute=' + (options.muted ? '1' : '0') +
      '&loop=' + (options.loop ? '1' : '0') +
      '&playsinline=1' +
      '&rel=0' +
      '&modestbranding=1' +
      '&controls=' + (options.controls !== false ? '1' : '0');

    if (options.loop && videoId) {
      src += '&playlist=' + videoId;
    }

    iframe.src = src;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';

    wrapper.appendChild(iframe);
    return wrapper;
  }

  function playMedia(container, videoObj, appearance) {
    if (!container || !videoObj) return;

    var videoUrl = getVideoUrl(videoObj);
    if (!videoUrl) return;

    container.innerHTML = '';
    container.style.background = '#000';

    var youtubeId = extractYouTubeId(videoUrl);
    var floatingConfig = getFloatingConfig(appearance);

    if (youtubeId) {
      var embed = createYouTubeEmbed(youtubeId, {
        autoplay: true,
        muted: false,
        loop: false,
        controls: false
      });
      container.appendChild(embed);
    } else {
      var videoEl = createVideoElement(videoUrl, {
        autoplay: true,
        muted: false,
        loop: false,
        controls: false,
        objectFit: floatingConfig.objectFit || 'cover',
        playsInline: true
      });

      videoEl.addEventListener('play', function () {
        globalActiveVideo = videoEl;
        globalActiveVideoPaused = false;
        pauseAllOtherVideos(videoEl);
      });

      videoEl.addEventListener('pause', function () {
        globalActiveVideoPaused = true;
      });

      videoEl.addEventListener('ended', function () {
        globalActiveVideo = null;
      });

      container.appendChild(videoEl);

      // Try autoplay with unmute
      var playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(function () {
          videoEl.muted = true;
          videoEl.play().catch(function () {
            // Show play button fallback
            var overlay = document.createElement('div');
            overlay.className = 'vl-play-overlay';
            var icon = document.createElement('div');
            icon.className = 'vl-play-icon';
            icon.innerHTML = '▶';
            overlay.appendChild(icon);
            overlay.addEventListener('click', function () {
              videoEl.muted = false;
              videoEl.play().catch(function () {
                videoEl.muted = true;
                videoEl.play();
              });
              overlay.remove();
            });
            container.appendChild(overlay);
          });
        });
      }
    }
  }

  function stopMedia(container) {
    if (!container) return;
    var videos = container.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      videos[i].pause();
      videos[i].removeAttribute('src');
      videos[i].load();
    }
    container.innerHTML = '';
    container.style.background = '';
    globalActiveVideo = null;
    globalActiveVideoPaused = false;
  }
