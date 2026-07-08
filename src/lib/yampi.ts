const PROXY_URL = ""; // Vite handles proxying from same origin

export interface YampiProduct {
  id: number;
  yampi_product_id: number;
  yampi_sku_id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number;
  image_url: string;
  thumbnail_url: string;
  product_url: string;
  checkout_url: string;
}

export interface YampiHealth {
  status: string;
  port: number;
  timestamp: string;
  env: {
    YAMPI_ALIAS: boolean;
    YAMPI_TOKEN: boolean;
    YAMPI_SECRET_KEY: boolean;
  };
}

export const yampiClient = {
  async checkHealth(): Promise<YampiHealth> {
    const response = await fetch(`/api/yampi/health`);
    if (!response.ok) {
      throw new Error('Servidor de proxy não está respondendo.');
    }
    return response.json();
  },

  async listProducts(): Promise<YampiProduct[]> {
    const response = await fetch(`/api/yampi/products`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.missing) {
        const missingKeys = Object.entries(errorData.missing)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join(', ');
        throw new Error(`Variáveis ausentes no .env: ${missingKeys}`);
      }
      throw new Error(errorData.error || 'Falha ao listar produtos da Yampi via proxy');
    }
    return response.json();
  },

  async getProduct(id: string | number): Promise<YampiProduct> {
    const response = await fetch(`/api/yampi/products/${id}`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar produto ${id} na Yampi via proxy`);
    }
    return response.json();
  }
};
