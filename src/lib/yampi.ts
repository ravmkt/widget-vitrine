export interface YampiProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  image: string;
  productUrl?: string;
  checkoutUrl?: string;
  active: boolean;
  raw?: any;
}

export interface YampiHealth {
  status: string;
  integrated: boolean;
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
    if (!response.ok) throw new Error('Proxy offline');
    return response.json();
  },

  async listProducts(): Promise<YampiProduct[]> {
    const response = await fetch(`/api/yampi/products`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao carregar produtos');
    return data as YampiProduct[];
  }
};