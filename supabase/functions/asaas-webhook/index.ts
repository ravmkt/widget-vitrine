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
    const isRefunded = invoiceStatus === "refunded" || invoiceStatus === "disputed";

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
    // 7. SISTEMA DE AFILIADOS: PROCESSA COMISSÃO (10%)
    // ─────────────────────────────────────────────────────────
    try {
      const { data: payingStore } = await supabase
        .from("stores")
        .select("id, referred_by_store_id")
        .eq("id", storeId)
        .maybeSingle();

      if (payingStore?.referred_by_store_id) {
        const referrerStoreId = payingStore.referred_by_store_id;
        const paidAmount = Number(payment.value ?? 0);

        if (isPaid && paidAmount > 0) {
          const commissionAmount = Math.round((paidAmount * 0.10) * 100) / 100;

          const { error: rewardErr } = await supabase
            .from("referral_rewards")
            .upsert({
              referrer_store_id: referrerStoreId,
              referred_store_id: storeId,
              asaas_payment_id: payment.id,
              amount: commissionAmount,
              commission_rate: 10.00,
              status: "pending",
              updated_at: new Date().toISOString(),
            }, { onConflict: "referrer_store_id,asaas_payment_id" });

          if (rewardErr) {
            console.error("[asaas-webhook] Erro ao registrar comissão de afiliado:", rewardErr);
          } else {
            console.log(`[asaas-webhook] Comissão de R$ ${commissionAmount} creditada para loja ${referrerStoreId}`);
          }
        } else if (isRefunded) {
          await supabase
            .from("referral_rewards")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("asaas_payment_id", payment.id);

          console.log(`[asaas-webhook] Comissão cancelada por estorno do pagamento ${payment.id}`);
        }
      }
    } catch (affiliateErr) {
      console.error("[asaas-webhook] Erro não fatal no processamento de afiliado:", affiliateErr);
    }

    // ─────────────────────────────────────────────────────────
    // 8. ESTADO DA ASSINATURA + SINCRONIZAÇÃO COM STORES
    // ─────────────────────────────────────────────────────────
    let subStatus: string | null = null;
    if (isPaid) subStatus = "active";
    else if (SUBSCRIPTION_BLOCKING_EVENTS.has(event)) subStatus = "past_due";

    if (subStatus) {
      const nowIso = new Date().toISOString();
      const periodEnd = isPaid
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: updSubErr } = await supabase
        .from("subscriptions")
        .update({
          status: subStatus,
          updated_at: nowIso,
          ...(isPaid
            ? {
                current_period_start: nowIso,
                current_period_end: periodEnd,
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

      // Sincroniza a tabela stores para refletir no painel/dashboard
      const storeUpdatePayload: Record<string, any> = {
        subscription_status: subStatus,
        plan_id: subscriptionRow.plan_id,
        updated_at: nowIso,
        ...(isPaid ? { trial_ends_at: null } : {}),
        ...(periodEnd ? { current_period_end: periodEnd } : {}),
      };

      const { error: storeUpdErr } = await supabase
        .from("stores")
        .update(storeUpdatePayload)
        .eq("id", storeId);

      if (storeUpdErr) {
        console.error("[asaas-webhook] Erro ao sincronizar stores:", storeUpdErr);
      } else {
        console.log("[asaas-webhook] Store sincronizada com status:", subStatus);
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
