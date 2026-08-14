import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Varredura recursiva para encontrar qualquer link .mp4 ou .m3u8 da CDN do Pinterest no JSON
function findVideoUrlsDeep(obj: any): string[] {
  const urls: string[] = [];
  function search(node: any) {
    if (!node) return;
    if (typeof node === "string") {
      if (node.startsWith("http") && (node.includes("pinimg.com") || node.includes("pinterest.com")) && (node.includes(".mp4") || node.includes(".m3u8") || node.includes("/v1/") || node.includes("/v3/"))) {
        urls.push(node);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) search(item);
    } else if (typeof node === "object") {
      for (const key of Object.keys(node)) search(node[key]);
    }
  }
  search(obj);
  return urls;
}

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
      console.error("[Pinterest] Erro ao verificar plano:", storeErr);
      return new Response(JSON.stringify({ error: "Não foi possível verificar o plano da loja." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const currentUsedBytes = Number(storeData.storage_used_bytes || 0);
    const maxLimitBytes = Number(storeData.storage_limit_bytes || 1073741824);

    if (currentUsedBytes >= maxLimitBytes) {
      return new Response(JSON.stringify({
        error: "Limite de armazenamento atingido. Faça upgrade para importar novos vídeos."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let rawUrl = String(videoData.video_url || videoData.pin_url || videoData.share_url || "").trim();

    if (!rawUrl || (!rawUrl.includes("pinterest.") && !rawUrl.includes("pin.it"))) {
      return new Response(JSON.stringify({ error: "URL do Pinterest inválida ou não informada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Normaliza subdomínios regionais para canonical pinterest.com
    rawUrl = rawUrl.replace(/https?:\/\/(?:[a-z]{2}\.)?pinterest\./i, "https://www.pinterest.");

    // Se for link encurtado pin.it, resolve o redirect
    if (rawUrl.includes("pin.it")) {
      try {
        const headResp = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
        rawUrl = headResp.url || rawUrl;
      } catch (e) {
        console.warn("[Pinterest] Falha ao resolver redirecionamento pin.it:", e);
      }
    }

    // Extração do ID do Pin
    let pinId = "";
    const pinMatch = rawUrl.match(/\/pin\/(\d+)/i);
    if (pinMatch && pinMatch[1]) {
      pinId = pinMatch[1];
    }

    let directMp4Url = "";
    let thumbnailPic = "";
    let mediaTitle = String(videoData.title || `PINTEREST_${Date.now()}`);

    console.log("[Pinterest] Resolvendo Pin ID:", pinId, "URL:", rawUrl);

    // --- ESTRATÉGIA 1: Scraping com Emulação de Navegador Desktop Real ---
    try {
      const pageResp = await fetch(rawUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
          "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Upgrade-Insecure-Requests": "1"
        }
      });

      if (pageResp.ok) {
        const html = await pageResp.text();

        // 1.1 JSON embutido __PWS_DATA__
        const jsonMatch = html.match(/<script id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (jsonMatch) {
          try {
            const pinData = JSON.parse(jsonMatch[1]);
            const videoCandidates = findVideoUrlsDeep(pinData);
            
            // Prioriza .mp4 direto sobre .m3u8
            const mp4Candidate = videoCandidates.find(u => u.includes(".mp4") && !u.includes("live"));
            if (mp4Candidate) {
              directMp4Url = mp4Candidate;
            } else if (videoCandidates.length > 0) {
              directMp4Url = videoCandidates[0];
            }

            // Thumbnail
            const imgCandidates = findVideoUrlsDeep(pinData?.props?.initialReduxState?.pins || pinData);
            const foundThumb = html.match(/https:\/\/[^"'\s]+\.pinimg\.com\/originals\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/i)
              || html.match(/https:\/\/[^"'\s]+\.pinimg\.com\/736x\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/i);
            if (foundThumb) thumbnailPic = foundThumb[0];
          } catch (e) {
            console.warn("[Pinterest] Falha no parser __PWS_DATA__:", e);
          }
        }

        // 1.2 Regex Direto no HTML por CDN de Vídeo do Pinterest (v.pinimg.com/*.mp4)
        if (!directMp4Url) {
          const directMatch = html.match(/https:\/\/(?:v1|v2|v3|v|video)\.pinimg\.com\/videos\/[a-zA-Z0-9_\-\/]+\.mp4/i)
            || html.match(/https:\/\/[^"'\s]+\.pinimg\.com\/[^"'\s]+\.mp4/i);
          if (directMatch) {
            directMp4Url = directMatch[0];
          }
        }

        // 1.3 Schema.org JSON-LD
        if (!directMp4Url) {
          const ldJsonMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
          for (const match of ldJsonMatches) {
            try {
              const ldData = JSON.parse(match[1]);
              if (ldData.contentUrl || ldData["@type"] === "VideoObject") {
                directMp4Url = ldData.contentUrl || ldData.embedUrl || "";
                if (ldData.thumbnailUrl) thumbnailPic = ldData.thumbnailUrl;
                if (directMp4Url) break;
              }
            } catch (_) {}
          }
        }
      }
    } catch (scrapErr) {
      console.warn("[Pinterest] Erro no scraping HTML:", scrapErr);
    }

    // --- ESTRATÉGIA 2: Fallback via API Pública de Recursos (PinResource) ---
    if (!directMp4Url && pinId) {
      try {
        console.log("[Pinterest] Tentando fallback PinResource API para ID:", pinId);
        const resourceUrl = `https://www.pinterest.com/resource/PinResource/get/?data=${encodeURIComponent(
          JSON.stringify({
            options: { id: pinId, field_set_key: "detailed" },
            context: {}
          })
        )}`;

        const apiResp = await fetch(resourceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json"
          }
        });

        if (apiResp.ok) {
          const apiJson = await apiResp.json();
          const videoCandidates = findVideoUrlsDeep(apiJson);
          const mp4Candidate = videoCandidates.find(u => u.includes(".mp4"));
          if (mp4Candidate) {
            directMp4Url = mp4Candidate;
          } else if (videoCandidates.length > 0) {
            directMp4Url = videoCandidates[0];
          }
        }
      } catch (apiErr) {
        console.warn("[Pinterest] Erro no fallback de API:", apiErr);
      }
    }

    if (!directMp4Url) {
      return new Response(JSON.stringify({
        error: "Não foi possível extrair o vídeo deste Pin. Verifique se o link informado contém um vídeo público ativo."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[Pinterest] ✅ Mídia localizada com sucesso:", directMp4Url);

    // 2. Download do binário
    console.log("[Pinterest] Baixando binário MP4...");
    const mediaResp = await fetch(directMp4Url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.pinterest.com/"
      }
    });

    if (!mediaResp.ok) {
      throw new Error(`Falha no download da CDN (status ${mediaResp.status}).`);
    }

    const videoBuffer = await mediaResp.arrayBuffer();
    const fileSize = videoBuffer.byteLength;

    // 🔒 2ª CAMADA: Validação pós-download contra o teto
    if ((currentUsedBytes + fileSize) > maxLimitBytes) {
      return new Response(JSON.stringify({
        error: "Este vídeo excede o espaço restante do seu plano. Faça upgrade para continuar."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Upload do Vídeo para o Supabase Storage
    const fileName = `${storeId}/${Date.now()}_pinterest_pure.mp4`;
    console.log("[Pinterest] Gravando no Supabase Storage:", fileName, `(${fileSize} bytes)`);

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
        console.log("[Pinterest] ✅ Vídeo hospedado com sucesso:", finalVideoUrl);
      }
    } else {
      console.warn("[Pinterest] Aviso no upload do vídeo:", uploadErr);
    }

    // 3.1 Download e Hospedagem da Capa (Thumbnail) no Storage para evitar bloqueios de Hotlink
    let finalThumbnailUrl = thumbnailPic;
    if (thumbnailPic && thumbnailPic.startsWith("http")) {
      try {
        console.log("[Pinterest] Baixando capa oficial do Pin:", thumbnailPic);
        const thumbResp = await fetch(thumbnailPic, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.pinterest.com/"
          }
        });

        if (thumbResp.ok) {
          const thumbBuffer = await thumbResp.arrayBuffer();
          const thumbFileName = `${storeId}/thumb_${Date.now()}_pinterest.jpg`;

          const { data: thumbUploadData, error: thumbUploadErr } = await supabase.storage
            .from("videos")
            .upload(thumbFileName, thumbBuffer, {
              contentType: "image/jpeg",
              upsert: true
            });

          if (!thumbUploadErr && thumbUploadData) {
            const { data: thumbPublicUrlData } = supabase.storage
              .from("videos")
              .getPublicUrl(thumbFileName);

            if (thumbPublicUrlData?.publicUrl) {
              finalThumbnailUrl = thumbPublicUrlData.publicUrl;
              console.log("[Pinterest] ✅ Thumbnail hospedada com sucesso:", finalThumbnailUrl);
            }
          }
        }
      } catch (thumbErr) {
        console.warn("[Pinterest] Não foi possível salvar a thumbnail no Storage, usando URL original:", thumbErr);
      }
    }

    // 4. Inserção na Tabela Videos
    const isSupabaseHosted = finalVideoUrl.includes("supabase.co");
    const payload = {
      store_id: storeId,
      title: mediaTitle.slice(0, 60),
      video_source_type: isSupabaseHosted ? "upload" : "url",
      source_type: isSupabaseHosted ? "upload" : "url",
      video_url: finalVideoUrl,
      thumbnail_url: finalThumbnailUrl || finalVideoUrl,
      thumbnail_source_type: "upload",
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
    console.error("[Pinterest] Erro crítico:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro ao processar vídeo do Pinterest." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});