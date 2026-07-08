import { YampiProduct } from "./yampi";

/**
 * Normalizador atualizado com base na inspeção real do JSON Yampi
 */
export function normalizeYampiProduct(item: any): YampiProduct {
  const firstSku = item.skus?.data?.[0];
  
  // Mapeamento de Imagem (Cascata de tamanhos)
  const imageData = item.images?.data?.[0];
  const foundImage = 
    imageData?.large?.url || 
    imageData?.medium?.url || 
    imageData?.thumb?.url || 
    imageData?.small?.url || 
    null;

  // Caminhos para debug visual
  const pricePath = firstSku?.price_sale ? 'skus.data[0].price_sale' : 'not_found';
  const imagePath = imageData?.large?.url ? 'images.data[0].large.url' : (imageData?.medium?.url ? 'images.data[0].medium.url' : 'not_found');

  return {
    id: String(item.id),
    name: item.name,
    slug: item.slug,
    sku: item.sku || firstSku?.sku,
    active: !!item.active,
    price: Number(firstSku?.price_sale ?? 0),
    priceCost: firstSku?.price_cost ? Number(firstSku?.price_cost) : null,
    image: foundImage,
    url: item.url,
    checkoutUrl: firstSku?.purchase_url || null,
    stock: firstSku?.total_in_stock ?? 0,
    stockStatus: firstSku?.stock_status ?? null,
    debug: { pricePath, imagePath },
    raw: item
  };
}