import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(JSON.stringify({ error: "videoId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(ytUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch YouTube page" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await response.text();

    let scheduledStartTime: string | null = null;
    let title: string | null = null;
    let thumbnailUrl: string | null = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    let viewCount = 0;
    let likeCount = 0;
    let commentCount = 0;

    // Título
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      title = titleMatch[1].replace(" - YouTube", "").trim();
    }

    // Data de Agendamento
    const startDateMatch = html.match(/<meta\s+itemprop="startDate"\s+content="([^"]+)"/i);
    if (startDateMatch?.[1]) {
      scheduledStartTime = startDateMatch[1];
    } else {
      const startTimestampMatch = html.match(/"startTimestamp":"([^"]+)"/);
      if (startTimestampMatch?.[1]) {
        scheduledStartTime = startTimestampMatch[1];
      }
    }

    // Visualizações
    const viewsMatch = html.match(/"viewCount":"(\d+)"/);
    if (viewsMatch?.[1]) {
      viewCount = parseInt(viewsMatch[1], 10);
    }

    // Comentários
    const commentsMatch = html.match(/"commentCount":\{"simpleText":"([\d.]+)"\}/) ||
                          html.match(/"totalComments":"(\d+)"/);
    if (commentsMatch?.[1]) {
      commentCount = parseInt(commentsMatch[1].replace(/\./g, ""), 10);
    }

    return new Response(
      JSON.stringify({
        videoId,
        title,
        thumbnailUrl,
        scheduledStartTime,
        viewCount,
        likeCount,
        commentCount
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
