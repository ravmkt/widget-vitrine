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

    if (!storeId || !videoData || !videoData.media_url) {
      throw new Error("Parâmetros inválidos. Faltando storeId ou media_url.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Faz o download do vídeo limpo da Meta
    const fbResponse = await fetch(videoData.media_url);
    if (!fbResponse.ok) {
      throw new Error(`Falha ao baixar da Meta: ${fbResponse.statusText}`);
    }
    const arrayBuffer = await fbResponse.arrayBuffer();

    // 2. Faz o upload permanente para a sua conta no Supabase Storage
    const safeStoragePath = `${storeId}/${Date.now()}_ig_${videoData.id}.mp4`;
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

    // 3. Salva no banco de dados como 'upload' nativo (Desvincula do Instagram)
    const title = videoData.caption ? videoData.caption.slice(0, 60) : `INSTAGRAM_REELS_${videoData.id.slice(-6)}`;
    const payload = {
      store_id: storeId,
      title: title,
      video_source_type: "upload",
      source_type: "upload",
      video_url: publicUrlData.publicUrl,
      thumbnail_url: videoData.thumbnail_url || publicUrlData.publicUrl,
      thumbnail_source_type: "auto",
      file_size: arrayBuffer.byteLength,
      thumbnail_file_size: 120000, // 🚀 ~120KB estimativa segura para miniaturas externas
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
    console.error("Erro na import-instagram-video:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
