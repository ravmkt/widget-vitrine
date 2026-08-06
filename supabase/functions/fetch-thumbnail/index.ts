import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STORAGE_BUCKET = "store-assets";

serve(async (req: Request) => {
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

    const url = new URL(videoUrl);

    // ── Instância do Supabase com service_role ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let imageUrl: string | null = null;

    // ──────────────────────────────────────────
    // Instagram: usa oEmbed
    // ──────────────────────────────────────────
    if (url.hostname.includes("instagram.com")) {
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const json = await res.json();
        imageUrl = json.thumbnail_url || null;
      }
    }

    // ──────────────────────────────────────────
    // TikTok: usa oEmbed
    // ──────────────────────────────────────────
    if (!imageUrl && url.hostname.includes("tiktok.com")) {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const json = await res.json();
        imageUrl = json.thumbnail_url || null;
      }
    }

    // ──────────────────────────────────────────
    // YouTube Shorts / YouTube: og:image
    // ──────────────────────────────────────────
    if (!imageUrl && (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be"))) {
      const pageRes = await fetch(videoUrl);
      const html = await pageRes.text();

      // Tenta og:image ou thumbnail_url do schema
      const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      if (ogMatch) {
        imageUrl = ogMatch[1].replace(/&amp;/g, "&");
      }

      // Fallback: thumbnail do YouTube via ID
      if (!imageUrl) {
        let videoId = "";
        if (url.hostname.includes("youtu.be")) {
          videoId = url.pathname.slice(1);
        } else {
          const searchParams = new URLSearchParams(url.search);
          videoId = searchParams.get("v") || "";
          if (!videoId) {
            // YouTube Shorts
            const match = url.pathname.match(/\/shorts\/([^/?]+)/);
            videoId = match?.[1] || "";
          }
        }
        if (videoId) {
          imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
    }

    // ──────────────────────────────────────────
    // Fallback genérico: og:image da página
    // ──────────────────────────────────────────
    if (!imageUrl) {
      try {
        const pageRes = await fetch(videoUrl);
        const html = await pageRes.text();
        const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogMatch) {
          imageUrl = ogMatch[1].replace(/&amp;/g, "&");
        }
      } catch {
        // sem fallback disponível
      }
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ thumbnailUrl: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────
    // Download da imagem e upload pro Storage
    // ──────────────────────────────────────────
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return new Response(
        JSON.stringify({ thumbnailUrl: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blob = await imageRes.blob();
    const contentType = blob.type || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const filePath = `${storeId}/thumbnails/ef-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ thumbnailUrl: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ thumbnailUrl: publicUrlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ thumbnailUrl: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
