export interface YampiProduct {
  id: number;
  name: string;
  sku: string;
  active: boolean;
  price: number;
  sale_price: number;
  image_url: string;
  product_url: string;
  checkout_url: string;
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

export interface YampiErrorResponse {
  success: boolean;
  status: number;
  message: string;
  details?: any;
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
    const data = await response.json();

    if (!response.ok) {
      const errorData = data as YampiErrorResponse;
      throw new Error(`[${errorData.status}] ${errorData.message}`);
    }
    
    return data as YampiProduct[];
  }
};