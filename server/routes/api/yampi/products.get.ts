import { defineHandler } from "nitro";
import { useRuntimeConfig } from "nitro";

export default defineHandler(async (event) => {
  const config = useRuntimeConfig();
  const alias = config.NITRO_YAMPI_ALIAS;
  const token = config.NITRO_YAMPI_API_TOKEN;
  const secret = config.NITRO_YAMPI_SECRET_KEY;

  if (!alias || !token || !secret) {
    return {
      error: "Configurações da Yampi não encontradas no servidor.",
    };
  }

  try {
    const response = await fetch(`https://api.dooki.com.br/v2/products`, {
      headers: {
        "User-Token": token,
        "User-Secret": secret,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: "Erro na API da Yampi",
        details: errorData,
      };
    }

    const json = await response.json();
    const rawProducts = json.data || [];

    // Normalização conforme solicitado
    const products = rawProducts.map((p: any) => {
      const mainImageObj = p.images?.data?.find((img: any) => img.active) || p.images?.data?.[0];
      const imageUrl = mainImageObj?.url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";

      return {
        id: String(p.id),
        yampi_product_id: String(p.id),
        yampi_sku_id: String(p.sku || p.id),
        name: String(p.name || ""),
        description: String(p.description_short || p.description || ""),
        price: parseFloat(p.price) || 0,
        sale_price: parseFloat(p.price_sale) || 0,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        product_url: p.url || `https://${alias}.yampi.store/produto/${p.slug || p.id}`,
        checkout_url: p.url_checkout || "",
      };
    });

    return { data: products };
  } catch (error: any) {
    return {
      error: "Falha na conexão com a Yampi",
      message: error.message,
    };
  }
});
