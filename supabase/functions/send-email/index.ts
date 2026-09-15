import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BRAND_BLUE = "#0094eb";
const BRAND_ORANGE = "#fd8539";
const DEFAULT_LOGO = "https://vidlytics.com.br/assets/sll-logotipo.png";

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

    const { to, subject, message, storeName, logoUrl, contactName, metrics } = await req.json() as {
      to: string;
      subject: string;
      message: string;
      storeName?: string;
      logoUrl?: string;
      contactName?: string;
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
    const safeContactName = contactName ? escapeAndFormat(contactName) : "";
const finalLogo = DEFAULT_LOGO;
    // Cards de métrica: 4 cards centralizados, mesma largura
    const metricCard = (label: string, value: string) => `
      <td width="25%" align="center" style="padding:6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
          <tr>
            <td align="center" style="padding:14px 8px;">
              <span style="display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${label}</span>
              <span style="display:block;font-size:16px;font-weight:700;color:${BRAND_BLUE};">${value}</span>
            </td>
          </tr>
        </table>
      </td>
    `;

    const metricsBlock = metrics
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            ${metricCard("Plano", metrics.planName || "—")}
            ${metricCard("Views (mês)", String(metrics.monthViews ?? "—"))}
            ${metricCard("Vídeos ativos", String(metrics.videosCount ?? "—"))}
            ${metricCard("Faturamento", formatCurrency(metrics.revenue))}
          </tr>
        </table>
      `
      : "";

    const greeting = safeContactName ? `<p style="margin:0 0 12px;font-size:15px;color:#334155;">Olá, <strong>${safeContactName}</strong>!</p>` : "";

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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:28px 24px 20px;background-color:#ffffff;text-align:center;">
                  <img src="${finalLogo}" alt="Vidlytics" width="200" height="auto" style="display:inline-block; max-width:200px; width:100%; height:auto;" />
                </td>
              </tr>
              <tr>
                <td style="height:3px;background-color:${BRAND_BLUE};font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:24px;font-size:15px;line-height:1.6;color:#334155;">
                  ${greeting}
                  ${safeMessage}
                  ${metricsBlock}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;border-top:1px solid #e2e8f0;background-color:#f8fafc;font-size:12px;color:#64748b;">
                  Mensagem referente à loja <strong style="color:${BRAND_ORANGE};">${safeStoreName}</strong>.
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
