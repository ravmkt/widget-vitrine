import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoUrl, storeId } = await req.json();

    if (!videoUrl || !storeId) {
      return new Response(
        JSON.stringify({ error: "videoUrl and storeId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Tenta extrair a thumbnail (oEmbed → og:image)
    const thumbnailUrl = await extractThumbnailUrl(videoUrl);

    if (!thumbnailUrl) {
      return new Response(
        JSON.stringify({ error: "Could not extract thumbnail from URL" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Baixa a imagem
    const imageResponse = await fetch(thumbnailUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ThumbnailBot/1.0)" },
    });

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download thumbnail image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // 3. Upload pro bucket store-assets
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const timestamp = Date.now();
    const fileId = crypto.randomUUID();
    const filePath = `${storeId}/thumbnails/${timestamp}-${fileId}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from("store-assets")
      .upload(filePath, new Uint8Array(imageBuffer), {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Retorna URL pública (nunca expira)
    const { data } = supabaseClient.storage
      .from("store-assets")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        thumbnailUrl: data.publicUrl,
        filePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Helpers ---

async function extractThumbnailUrl(videoUrl: string): Promise<string | null> {
  const isInstagram = /instagram\.com\/(reel|p)\//i.test(videoUrl);
  const isTikTok = /tiktok\.com\/@/i.test(videoUrl);

  // ── TikTok: oEmbed funciona bem server-side ──
  if (isTikTok) {
    const url = await tryOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`);
    if (url) return url;
  }

  // ── Instagram: tenta oEmbed, fallback pra og:image ──
  if (isInstagram) {
    const url = await tryOEmbed(`https://api.instagram.com/oembed?url=${encodeURIComponent(videoUrl)}`);
    if (url) return url;
  }

  // ── Fallback universal: extrai og:image da página ──
  return tryOgImage(videoUrl);
}

async function tryOEmbed(oembedUrl: string): Promise<string | null> {
  try {
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ThumbnailBot/1.0)" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.thumbnail_url || null;
  } catch {
    return null;
  }
}

async function tryOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Procura og:image nos dois formatos possíveis
    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
