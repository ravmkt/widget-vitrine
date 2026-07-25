export const PLATFORM_OPTIONS = [
  { value: "yampi", label: "Yampi", url: "https://yampi.com.br" },
  { value: "shopify", label: "Shopify", url: "https://shopify.com" },
  { value: "woocommerce", label: "WooCommerce", url: "https://woocommerce.com" },
  { value: "nuvemshop", label: "Nuvemshop", url: "https://nuvemshop.com.br" },
  { value: "toggo", label: "Toggo", url: "https://toggo.io" },
  { value: "magento", label: "Magento", url: "https://magento.com" },
  { value: "vtex", label: "VTEX", url: "https://vtex.com" },
  { value: "tray", label: "Tray", url: "https://tray.com.br" },
  { value: "lojaintegrada", label: "Loja Integrada", url: "https://lojaintegrada.com.br" },
  { value: "bagy", label: "Bagy", url: "https://bagy.com.br" },
  { value: "irroba", label: "Irroba", url: "https://irroba.com.br" },
  { value: "megazord", label: "Megazord", url: "https://megazord.com.br" },
  { value: "cartpanda", label: "Cartpanda", url: "https://cartpanda.com.br" },
];

export function getPlatformLabel(value: string): string {
  const platform = PLATFORM_OPTIONS.find((p) => p.value === value);
  return platform?.label ?? value;
}

export function getPlatformUrl(value: string): string {
  const platform = PLATFORM_OPTIONS.find((p) => p.value === value);
  return platform?.url ?? "#";
}
