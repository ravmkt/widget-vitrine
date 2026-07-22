const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return new Response(
        JSON.stringify({
          error: "O parâmetro url é obrigatório.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({
          error: "A URL informada é inválida.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({
          error: "A URL precisa utilizar HTTP ou HTTPS.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: "application/xml,text/xml,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 XML Feed Proxy",
      },
    });

    const xml = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `O servidor do XML respondeu com HTTP ${upstreamResponse.status}.`,
          preview: xml.slice(0, 500),
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Erro no proxy XML:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Erro desconhecido ao baixar o XML.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
