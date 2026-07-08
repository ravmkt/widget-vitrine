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
              
              try {
                const response = await fetch(targetUrl, {
                  headers: {
                    'User-Token': YAMPI_TOKEN || '',
                    'User-Secret-Key': YAMPI_SECRET_KEY || '',
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify({ success: false, message: 'Erro na API Yampi', details: data }));
                  return;
                }

                const rawProducts = data.data || [];
                
                const products = rawProducts.map((p: any) => {
                  // --- LÓGICA DE DESCOBERTA DE PREÇO ---
                  let foundPrice = 0;
                  let foundSalePrice = undefined;
                  let pricePath = 'none';

                  // Prioridade 1: Preços na raiz
                  if (p.price && parseFloat(p.price) > 0) {
                    foundPrice = parseFloat(p.price);
                    foundSalePrice = p.price_sale ? parseFloat(p.price_sale) : undefined;
                    pricePath = 'root (price/price_sale)';
                  } 
                  // Prioridade 2: Preços no primeiro SKU
                  else if (p.skus?.data?.[0]) {
                    const sku = p.skus.data[0];
                    foundPrice = parseFloat(sku.price || 0);
                    foundSalePrice = sku.price_sale ? parseFloat(sku.price_sale) : undefined;
                    pricePath = 'skus.data[0] (price/price_sale)';
                  }

                  // --- LÓGICA DE DESCOBERTA DE IMAGEM ---
                  let foundImage = '';
                  let imagePath = 'none';

                  // Prioridade 1: Array de imagens
                  if (p.images?.data?.[0]?.url) {
                    foundImage = p.images.data[0].url;
                    imagePath = 'images.data[0].url';
                  }
                  // Prioridade 2: Campo image_url (comum em algumas versões da API)
                  else if (p.image_url && p.image_url.startsWith('http')) {
                    foundImage = p.image_url;
                    imagePath = 'root.image_url';
                  }
                  // Prioridade 3: Imagem do primeiro SKU
                  else if (p.skus?.data?.[0]?.image_url) {
                    foundImage = p.skus.data[0].image_url;
                    imagePath = 'skus.data[0].image_url';
                  }

                  // Log de diagnóstico para o console (Backend)
                  console.log(`[Normalizer] ID: ${p.id} | Name: ${p.name}`);
                  console.log(`  > Price: ${foundPrice} (Path: ${pricePath})`);
                  console.log(`  > Image: ${foundImage ? foundImage.substring(0, 40) + '...' : 'EMPTY'} (Path: ${imagePath})`);

                  return {
                    id: String(p.id),
                    name: p.name,
                    sku: p.sku || p.skus?.data?.[0]?.sku || `ID-${p.id}`,
                    price: foundPrice,
                    salePrice: foundSalePrice && foundSalePrice < foundPrice ? foundSalePrice : undefined,
                    image: foundImage,
                    productUrl: p.url,
                    checkoutUrl: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`,
                    active: !!p.active,
                    debug: { pricePath, imagePath }
                  };
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(products));
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
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});