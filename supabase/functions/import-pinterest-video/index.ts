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
      throw new Error("Parâmetros inválidos. Faltando storeId ou dados do vídeo.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 🔒 1ª CAMADA DE PROTEÇÃO: Validação prévia de cota de armazenamento
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

    const rawUrl = String(videoData.video_url || videoData.pin_url || videoData.share_url || "").trim();

    if (!rawUrl || (!rawUrl.includes("pinterest.") && !rawUrl.includes("pin.it"))) {
      throw new Error("URL do Pinterest inválida ou não informada.");
    }

    let directMp4Url = "";
    let thumbnailPic = "";
    let mediaTitle = String(videoData.title || `PINTEREST_${Date.now()}`);

    // 1. Faz scraping da página do Pin para extrair os dados internos (__PWS_DATA__)
    try {
      console.log("[Vidlytics] Resolvendo Pin do Pinterest:", rawUrl);
      const pageResp = await fetch(rawUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });

      if (!pageResp.ok) {
        throw new Error(`Não foi possível acessar o Pin (status ${pageResp.status}). Verifique se a URL é pública.`);
      }

      const html = await pageResp.text();

      const jsonMatch = html.match(/<script id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!jsonMatch) {
        throw new Error("Não foi possível localizar os dados do Pin na página (estrutura pode ter mudado).");
      }

      const pinData = JSON.parse(jsonMatch[1]);
      const pinsObj = pinData?.props?.initialReduxState?.pins;

      if (!pinsObj) {
        throw new Error("Estrutura de dados do Pin não encontrada.");
      }

      const pin = Object.values(pinsObj)[0] as any;

      if (!pin) {
        throw new Error("Pin não encontrado nos dados extraídos.");
      }

      const videoList = pin.videos?.video_list;
      if (!videoList) {
        throw new Error("Este Pin não contém vídeo (é apenas uma imagem estática).");
      }

      // Prioriza variantes de maior qualidade/mp4 direto
      const preferredKeys = ["V_720P", "V_HLSV4", "V_EXP7", "V_EXP6", "V_EXP5", "V_EXP4", "V_EXP3"];
      for (const key of preferredKeys) {
        if (videoList[key]?.url) {
          directMp4Url = videoList[key].url;
          break;
        }
      }
      if (!directMp4Url) {
        const firstVariant = Object.values(videoList)[0] as any;
        directMp4Url = firstVariant?.url || "";
      }

      if (!directMp4Url) {
        throw new Error("Não foi possível localizar a URL do arquivo de vídeo do Pin.");
      }

      thumbnailPic = pin.images?.orig?.url || pin.images?.["736x"]?.url || "";
      if (!videoData.title) {
        mediaTitle = String(pin.title || pin.description || mediaTitle);
      }

      console.log("[Vidlytics] ✅ URL de mídia do Pinterest resolvida com sucesso!");
    } catch (e) {
      console.error("[Vidlytics] ❌ Falha ao resolver Pin do Pinterest:", e);
      throw new Error(e.message || "Falha ao processar o Pin do Pinterest.");
    }

    const sourceVideoUrl = directMp4Url;
    let finalVideoUrl = sourceVideoUrl;
    let fileSize = 0;

    // 2. Faz o download do binário e salva no Supabase Storage
    if (sourceVideoUrl && (sourceVideoUrl.startsWith("http://") || sourceVideoUrl.startsWith("https://"))) {
      try {
        console.log("[Vidlytics] Baixando binário do vídeo do Pinterest:", sourceVideoUrl);
        const mediaResp = await fetch(sourceVideoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.pinterest.com/"
          }
        });

        if (mediaResp.ok) {
          const videoBuffer = await mediaResp.arrayBuffer();
          fileSize = videoBuffer.byteLength;

          // 🔒 2ª CAMADA DE PROTEÇÃO: Validação pós-download contra o teto do plano
          if ((currentUsedBytes + fileSize) > maxLimitBytes) {
            return new Response(JSON.stringify({
              error: "Este vídeo excede o espaço restante do seu plano de armazenamento. Faça upgrade para salvar este arquivo."
            }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const fileName = `${storeId}/${Date.now()}_pinterest_pure.mp4`;

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
          throw new Error("Não foi possível baixar o arquivo de vídeo do Pinterest.");
        }
      } catch (dlErr) {
        console.error("[Vidlytics] ❌ Erro ao processar download/upload do binário:", dlErr);
        throw new Error(dlErr.message || "Falha ao baixar/salvar o vídeo do Pinterest.");
      }
    } else {
      throw new Error("URL de mídia do Pinterest inválida.");
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
    console.error("Erro na import-pinterest-video:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
