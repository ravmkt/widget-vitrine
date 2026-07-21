import { supabase } from '@/lib/supabase';

const getPublicBaseUrl = (req: Request) => {
  const configuredUrl = import.meta.env?.VITE_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl;

  const origin = new URL(req.url).origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'https://app.vidlytics.com.br';
  }

  return origin;
};

const buildScript = (block: any, baseUrl: string) => {
  const preset = block?.preset || 'main-area';
  const customSelector = block?.selector || null;
  const blockId = block?.id;
  const blockType = block?.story?.format || block?.format || 'carousel';
  const position = block?.position || 'afterbegin';

  return `(function() {
  var script = document.currentScript;
  var preset = script.getAttribute('data-preset') || 'main-area';
  var customSelector = script.getAttribute('data-custom-selector') || null;
  var blockId = script.getAttribute('data-block-id');
  var blockType = script.getAttribute('data-block-type');
  var position = script.getAttribute('data-position') || 'afterbegin';
  var baseUrl = script.getAttribute('data-base-url') || '';

  var PRESETS = {
    'after-menu':    ['.menu', 'header nav', '#menu', 'nav', 'main'],
    'middle-page':   ['[role="main"]', 'main', '.content', '.page-content'],
    'before-footer': ['footer', '.footer', '#footer'],
    'main-area':     ['main', '.holder-results', '.flex-holder', '.content', '[role="main"]'],
    'custom':        customSelector ? [customSelector] : []
  };

  var selectors = PRESETS[preset] || PRESETS['main-area'];
  var BLOCK_ID = 'vidlytics-' + blockId;
  var METHOD = position;
  var injected = false;
  var observerStarted = false;

  function findTarget() {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return document.querySelector('footer') || document.body;
  }

  function inject() {
    if (injected || document.getElementById(BLOCK_ID)) return;
    var target = findTarget();
    if (!target) return;
    var wrapper = document.createElement('div');
    wrapper.id = BLOCK_ID;
    wrapper.className = 'vidlytics-block vidlytics-' + blockType;
    wrapper.setAttribute('data-vidlytics-block-id', blockId);
    target.insertAdjacentElement(METHOD, wrapper);
    fetch(baseUrl + '/api/blocks/' + blockId)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        if (document.getElementById(BLOCK_ID)) {
          wrapper.innerHTML = html;
        }
      })
      .catch(function() {
        if (document.getElementById(BLOCK_ID)) {
          wrapper.innerHTML = '<!-- Vidlytics: bloco não encontrado -->';
        }
      });
    injected = true;
  }

  function safeInject() {
    if (document.body) { inject(); }
    else { document.addEventListener('DOMContentLoaded', inject, { once: true }); }
  }
  safeInject();

  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;
    var observer = new MutationObserver(function() {
      if (!injected && !document.getElementById(BLOCK_ID)) {
        inject();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    startObserver();
  } else {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  }
})();`;
};

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const baseUrl = getPublicBaseUrl(_);
  const { data: block } = await supabase
    .from('display_locations')
    .select('*')
    .eq('id', token)
    .maybeSingle();

  const payload = buildScript(block || { id: token }, baseUrl);

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
