import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Chave RESEND_API_KEY não configurada no Supabase Secrets." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, message, storeName } = await req.json();

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Destinatário (to), assunto (subject) e mensagem (message) são obrigatórios." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Disparo via API REST do Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vidlytics <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f4f4f5; margin: 0; padding: 24px; }
                .card { background-color: #12141c; border: 1px solid #27272a; border-radius: 12px; max-width: 580px; margin: 0 auto; overflow: hidden; }
                .header { padding: 24px; border-bottom: 1px solid #27272a; background: linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent); }
                .brand { color: #10b981; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
                .sub { color: #71717a; font-size: 13px; margin-top: 4px; }
                .content { padding: 24px; font-size: 15px; line-height: 1.6; color: #d4d4d8; white-space: pre-wrap; }
                .footer { padding: 16px 24px; border-top: 1px solid #27272a; background-color: #0d0f17; font-size: 12px; color: #71717a; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h2 class="brand">Vidlytics Stories</h2>
                  <p class="sub">Comunicação oficial da plataforma</p>
                </div>
                <div class="content">${message}</div>
                <div class="footer">
                  Mensagem referente à loja <strong>${storeName || "Vidlytics Store"}</strong>.
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || "Erro retornado pela API do Resend." }),
        { status: res.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no servidor." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
