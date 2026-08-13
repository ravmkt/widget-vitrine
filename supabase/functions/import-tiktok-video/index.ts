import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { storeId, videoData } = await req.json();

    if (!storeId || !videoData) {
      throw new Error("Parâmetros inválidos. Faltando storeId ou dados do vídeo do TikTok.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const mediaTitle = String(videoData.title || videoData.description || `TIKTOK_POST_${String(videoData.id || '').slice(-6)}`);
    const referenceUrl = videoData.share_url || videoData.embed_link || `https://www.tiktok.com`;
    const thumbnailPic = videoData.cover_image_url || videoData.thumbnail_url || '';

    const payload = {
      store_id: storeId,
      title: mediaTitle.slice(0, 60),
      video_source_type: "url",
      source_type: "url",
      video_url: referenceUrl,
      thumbnail_url: thumbnailPic,
      thumbnail_source_type: "auto",
      file_size: 0,
      status: "active",
      active: true,
      created_at: new Date().toISOString(),
    };

    const { data: dbData, error: dbErr } = await supabase
      .from("videos")
      .insert([payload])
      .select("id")
      .single();

    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ success: true, videoId: dbData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na import-tiktok-video:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
