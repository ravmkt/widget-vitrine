import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const PLANO_INICIANTE_ID = "c8c634e6-0641-4f5b-a826-4db837192c83";

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
    const payment = payload.payment || null;
    const subEventData = payload.subscription || null;

    if (!payment && !subEventData) {
      return new Response(
        JSON.stringify({ message: "Payload sem dados de pagamento ou assinatura, ignorado." }),
        { status: 200, headers: corsHeaders }
      );
    }

    const asaasPaymentId = payment?.id || null;
    const asaasSubscriptionId = payment?.subscription || subEventData?.id || null;
    const asaasCustomerId = payment?.customer || subEventData?.customer || null;
    const storeId = payment?.externalReference || subEventData?.externalReference || null;

    console.log(`Webhook recebido: ${event} | Payment ID: ${asaasPaymentId} | Sub ID: ${asaasSubscriptionId} | Customer ID: ${asaasCustomerId} | Store: ${storeId}`);

    // 2. Conectar ao Supabase com service_role (bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

// 3. Buscar a invoice existente (idempotência) apenas se houver pagamento
    let existingInvoice: any = null;
    const newInvoiceStatus = mapAsaasStatusToInvoiceStatus(event);

    if (asaasPaymentId) {
      const { data } = await supabaseAdmin
        .from("invoices")
        .select("id, status")
        .eq("asaas_payment_id", asaasPaymentId)
        .maybeSingle();

      existingInvoice = data;

      if (existingInvoice && existingInvoice.status === newInvoiceStatus) {
        console.log("Status já sincronizado, ignorando webhook duplicado.");
        return new Response(
          JSON.stringify({ message: "Já processado." }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // 4. Buscar a subscription local e resolver plano por valor pago (protegido contra payment nulo)
    const paymentAmountCents = payment ? Math.round((payment.value || 0) * 100) : 0;
    let resolvedPlanId: string | null = null;

    if (paymentAmountCents > 0) {
      const { data: matchedPlan } = await supabaseAdmin
        .from("plans")
        .select("id, name, price_cents")
        .eq("price_cents", paymentAmountCents)
        .maybeSingle();

      resolvedPlanId = matchedPlan?.id || null;
    }
    
    let subscription: any = null;

    if (asaasSubscriptionId) {
      const { data: subById } = await supabaseAdmin
        .from("subscriptions")
        .select("id, store_id, plan_id, status")
        .eq("asaas_subscription_id", asaasSubscriptionId)
        .maybeSingle();

      subscription = subById;
    }

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
        
        // Atualiza a subscription com o ID do Asaas e o plano correspondente ao valor pago
        const updatePayload: Record<string, any> = {};
        if (asaasSubscriptionId) updatePayload.asaas_subscription_id = asaasSubscriptionId;
        if (asaasCustomerId) updatePayload.asaas_customer_id = asaasCustomerId;
        if (resolvedPlanId && subscription.plan_id !== resolvedPlanId) {
          updatePayload.plan_id = resolvedPlanId;
          subscription.plan_id = resolvedPlanId;
        }

        if (Object.keys(updatePayload).length > 0) {
          await supabaseAdmin
            .from("subscriptions")
            .update(updatePayload)
            .eq("id", subscription.id);
        }
      }
    }

    if (!subscription && storeId) {
      const targetPlanId = resolvedPlanId || "4b5d747e-af5c-46e9-a6aa-0682cc253110";

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

    // 5. Atualizar ou criar a invoice apenas se houver cobrança (payment)
    if (payment && asaasPaymentId) {
      if (existingInvoice) {
        await supabaseAdmin
          .from("invoices")
          .update({
            status: newInvoiceStatus,
            paid_at: event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED"
              ? new Date().toISOString()
              : null,
            store_id: storeId || undefined,
            subscription_id: subscription?.id || undefined,
          })
          .eq("id", existingInvoice.id);
      } else {
        await supabaseAdmin.from("invoices").insert({
          store_id: storeId,
          subscription_id: subscription?.id || null,
          asaas_payment_id: asaasPaymentId,
          status: newInvoiceStatus,
          amount_cents: paymentAmountCents,
          currency: "BRL",
          description: payment.description || null,
          due_date: payment.dueDate,
          paid_at: event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED"
            ? new Date().toISOString()
            : null,
          gateway_provider: "asaas",
          gateway_invoice_id: asaasPaymentId,
          invoice_pdf_url: payment.bankSlipUrl || null,
          invoice_url: payment.invoiceUrl || payment.bankSlipUrl || null,
          payment_method: payment.billingType || null,
        });
      }
    }

    // 6. Tratar o ciclo de vida da assinatura conforme o evento
    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        if (subscription?.store_id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ is_current: false })
            .eq("store_id", subscription.store_id)
            .eq("is_current", true)
            .neq("id", subscription.id);
        }

        if (subscription?.id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              is_current: true,
              asaas_subscription_id: asaasSubscriptionId || undefined,
              asaas_customer_id: asaasCustomerId || undefined,
            })
            .eq("id", subscription.id);
        }

        const activePlanId = resolvedPlanId || subscription?.plan_id;
        const targetStoreId = subscription?.store_id || storeId;

        if (targetStoreId) {
          const storeUpdatePayload: Record<string, any> = {
            subscription_status: "active",
            trial_ends_at: null,
            past_due_since: null, // Limpa o timestamp de carência após regularização
            updated_at: new Date().toISOString(),
          };

          if (activePlanId) {
            storeUpdatePayload.plan_id = activePlanId;
          }

          await supabaseAdmin
            .from("stores")
            .update(storeUpdatePayload)
            .eq("id", targetStoreId);
        }

        console.log(`Subscription ${subscription?.id} e Store ${targetStoreId} ativadas com sucesso.`);
        break;
      }

      case "PAYMENT_OVERDUE": {
        const targetStoreId = subscription?.store_id || storeId;

        if (targetStoreId) {
          const { data: storeRow } = await supabaseAdmin
            .from("stores")
            .select("past_due_since")
            .eq("id", targetStoreId)
            .maybeSingle();

          const updatePayload: Record<string, any> = {
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          };

          // Grava past_due_since apenas se ainda não existir (idempotência para não reiniciar a janela)
          if (!storeRow?.past_due_since) {
            updatePayload.past_due_since = new Date().toISOString();
          }

          await supabaseAdmin
            .from("stores")
            .update(updatePayload)
            .eq("id", targetStoreId);
        }

        if (subscription?.id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);
        }

        console.log(`Subscription ${subscription?.id} marcada como past_due com janela de carência iniciada.`);
        break;
      }

      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_INACTIVATED":
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        let targetStoreId = subscription?.store_id || storeId;

        // Fallback defensivo por Customer ID
        if (!targetStoreId && asaasCustomerId) {
          const { data: storeByCustomer } = await supabaseAdmin
            .from("stores")
            .select("id")
            .eq("asaas_customer_id", asaasCustomerId)
            .maybeSingle();

          if (storeByCustomer) {
            targetStoreId = storeByCustomer.id;
          }
        }

        // Desativa assinaturas locais
        if (targetStoreId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "canceled", is_current: false, updated_at: new Date().toISOString() })
            .eq("store_id", targetStoreId);
        } else if (subscription?.id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "canceled", is_current: false, updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
        }

        // Rebaixa a loja para o Plano Iniciante, zera carência, seta canceled e limita a 1 GB
        if (targetStoreId) {
          await supabaseAdmin
            .from("stores")
            .update({
              plan_id: PLANO_INICIANTE_ID,
              subscription_status: "canceled",
              past_due_since: null,
              storage_limit_bytes: 1073741824, // 1 GB
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetStoreId);

          console.log(`[WEBHOOK] Store ${targetStoreId} cancelada e rebaixada para cota de 1 GB.`);
        }
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
