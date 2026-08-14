import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {z
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
      throw new Error("Parâmetros inválidos. Faltando storeId ou dados do vídeo.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 🔒 VALIDAÇÃO PRÉVIA DE COTA DE ARMAZENAMENTO (Proteção do Plano)
    const { data: storeData, error: storeErr } = await supabase
      .from("stores")
      .select("storage_used_bytes, storage_limit_bytes")
      .eq("id", storeId)
      .single();

    if (storeErr || !storeData) {
      return new Response(JSON.stringify({ error: "Não foi possível verificar o plano de armazenamento da loja." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (storeData.storage_used_bytes >= storeData.storage_limit_bytes) {
      return new Response(JSON.stringify({ 
        error: "Limite de armazenamento do plano atingido. Faça upgrade do seu plano para continuar importando vídeos." 
      }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const currentUsedBytes = Number(storeData.storage_used_bytes || 0);
    const maxLimitBytes = Number(storeData.storage_limit_bytes || 1073741824);

    const rawUrl = videoData.video_url || videoData.download_url || videoData.media_url || videoData.share_url;
    const mediaTitle = String(videoData.title || videoData.description || `TIKTOK_${Date.now()}`);
    const thumbnailPic = videoData.cover_image_url || '';

    let directMp4Url = "";

    // 1. Tenta resolver o link limpo (sem marca d'água) via resolvedor de CDN
    if (rawUrl && rawUrl.includes("tiktok.com")) {
      try {
        console.log("[Vidlytics] Resolvendo link limpo para:", rawUrl);
        const resolveResp = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`, {
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.tiktok.com/"
          }
        });
        
        if (resolveResp.ok) {
          const jsonRes = await resolveResp.json();
          if (jsonRes && jsonRes.data && (jsonRes.data.play || jsonRes.data.hdplay)) {
            directMp4Url = jsonRes.data.hdplay || jsonRes.data.play;
            if (directMp4Url && directMp4Url.startsWith("/")) {
              directMp4Url = `https://tikwm.com${directMp4Url}`;
            }
            console.log("[Vidlytics] ✅ Link .mp4 puro resolvido com sucesso!");
          }
        }
      } catch (e) {
        console.warn("[Vidlytics] ⚠️ Falha ao consultar resolvedor externo, tentando URL original:", e);
      }
    }

    const sourceVideoUrl = directMp4Url || rawUrl;
    let finalVideoUrl = sourceVideoUrl;
    let fileSize = 0;

    // 2. Faz o download do binário usando ArrayBuffer e headers anti-hotlink, salvando no Supabase Storage
    if (sourceVideoUrl && (sourceVideoUrl.startsWith("http://") || sourceVideoUrl.startsWith("https://"))) {
      try {
        console.log("[Vidlytics] Baixando binário do vídeo com headers seguros:", sourceVideoUrl);
        const mediaResp = await fetch(sourceVideoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.tiktok.com/"
          }
        });
        
        if (mediaResp.ok) {
          const videoBuffer = await mediaResp.arrayBuffer();
          fileSize = videoBuffer.byteLength;

          // 🔒 VALIDAÇÃO PÓS-DOWNLOAD: O arquivo novo estouraria o teto?
          if ((currentUsedBytes + fileSize) > maxLimitBytes) {
            return new Response(JSON.stringify({ 
              error: "Este vídeo excede o espaço restante do seu plano de armazenamento. Faça upgrade para salvar este arquivo." 
            }), { 
              status: 403, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          const fileName = `${storeId}/${Date.now()}_tiktok_pure.mp4`;

          console.log("[Vidlytics] Enviando para o Supabase Storage:", fileName, `(${fileSize} bytes)`);
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("videos")
            .upload(fileName, videoBuffer, {
              contentType: "video/mp4",
              upsert: true
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from("videos")
              .getPublicUrl(fileName);
            
            if (publicUrlData?.publicUrl) {
              finalVideoUrl = publicUrlData.publicUrl;
              console.log("[Vidlytics] ✅ Vídeo re-hospedado no Storage com sucesso:", finalVideoUrl);
            }
          } else {
            console.warn("[Vidlytics] ⚠️ Falha no upload para o Storage:", uploadErr);
          }
        } else {
          console.warn("[Vidlytics] ⚠️ Resposta não-OK ao baixar binário:", mediaResp.status);
        }
      } catch (dlErr) {
        console.warn("[Vidlytics] ⚠️ Erro ao processar download/upload do binário:", dlErr);
      }
    }

    const payload = {
      store_id: storeId,
      title: mediaTitle.slice(0, 60),
      video_source_type: finalVideoUrl.includes(supabaseUrl) ? "upload" : "url",
      source_type: finalVideoUrl.includes(supabaseUrl) ? "upload" : "url",
      video_url: finalVideoUrl,
      thumbnail_url: thumbnailPic,
      thumbnail_source_type: "auto",
      file_size: fileSize,
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