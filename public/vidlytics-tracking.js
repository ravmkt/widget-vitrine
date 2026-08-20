/**
 * ================================================================
 *  VIDLYTICS — Script Universal de Rastreamento de Vendas
 *  Compatível com: Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray
 * ================================================================
 *  Este script é gerado automaticamente pelo painel Vidlytics,
 *  já com os dados da sua loja preenchidos. Não é necessário
 *  editar nada — apenas cole onde indicado.
 * ================================================================
 */
(function () {
  var SUPABASE_URL = "https://wznvecurmisgoaijykbt.supabase.co";
  var SUPABASE_ANON_KEY = "__VLY_ANON_KEY__";
  var STORE_ID = "__VLY_STORE_ID__";
  var SECURITY_TOKEN = "__VLY_SECURITY_TOKEN__";
var EDGE_FUNCTION = SUPABASE_URL + "/functions/v1/universal-conversion";

  // ---------- Utilitários de cookie/URL ----------
  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax";
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  var videoId = getCookie("vly_video_id") || getUrlParam("vly_v");
  var productId = getCookie("vly_product_id") || getUrlParam("vly_p");
  var visitorId = getCookie("vly_visitor_id") || getUrlParam("vly_u");

  if (getUrlParam("vly_v")) setCookie("vly_video_id", videoId, 30);
  if (getUrlParam("vly_p")) setCookie("vly_product_id", productId, 30);
  if (getUrlParam("vly_u")) setCookie("vly_visitor_id", visitorId, 30);

  // ---------- Envio da conversão ----------
  var alreadySent = false;
  function sendConversion(order) {
    if (!visitorId || alreadySent) return; // visitante não veio de um vídeo Vidlytics
    if (!order.order_value || order.order_value <= 0) return;
    alreadySent = true;

    var payload = {
      store_id: STORE_ID,
      video_id: videoId || null,
      product_id: productId || null,
      visitor_id: visitorId,
      order_id: order.order_id || null,
      order_value: order.order_value,
      status: "paid",
      platform: order.platform || "unknown",
    };

    fetch(EDGE_FUNCTION + "?token=" + encodeURIComponent(SECURITY_TOKEN), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (r.ok) sessionStorage.setItem("vly_conversion_sent", "1");
      else alreadySent = false;
    }).catch(function () { alreadySent = false; });
  }

  if (sessionStorage.getItem("vly_conversion_sent")) alreadySent = true;

  // ---------- 1. dataLayer (GTM / Yampi / Shopify Analytics / Nuvemshop) ----------
  if (window.dataLayer) {
    var push = window.dataLayer.push;
    window.dataLayer.push = function () {
      for (var i = 0; i < arguments.length; i++) {
        var e = arguments[i];
        if (e && (e.event === "purchase" || e.event === "order_completed" || e.event === "checkout_finished")) {
          var value = e.value || e.transactionTotal || (e.ecommerce && e.ecommerce.value) || 0;
          var id = e.transactionId || e.order_id || (e.ecommerce && e.ecommerce.transaction_id) || "";
          sendConversion({ order_id: id, order_value: value, platform: "dataLayer" });
        }
      }
      return push.apply(window.dataLayer, arguments);
    };
  }

  // ---------- 2. Variáveis globais específicas de plataforma ----------
  function tryPlatformGlobals() {
    // Shopify
    if (window.Shopify && window.Shopify.checkout) {
      var c = window.Shopify.checkout;
      sendConversion({ order_id: c.order_id || c.token, order_value: c.total_price / 100, platform: "shopify" });
    }
    // Nuvemshop
    if (window.LS && window.LS.checkout) {
      var n = window.LS.checkout;
      sendConversion({ order_id: n.order_id, order_value: n.total, platform: "nuvemshop" });
    }
    // Yampi (objeto global comum em temas)
    if (window.yampi && window.yampi.order) {
      var y = window.yampi.order;
      sendConversion({ order_id: y.id, order_value: y.total, platform: "yampi" });
    }
    // WBuy
    if (window.wbuy && window.wbuy.pedido) {
      var w = window.wbuy.pedido;
      sendConversion({ order_id: w.id, order_value: w.valor_total, platform: "wbuy" });
    }
  }
  tryPlatformGlobals();

  // ---------- 3. Fallback: detecção por URL + leitura de texto na tela ----------
  function checkOrderPage() {
    if (alreadySent) return;
    var path = window.location.pathname.toLowerCase();
    var isOrderPage = ["confirmacao", "confirmation", "obrigado", "thank", "pedido", "order", "sucesso", "success"]
      .some(function (kw) { return path.indexOf(kw) !== -1; });
    if (!isOrderPage) return;

    setTimeout(function () {
      var totalEl = document.querySelector("[data-order-total], .order-total, .checkout-summary__total, [class*='total-pedido'], [class*='total']");
      var idEl = document.querySelector("[data-order-id], .order-id, .numero-pedido");

      var value = 0, id = "";
      if (totalEl) {
        var m = (totalEl.textContent || "").replace(/\./g, "").replace(",", ".").match(/(\d+\.?\d*)/);
        if (m) value = parseFloat(m[1]);
      }
      if (idEl) id = (idEl.textContent || idEl.getAttribute("data-order-id") || "").trim();
      if (!id) {
        var um = window.location.pathname.match(/(\d{4,})/);
        if (um) id = um[1];
      }
      if (value > 0) sendConversion({ order_id: id, order_value: value, platform: "dom-fallback" });
    }, 2500);
  }

  checkOrderPage();
  window.addEventListener("popstate", checkOrderPage);
  window.addEventListener("hashchange", checkOrderPage);
  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) { lastUrl = location.href; checkOrderPage(); }
  }, 1000);

  console.log("[Vidlytics] Rastreamento de vendas ativo.", { hasVisitor: !!visitorId, store: STORE_ID });
})();
