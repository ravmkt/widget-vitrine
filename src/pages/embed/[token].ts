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
  const blockId = block?.id;
  const selector = block?.selector || '';
  const position = block?.position || 'beforeend';
  const storyId = block?.story_id || block?.story?.id || null;
  const rules = Array.isArray(block?.rules) ? block.rules : [];

  return `(function() {
  var script = document.currentScript;
  var blockId = script.getAttribute('data-block-id');
  var selector = script.getAttribute('data-selector') || '';
  var position = script.getAttribute('data-position') || 'beforeend';
  var storyId = script.getAttribute('data-story-id') || '';
  var rules = JSON.parse(script.getAttribute('data-rules') || '[]');
  var baseUrl = script.getAttribute('data-base-url') || '';
  var injectedIds = new Set();

  function normalizeUrl(url) {
    if (!url) return '/';
    try {
      var parsed = new URL(url, window.location.origin);
      parsed.hash = '';
      parsed.search = '';
      var pathname = parsed.pathname.replace(/\/+$/, '') || '/';
      return pathname === '' ? '/' : pathname;
    } catch (e) {
      return String(url).trim().replace(/\/+$/, '') || '/';
    }
  }

  function matchesRule(rule) {
    var current = normalizeUrl(window.location.href);
    var value = normalizeUrl(rule.value || '');

    if (rule.condition_type === 'home') return current === '/';
    if (rule.condition_type === 'all_pages') return true;
    if (rule.condition_type === 'url_contains') return current.indexOf(String(rule.value || '').trim()) !== -1;
    if (rule.condition_type === 'url_equals') return current === value;
    if (rule.condition_type === 'url_not_equals') return current !== value;
    return false;
  }

  function shouldRender() {
    if (!rules.length) return true;
    for (var i = 0; i < rules.length; i++) {
      if (matchesRule(rules[i])) return true;
    }
    return false;
  }

  function waitForElement(selector, timeout) {
    return new Promise(function(resolve) {
      var start = Date.now();
      function check() {
        var element = null;
        try {
          element = document.querySelector(selector);
        } catch (e) {
          console.warn('[Vidlytics] Selector inválido:', selector, e);
          resolve(null);
          return;
        }
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - start >= timeout) {
          console.warn('[Vidlytics] Seletor não encontrado após o tempo limite:', selector);
          resolve(null);
          return;
        }
        requestAnimationFrame(check);
      }
      check();
    });
  }

  function buildHostId() {
    return 'vidlytics-story-' + storyId + '-' + blockId;
  }

  function createHost() {
    var hostId = buildHostId();
    var existing = document.getElementById(hostId);
    if (existing) return existing;
    var host = document.createElement('div');
    host.id = hostId;
    host.setAttribute('data-vidlytics-story-id', storyId);
    host.setAttribute('data-vidlytics-block-id', blockId);
    host.style.width = '100%';
    host.style.maxWidth = '100%';
    host.style.display = 'block';
    host.style.position = 'static';
    return host;
  }

  function insertHost(target, host) {
    if (!target || !host || host.parentNode) return;
    if (position === 'beforebegin' && target.parentNode) target.parentNode.insertBefore(host, target);
    else if (position === 'afterend' && target.parentNode) target.parentNode.insertBefore(host, target.nextSibling);
    else if (position === 'afterbegin') target.insertBefore(host, target.firstChild);
    else target.appendChild(host);
  }

  function renderIntoHost(host) {
    if (!host || injectedIds.has(host.id)) return;
    injectedIds.add(host.id);
    fetch(baseUrl + '/api/blocks/' + blockId)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        if (document.getElementById(host.id)) {
          host.innerHTML = html;
        }
      })
      .catch(function() {
        if (document.getElementById(host.id)) {
          host.innerHTML = '';
        }
      });
  }

  async function inject() {
    if (!shouldRender()) return;
    var host = createHost();
    if (host.parentNode) return;
    var target = selector ? await waitForElement(selector, 8000) : document.body;
    if (!target) return;
    insertHost(target, host);
    renderIntoHost(host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
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
