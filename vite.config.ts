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

            // Rota de Health
            if (req.url === '/api/yampi/health') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'ok',
                env: { YAMPI_ALIAS: !!YAMPI_ALIAS, YAMPI_TOKEN: !!YAMPI_TOKEN, YAMPI_SECRET_KEY: !!YAMPI_SECRET_KEY }
              }));
              return;
            }

            // Rota de Debug (Retorna o primeiro produto bruto com includes)
            if (req.url === '/api/yampi/debug') {
              try {
                const url = `${YAMPI_API_BASE}/catalog/products?include=skus,images&limit=1`;
                const response = await fetch(url, {
                  headers: { 'User-Token': YAMPI_TOKEN || '', 'User-Secret-Key': YAMPI_SECRET_KEY || '', 'Accept': 'application/json' }
                });
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data.data?.[0] || { message: 'Nenhum produto encontrado' }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Erro no fetch de debug' }));
              }
              return;
            }

            // Rota de Produtos (Agora retorna RAW para o frontend normalizar)
            if (req.url === '/api/yampi/products') {
              try {
                // ADICIONADO: include=skus,images para garantir que os dados venham no JSON
                const url = `${YAMPI_API_BASE}/catalog/products?include=skus,images&limit=50`;
                
                const response = await fetch(url, {
                  headers: {
                    'User-Token': YAMPI_TOKEN || '',
                    'User-Secret-Key': YAMPI_SECRET_KEY || '',
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify(data));
                  return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data.data || []));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, message: 'Falha no Proxy' }));
              }
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  };
});