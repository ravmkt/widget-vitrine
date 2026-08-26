export const PLATFORM_OPTIONS: { value: string; label: string; url: string }[] = [
  { value: 'bagy', label: 'Bagy', url: 'https://bagy.com.br' },
  { value: 'cartpanda', label: 'Cartpanda', url: 'https://cartpanda.com' },
  { value: 'irroba', label: 'Irroba', url: 'https://www.irroba.com.br' },
  { value: 'loja-integrada', label: 'Loja Integrada', url: 'https://lojaintegrada.com.br' },
  { value: 'nuvemshop', label: 'Nuvemshop', url: 'https://www.nuvemshop.com.br' },
  { value: 'shopify', label: 'Shopify', url: 'https://shopify.com' },
  { value: 'tray', label: 'Tray', url: 'https://www.tray.com.br' },
  { value: 'vtex', label: 'VTEX', url: 'https://vtex.com' },
  { value: 'wbuy', label: 'Wbuy', url: 'https://www.wbuy.com.br' },
  { value: 'woocommerce', label: 'WooCommerce', url: 'https://woocommerce.com' },
  { value: 'yampi', label: 'Yampi', url: 'https://www.yampi.com.br' },
  { value: 'outras', label: 'Outras', url: '' }
];

/**
 * Retorna o nome amigável da plataforma com base no slug/value.
 */
export function getPlatformLabel(p?: string): string {
  if (!p) return 'Não definida';
  const option = PLATFORM_OPTIONS.find(opt => opt.value === p);
  return option ? option.label : p;
}

/**
 * Retorna a URL padrão/institucional da plataforma selecionada.
 */
export function getPlatformUrl(p?: string): string {
  if (!p) return '';
  const option = PLATFORM_OPTIONS.find(opt => opt.value === p);
  return option ? option.url : '';
}
