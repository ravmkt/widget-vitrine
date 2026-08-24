import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Trata requisições de preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const urlObj = new URL(req.url)
    const targetUrl = urlObj.searchParams.get('url')

    if (!targetUrl) {
      return new Response('Parâmetro "url" é obrigatório.', { status: 400, headers: corsHeaders })
    }

    // 1. Faz o download do HTML original da loja
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    })

    if (!response.ok) {
      return new Response(`Erro ao buscar a página: ${response.statusText}`, { status: response.status, headers: corsHeaders })
    }

    let html = await response.text()

    // 2. Remove tags de segurança (CSP) e iframes indesejados no cabeçalho HTML
    html = html.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    html = html.replace(/<meta\s+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')

    // 3. Script que será injetado para ouvir as atualizações do painel em tempo real via postMessage
    const injectorScript = `
      <script>
        (function() {
          console.log('[Vidlytics Proxy] Script de Preview ativado!');
          
          let currentWidgetContainer = null;

          // Função para posicionar o widget dinamicamente baseado nas âncoras escolhidas
          function injectOrUpdateWidget(config) {
            if (currentWidgetContainer) {
              currentWidgetContainer.remove();
            }

            // Criamos o container temporário do widget
            currentWidgetContainer = document.createElement('div');
            currentWidgetContainer.id = 'vidlytics-preview-widget-root';
            currentWidgetContainer.style.width = '100%';
            currentWidgetContainer.style.padding = '10px 0';

            // Criamos um esqueleto simples visual para representar o widget ativo
            let widgetHtml = '';
            const isFloating = config.activeTab === 'floating';
            const isCarousel = config.activeTab === 'carousel' || config.activeTab === 'dynamic_carousel';
            const isGrid = config.activeTab === 'grid';

            const primaryColor = config.primary_color || '#0094EB';

            if (isFloating) {
              currentWidgetContainer.removeAttribute('style'); // Float usa posições fixas
              currentWidgetContainer.style.position = 'fixed';
              currentWidgetContainer.style.bottom = '20px';
              currentWidgetContainer.style.right = '20px';
              currentWidgetContainer.style.zIndex = '999999';
              currentWidgetContainer.style.cursor = 'pointer';
              
              widgetHtml = \`
                <div style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid \${primaryColor}; background: #000; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 10px; font-weight: bold; text-align: center; text-transform: uppercase;">Stories</span>
                </div>
              \`;
            } else if (isCarousel) {
              widgetHtml = \`
                <div style="width: 100%; max-width: 1200px; margin: 0 auto; padding: 15px;">
                  <h3 style="font-family: sans-serif; font-size: 16px; margin-bottom: 12px; font-weight: bold;">Confira nossos Stories:</h3>
                  <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px;">
                    \${[1, 2, 3, 4, 5].map(i => \`
                      <div style="flex: 0 0 110px; width: 110px; height: 160px; border-radius: 12px; border: 2.5px solid \${primaryColor}; background: #333; display: flex; align-items: flex-end; padding: 8px; box-sizing: border-box;">
                        <span style="color: white; font-family: sans-serif; font-size: 10px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">Preview \${i}</span>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              \`;
            } else if (isGrid) {
              widgetHtml = \`
                <div style="width: 100%; max-width: 1200px; margin: 0 auto; padding: 15px;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px;">
                    \${[1, 2, 3, 4, 6].map(i => \`
                      <div style="aspect-ratio: 9/16; border-radius: 12px; border: 2.5px solid \${primaryColor}; background: #222; display: flex; align-items: flex-end; padding: 10px; box-sizing: border-box;">
                        <span style="color: white; font-family: sans-serif; font-size: 11px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">Story \${i}</span>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              \`;
            }

            currentWidgetContainer.innerHTML = widgetHtml;

            // Encontra a âncora para inserção
            const targetSelector = config.target_selector || 'body';
            const position = config.insert_position || 'append';
            const targetElement = document.querySelector(targetSelector);

            if (!targetElement) {
              console.warn('[Vidlytics] Elemento alvo "' + targetSelector + '" não encontrado. Adicionando no fim do body como fallback.');
              document.body.appendChild(currentWidgetContainer);
              return;
            }

            // Inserção com base na posição
            if (isFloating) {
              document.body.appendChild(currentWidgetContainer);
            } else {
              switch (position) {
                case 'after':
                  targetElement.insertAdjacentElement('afterend', currentWidgetContainer);
                  break;
                case 'before':
                  targetElement.insertAdjacentElement('beforebegin', currentWidgetContainer);
                  break;
                case 'prepend':
                  targetElement.insertAdjacentElement('afterbegin', currentWidgetContainer);
                  break;
                case 'append':
                default:
                  targetElement.appendChild(currentWidgetContainer);
                  break;
              }
              // Rolagem suave até o widget injetado para dar feedback imediato ao lojista
              currentWidgetContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }

          // Escuta mensagens vindas do painel principal (controlador pai do iframe)
          window.addEventListener('message', (event) => {
            // No futuro, se desejar restringir por origem: if (event.origin !== 'sua-url-do-painel') return;
            if (event.data && event.data.type === 'VIDLYTICS_PREVIEW_UPDATE') {
              console.log('[Vidlytics Proxy] Configurações recebidas:', event.data.config);
              injectOrUpdateWidget(event.data.config);
            }
          });
        })();
      </script>
    `;

    // 4. Injeta o nosso script logo antes do fechamento da tag </body>
    const bodyEndIndex = html.lastIndexOf('</body>')
    if (bodyEndIndex !== -1) {
      html = html.substring(0, bodyEndIndex) + injectorScript + html.substring(bodyEndIndex)
    } else {
      html += injectorScript
    }

    // Retorna o HTML alterado com as cabeçalhos liberados para iframe
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL', // Libera carregamento em iframe
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
