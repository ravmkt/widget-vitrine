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
      return new Response(JSON.stringify({ error: "Parâmetros inválidos. Faltando storeId ou dados do vídeo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 🔒 1ª CAMADA: Validação de cota do plano
    const { data: storeData, error: storeErr } = await supabase
      .from("stores")
      .select("storage_used_bytes, storage_limit_bytes")
      .eq("id", storeId)
      .single();

    if (storeErr || !storeData) {
      console.error("[Pinterest] Erro ao consultar dados da loja:", storeErr);
      return new Response(JSON.stringify({ error: "Não foi possível verificar o plano de armazenamento da loja." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const currentUsedBytes = Number(storeData.storage_used_bytes || 0);
    const maxLimitBytes = Number(storeData.storage_limit_bytes || 1073741824);

    if (currentUsedBytes >= maxLimitBytes) {
      return new Response(JSON.stringify({
        error: "Limite de armazenamento do plano atingido. Faça upgrade do seu plano para continuar importando vídeos."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rawUrl = String(videoData.video_url || videoData.pin_url || videoData.share_url || "").trim();

    if (!rawUrl || (!rawUrl.includes("pinterest.") && !rawUrl.includes("pin.it"))) {
      return new Response(JSON.stringify({ error: "URL do Pinterest inválida ou não informada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let directMp4Url = "";
    let thumbnailPic = "";
    let mediaTitle = String(videoData.title || `PINTEREST_${Date.now()}`);

    console.log("[Vidlytics] Resolvendo Pin do Pinterest:", rawUrl);

    // 1. Scraping com Headers completos de Navegador
    const pageResp = await fetch(rawUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    if (!pageResp.ok) {
      throw new Error(`Servidor do Pinterest respondeu com status ${pageResp.status}. Verifique se o Pin é público.`);
    }

    const html = await pageResp.text();

    // --- ESTRATÉGIA A: Parser JSON-LD (Schema.org VideoObject) ---
    const ldJsonMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of ldJsonMatches) {
      try {
        const ldData = JSON.parse(match[1]);
        if (ldData["@type"] === "VideoObject" || ldData.contentUrl) {
          directMp4Url = ldData.contentUrl || ldData.embedUrl || "";
          thumbnailPic = ldData.thumbnailUrl || "";
          if (ldData.name) mediaTitle = ldData.name;
          if (directMp4Url) break;
        }
      } catch (_) {
        // ignora erro de parse individual
      }
    }

    // --- ESTRATÉGIA B: Parser __PWS_DATA__ (Redux Store) ---
    if (!directMp4Url) {
      const jsonMatch = html.match(/<script id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        try {
          const pinData = JSON.parse(jsonMatch[1]);
          const pinsObj = pinData?.props?.initialReduxState?.pins;
          if (pinsObj) {
            const pin = Object.values(pinsObj)[0] as any;
            if (pin?.videos?.video_list) {
              const videoList = pin.videos.video_list;
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
            }
            if (!thumbnailPic) {
              thumbnailPic = pin?.images?.orig?.url || pin?.images?.["736x"]?.url || "";
            }
            if (pin?.title || pin?.description) {
              mediaTitle = pin.title || pin.description;
            }
          }
        } catch (e) {
          console.warn("[Vidlytics] Falha ao ler __PWS_DATA__:", e);
        }
      }
    }

    // --- ESTRATÉGIA C: Meta Tags OpenGraph / Twitter Stream ---
    if (!directMp4Url) {
      const ogVideo = html.match(/<meta property="og:video(?::secure_url)?" content="([^"]+)"/i);
      const twitterStream = html.match(/<meta name="twitter:player:stream" content="([^"]+)"/i);
      const rawVideoTag = html.match(/<video[^>]+src="([^">]+)"/i);

      directMp4Url = ogVideo?.[1] || twitterStream?.[1] || rawVideoTag?.[1] || "";
    }

    if (!thumbnailPic) {
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
      thumbnailPic = ogImage?.[1] || "";
    }

    if (!directMp4Url) {
      console.error("[Vidlytics] Falha crítica: Nenhuma URL de vídeo encontrada no HTML do Pin.");
      return new Response(JSON.stringify({ 
        error: "Não foi possível identificar o vídeo deste Pin. Certifique-se de que é um Pin de vídeo e não uma imagem estática." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[Vidlytics] ✅ Mídia resolvida com sucesso:", directMp4Url);

    // 2. Download do binário
    console.log("[Vidlytics] Baixando binário MP4...");
    const mediaResp = await fetch(directMp4Url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.pinterest.com/"
      }
    });

    if (!mediaResp.ok) {
      throw new Error(`Falha no download da CDN de mídia (status ${mediaResp.status}).`);
    }

    const videoBuffer = await mediaResp.arrayBuffer();
    const fileSize = videoBuffer.byteLength;

    // 🔒 2ª CAMADA: Validação pós-download
    if ((currentUsedBytes + fileSize) > maxLimitBytes) {
      return new Response(JSON.stringify({
        error: "Este vídeo excede o espaço restante do seu plano de armazenamento. Faça upgrade para continuar."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Upload para o Supabase Storage
    const fileName = `${storeId}/${Date.now()}_pinterest_pure.mp4`;
    console.log("[Vidlytics] Enviando para o Supabase Storage:", fileName, `(${fileSize} bytes)`);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true
      });

    let finalVideoUrl = directMp4Url;

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        finalVideoUrl = publicUrlData.publicUrl;
        console.log("[Vidlytics] ✅ Arquivo salvo no Storage:", finalVideoUrl);
      }
    } else {
      console.warn("[Vidlytics] Aviso: Upload no Storage falhou, mantendo URL direta:", uploadErr);
    }

    // 4. Inserção na Tabela Videos
    const isSupabaseHosted = finalVideoUrl.includes("supabase.co");
    const payload = {
      store_id: storeId,
      title: mediaTitle.slice(0, 60),
      video_source_type: isSupabaseHosted ? "upload" : "url",
      source_type: isSupabaseHosted ? "upload" : "url",
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

  } catch (error: any) {
    console.error("[Vidlytics] Erro fatal na Edge Function:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro interno ao processar o vídeo do Pinterest." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});