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
              const targetUrl = `${YAMPI_API_BASE}/catalog/products`;
              console.log(`[Yampi API] Chamando URL: ${targetUrl}`);

              if (!YAMPI_ALIAS || !YAMPI_TOKEN || !YAMPI_SECRET_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  status: 500,
                  message: 'Variáveis de ambiente ausentes no .env',
                  details: { YAMPI_ALIAS: !YAMPI_ALIAS, YAMPI_TOKEN: !YAMPI_TOKEN, YAMPI_SECRET_KEY: !YAMPI_SECRET_KEY }
                }));
                return;
              }

              try {
                // Header ajustado para User-Secret-Key conforme solicitação
                const response = await fetch(targetUrl, {
                  headers: {
                    'User-Token': YAMPI_TOKEN,
                    'User-Secret-Key': YAMPI_SECRET_KEY,
                    'Accept': 'application/json'
                  }
                });

                console.log(`[Yampi API] Status retornado: ${response.status}`);
                const data = await response.json();
                
                if (!response.ok) {
                  let customMessage = 'Erro na API Yampi';
                  if (response.status === 401) customMessage = 'Token ou Secret Key inválidos na Yampi';
                  if (response.status === 403) customMessage = 'Acesso negado: verifique as permissões da API';
                  if (response.status === 404) customMessage = 'Endpoint ou Loja (Alias) não encontrados';
                  
                  console.error(`[Yampi API] Detalhes do erro:`, JSON.stringify(data));
                  
                  res.statusCode = response.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ 
                    success: false,
                    status: response.status,
                    message: customMessage, 
                    details: data 
                  }));
                  return;
                }

                // Normalização dos produtos
                const rawProducts = data.data || [];
                const products = rawProducts.map((p: any) => ({
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
                console.error(`[Yampi API] Erro de rede/conexão:`, error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  success: false,
                  status: 500,
                  message: 'Falha crítica na conexão com o gateway da Yampi',
                  details: error instanceof Error ? error.message : String(error)
                }));
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