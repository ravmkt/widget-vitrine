import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validar o token do webhook (segurança)
    const webhookToken = req.headers.get("asaas-access-token");
    const expectedSecret = Deno.env.get("ASAAS_WEBHOOK_SECRET");

    if (!webhookToken || webhookToken !== expectedSecret) {
      console.error("Token de webhook inválido ou ausente.");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const payload = await req.json();
    const event = payload.event;
    const payment = payload.payment;

    if (!payment) {
      return new Response(
        JSON.stringify({ message: "Payload sem dados de pagamento, ignorado." }),
        { status: 200, headers: corsHeaders }
      );
    }

    const asaasPaymentId = payment.id;
    const asaasSubscriptionId = payment.subscription; // ID da assinatura no Asaas
    const asaasCustomerId = payment.customer;

    console.log(`Webhook recebido: ${event} | Payment ID: ${asaasPaymentId}`);

    // 2. Conectar ao Supabase com service_role (bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Buscar a invoice existente (idempotência)
    const { data: existingInvoice } = await supabaseAdmin
      .from("invoices")
      .select("id, status")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    // Se já existe e o status já é o mesmo, não faz nada (evita reprocessamento)
    const newInvoiceStatus = mapAsaasStatusToInvoiceStatus(event);

    if (existingInvoice && existingInvoice.status === newInvoiceStatus) {
      console.log("Status já sincronizado, ignorando webhook duplicado.");
      return new Response(
        JSON.stringify({ message: "Já processado." }),
        { status: 200, headers: corsHeaders }
      );
    }

    const storeId = payment.externalReference || null;

    // 4. Atualizar ou criar a invoice (com store_id garantido para exibição no frontend)
    if (existingInvoice) {
      await supabaseAdmin
        .from("invoices")
        .update({
          status: newInvoiceStatus,
          paid_at: event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED"
            ? new Date().toISOString()
            : null,
          store_id: storeId || undefined,
          invoice_url: payment.invoiceUrl || payment.bankSlipUrl || undefined,
          payment_method: payment.billingType || undefined,
        })
        .eq("id", existingInvoice.id);
    } else {
      await supabaseAdmin.from("invoices").insert({
        store_id: storeId,
        asaas_payment_id: asaasPaymentId,
        asaas_subscription_id: asaasSubscriptionId,
        asaas_customer_id: asaasCustomerId,
        status: newInvoiceStatus,
        amount_cents: Math.round((payment.value || 0) * 100),
        due_date: payment.dueDate,
        paid_at: event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED"
          ? new Date().toISOString()
          : null,
        invoice_url: payment.invoiceUrl || payment.bankSlipUrl || null,
        payment_method: payment.billingType || "PIX",
      });
    }

    // 5. Buscar a subscription local vinculada ao asaas_subscription_id com fallback por store_id
    let subscription: any = null;

    if (asaasSubscriptionId) {
      const { data: subById } = await supabaseAdmin
        .from("subscriptions")
        .select("id, store_id, plan_id, status")
        .eq("asaas_subscription_id", asaasSubscriptionId)
        .maybeSingle();
      
      subscription = subById;
    }

    // Fallback: se não encontrou pelo ID do Asaas, busca pela loja via externalReference
    const storeId = payment.externalReference;
    if (!subscription && storeId) {
      console.log(`[WEBHOOK] Buscando fallback para store_id: ${storeId}`);
      
      const { data: subByStore } = await supabaseAdmin
        .from("subscriptions")
        .select("id, store_id, plan_id, status")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subByStore) {
        subscription = subByStore;
        // Salva o asaas_subscription_id para os próximos webhooks
        if (asaasSubscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ 
              asaas_subscription_id: asaasSubscriptionId,
              asaas_customer_id: asaasCustomerId 
            })
            .eq("id", subscription.id);
        }
      }
    }

    // Se ainda não encontrou nenhuma subscription, cria uma nova para a loja
    if (!subscription && storeId) {
      // Descobre o plano Pro pelo valor ou nome
      const { data: planPro } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("price_cents", Math.round((payment.value || 0) * 100))
        .maybeSingle();

      const targetPlanId = planPro?.id || "4b5d747e-af5c-46e9-a6aa-0682cc253110";

      const { data: createdSub } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          store_id: storeId,
          plan_id: targetPlanId,
          asaas_subscription_id: asaasSubscriptionId,
          asaas_customer_id: asaasCustomerId,
          status: "pending",
          is_current: false,
        })
        .select("id, store_id, plan_id, status")
        .single();

      subscription = createdSub;
    }

    if (!subscription) {
      console.warn("Nenhuma subscription encontrada nem criada para:", asaasSubscriptionId);
      return new Response(
        JSON.stringify({ message: "Invoice atualizada, subscription não encontrada." }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 6. Tratar o ciclo de vida da assinatura conforme o evento
    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        // Desativa qualquer subscription anterior "current" da mesma loja
        await supabaseAdmin
          .from("subscriptions")
          .update({ is_current: false })
          .eq("store_id", subscription.store_id)
          .eq("is_current", true)
          .neq("id", subscription.id);

        // Ativa a subscription atual
        await supabaseAdmin
          .from("subscriptions")
          .update({ 
            status: "active", 
            is_current: true,
            asaas_subscription_id: asaasSubscriptionId || undefined,
            asaas_customer_id: asaasCustomerId || undefined
          })
          .eq("id", subscription.id);

        // Sincroniza diretamente o plano ativo na tabela stores
        if (subscription.plan_id) {
          await supabaseAdmin
            .from("stores")
            .update({ plan_id: subscription.plan_id })
            .eq("id", subscription.store_id);
        }

        console.log(`Subscription ${subscription.id} e Store ${subscription.store_id} ativadas com sucesso.`);
        break;
      }

      case "PAYMENT_OVERDUE": {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("id", subscription.id);

        console.log(`Subscription ${subscription.id} marcada como past_due.`);
        break;
      }

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", is_current: false })
          .eq("id", subscription.id);

        console.log(`Subscription ${subscription.id} cancelada.`);
        break;
      }

      default:
        console.log(`Evento ${event} recebido mas sem ação de ciclo de vida definida.`);
    }

    return new Response(
      JSON.stringify({ message: "Webhook processado com sucesso." }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar webhook.", details: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function mapAsaasStatusToInvoiceStatus(event: string): string {
  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      return "paid";
    case "PAYMENT_OVERDUE":
      return "overdue";
    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED":
      return "canceled";
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      return "pending";
    default:
      return "pending";
  }
}
