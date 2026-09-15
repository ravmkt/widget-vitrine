import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailMetrics {
  planName?: string;
  monthViews?: number;
  videosCount?: number;
  revenue?: number;
}

// Escapa HTML e converte \n em <br> para exibir a mensagem em texto plano com segurança
function escapeAndFormat(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  return escaped.replace(/\n/g, "<br>");
}

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

    const { to, subject, message, storeName, metrics } = await req.json() as {
      to: string;
      subject: string;
      message: string;
      storeName?: string;
      metrics?: EmailMetrics;
    };

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Destinatário (to), assunto (subject) e mensagem (message) são obrigatórios." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formatCurrency = (value?: number) =>
      typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—";

    const safeMessage = escapeAndFormat(message);
    const safeStoreName = storeName ? escapeAndFormat(storeName) : "Vidlytics Store";

    const metricsBlock = metrics
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="padding: 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <span style="display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Plano</span>
                    <span style="display:block;font-size:16px;font-weight:700;color:#059669;">${metrics.planName || "—"}</span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Views (mês)</span>
                    <span style="display:block;font-size:16px;font-weight:700;color:#059669;">${metrics.monthViews ?? "—"}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <span style="display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Vídeos ativos</span>
                    <span style="display:block;font-size:16px;font-weight:700;color:#059669;">${metrics.videosCount ?? "—"}</span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Faturamento via Stories</span>
                    <span style="display:block;font-size:16px;font-weight:700;color:#059669;">${formatCurrency(metrics.revenue)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `
      : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vidlytics <contato@mail.vidlytics.com.br>",
        to: [to],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td style="padding:24px;border-bottom:1px solid #e2e8f0;background-color:#f0fdf4;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:12px;">
                                <img src="https://vidlytics.com.br/logo.png" alt="Vidlytics" width="36" height="36" style="display:block;border-radius:8px;" />
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:20px;font-weight:700;color:#059669;letter-spacing:-0.5px;">Vidlytics Stories</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Comunicação oficial da plataforma</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px;font-size:15px;line-height:1.6;color:#334155;">
                          ${safeMessage}
                          ${metricsBlock}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 24px;border-top:1px solid #e2e8f0;background-color:#f8fafc;font-size:12px;color:#64748b;">
                          Mensagem referente à loja <strong>${safeStoreName}</strong>.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
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
