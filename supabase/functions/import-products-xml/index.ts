import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "object" && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"]).trim();
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function parsePrice(value: unknown): number | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const price = Number(normalized);

  return Number.isFinite(price) ? price : null;
}

function getGoogleField(
  item: Record<string, unknown>,
  field: string,
): unknown {
  return (
    item[`g:${field}`] ??
    item[`${field}`] ??
    item[`g_${field}`]
  );
}

function normalizeItem(item: Record<string, unknown>) {
  const externalId =
    cleanText(getGoogleField(item, "id")) ??
    cleanText(item.id) ??
    cleanText(getGoogleField(item, "link"));

  const name =
    cleanText(getGoogleField(item, "title")) ??
    cleanText(item.title) ??
    "Produto sem nome";

  const productUrl =
    cleanText(item.link) ??
    cleanText(getGoogleField(item, "link"));

  const imageUrl =
    cleanText(getGoogleField(item, "image_link")) ??
    cleanText(item.image_url);

  const price =
    parsePrice(getGoogleField(item, "price")) ??
    parsePrice(item.price);

  const description =
    cleanText(getGoogleField(item, "description")) ??
    cleanText(item.description);

  const availability =
    cleanText(getGoogleField(item, "availability")) ??
    cleanText(item.availability);

  const active =
    availability === null ||
    !["out of stock", "discontinued"].includes(
      availability.toLowerCase(),
    );

  return {
    external_product_id: externalId,
    name,
    product_url: productUrl,
    image_url: imageUrl,
    price,
    short_description: description,
    active,
    is_active: active,
    import_source: "google_xml",
    last_imported_at: new Date().toISOString(),
  };
}

function extractItems(parsedXml: Record<string, unknown>) {
  const rssItems =
    (parsedXml.rss as Record<string, unknown> | undefined)?.channel;

  if (rssItems) {
    const channel = rssItems as Record<string, unknown>;

    return asArray(
      channel.item as Record<string, unknown> | Record<string, unknown>[],
    );
  }

  const atomFeed = parsedXml.feed as Record<string, unknown> | undefined;

  if (atomFeed) {
    return asArray(
      atomFeed.entry as Record<string, unknown> | Record<string, unknown>[],
    );
  }

  return [];
}

async function readXmlFromRequest(req: Request): Promise<string> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("O arquivo XML não foi enviado.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("O arquivo XML não pode ultrapassar 20 MB.");
    }

    return await file.text();
  }

  const body = await req.json();

  const xmlUrl = body.xml_url;

  if (!xmlUrl || typeof xmlUrl !== "string") {
    throw new Error("Informe xml_url ou envie um arquivo XML.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(xmlUrl);
  } catch {
    throw new Error("A URL do XML é inválida.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("A URL deve utilizar HTTP ou HTTPS.");
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      Accept: "application/xml,text/xml,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível baixar o XML. Status: ${response.status}`,
    );
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) > 20 * 1024 * 1024) {
    throw new Error("O XML não pode ultrapassar 20 MB.");
  }

  const xml = await response.text();

  if (xml.length > 20 * 1024 * 1024) {
    throw new Error("O XML não pode ultrapassar 20 MB.");
  }

  return xml;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Método não permitido.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Usuário não autenticado.");
    }

    const supabaseUser = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error("Sessão de usuário inválida.");
    }

    const contentType = req.headers.get("content-type") ?? "";
let storeId: string | null = null;
let xml: string;

if (contentType.includes("multipart/form-data")) {
  const formData = await req.formData();
  storeId = String(formData.get("store_id") ?? "");

  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("O arquivo XML não foi enviado.");
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("O arquivo XML não pode ultrapassar 20 MB.");
  }

  xml = await file.text();
} else {
  const body = await req.json();

  if (!body.store_id) {
    throw new Error("store_id é obrigatório.");
  }

  storeId = String(body.store_id);

  const requestWithBody = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(body),
  });

  xml = await readXmlFromRequest(requestWithBody);
}


    if (!storeId) {
      throw new Error("store_id é obrigatório.");
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, owner_user_id")
      .eq("id", storeId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (storeError) {
      throw storeError;
    }

    if (!store) {
      throw new Error("A loja não pertence ao usuário autenticado.");
    }

    const parsedXml = parser.parse(xml);
    const items = extractItems(parsedXml);

    if (items.length === 0) {
      throw new Error("Nenhum produto foi encontrado no XML.");
    }

    const products = items
      .map(normalizeItem)
      .filter((product) => product.name);

    const productsToSave = products.map((product) => ({
      store_id: storeId,
      ...product,
    }));

    const { data, error: upsertError } = await supabaseAdmin
      .from("products")
      .upsert(productsToSave, {
        onConflict: "store_id,external_product_id",
        ignoreDuplicates: false,
      })
      .select("id, name, product_url, price");

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: data?.length ?? 0,
        products: data ?? [],
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Erro interno ao importar produtos.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
