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

            // Rota de Health Check
            if (req.url === '/api/yampi/health') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'ok',
                integrated: true,
                timestamp: new Date().toISOString(),
                env: {
                  YAMPI_ALIAS: !!YAMPI_ALIAS,
                  YAMPI_TOKEN: !!YAMPI_TOKEN,
                  YAMPI_SECRET_KEY: !!YAMPI_SECRET_KEY
                }
              }));
              return;
            }

            // Rota de Produtos
            if (req.url === '/api/yampi/products') {
              if (!YAMPI_ALIAS || !YAMPI_TOKEN || !YAMPI_SECRET_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'Variáveis de ambiente ausentes',
                  missing: { YAMPI_ALIAS: !YAMPI_ALIAS, YAMPI_TOKEN: !YAMPI_TOKEN, YAMPI_SECRET_KEY: !YAMPI_SECRET_KEY }
                }));
                return;
              }

              try {
                const response = await fetch(`${YAMPI_API_BASE}/catalog/products`, {
                  headers: {
                    'User-Token': YAMPI_TOKEN,
                    'User-Secret': YAMPI_SECRET_KEY,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify({ error: 'Erro na API Yampi', details: data }));
                  return;
                }

                const products = (data.data || []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  price: parseFloat(p.price || 0),
                  sale_price: parseFloat(p.price_sale || 0),
                  image_url: p.images?.data?.[0]?.url || '',
                  product_url: p.url,
                  checkout_url: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`
                }));

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(products));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Falha na conexão com Yampi' }));
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