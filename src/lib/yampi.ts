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
  debug?: {
    pricePath: string;
    imagePath: string;
  };
  raw?: any;
}

export interface YampiHealth {
  status: string;
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

  async listRawProducts(): Promise<any[]> {
    const response = await fetch(`/api/yampi/products`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao carregar produtos brutos');
    }
    return response.json();
  },

  async getDebugProduct(): Promise<any> {
    const response = await fetch(`/api/yampi/debug`);
    return response.json();
  }
};