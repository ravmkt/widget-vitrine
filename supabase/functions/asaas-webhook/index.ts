import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapa de status do Asaas → status interno das faturas
const INVOICE_STATUS_MAP: Record<string, string> = {
  PAYMENT_CREATED: "pending",
  PAYMENT_AWAITING_RISK_ANALYSIS: "pending",
  PAYMENT_UPDATED: "pending",
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_RECEIVED: "paid",
  PAYMENT_RECEIVED_IN_CASH_UNCONFERMED: "paid",
  PAYMENT_REFUNDED: "refunded",
  PAYMENT_REFUND_CONCILIATED: "refunded",
  PAYMENT_CHARGEBACK_REQUESTED: "disputed",
  PAYMENT_CHARGEBACK_DISPUTE: "disputed",
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: "disputed",
  PAYMENT_DUNNING_RECEIVED: "paid",
  PAYMENT_DUNNING_REQUESTED: "pending",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "canceled",
  ANTICIPATION_REFUND_REFUND_IN_BANKACCOUNT: "refunded",
};

// Eventos que marcam a assinatura como inadimplente/cancelada
const SUBSCRIPTION_BLOCKING_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ─────────────────────────────────────────────────────────
    // 1. VALIDAÇÃO DO asaas-access-token
    //    (token configurado no painel do Asaas → Integrações → Webhook)
    // ─────────────────────────────────────────────────────────
    const expectedToken = Deno.env.get("ASAAS_ACCESS_TOKEN") ??
      Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

    if (!expectedToken) {
      console.error("[asaas-webhook] Secret ASAAS_ACCESS_TOKEN não configurado.");
      return new Response(
        JSON.stringify({ error: "Webhook não configurado no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const receivedToken = req.headers.get("asaas-access-token");
    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn("[asaas-webhook] Tentativa de acesso com token inválido.");
      return new Response(
        JSON.stringify({ error: "Não autorizado: asaas-access-token inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 2. PARSE DO EVENTO
    // ─────────────────────────────────────────────────────────
    const payload = await req.json();
    const event = payload?.event ?? "";
    const payment = payload?.payment ?? null;
    const subscriptionId = payment?.subscription ?? null;

    console.log("[asaas-webhook] Evento recebido:", event, "| Pagamento:", payment?.id ?? "n/d");

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Evento ausente no payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Eventos sem pagamento (ex.: SUBSCRIPTION_*) apenas confirmam recebimento
    if (!payment?.id) {
      console.log("[asaas-webhook] Evento sem pagamento associado. Ack e encerramento.");
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 3. CLIENTE ADMINISTRATIVO
    // ─────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─────────────────────────────────────────────────────────
    // 4. IDEMPOTÊNCIA
    //    Registra o evento na tabela asaas_webhook_events.
    //    Se o mesmo evento já foi processado, responde 200 sem reprocessar.
    // ─────────────────────────────────────────────────────────
    const eventKey = `${event}:${payment.id}`;

    const { error: insertEventErr } = await supabase
      .from("asaas_webhook_events")
      .insert({
        event_id: eventKey,
        event_type: event,
        payment_id: payment.id,
        subscription_id: subscriptionId,
        payload: payload,
        received_at: new Date().toISOString(),
      });

    if (insertEventErr) {
      // Violação de chave única = evento duplicado → idempotência garantida
      if (insertEventErr.code === "23505" || /duplicate key|unique/i.test(insertEventErr.message)) {
        console.log("[asaas-webhook] Evento duplicado detectado (idempotência):", eventKey);
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("[asaas-webhook] Erro ao registrar evento:", insertEventErr);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar evento de webhook." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 5. RESOLVE A LOJA ATRAVÉS DA ASSINATURA
    // ─────────────────────────────────────────────────────────
    if (!subscriptionId) {
      console.log("[asaas-webhook] Pagamento sem subscription_id. Encerrando com ack.");
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptionRow, error: subErr } = await supabase
      .from("subscriptions")
      .select("id, store_id, plan_id")
      .eq("asaas_subscription_id", subscriptionId)
      .maybeSingle();

    if (subErr || !subscriptionRow) {
      console.warn("[asaas-webhook] Assinatura local não encontrada para:", subscriptionId);
      // Ack para o Asaas não ficar reenviando; o evento já ficou registrado para auditoria
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "subscription_not_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storeId = subscriptionRow.store_id;

    // ─────────────────────────────────────────────────────────
    // 6. ATUALIZA A FATURA (upsert por asaas_payment_id)
    // ─────────────────────────────────────────────────────────
    const invoiceStatus = INVOICE_STATUS_MAP[event] ?? "pending";
    const isPaid = invoiceStatus === "paid";

    const invoicePayload = {
      store_id: storeId,
      subscription_id: subscriptionRow.id,
      asaas_payment_id: payment.id,
      description: `Assinatura Vidlytics - ${payment.description ?? ""}`.trim(),
      amount_cents: Math.round(Number(payment.value ?? 0) * 100),
      status: invoiceStatus,
      billing_type: payment.billingType ?? null,
      due_date: payment.dueDate ?? null,
      paid_at: payment.paymentDate ?? (isPaid ? new Date().toISOString() : null),
      invoice_pdf_url: payment.invoiceUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: invoiceErr } = await supabase
      .from("invoices")
      .upsert(invoicePayload, { onConflict: "asaas_payment_id" });

    if (invoiceErr) {
      console.error("[asaas-webhook] Erro ao gravar fatura:", invoiceErr);
      throw new Error("Falha ao atualizar a fatura no banco.");
    }

    console.log("[asaas-webhook] Fatura atualizada:", payment.id, "→", invoiceStatus);

    // ─────────────────────────────────────────────────────────
    // 7. ESTADO DA ASSINATURA CONFORME O PAGAMENTO
    // ─────────────────────────────────────────────────────────
    let subStatus: string | null = null;
    if (isPaid) subStatus = "active";
    else if (SUBSCRIPTION_BLOCKING_EVENTS.has(event)) subStatus = "past_due";

    if (subStatus) {
      const { error: updSubErr } = await supabase
        .from("subscriptions")
        .update({
          status: subStatus,
          updated_at: new Date().toISOString(),
          ...(isPaid
            ? {
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              }
            : {}),
        })
        .eq("asaas_subscription_id", subscriptionId)
        .eq("is_current", true);

      if (updSubErr) {
        console.error("[asaas-webhook] Erro ao atualizar assinatura:", updSubErr);
      } else {
        console.log("[asaas-webhook] Assinatura marcada como:", subStatus);
      }
    }

    console.log("[asaas-webhook] Evento processado com sucesso:", eventKey);

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[asaas-webhook] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno de servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
