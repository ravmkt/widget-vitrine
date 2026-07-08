import { defineConfig, loadEnv } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      dyadComponentTagger(), 
      react(),
      {
        name: 'yampi-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/yampi')) {
              return next();
            }

            const { YAMPI_ALIAS, YAMPI_TOKEN, YAMPI_SECRET_KEY } = env;
            const YAMPI_API_BASE = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}`;

            if (req.url === '/api/yampi/health') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'ok',
                integrated: true,
                timestamp: new Date().toISOString(),
                env: { YAMPI_ALIAS: !!YAMPI_ALIAS, YAMPI_TOKEN: !!YAMPI_TOKEN, YAMPI_SECRET_KEY: !!YAMPI_SECRET_KEY }
              }));
              return;
            }

            if (req.url === '/api/yampi/products') {
              const targetUrl = `${YAMPI_API_BASE}/catalog/products`;
              
              if (!YAMPI_ALIAS || !YAMPI_TOKEN || !YAMPI_SECRET_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Credenciais ausentes' }));
                return;
              }

              try {
                const response = await fetch(targetUrl, {
                  headers: {
                    'User-Token': YAMPI_TOKEN,
                    'User-Secret-Key': YAMPI_SECRET_KEY,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, status: response.status, message: 'Erro Yampi', details: data }));
                  return;
                }

                const rawProducts = data.data || [];
                
                // --- DEBUG LOGS SEGUROS ---
                if (rawProducts.length > 0) {
                  const p = rawProducts[0];
                  console.log('--- INSPEÇÃO DE PRODUTO YAMPI ---');
                  console.log(`ID: ${p.id} | Nome: ${p.name}`);
                  console.log(`Campos de Preço: price=${p.price}, price_sale=${p.price_sale}, cost_price=${p.cost_price}`);
                  console.log(`Estrutura de Imagens:`, p.images ? (p.images.data ? `Array com ${p.images.data.length}` : 'Não é array') : 'Nula');
                  if (p.images?.data?.[0]) console.log(`Primeira Imagem:`, p.images.data[0]);
                  console.log(`SKUs:`, p.skus ? (p.skus.data ? `Array com ${p.skus.data.length}` : 'Não é array') : 'Nula');
                  console.log(`OBJETO COMPLETO (Saneado):`, JSON.stringify({ ...p, links: 'hidden' }, null, 2));
                  console.log('---------------------------------');
                }

                // Normalização robusta seguindo o novo padrão solicitado
                const products = rawProducts.map((p: any) => {
                  // Preço: Tenta no produto, senão tenta no primeiro SKU
                  let price = parseFloat(p.price || 0);
                  let salePrice = parseFloat(p.price_sale || 0);
                  
                  if (price === 0 && p.skus?.data?.[0]) {
                    price = parseFloat(p.skus.data[0].price || 0);
                    salePrice = parseFloat(p.skus.data[0].price_sale || 0);
                  }

                  // Imagem: Tenta imagens.data, senão tenta image_url, senão tenta no SKU
                  let image = p.images?.data?.[0]?.url || p.image_url || '';
                  if (!image && p.skus?.data?.[0]?.image_url) {
                    image = p.skus.data[0].image_url;
                  }

                  return {
                    id: String(p.id),
                    name: p.name,
                    sku: p.sku || p.skus?.data?.[0]?.sku || `ID-${p.id}`,
                    price: price,
                    salePrice: salePrice > 0 ? salePrice : undefined,
                    image: image,
                    productUrl: p.url,
                    checkoutUrl: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`,
                    active: !!p.active,
                    raw: {
                      id: p.id,
                      has_skus: !!p.skus?.data?.length,
                      has_images: !!p.images?.data?.length
                    }
                  };
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(products));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Falha crítica no proxy' }));
              }
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});