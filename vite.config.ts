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
                
                // Log de inspeção seguro (apenas o primeiro produto se existir)
                if (rawProducts.length > 0) {
                  const first = rawProducts[0];
                  console.log(`[Yampi Debug] Estrutura do produto ID ${first.id}:`, {
                    has_images: !!first.images?.data,
                    price_raw: first.price,
                    price_sale_raw: first.price_sale,
                    sku: first.sku,
                    active: first.active
                  });
                }

                // Normalização robusta para Video Commerce
                const products = rawProducts.map((p: any) => {
                  // Tenta pegar a primeira imagem válida
                  const mainImage = p.images?.data?.[0]?.url || p.image_url || '';
                  
                  return {
                    id: p.id,
                    name: p.name,
                    sku: p.sku || `ID-${p.id}`,
                    active: !!p.active,
                    // Garante que o preço seja número
                    price: typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0),
                    sale_price: typeof p.price_sale === 'string' ? parseFloat(p.price_sale) : (p.price_sale || 0),
                    image_url: mainImage,
                    product_url: p.url,
                    // Link direto para adição ao carrinho na Yampi
                    checkout_url: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`
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