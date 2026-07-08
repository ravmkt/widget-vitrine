import { YampiProduct } from "./yampi";

/**
 * Normalizador centralizado para produtos Yampi (Dooki)
 * Busca preços e imagens em múltiplos níveis do JSON
 */
export function normalizeYampiProduct(p: any, alias: string): YampiProduct {
  let foundPrice = 0;
  let foundSalePrice: number | undefined = undefined;
  let pricePath = 'not_found';

  // 1. Tenta Preço na Raiz
  const rootPrice = parseFloat(p.price || 0);
  if (rootPrice > 0) {
    foundPrice = rootPrice;
    foundSalePrice = p.price_sale ? parseFloat(p.price_sale) : undefined;
    pricePath = 'root.price';
  } 
  // 2. Tenta no Primeiro SKU (Comum em produtos com variações)
  else if (p.skus?.data?.[0]) {
    const sku = p.skus.data[0];
    foundPrice = parseFloat(sku.price || 0);
    foundSalePrice = sku.price_sale ? parseFloat(sku.price_sale) : undefined;
    pricePath = 'skus.data[0].price';
  }

  let foundImage = '';
  let imagePath = 'not_found';

  // 1. Tenta Array de Imagens (Relacionamento include=images)
  if (p.images?.data?.[0]?.url) {
    foundImage = p.images.data[0].url;
    imagePath = 'images.data[0].url';
  }
  // 2. Tenta image_url na Raiz
  else if (p.image_url && p.image_url.startsWith('http')) {
    foundImage = p.image_url;
    imagePath = 'root.image_url';
  }
  // 3. Tenta no Primeiro SKU
  else if (p.skus?.data?.[0]?.image_url) {
    foundImage = p.skus.data[0].image_url;
    imagePath = 'skus.data[0].image_url';
  }

  // Log de diagnóstico para depuração no console do navegador
  console.log(`[Yampi Sync] ${p.name}`, {
    id: p.id,
    price: foundPrice,
    pricePath,
    image: foundImage ? 'OK' : 'MISSING',
    imagePath,
    rawSkus: p.skus?.data?.length || 0,
    rawImages: p.images?.data?.length || 0
  });

  return {
    id: String(p.id),
    name: p.name,
    sku: p.sku || p.skus?.data?.[0]?.sku || `ID-${p.id}`,
    price: foundPrice,
    salePrice: foundSalePrice && foundSalePrice < foundPrice ? foundSalePrice : undefined,
    image: foundImage,
    productUrl: p.url,
    checkoutUrl: `https://${alias}.yampi.store/checkout/cart/add/${p.id}`,
    active: !!p.active,
    debug: { pricePath, imagePath },
    raw: p // Armazena o bruto para o "Ver JSON"
  };
}