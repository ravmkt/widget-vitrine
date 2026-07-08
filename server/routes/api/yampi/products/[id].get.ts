import { defineHandler } from "nitro";
import { getRouterParam, useRuntimeConfig } from "nitro/h3";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const config = useRuntimeConfig();
  const alias = config.NITRO_YAMPI_ALIAS;
  const token = config.NITRO_YAMPI_API_TOKEN;
  const secret = config.NITRO_YAMPI_SECRET_KEY;

  if (!id) {
    return { error: "ID do produto é obrigatório." };
  }

  if (!alias || !token || !secret) {
    return { error: "Configurações da Yampi não encontradas no servidor." };
  }

  try {
    const response = await fetch(`https://api.dooki.com.br/v2/products/${id}`, {
      headers: {
        "User-Token": token,
        "User-Secret": secret,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return { error: "Produto não encontrado ou erro na API da Yampi" };
    }

    const json = await response.json();
    const p = json.data;

    if (!p) {
      return { error: "Dados do produto não encontrados." };
    }

    const mainImageObj = p.images?.data?.find((img: any) => img.active) || p.images?.data?.[0];
    const imageUrl = mainImageObj?.url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";

    const normalizedProduct = {
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

    return { data: normalizedProduct };
  } catch (error: any) {
    return { error: "Falha na conexão com a Yampi", message: error.message };
  }
});
