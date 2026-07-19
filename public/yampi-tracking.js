/**
 * ================================================================
 *  VIDLYTICS — Script de Conversão para Yampi
 * ================================================================
 *
 *  COMO INSTALAR:
 *
 *  1. Acesse o painel administrativo da sua loja na Yampi
 *  2. Vá em: Configurações → Pixel / Scripts Personalizados
 *  3. Cole TODO este código no campo de "Scripts personalizados"
 *     (rodapé/body ou head — o ideal é no final do body)
 *  4. Substitua o SUPABASE_URL e SUPABASE_ANON_KEY abaixo pelos
 *     valores do seu projeto (encontra no painel do Vidlytics)
 *  5. Salve e publique as alterações
 *
 *  COMO FUNCIONA:
 *
 *  - Quando um visitante vem do Vidlytics (clicou num vídeo),
 *    a URL contém os parâmetros: vly_v (video_id), vly_s (store_id),
 *    vly_p (product_id) e vly_u (visitor_id)
 *  - O script salva esses dados em um cookie (30 dias)
 *  - Quando a pessoa finaliza a compra na Yampi, o script detecta
 *    o evento de conversão e envia os dados para o Supabase
 *  - O dashboard do Vidlytics mostra a receita atribuída ao vídeo
 *
 * ================================================================
 */

