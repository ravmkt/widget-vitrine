import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Produção: https://api.asaas.com/v3 | Sandbox: https://api-sandbox.asaas.com/v3
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ─────────────────────────────────────────────────────────
    // 1. AUTENTICAÇÃO JWT MANUAL (verify_jwt = false por padrão)
    // ─────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[create-asaas-subscription] Requisição sem token Bearer.");
      return new Response(
        JSON.stringify({ error: "Não autorizado: token ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Cliente com anon key APENAS para validar o JWT no servidor de Auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error("[create-asaas-subscription] JWT inválido ou expirado:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Não autorizado: JWT inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    const userId = user.id;
    console.log("[create-asaas-subscription] Usuário autenticado:", userId);

    // Cliente administrativo (service role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────
    // 2. PARÂMETROS DE ENTRADA
    // ─────────────────────────────────────────────────────────
    const { storeId, planId } = await req.json();

    if (!storeId || !planId) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes: storeId e planId." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 3. VALIDAÇÃO DA LOJA E DO PLANO
    // ─────────────────────────────────────────────────────────
    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, owner_id")
      .eq("id", storeId)
      .single();

    if (storeErr || !storeRow) {
      console.error("[create-asaas-subscription] Loja não encontrada:", storeErr?.message);
      return new Response(
        JSON.stringify({ error: "Loja não encontrada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Garante que o usuário autenticado é o dono da loja (quando owner_id existe)
    if (storeRow.owner_id && storeRow.owner_id !== userId) {
      console.error("[create-asaas-subscription] Usuário não é dono da loja.");
      return new Response(
        JSON.stringify({ error: "Não autorizado: você não tem permissão sobre esta loja." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: planRow, error: planErr } = await supabase
      .from("plans")
      .select("id, name, price_cents")
      .eq("id", planId)
      .single();

    if (planErr || !planRow) {
      console.error("[create-asaas-subscription] Plano não encontrado:", planErr?.message);
      return new Response(
        JSON.stringify({ error: "Plano não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────
    // 4. BUSCA HIERÁRQUICA DE DADOS DO CLIENTE:
    //    billing_info (preferencial) → profiles (fallback)
    // ─────────────────────────────────────────────────────────
    const { data: billingInfo } = await supabase
      .from("billing_info")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    let customerName = billingInfo?.legal_name?.trim() || "";
    let customerEmail = billingInfo?.email?.trim() || "";
    let customerCpfCnpj = billingInfo?.cnpj_cpf?.trim() || "";
    let customerPhone = billingInfo?.phone?.trim() || "";
    const addressLine = billingInfo?.address?.trim() || "";
    const addressNumber = billingInfo?.number?.trim() || "";
    const complement = billingInfo?.complement?.trim() || "";
    const neighborhood = billingInfo?.neighborhood?.trim() || "";
    const city = billingInfo?.city?.trim() || "";
    const state = billingInfo?.state?.trim() || "";
    let postalCode = billingInfo?.cep?.trim() || "";

    // Fallback: perfil do usuário autenticado
    if (!customerName || !customerEmail) {
      console.log("[create-asaas-subscription] billing_info incompleto. Usando fallback profiles:", userId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name, display_name")
        .eq("id", userId)
        .maybeSingle();

      const profileName = profile?.full_name?.trim() ||
        profile?.display_name?.trim() ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

      if (!customerName) customerName = profileName || user.user_metadata?.full_name || user.email || "Cliente Vidlytics";
      if (!customerEmail) customerEmail = user.email || "";
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Não foi possível determinar o e-mail do cliente. Preencha os dados fiscais." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitizações
    const onlyDigits = (v: string) => v.replace(/\D/g, "");
    customerCpfCnpj = onlyDigits(customerCpfCnpj);
    customerPhone = onlyDigits(customerPhone);
    postalCode = onlyDigits(postalCode);

    console.log("[create-asaas-subscription] Dados do cliente resolvidos:", {
      nome: customerName,
      email: customerEmail,
      doc: customerCpfCnpj ? "presente" : "ausente",
      origem: billingInfo ? "billing_info" : "profiles",
    });

    // ─────────────────────────────────────────────────────────
    // 5. ASAAS: LOCALIZA OU CRIA O CUSTOMER
    // ─────────────────────────────────────────────────────────
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY") ?? "";
    if (!asaasApiKey) {
      console.error("[create-asaas-subscription] Secret ASAAS_API_KEY não configurado.");
      return new Response(
        JSON.stringify({ error: "Gateway de pagamento não configurado (ASAAS_API_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: asaasApiKey,
    };

    let asaasCustomerId = "";

    // 5.1 Tenta reutilizar customer já cadastrado pelo documento
    if (customerCpfCnpj) {
      const findResp = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=${customerCpfCnpj}`,
        { headers: asaasHeaders }
      );
      const findData = await findResp.json();
      if (findResp.ok && findData?.data?.length > 0) {
        asaasCustomerId = findData.data[0].id;
        console.log("[create-asaas-subscription] Customer existente reutilizado:", asaasCustomerId);
      }
    }

    // 5.2 Cria novo customer quando necessário
    if (!asaasCustomerId) {
      const customerPayload: Record<string, string> = {
        name: customerName,
        email: customerEmail,
      };
      if (customerCpfCnpj) customerPayload.cpfCnpj = customerCpfCnpj;
      if (customerPhone) customerPayload.mobilePhone = customerPhone;
      if (postalCode) customerPayload.postalCode = postalCode;
      if (addressLine) customerPayload.address = addressLine;
      if (addressNumber) customerPayload.addressNumber = addressNumber;
      if (complement) customerPayload.complement = complement;
      if (neighborhood) customerPayload.province = neighborhood;
      if (city) customerPayload.city = city;

      const createResp = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
      });
      const createData = await createResp.json();

      if (!createResp.ok || !createData?.id) {
        console.error("[create-asaas-subscription] Falha ao criar customer no Asaas:", createData);
        throw new Error(createData?.errors?.[0]?.description || "Falha ao cadastrar cliente no gateway.");
      }

      asaasCustomerId = createData.id;
      console.log("[create-asaas-subscription] Customer criado no Asaas:", asaasCustomerId);
    }

    // ─────────────────────────────────────────────────────────
    // 6. ASAAS: CRIA A ASSINATURA MENSAL
    // ─────────────────────────────────────────────────────────
    const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

    const subResp = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED", // Cliente escolhe PIX, boleto ou cartão
        value: planRow.price_cents / 100,
        cycle: "MONTHLY",
        description: `Vidlytics - Plano ${planRow.name}`,
        nextDueDate: todayBR,
      }),
    });
    const subData = await subResp.json();

    if (!subResp.ok || !subData?.id) {
      console.error("[create-asaas-subscription] Falha ao criar assinatura no Asaas:", subData);
      throw new Error(subData?.errors?.[0]?.description || "Falha ao criar assinatura no gateway.");
    }

    console.log("[create-asaas-subscription] Assinatura Asaas criada:", subData.id);

    // ─────────────────────────────────────────────────────────
    // 7. BUSCA A COBRANÇA INICIAL (PIX / BOLETO / LINK)
    // ─────────────────────────────────────────────────────────
    let firstCharge: Record<string, any> | null = null;
    try {
      const chargeResp = await fetch(
        `${ASAAS_API_URL}/payments?subscription=${subData.id}&limit=1`,
        { headers: asaasHeaders }
      );
      const chargeData = await chargeResp.json();
      if (chargeResp.ok && chargeData?.data?.length > 0) {
        const c = chargeData.data[0];
        firstCharge = {
          id: c.id,
          value: c.value,
          billingType: c.billingType,
          status: c.status,
          dueDate: c.dueDate,
          invoiceUrl: c.invoiceUrl,
          bankSlipUrl: c.bankSlipUrl ?? null,
          pixQrCodeUrl: (c as any).pixQrCode?.qrCodeImageUrl ?? null,
          pixCopyPaste: (c as any).pixQrCode?.payload ?? null,
        };
      }
    } catch (chargeErr) {
      console.warn("[create-asaas-subscription] Cobrança inicial ainda não disponível:", chargeErr);
    }

    // ─────────────────────────────────────────────────────────
    // 8. PERSISTÊNCIA NO SUPABASE
    // ─────────────────────────────────────────────────────────
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: upsertErr } = await supabase.from("subscriptions").upsert({
      store_id: storeId,
      plan_id: planRow.id,
      status: "active",
      is_current: true,
      billing_cycle: "monthly",
      billing_provider: "asaas",
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: subData.id,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: periodStart.toISOString(),
    });

    if (upsertErr) {
      console.error("[create-asaas-subscription] Erro ao gravar assinatura no banco:", upsertErr);
      throw new Error("Assinatura criada no gateway, mas falhou ao registrar no banco.");
    }

    console.log("[create-asaas-subscription] Fluxo concluído com sucesso.");

    // ─────────────────────────────────────────────────────────
    // 9. RESPOSTA FINAL
    // ─────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subData.id,
        customerId: asaasCustomerId,
        plan: { id: planRow.id, name: planRow.name, value: planRow.price_cents / 100 },
        firstCharge,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[create-asaas-subscription] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno de servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
