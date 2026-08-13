import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storeId, videoData } = await req.json();

    const rawVideoUrl = videoData.video_url || videoData.download_url || videoData.media_url || videoData.embed_link || videoData.share_url;

    if (!storeId || !videoData) {
      throw new Error("Parâmetros inválidos. Faltando storeId ou dados do vídeo do TikTok.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let finalVideoUrl = rawVideoUrl;
    let fileSize = 0;

    if (rawVideoUrl && (rawVideoUrl.startsWith('http://') || rawVideoUrl.startsWith('https://'))) {
      try {
        const tkResponse = await fetch(rawVideoUrl);
        if (tkResponse.ok) {
          const arrayBuffer = await tkResponse.arrayBuffer();
          fileSize = arrayBuffer.byteLength;

          const safeStoragePath = `${storeId}/${Date.now()}_tk_${videoData.id || Math.random().toString(36).substring(7)}.mp4`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("videos")
            .upload(safeStoragePath, arrayBuffer, {
              contentType: "video/mp4",
              cacheControl: "3600",
              upsert: true,
            });

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from("videos")
              .getPublicUrl(uploadData.path);
            finalVideoUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Aviso: Não foi possível baixar o binário direto do TikTok, usando URL de referência:", err);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Download do TikTok escapando do CORS do navegador
    const tkResponse = await fetch(rawVideoUrl);
    if (!tkResponse.ok) {
      throw new Error(`Falha ao baixar do TikTok: ${tkResponse.statusText}`);
    }
    const arrayBuffer = await tkResponse.arrayBuffer();

    // 2. Upload seguro para o Storage
    const safeStoragePath = `${storeId}/${Date.now()}_tk_${videoData.id || Math.random().toString(36).substring(7)}.mp4`;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("videos")
      .upload(safeStoragePath, arrayBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabase.storage
      .from("videos")
      .getPublicUrl(uploadData.path);

    // 3. Salva no banco de dados como 'upload' nativo
    const title = String(videoData.title || videoData.description || `TIKTOK_VIDEO_${String(videoData.id || '').slice(-6)}`);
    const payload = {
      store_id: storeId,
      title: title.slice(0, 60),
      video_source_type: "upload",
      source_type: "upload",
      video_url: publicUrlData.publicUrl,
      thumbnail_url: videoData.cover_image_url || videoData.thumbnail_url || publicUrlData.publicUrl,
      thumbnail_source_type: "auto",
      file_size: arrayBuffer.byteLength,
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