(function () {
  // ================================================================
  // CONFIGURAÇÃO — SUBSTITUA PELOS DADOS DO SEU PROJETO
  // ================================================================
  var SUPABASE_URL = "https://wznvecurmisgoaijykbt.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZlY3VybWlzZ29haWp5a2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDk3NzgsImV4cCI6MjA5ODg4NTc3OH0.0wLxWu028Gf-53ZXzL2AS9rPMLz3ndFrm9LSJu-bvRQ";
  var EDGE_FUNCTION = SUPABASE_URL + "/functions/v1/yampi-conversion";

  // ================================================================
  // 1. CAPTURA E ARMAZENA OS PARÂMETROS DE RASTREAMENTO
  // ================================================================

  function getUrlParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || "";
  }

  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return "";
  }

  // Captura parâmetros da URL vindos do Vidlytics
  var videoId = getCookie("vly_video_id") || getUrlParam("vly_v");
  var storeId = getCookie("vly_store_id") || getUrlParam("vly_s");
  var productId = getCookie("vly_product_id") || getUrlParam("vly_p");
  var visitorId = getCookie("vly_visitor_id") || getUrlParam("vly_u");

  // Se encontrou parâmetros na URL, salva no cookie (30 dias)
  if (getUrlParam("vly_v")) setCookie("vly_video_id", videoId, 30);
  if (getUrlParam("vly_s")) setCookie("vly_store_id", storeId, 30);
  if (getUrlParam("vly_p")) setCookie("vly_product_id", productId, 30);
  if (getUrlParam("vly_u")) setCookie("vly_visitor_id", visitorId, 30);

  // ================================================================
  // 2. ENVIA CONVERSÃO PARA O SUPABASE
  // ================================================================

  function sendConversion(orderData) {
    // Se não tem visitor_id, o usuário não veio do Vidlytics
    if (!visitorId || !storeId) {
      console.log("[Vidlytics] Conversão ignorada: visitante não veio do Vidlytics");
      return;
    }

    var payload = {
      store_id: storeId,
      video_id: videoId || null,
      product_id: productId || null,
      visitor_id: visitorId,
      order_id: orderData.order_id || null,
      order_value: orderData.order_value || 0,
      status: orderData.status || "pending",
    };

    console.log("[Vidlytics] Enviando conversão:", payload);

    fetch(EDGE_FUNCTION, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        if (response.ok) {
          console.log("[Vidlytics] Conversão registrada com sucesso!");
        } else {
          console.warn("[Vidlytics] Conversão falhou:", response.status);
        }
      })
      .catch(function (error) {
        console.error("[Vidlytics] Erro ao enviar conversão:", error);
      });
  }

  // ================================================================
  // 3. DETECTA A COMPRA NA YAMPI
  // ================================================================

  /**
   * A Yampi usa diferentes eventos dependendo da versão:
   *
   * — dataLayer.push (Google Tag Manager pattern)
   * — Evento customizado "purchase" no dataLayer
   * — Webhook nativo da Yampi (alternativa ao script)
   *
   * Aqui interceptamos o dataLayer para capturar a compra.
   */

  // Método 1: Intercepta dataLayer.push (padrão Yampi/GTM)
  if (typeof window.dataLayer !== "undefined") {
    var originalPush = window.dataLayer.push;

    window.dataLayer.push = function () {
      for (var i = 0; i < arguments.length; i++) {
        var event = arguments[i];

        // Detecta evento de compra (Yampi / GTM Enhanced Ecommerce)
        if (event && (event.event === "purchase" || event.event === "order_completed")) {
          console.log("[Vidlytics] Evento de compra detectado:", event);

          var orderValue = 0;
          var orderId = "";

          // Yampi padrão: event.transactionTotal ou event.value ou event.ecommerce.value
          if (event.transactionTotal) orderValue = event.transactionTotal;
          else if (event.value) orderValue = event.value;
          else if (event.ecommerce && event.ecommerce.value) orderValue = event.ecommerce.value;

          // Order ID
          if (event.transactionId) orderId = event.transactionId;
          else if (event.order_id) orderId = event.order_id;
          else if (event.ecommerce && event.ecommerce.transaction_id) orderId = event.ecommerce.transaction_id;

          if (orderValue > 0) {
            sendConversion({
              order_id: orderId,
              order_value: orderValue,
              status: "paid",
            });
          }
        }
      }

      return originalPush.apply(window.dataLayer, arguments);
    };
  }

  // Método 2: Escuta diretamente o evento "purchase" disparado no documento
  document.addEventListener("purchase", function (e) {
    var detail = e.detail || {};
    console.log("[Vidlytics] Evento purchase custom:", detail);

    if (detail.total || detail.value || detail.transactionTotal) {
      sendConversion({
        order_id: detail.order_id || detail.transactionId || "",
        order_value: detail.total || detail.value || detail.transactionTotal || 0,
        status: "paid",
      });
    }
  });

  // Método 3: Detecta pela URL de confirmação de pedido
  // A Yampi redireciona para /checkout/confirmacao ou /pedido/[id]
  function checkOrderUrl() {
    var path = window.location.pathname.toLowerCase();

    if (
      (path.indexOf("confirmacao") !== -1 ||
        path.indexOf("confirmation") !== -1 ||
        path.indexOf("pedido") !== -1 ||
        path.indexOf("order") !== -1 ||
        path.indexOf("obrigado") !== -1 ||
        path.indexOf("thank") !== -1) &&
      !sessionStorage.getItem("vly_conversion_sent")
    ) {

      // Tenta extrair o valor e ID do pedido da página
      setTimeout(function () {
        // Procura por elementos comuns da Yampi que mostram o valor total
        var totalEl =
          document.querySelector("[data-order-total]") ||
          document.querySelector(".order-total") ||
          document.querySelector(".checkout-summary__total") ||
          document.querySelector('[class*="total"]');

        var idEl =
          document.querySelector("[data-order-id]") ||
          document.querySelector(".order-id");

        var orderValue = 0;
        var orderId = "";

        if (totalEl) {
          var text = totalEl.textContent || "";
          // Extrai números do texto (R$ 299,90 → 299.90)
          var match = text.replace(/\./g, "").replace(",", ".").match(/(\d+\.?\d*)/);
          if (match) orderValue = parseFloat(match[1]);
        }

        if (idEl) {
          orderId = (idEl.textContent || idEl.getAttribute("data-order-id") || "").trim();
        }

        // Tenta pegar da URL também
        var urlMatch = window.location.pathname.match(/\/(\d+)$/);
        if (!orderId && urlMatch) orderId = urlMatch[1];

        if (orderValue > 0) {
          sessionStorage.setItem("vly_conversion_sent", "1");
          sendConversion({
            order_id: orderId,
            order_value: orderValue,
            status: "paid",
          });
        }
      }, 2000);
    }
  }

  // Executa na carga da página e quando a URL muda (SPA)
  checkOrderUrl();

  window.addEventListener("popstate", checkOrderUrl);
  window.addEventListener("hashchange", checkOrderUrl);

  // Observa mudanças no DOM (Yampi pode ser SPA)
  var lastUrl = window.location.href;
  var urlObserver = setInterval(function () {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkOrderUrl();
    }
  }, 1000);

  console.log("[Vidlytics] Script de conversão Yampi carregado.", {
    hasVideo: !!videoId,
    hasStore: !!storeId,
    hasVisitor: !!visitorId,
  });
})();
