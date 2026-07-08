import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3333;

app.use(cors());
app.use(express.json());

const { YAMPI_ALIAS, YAMPI_TOKEN, YAMPI_SECRET_KEY } = process.env;

if (!YAMPI_ALIAS || !YAMPI_TOKEN || !YAMPI_SECRET_KEY) {
  console.error('ERRO: Variáveis de ambiente da Yampi não configuradas corretamente.');
}

// URL Base utilizando o Alias da loja conforme solicitado
const YAMPI_API_BASE = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}`;

app.get('/api/yampi/products', async (req, res) => {
  try {
    // Endpoint de catálogo correto: /catalog/products
    const response = await fetch(`${YAMPI_API_BASE}/catalog/products`, {
      headers: {
        'User-Token': YAMPI_TOKEN || '',
        'User-Secret': YAMPI_SECRET_KEY || '',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'Erro na API da Yampi',
        details: errorData
      });
    }

    const data = await response.json();
    const products = data.data || [];
    
    const normalized = products.map((p: any) => ({
      id: p.id,
      yampi_product_id: p.id,
      yampi_sku_id: p.sku,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price || 0),
      sale_price: parseFloat(p.price_sale || 0),
      image_url: p.images?.data?.[0]?.url || '',
      thumbnail_url: p.images?.data?.[0]?.url_thumbnail || '',
      product_url: p.url,
      checkout_url: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Erro interno no servidor proxy' });
  }
});

app.get('/api/yampi/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Endpoint de produto individual correto: /catalog/products/:id
    const response = await fetch(`${YAMPI_API_BASE}/catalog/products/${id}`, {
      headers: {
        'User-Token': YAMPI_TOKEN || '',
        'User-Secret': YAMPI_SECRET_KEY || '',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Produto não encontrado na Yampi' });
    }

    const json = await response.json();
    const p = json.data;

    const normalized = {
      id: p.id,
      yampi_product_id: p.id,
      yampi_sku_id: p.sku,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price || 0),
      sale_price: parseFloat(p.price_sale || 0),
      image_url: p.images?.data?.[0]?.url || '',
      thumbnail_url: p.images?.data?.[0]?.url_thumbnail || '',
      product_url: p.url,
      checkout_url: `https://${YAMPI_ALIAS}.yampi.store/checkout/cart/add/${p.id}`
    };

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor proxy' });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy Yampi rodando em http://localhost:${port}`);
  console.log(`URL Base Yampi: ${YAMPI_API_BASE}`);
});
