import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const buildScript = (block: any) => {
  const preset = block?.preset || 'main-area';
  const customSelector = block?.selector || null;
  const blockId = block?.id;
  const blockType = block?.blockType || 'carousel';
  const position = block?.position || 'afterbegin';

  return `(function() {
  var script = document.currentScript;
  var preset = script.getAttribute('data-preset') || 'main-area';
  var customSelector = script.getAttribute('data-custom-selector') || null;
  var blockId = script.getAttribute('data-block-id');
  var blockType = script.getAttribute('data-block-type');
  var position = script.getAttribute('data-position') || 'afterbegin';

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

  function findTarget() {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return document.querySelector('footer') || document.body;
  }

  var injected = false;

  function inject() {
    if (injected) return;
    if (document.getElementById(BLOCK_ID)) {
      injected = true;
      return;
    }
    var target = findTarget();
    if (!target) return;
    var wrapper = document.createElement('div');
    wrapper.id = BLOCK_ID;
    wrapper.className = 'vidlytics-block vidlytics-' + blockType;
    wrapper.setAttribute('data-vidlytics-block-id', blockId);
    target.insertAdjacentElement(METHOD, wrapper);
    injected = true;
  }

  function safeInject() {
    if (document.body) { inject(); }
    else { document.addEventListener('DOMContentLoaded', inject); }
  }
  safeInject();

  var observer = new MutationObserver(function() {
    if (!document.getElementById(BLOCK_ID)) {
      injected = false;
      safeInject();
    }
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', startObserver);
    }
  }
  startObserver();

  window.addEventListener('popstate', function() {
    injected = false;
    setTimeout(safeInject, 300);
  });
})();`;
};

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const { data: block } = await supabase
    .from('display_locations')
    .select('*')
    .eq('id', token)
    .maybeSingle();

  const payload = buildScript(block || { id: token });

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
