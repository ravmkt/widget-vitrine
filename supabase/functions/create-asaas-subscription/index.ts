import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticar o usuário via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Token de autenticação ausente." }),
        { status: 401, headers: corsHeaders }
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
        { status: 401, headers: corsHeaders }
      );
    }

    const user = userData.user;

    // 2. Ler o body da requisição
    const { plan_id, store_id, billing_type } = await req.json();

    if (!plan_id || !store_id) {
      return new Response(
        JSON.stringify({ error: "INVALID_PAYLOAD", message: "plan_id e store_id são obrigatórios." }),
        { status: 400, headers: corsHeaders }
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
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. Buscar dados fiscais: primeiro em billing_info (cnpj_cpf, legal_name), senão em profiles
    let document: string | null = null;
    let phone: string | null = null;
    let name: string | null = null;
    let email: string | null = user.email ?? null;

    const { data: billingInfo, error: billingErr } = await supabaseAdmin
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
      // Fallback para tabela profiles
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
        { status: 400, headers: corsHeaders }
      );
    }

    // 5.1 Normalização rigorosa do CPF/CNPJ (adiciona zero à esquerda se necessário)
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

    if (!asaasCustomerId) {
      console.log("[ASAAS] Criando customer:", { name, email, cpfCnpj: cleanDoc });

      const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: name || email || "Cliente Vidlytics",
          email: email || undefined,
          cpfCnpj: cleanDoc,
          phone: cleanPhone,
          externalReference: store_id,
        }),
      });

      const customerText = await customerResponse.text();
      let customerData: any = {};
      try {
        customerData = customerText ? JSON.parse(customerText) : {};
      } catch (e) {
        console.error("[ASAAS] Resposta não-JSON ao criar customer:", customerText);
        throw new Error(`Asaas retornou resposta inválida: ${customerText || customerResponse.statusText}`);
      }

      if (!customerResponse.ok) {
        console.error("[ASAAS] Erro retornado pelo Asaas ao criar customer:", customerData);
        return new Response(
          JSON.stringify({ 
            error: "ASAAS_CUSTOMER_ERROR", 
            message: customerData.errors?.[0]?.description || "Erro ao criar cliente no Asaas.", 
            details: customerData 
          }),
          { status: 400, headers: corsHeaders }
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

    console.log("[ASAAS] Criando subscription:", { customer: asaasCustomerId, cycle, value: plan.price_cents / 100 });

    const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billing_type || "UNDEFINED",
        value: plan.price_cents / 100,
        nextDueDate,
        cycle,
        description: `Assinatura ${plan.name} - Vidlytics`,
        externalReference: store_id,
      }),
    });

    const subscriptionText = await subscriptionResponse.text();
    let subscriptionData: any = {};
    try {
      subscriptionData = subscriptionText ? JSON.parse(subscriptionText) : {};
    } catch (e) {
      console.error("[ASAAS] Resposta não-JSON ao criar subscription:", subscriptionText);
      throw new Error(`Asaas retornou resposta inválida ao criar assinatura: ${subscriptionText || subscriptionResponse.statusText}`);
    }

    if (!subscriptionResponse.ok) {
      console.error("[ASAAS] Erro ao criar subscription no Asaas:", subscriptionData);
      return new Response(
        JSON.stringify({ 
          error: "ASAAS_SUBSCRIPTION_ERROR", 
          message: subscriptionData.errors?.[0]?.description || "Erro ao criar assinatura no Asaas.", 
          details: subscriptionData 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 8. Salvar a subscription local (histórico preservado via insert)
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
        { headers: { "access_token": ASAAS_API_KEY } }
      );
      const paymentsText = await paymentsResponse.text();
      try {
        const paymentsData = paymentsText ? JSON.parse(paymentsText) : {};
        invoiceUrl = paymentsData?.data?.[0]?.invoiceUrl || paymentsData?.data?.[0]?.bankSlipUrl || null;
      } catch (e) {
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
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro interno ao processar assinatura.", details: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
