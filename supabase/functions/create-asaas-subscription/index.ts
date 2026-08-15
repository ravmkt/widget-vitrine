import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_BASE_URL = (Deno.env.get("ASAAS_BASE_URL") || "https://api-sandbox.asaas.com/v3").replace(/\/$/, "");
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // 1. Autenticar o usuário via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Token de autenticação ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Usuário não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;

    // 2. Ler o body da requisição
    const { plan_id, store_id, billing_type } = await req.json();

    if (!plan_id || !store_id) {
      return new Response(
        JSON.stringify({ error: "INVALID_PAYLOAD", message: "plan_id e store_id são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Cliente admin (service_role) para consultas privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Buscar o plano
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_cents, billing_cycle")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "PLAN_NOT_FOUND", message: "Plano não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Buscar dados fiscais: primeiro em billing_info, senão em profiles
    let document: string | null = null;
    let phone: string | null = null;
    let name: string | null = null;
    let email: string | null = user.email ?? null;

    const { data: billingInfo } = await supabaseAdmin
      .from("billing_info")
      .select("cnpj_cpf, legal_name, phone, email")
      .eq("store_id", store_id)
      .maybeSingle();

    if (billingInfo?.cnpj_cpf) {
      document = String(billingInfo.cnpj_cpf).trim();
      phone = billingInfo.phone ? String(billingInfo.phone).trim() : null;
      name = billingInfo.legal_name || null;
      email = billingInfo.email || email;
    } else {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("document_number, phone, name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.document_number) {
        document = String(profile.document_number).trim();
        phone = profile.phone ? String(profile.phone).trim() : null;
        name = profile.name || null;
        email = profile.email || email;
      }
    }

    if (!document) {
      return new Response(
        JSON.stringify({
          error: "DADOS_FISCAIS_OBRIGATORIOS",
          message: "Preencha seus dados de faturamento (CPF/CNPJ) antes de assinar um plano.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5.1 Normalização do CPF/CNPJ
    let cleanDoc = document.replace(/\D/g, "");
    if (cleanDoc.length <= 11) {
      cleanDoc = cleanDoc.padStart(11, "0");
    } else if (cleanDoc.length <= 14) {
      cleanDoc = cleanDoc.padStart(14, "0");
    }

    const cleanPhone = phone ? phone.replace(/\D/g, "") : undefined;

    // 6. Buscar ou criar o customer no Asaas
    const { data: storeRow } = await supabaseAdmin
      .from("stores")
      .select("asaas_customer_id")
      .eq("id", store_id)
      .single();

    let asaasCustomerId = storeRow?.asaas_customer_id;

    const asaasHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Vidlytics-App/1.0",
      "access_token": ASAAS_API_KEY.trim(),
    };

    if (!asaasCustomerId) {
      const isMobile = cleanPhone && cleanPhone.length === 11;

      const customerPayload: Record<string, any> = {
        name: name || "Cliente Vidlytics",
        cpfCnpj: cleanDoc,
        email: email || undefined,
        externalReference: store_id,
      };

      if (cleanPhone) {
        if (isMobile) {
          customerPayload.mobilePhone = cleanPhone;
        } else {
          customerPayload.phone = cleanPhone;
        }
      }

      console.log("[ASAAS] Disparando criação de customer:", customerPayload);

      const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
      });

      const customerText = await customerResponse.text();
      let customerData: any = {};
      try {
        customerData = customerText ? JSON.parse(customerText) : {};
      } catch {
        customerData = { rawResponse: customerText };
      }

      if (!customerResponse.ok) {
        console.error("[ASAAS] Erro HTTP ao criar customer:", customerResponse.status, customerData);
        const errMsg = customerData?.errors?.[0]?.description || customerData?.message || `Erro HTTP ${customerResponse.status} do Asaas`;
        return new Response(
          JSON.stringify({
            error: "ASAAS_CUSTOMER_ERROR",
            message: errMsg,
            details: customerData,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      asaasCustomerId = customerData.id;

      await supabaseAdmin
        .from("stores")
        .update({ asaas_customer_id: asaasCustomerId })
        .eq("id", store_id);
    }

    // 7. Criar a assinatura no Asaas
    const cycle = plan.billing_cycle === "yearly" ? "YEARLY" : "MONTHLY";
    const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: billing_type || "UNDEFINED",
      value: plan.price_cents / 100,
      nextDueDate,
      cycle,
      description: `Assinatura ${plan.name} - Vidlytics`,
      externalReference: store_id,
    };

    console.log("[ASAAS] Criando subscription:", subscriptionPayload);

    const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(subscriptionPayload),
    });

    const subText = await subscriptionResponse.text();
    let subscriptionData: any = {};
    try {
      subscriptionData = subText ? JSON.parse(subText) : {};
    } catch {
      subscriptionData = { rawResponse: subText };
    }

    if (!subscriptionResponse.ok) {
      console.error("[ASAAS] Erro HTTP ao criar subscription:", subscriptionResponse.status, subscriptionData);
      const errMsg = subscriptionData?.errors?.[0]?.description || subscriptionData?.message || `Erro HTTP ${subscriptionResponse.status} ao criar assinatura`;
      return new Response(
        JSON.stringify({
          error: "ASAAS_SUBSCRIPTION_ERROR",
          message: errMsg,
          details: subscriptionData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Salvar a subscription local
    const { data: newSubscription, error: insertError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        store_id,
        plan_id,
        asaas_subscription_id: subscriptionData.id,
        asaas_customer_id: asaasCustomerId,
        status: "pending",
        is_current: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao salvar subscription local:", insertError);
    }

    // 9. Buscar a primeira invoice gerada para obter a invoice_url
    let invoiceUrl = subscriptionData.invoiceUrl || null;

    if (!invoiceUrl) {
      const paymentsResponse = await fetch(
        `${ASAAS_BASE_URL}/payments?subscription=${subscriptionData.id}`,
        { headers: asaasHeaders }
      );
      const paymentsText = await paymentsResponse.text();
      try {
        const paymentsData = paymentsText ? JSON.parse(paymentsText) : {};
        invoiceUrl = paymentsData?.data?.[0]?.invoiceUrl || paymentsData?.data?.[0]?.bankSlipUrl || null;
      } catch {
        console.warn("[ASAAS] Não foi possível parsear lista de pagamentos:", paymentsText);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Assinatura criada com sucesso.",
        subscription_id: newSubscription?.id,
        asaas_subscription_id: subscriptionData.id,
        invoice_url: invoiceUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro interno ao processar assinatura.", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
