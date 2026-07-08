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

export const yampiClient = {
  async listProducts(): Promise<YampiProduct[]> {
    const response = await fetch(`${PROXY_URL}/api/yampi/products`);
    if (!response.ok) {
      throw new Error('Falha ao listar produtos da Yampi via proxy');
    }
    return response.json();
  },

  async getProduct(id: string | number): Promise<YampiProduct> {
    const response = await fetch(`${PROXY_URL}/api/yampi/products/${id}`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar produto ${id} na Yampi via proxy`);
    }
    return response.json();
  }
};
