/**
 * ================================================================
 *  VIDLYTICS — Script Universal de Rastreamento de Vendas
 *  Compatível com: Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray, CartPanda
 * ================================================================
 */
(function () {
  var SUPABASE_URL = "https://wznvecurmisgoaijykbt.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_zaJmbR8cGsp-gXxzVXZprQ_laRyRQLf";
  var EDGE_FUNCTION = SUPABASE_URL + "/functions/v1/universal-conversion";

  // ---------- 1. Captura dinâmica dos parâmetros passados no Script ----------
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("vidlytics-tracking.js") !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var scriptParams = (function () {
    if (!currentScript || !currentScript.src) return new URLSearchParams();
    var queryIdx = currentScript.src.indexOf("?");
    return queryIdx !== -1 ? new URLSearchParams(currentScript.src.substring(queryIdx)) : new URLSearchParams();
  })();

  var STORE_ID = scriptParams.get("store") || window.VIDLYTICS_STORE_ID || "__VLY_STORE_ID__";
  var SECURITY_TOKEN = scriptParams.get("token") || window.VIDLYTICS_SECURITY_TOKEN || "__VLY_SECURITY_TOKEN__";

  if (!STORE_ID || STORE_ID === "__VLY_STORE_ID__") {
    console.warn("[Vidlytics Tracking] Store ID não identificada no script.");
    return;
  }

  // ---------- 2. Utilitários de Domínio Raiz e Cookies ----------
  function getRootDomain() {
    try {
      var hostname = window.location.hostname;
      if (!hostname || hostname === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        return "";
      }
      var parts = hostname.split(".");
      if (parts.length >= 2) {
        return "." + parts.slice(-2).join(".");
      }
      return hostname;
    } catch (_) {
      return "";
    }
  }

  function getUrlParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (_) {
      return "";
    }
  }

  function setCookie(name, value, days) {
    try {
      var d = new Date();
      d.setTime(d.getTime() + (days || 30) * 864e5);
      var rootDomain = getRootDomain();
      var domainAttr = rootDomain ? "; domain=" + rootDomain : "";
      document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/" + domainAttr + "; SameSite=Lax";
      localStorage.setItem(name, value);
    } catch (_) {}
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      if (m) return decodeURIComponent(m[2]);
      return localStorage.getItem(name) || "";
    } catch (_) {
      return "";
    }
  }

  // Identificação do visitante e da mídia
  var videoId = getUrlParam("vly_v") || getCookie("vly_video_id") || null;
  var productId = getUrlParam("vly_p") || getCookie("vly_product_id") || null;
  var visitorId = getUrlParam("vly_u") || getCookie("vly_visitor_id");

  if (!visitorId) {
    visitorId = "vly_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    setCookie("vly_visitor_id", visitorId, 30);
  }

  if (getUrlParam("vly_v")) setCookie("vly_video_id", videoId, 30);
  if (getUrlParam("vly_p")) setCookie("vly_product_id", productId, 30);

  // ---------- 3. Envio da conversão ----------
  var alreadySent = false;
  function sendConversion(order) {
    if (!order || alreadySent) return;
    if (!order.order_value || Number(order.order_value) <= 0) return;

    var orderKey = "vly_sent_" + (order.order_id || String(order.order_value));
    if (sessionStorage.getItem(orderKey)) return;

    alreadySent = true;
    sessionStorage.setItem(orderKey, "1");

    var payload = {
      store_id: STORE_ID,
      video_id: videoId || null,
      product_id: productId || null,
      visitor_id: visitorId,
      order_id: order.order_id ? String(order.order_id) : null,
      order_value: parseFloat(order.order_value),
      status: order.status || "pending",
      platform: order.platform || "unknown",
    };

    var endpoint = EDGE_FUNCTION;
    if (SECURITY_TOKEN && SECURITY_TOKEN !== "__VLY_SECURITY_TOKEN__") {
      endpoint += "?token=" + encodeURIComponent(SECURITY_TOKEN);
    }

    fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) {
          alreadySent = false;
          sessionStorage.removeItem(orderKey);
        } else {
          console.log("[Vidlytics] Conversão registrada com sucesso!", payload);
        }
      })
      .catch(function () {
        alreadySent = false;
        sessionStorage.removeItem(orderKey);
      });
  }

  // ---------- 4. dataLayer (GTM / Yampi / Shopify / Nuvemshop) ----------
  function processDataLayerItem(e) {
    if (!e || typeof e !== "object") return;

    var isPurchase =
      e.event === "purchase" ||
      e.event === "order_completed" ||
      e.event === "checkout_finished" ||
      e.event === "pix_generated" ||
      e.event === "yampi:order_created";

    if (isPurchase) {
      var val =
        e.value ||
        e.transactionTotal ||
        (e.ecommerce && (e.ecommerce.value || e.ecommerce.transaction_total)) ||
        0;

      var id =
        e.transactionId ||
        e.order_id ||
        (e.ecommerce && (e.ecommerce.transaction_id || e.ecommerce.order_id)) ||
        "";

      if (val > 0) {
        sendConversion({
          order_id: id,
          order_value: val,
          status: e.event === "pix_generated" ? "pending" : "paid",
          platform: "dataLayer",
        });
      }
    }
  }

  if (window.dataLayer && Array.isArray(window.dataLayer)) {
    for (var i = 0; i < window.dataLayer.length; i++) {
      processDataLayerItem(window.dataLayer[i]);
    }
    var originalPush = window.dataLayer.push;
    window.dataLayer.push = function () {
      for (var j = 0; j < arguments.length; j++) {
        processDataLayerItem(arguments[j]);
      }
      return originalPush.apply(window.dataLayer, arguments);
    };
  }

  // ---------- 5. Variáveis globais de plataformas de checkout ----------
  function tryPlatformGlobals() {
    // Yampi
    if (window.yampi && (window.yampi.order || window.yampi.checkout)) {
      var yo = window.yampi.order || window.yampi.checkout;
      sendConversion({
        order_id: yo.id || yo.number,
        order_value: yo.total || yo.value,
        platform: "yampi",
      });
    }
    if (window._yampi && window._yampi.order) {
      var yoo = window._yampi.order;
      sendConversion({
        order_id: yoo.id || yoo.number,
        order_value: yoo.total || yoo.value,
        platform: "yampi",
      });
    }

    // Shopify
    if (window.Shopify && window.Shopify.checkout) {
      var sc = window.Shopify.checkout;
      sendConversion({
        order_id: sc.order_id || sc.token,
        order_value: sc.total_price / 100,
        platform: "shopify",
      });
    }

    // Nuvemshop
    if (window.LS && window.LS.checkout) {
      var nc = window.LS.checkout;
      sendConversion({
        order_id: nc.order_id,
        order_value: nc.total,
        platform: "nuvemshop",
      });
    }
  }
  tryPlatformGlobals();

  // ---------- 6. Detecção por URL e Leitura de DOM (Finalization Yampi) ----------
  function checkOrderPage() {
    if (alreadySent) return;

    var path = window.location.pathname.toLowerCase();
    var isOrderPage = [
      "finalization",
      "confirmacao",
      "confirmation",
      "obrigado",
      "thank",
      "pedido",
      "order",
      "sucesso",
      "success",
    ].some(function (kw) {
      return path.indexOf(kw) !== -1;
    });

    if (!isOrderPage) return;

    setTimeout(function () {
      tryPlatformGlobals();

      var totalEl = document.querySelector(
        "[data-order-total], .order-total, .checkout-summary__total, [class*='total-pedido'], [class*='total'], .yampi-order-total, .payment-total, .summary-total, .finalization-total"
      );
      var idEl = document.querySelector(
        "[data-order-id], .order-id, .numero-pedido, .order-number, [data-transaction-id]"
      );

      var value = 0;
      var id = "";

      if (totalEl) {
        var cleanText = (totalEl.textContent || "").replace(/[^\d,\.]/g, "");
        if (cleanText.indexOf(",") !== -1) {
          cleanText = cleanText.replace(/\./g, "").replace(",", ".");
        }
        var m = cleanText.match(/(\d+\.?\d*)/);
        if (m) value = parseFloat(m[1]);
      }

      if (idEl) {
        id = (idEl.textContent || idEl.getAttribute("data-order-id") || "").trim();
      }

      if (!id) {
        var urlMatch =
          window.location.pathname.match(/finalization\/(\d+)/i) ||
          window.location.pathname.match(/(\d{5,})/);
        if (urlMatch) id = urlMatch[1];
      }

      if (value > 0) {
        sendConversion({
          order_id: id,
          order_value: value,
          platform: "yampi-dom",
        });
      }
    }, 2000);
  }

  checkOrderPage();
  window.addEventListener("popstate", checkOrderPage);
  window.addEventListener("hashchange", checkOrderPage);

  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkOrderPage();
    }
  }, 1000);

  console.log("[Vidlytics] Rastreamento ativo para a loja:", STORE_ID);
})();
