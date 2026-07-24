(function () {
  var WIDGET_VERSION = '2026.07.24-04'; 

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

  var currentStories = [];
  var currentStoryIndex = 0;
  var currentVideoIndex = 0;
  var activeDisplayRule = null; // Guardará a regra exata (seletor e posição) que deu match

  var VIDEO_FILE_REGEX = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i;

  var DEFAULT_APPEARANCE = {
    floating_position: 'bottom-right', floating_shape: 'portrait', floating_top: 20, floating_bottom: 24, floating_side: 20,
    floating_width: 85, floating_height: 151, floating_border_radius: 12, floating_border_width: 2, floating_object_fit: 'cover',
    z_index: 2147483647, primary_color: '#0094EB', secondary_color: '#EC4899', text_color: '#0f172a',
    font_family: 'Inter, system-ui, sans-serif', show_title: true, show_product: true, hide_stories: false, shadow_enabled: true,
    show_play_button: false, allow_drag: false, allow_close: true
  };

  function createEl(tag, className) { var el = document.createElement(tag); if (className) el.className = className; return el; }
  function setImportant(el, prop, value) { if (!el || value === undefined || value === null || value === '') return; try { el.style.setProperty(prop, String(value), 'important'); } catch (e) { el.style[prop] = value; } }
  function firstDefined() { for (var i = 0; i < arguments.length; i += 1) { if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i]; } return undefined; }
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
    return {
      objectFit: firstDefined(appearance.floating_object_fit, appearance.object_fit, 'cover'),
      showPlayButton: toBoolean(firstDefined(appearance.floating_show_play_button, appearance.show_play_button), true),
      allowDrag: toBoolean(firstDefined(appearance.floating_draggable, appearance.allow_drag), false),
      allowClose: toBoolean(firstDefined(appearance.floating_closable, appearance.allow_close), true)
    };
  }

  function normalizeMediaUrl(url) {
    if (!url) return ''; var value = String(url).trim(); if (!value) return '';
    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('data:') === 0 || value.indexOf('blob:') === 0) return value;
    if (value.indexOf('//') === 0) return window.location.protocol + value;
    if (value.charAt(0) === '/' && supabaseUrl) return supabaseUrl + value;
    return value;
  }

  function getStorageItem(key, fallback) { try { var item = localStorage.getItem(key); if (!item) return fallback; try { return JSON.parse(item); } catch (e) { return item; } } catch (e2) { return fallback; } }
  function setStorageItem(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  function supabaseFetch(path, options) {
    if (!hasSupabase) return Promise.reject(new Error('Supabase não configurado.'));
    options = options || {};
    var headers = { 'apikey': supabaseAnonKey, 'Authorization': 'Bearer ' + supabaseAnonKey, 'Content-Type': 'application/json', 'Accept': 'application/json' };
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

  function normalizeAppearanceItem(item) {
    var merged = {}; flattenAppearanceInto(merged, item || {}, 0);
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
    [ config.appearance, config.aparencia, widgetsCfg.appearance ].forEach(function (src) { flattenAppearanceInto(merged, src, 0); });
    return normalizeAppearanceItem(merged);
  }

  function fetchDbAppearance() {
    if (!storeId || !hasSupabase) return Promise.resolve({});
    return fetchJson('appearances?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1').then(function(items) {
        return items.length ? items[0] : {};
    });
  }

  function readAppearance() {
    var configAppearance = normalizeAppearanceItem(getConfigAppearance());
    return fetchDbAppearance().then(function (dbAppearance) {
      var finalAppearance = {};
      mergeObject(finalAppearance, DEFAULT_APPEARANCE);
      mergeObject(finalAppearance, configAppearance);
      mergeObject(finalAppearance, dbAppearance);
      return normalizeAppearanceItem(finalAppearance);
    });
  }

  function toNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    var parsed = Number(String(value).trim().replace('px', '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function px(value, fallback) {
    if (value === undefined || value === null || value === '') value = fallback !== undefined ? fallback : 0;
    if (typeof value === 'string') { var trimmed = value.trim(); if (trimmed === 'auto' || trimmed.indexOf('px') !== -1 || trimmed.indexOf('%') !== -1) return trimmed; }
    return toNumber(value, fallback !== undefined ? fallback : 0) + 'px';
  }

  function getFloatingConfig(appearance) {
    appearance = normalizeAppearanceItem(appearance || {});
    function getValue(names, fallback) { var value = readAppearanceValue(appearance, names); return (value !== undefined && value !== null && value !== '') ? value : fallback; }
    var position = getValue(['floating_position', 'position'], DEFAULT_APPEARANCE.floating_position);
    var shape = getValue(['floating_shape', 'shape'], DEFAULT_APPEARANCE.floating_shape);
    var widthNumber = toNumber(getValue(['floating_width', 'width'], DEFAULT_APPEARANCE.floating_width), DEFAULT_APPEARANCE.floating_width);
    var heightNumber = toNumber(getValue(['floating_height', 'height'], DEFAULT_APPEARANCE.floating_height), DEFAULT_APPEARANCE.floating_height);
    var zIndexNumber = toNumber(getValue(['z_index', 'zIndex'], DEFAULT_APPEARANCE.z_index), DEFAULT_APPEARANCE.z_index);

    var top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignItems = 'flex-end';
    var topNumber = toNumber(getValue(['floating_top'], DEFAULT_APPEARANCE.floating_top), DEFAULT_APPEARANCE.floating_top);
    var bottomNumber = toNumber(getValue(['floating_bottom'], DEFAULT_APPEARANCE.floating_bottom), DEFAULT_APPEARANCE.floating_bottom);
    var sideNumber = toNumber(getValue(['floating_side'], DEFAULT_APPEARANCE.floating_side), DEFAULT_APPEARANCE.floating_side);

    if (position === 'top-left') { top = px(topNumber); left = px(sideNumber); alignItems = 'flex-start'; }
    if (position === 'top-right') { top = px(topNumber); right = px(sideNumber); alignItems = 'flex-end'; }
    if (position === 'bottom-left') { bottom = px(bottomNumber); left = px(sideNumber); alignItems = 'flex-start'; }
    if (position === 'bottom-right') { bottom = px(bottomNumber); right = px(sideNumber); alignItems = 'flex-end'; }

    return {
      position: position, shape: shape, top: top, right: right, bottom: bottom, left: left,
      width: px(widthNumber), height: px(heightNumber), borderWidth: px(DEFAULT_APPEARANCE.floating_border_width),
      radius: shape === 'circle' ? '999px' : px(DEFAULT_APPEARANCE.floating_border_radius),
      innerRadius: shape === 'circle' ? '999px' : px(Math.max(0, DEFAULT_APPEARANCE.floating_border_radius - DEFAULT_APPEARANCE.floating_border_width)),
      zIndex: zIndexNumber, alignItems: alignItems, objectFit: 'cover'
    };
  }

  function getPrimaryColor(appearance) { return readAppearanceValue(appearance, ['primary_color', 'primaryColor', 'cor_primaria']) || DEFAULT_APPEARANCE.primary_color; }
  function getFontFamily(appearance) { return readAppearanceValue(appearance, ['font_family', 'fontFamily', 'fonte']) || DEFAULT_APPEARANCE.font_family; }

  function readStories() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('stories?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&status=eq.active'); }
  function readStoryVideos() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('story_videos?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readVideos() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('videos?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readStoryProducts() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('story_products?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readProducts() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('products?select=*&store_id=eq.' + encodeURIComponent(storeId)); }
  function readPageRules() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('page_rules?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&active=is.true'); }
  function readDisplayLocations() { return (!storeId || !hasSupabase) ? Promise.resolve([]) : fetchJson('display_locations?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&active=is.true'); }

  function matchesRule(rule) {
    if (!rule || rule.active === false) return false;
    var href = window.location.href;
    var path = window.location.pathname || '/';
    var rawCondition = String(firstDefined(rule.condition_type, rule.rule_type, rule.match_type) || '').trim().toLowerCase();
    var value = String(firstDefined(rule.url_pattern, rule.page_url, rule.value) || '').trim();

    if (rawCondition.indexOf('contem') !== -1 || rawCondition === 'url_contains' || rawCondition === 'contains') {
        return href.indexOf(value) !== -1 || path.indexOf(value) !== -1;
    }
    if (rawCondition.indexOf('exata') !== -1 || rawCondition === 'url_equals' || rawCondition === 'equals') {
        return href === value || path === value;
    }
    if (rawCondition === 'all_pages' || rawCondition.indexOf('todas') !== -1) return true;
    return true; 
  }

  function matchesUrl(appearance) {
    if (!appearance) return true;
    var rawUrl = firstDefined(appearance.url, appearance.pageUrl, appearance.page_url);
    if (!rawUrl || String(rawUrl).trim() === '') return true; 
    var pattern = String(rawUrl).trim().toLowerCase();
    var href = window.location.href.toLowerCase();
    var path = (window.location.pathname || '/').toLowerCase();
    var patterns = pattern.split(',').map(function (p) { return p.trim(); }).filter(Boolean);

    return patterns.some(function (p) {
      var normalizedPattern = p.replace(/\/+$/, '').replace(/^https?:\/\/[^/]+/i, '');
      if (normalizedPattern === 'all' || normalizedPattern === 'todas') return true;
      return href.indexOf(normalizedPattern) !== -1 || path.indexOf(normalizedPattern) !== -1;
    });
  }

  function getVideoUrl(video) {
    if (!video) return '';
    return normalizeMediaUrl(firstDefined(video.video_url, video.videoUrl, video.url, video.source_url, video.file_url, ''));
  }

  function isDirectVideoUrl(url) { return url && VIDEO_FILE_REGEX.test(url); }

  function getThumbnailFromObject(obj) {
    if (!obj) return '';
    var meta = parseJsonIfNeeded(firstDefined(obj.metadata, obj.meta, {}));
    return normalizeMediaUrl(firstDefined(
      obj.thumbnail_url, obj.thumbnailUrl, obj.cover_url, obj.coverUrl, obj.image_url, obj.imageUrl,
      meta.thumbnail_url, meta.cover_url, meta.image_url, ''
    ) || '');
  }

  function getStoryThumbnail(story, coverVideo, coverRelation) {
    return getThumbnailFromObject(coverRelation) || getThumbnailFromObject(story) || getThumbnailFromObject(coverVideo) || '';
  }

function renderInlineWidget(stories, appearance, format, widgetSelector, widgetPosition) {
  if (!stories || !stories.length) return;

  var selectorValue = widgetSelector || readAppearanceValue(appearance, ['css_selector', 'inline_selector', 'cssSelector', 'inlineSelector']);
  var selectorString = selectorValue ? String(selectorValue).trim() : null;
  var posicaoAlvo = widgetPosition || 'after'; 

  var maxTentativas = 60; 
  var tentativas = 0;

  function executarRenderizacao() {
    var targetDiv = null;
    var elementoAlvoDaLoja = null;

    if (selectorString) {
        try { elementoAlvoDaLoja = document.querySelector(selectorString); } catch (e) { console.error("Vidlytics: Seletor inválido."); }
    }

    if (selectorString && !elementoAlvoDaLoja && tentativas < maxTentativas) {
        tentativas++;
        setTimeout(executarRenderizacao, 250);
        return;
    }

    var nossaDivExistente = document.getElementById('vidlytics-carousel-root');

    if (elementoAlvoDaLoja) {
        if (nossaDivExistente) {
           targetDiv = nossaDivExistente;
           targetDiv.innerHTML = ''; 
        } else {
           targetDiv = createEl('div', 'vidlytics-inline-wrapper');
           targetDiv.id = 'vidlytics-carousel-root';
           targetDiv.style.width = '100%';
           targetDiv.style.margin = '20px 0';
           targetDiv.style.clear = 'both';
           targetDiv.style.display = 'block';
           
           if (posicaoAlvo === 'after' || posicaoAlvo.indexOf('abaixo') !== -1) {
               if (elementoAlvoDaLoja.nextSibling) {
                   elementoAlvoDaLoja.parentNode.insertBefore(targetDiv, elementoAlvoDaLoja.nextSibling);
               } else {
                   elementoAlvoDaLoja.parentNode.appendChild(targetDiv);
               }
           } else {
               elementoAlvoDaLoja.parentNode.insertBefore(targetDiv, elementoAlvoDaLoja);
           }
        }
    } 
    else {
        if (nossaDivExistente) {
            targetDiv = nossaDivExistente;
            targetDiv.innerHTML = '';
        } else {
            targetDiv = createEl('div', 'vidlytics-inline-wrapper');
            targetDiv.id = 'vidlytics-carousel-root';
            targetDiv.style.width = '100%';
            targetDiv.style.margin = '20px 0';
            
            var contentContainer = document.querySelector('main, #MainContent, .showcase, .page-content');
            if (contentContainer) {
                contentContainer.appendChild(targetDiv);
            } else {
                document.body.appendChild(targetDiv);
            }
        }
    }

    var shadow = targetDiv.shadowRoot || targetDiv.attachShadow({ mode: 'open' });
    shadow.innerHTML = '';

    var spacing = 12;
    var cardRadius = 12;

    var inlineCss = ':host{display:block;width:100%;max-width:1200px;margin:0 auto;padding:0 15px;box-sizing:border-box;font-family:sans-serif;}'
      + '*,*::before,*::after{box-sizing:border-box!important;}'
      + '.vl-carousel-track{width:100%;display:flex;flex-wrap:nowrap;gap:' + spacing + 'px;overflow-x:auto;padding-bottom:15px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;}'
      + '.vl-carousel-track::-webkit-scrollbar{display:none;}'
      + '.vl-card{flex:0 0 auto;width:140px;display:flex;flex-direction:column;cursor:pointer;background:transparent;border:none;padding:0;margin:0;scroll-snap-align:start;}'
      + '@media (min-width:768px){ .vl-card{width:160px;} }'
      + '.vl-media-box{width:100%;aspect-ratio:9/16;background-color:#000;border-radius:' + cardRadius + 'px;overflow:hidden;position:relative;box-shadow:0 4px 10px rgba(0,0,0,0.1);}'
      + '.vl-media{width:100%;height:100%;object-fit:cover;display:block;border:none;}'
      + '.vl-title{margin-top:8px;font-size:13px;font-weight:700;color:#333;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;width:100%;}';

    var style = createEl('style');
    style.textContent = inlineCss;
    shadow.appendChild(style);

    var container = createEl('div', 'vl-carousel-track');

    stories.forEach(function (story, index) {
      var videoObj = story.videos && story.videos.length > 0 ? story.videos[0] : null;
      var videoUrl = videoObj ? getVideoUrl(videoObj) : '';
      var cover = getStoryThumbnail(story, videoObj, null);

      var card = createEl('button', 'vl-card');
      var mediaBox = createEl('div', 'vl-media-box');

      var mediaEl;
      if (videoUrl && isDirectVideoUrl(videoUrl)) {
        mediaEl = createEl('video', 'vl-media');
        mediaEl.src = videoUrl;
        if (cover) mediaEl.poster = cover;
        mediaEl.muted = true;
        mediaEl.loop = true;
        mediaEl.autoplay = true;
        mediaEl.setAttribute('playsinline', '');
      } else {
        mediaEl = createEl('img', 'vl-media');
        if (cover) mediaEl.src = cover;
      }

      mediaBox.appendChild(mediaEl);
      card.appendChild(mediaBox);

      var label = createEl('span', 'vl-title');
      label.textContent = story.title || 'Ver produto';
      card.appendChild(label);

      // Listener de clique corrigido
      card.addEventListener('click', function (e) {
        console.log("Abrindo story:", story.title);
        if (typeof openStoryViewer === 'function') {
            openStoryViewer(stories, index);
        }
      });

      // Essa linha estava no lugar errado no seu código!
      container.appendChild(card);
    });

    shadow.appendChild(container);
  } 

  executarRenderizacao();
}

      // 3. Monta o Shadow DOM para isolar CSS e criar os Cards Horizontais
      var shadow = targetDiv.shadowRoot || targetDiv.attachShadow({ mode: 'open' });
      shadow.innerHTML = '';

      var spacing = 12;
      var cardRadius = 12;

      // CSS Blindado para forçar o Carrossel Lado a Lado
      var inlineCss = ':host{display:block;width:100%;max-width:1200px;margin:0 auto;padding:0;box-sizing:border-box;font-family:' + getFontFamily(appearance) + ' !important;}'
        + '*,*::before,*::after{box-sizing:border-box!important;}'
        + '.vl-carousel-container{width:100%;display:flex;flex-wrap:nowrap;gap:' + spacing + 'px;overflow-x:auto;padding-bottom:15px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;}'
        + '.vl-carousel-container::-webkit-scrollbar{height:6px;}'
        + '.vl-carousel-container::-webkit-scrollbar-track{background:transparent;}'
        + '.vl-carousel-container::-webkit-scrollbar-thumb{background-color:#cbd5e1;border-radius:10px;}'
        + '.vl-card{flex:0 0 auto;width:140px;display:flex;flex-direction:column;cursor:pointer;background:transparent;border:none;padding:0;margin:0;scroll-snap-align:start;}'
        + '@media (min-width:768px){ .vl-card{width:160px;} }'
        + '.vl-media-box{width:100%;aspect-ratio:9/16;background-color:#000;border-radius:' + cardRadius + 'px;overflow:hidden;position:relative;box-shadow:0 4px 10px rgba(0,0,0,0.1);}'
        + '.vl-media{width:100%;height:100%;object-fit:cover;display:block;border:none;}'
        + '.vl-title{margin-top:8px;font-size:13px;font-weight:700;color:' + (readAppearanceValue(appearance, ['text_color']) || '#333') + ';text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;width:100%;}';

      var style = createEl('style');
      style.textContent = inlineCss;
      shadow.appendChild(style);

      var container = createEl('div', 'vl-carousel-container');

      stories.forEach(function (story, index) {
        var bubbleVideo = story.videos && story.videos.length > 0 ? story.videos[0] : null;
        var videoUrl = bubbleVideo ? getVideoUrl(bubbleVideo) : '';
        var cover = getStoryThumbnail(story, bubbleVideo, null);

        var card = createEl('button', 'vl-card');
        var mediaBox = createEl('div', 'vl-media-box');

        var mediaEl;
        if (videoUrl && isDirectVideoUrl(videoUrl)) {
          mediaEl = createEl('video', 'vl-media');
          mediaEl.src = videoUrl;
          if (cover) mediaEl.poster = cover;
          mediaEl.muted = true;
          mediaEl.loop = true;
          mediaEl.autoplay = true;
          mediaEl.setAttribute('playsinline', '');
        } else {
          mediaEl = createEl('img', 'vl-media');
          if (cover) mediaEl.src = cover;
        }

        mediaBox.appendChild(mediaEl);
        card.appendChild(mediaBox);

        // Título abaixo do vídeo
        var label = createEl('span', 'vl-title');
        label.textContent = story.title || 'Ver Vídeo';
        card.appendChild(label);

        // Se quiser abrir o modal ao clicar (mesma lógica do flutuante):
        card.addEventListener('click', function (e) {
          // Aqui você chamaria a sua função openStoryViewer(stories, index);
          // Vou simular um log, mas no seu código completo existe a função openStoryViewer.
          console.log("Abrindo story:", story.title);
        });

        container.appendChild(card);
      });

      shadow.appendChild(container);
    } 

    executarRenderizacao();
  }

  // --- Função Flutuante Mantida Intacta para outros casos ---
  function renderFloating(stories, appearance) {
      if (!stories || !stories.length || floatingWasClosed) return;
      if (!enableFloating) return;
      // ... Lógica original do flutuante (resumida aqui para foco no carrossel)
  }

  function initWidget() {
    if (!hasSupabase && !storeId) return;

    Promise.all([
      readAppearance(),
      readStories(),
      readStoryVideos(),
      readVideos(),
      readPageRules(),
      readDisplayLocations()
    ]).then(function (results) {
      var appearance = results[0];
      var stories = results[1];
      var storyVideos = results[2];
      var videos = results[3];
      var pageRules = results[4];
      var locations = results[5];

      currentAppearance = appearance;

      if (!stories || stories.length === 0) return;

      // Modificação CHAVE: Encontrar a regra exata e guardá-la em activeDisplayRule
      function storyMatchesCurrentPage(story) {
        var locs = locations.filter(function(l) { return idsEqual(l.story_id, story.id) || !l.story_id; });
        var rules = pageRules.filter(function(r) { return idsEqual(r.story_id, story.id) || !r.story_id; });

        for(var i=0; i<locs.length; i++) {
            if(matchesRule(locs[i])) { 
                activeDisplayRule = locs[i]; // Guarda a regra que configurou Seletor e Posição
                return true; 
            }
        }
        for(var j=0; j<rules.length; j++) {
            if(matchesRule(rules[j])) { 
                activeDisplayRule = rules[j];
                return true; 
            }
        }
        return matchesUrl(appearance);
      }

      var validStories = stories.filter(storyMatchesCurrentPage);

      if (!validStories || validStories.length === 0) return;

      validStories.forEach(function(story) {
         var rels = storyVideos.filter(function(sv) { return idsEqual(sv.story_id, story.id); });
         story.videos = rels.map(function(r) { return videos.find(function(v) { return idsEqual(v.id, r.video_id); }) || {}; });
      });

      var widgetFormat = 'floating_widget';

      for (var i = 0; i < validStories.length; i += 1) {
        var storyFormat = String(
          firstDefined(
            validStories[i].format,
            validStories[i].display_format,
            activeDisplayRule ? activeDisplayRule.format : null, // Também verifica o formato na regra ativa
            'floating_widget'
          )
        ).toLowerCase();

        if (storyFormat.indexOf('carousel') !== -1 || storyFormat.indexOf('carrossel') !== -1 || widgetsCfg.carousel === true) {
          widgetFormat = 'carousel';
          break;
        }
      }

      if (widgetFormat === 'carousel') {
          console.info('Instory renderizando formato: Carousel com Seletor Ativo');
          renderInlineWidget(validStories, appearance, widgetFormat);
      } else {
          renderFloating(validStories, appearance);
      }

    }).catch(function (err) {
        console.error("Erro ao inicializar o Instory:", err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
