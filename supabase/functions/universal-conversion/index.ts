import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[universal-conversion] Requisição recebida:", req.method);

  try {
    const body = await req.json();
    console.log("[universal-conversion] Payload:", JSON.stringify(body));

    const {
      store_id,
      video_id,
      live_id,
      product_id,
      visitor_id,
      order_id,
      order_value,
      status,
      source,
    } = body;

    if (!store_id || !visitor_id) {
      console.error("[universal-conversion] Campos obrigatórios faltando:", {
        store_id: !!store_id,
        visitor_id: !!visitor_id,
      });
      return new Response(
        JSON.stringify({ error: "store_id e visitor_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verifica se esta conversão já existe (evita duplicatas de webhook / reload de página)
    if (order_id) {
      const { data: existing } = await supabase
        .from("conversions")
        .select("id")
        .eq("store_id", store_id)
        .eq("order_id", String(order_id))
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("conversions")
          .update({
            status: status || "pending",
            order_value: order_value || 0,
            ...(live_id ? { live_id } : {}),
            ...(video_id ? { video_id } : {}),
            ...(product_id ? { product_id } : {}),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          console.error("[universal-conversion] Erro ao atualizar conversão:", updateError);
        } else {
          console.log("[universal-conversion] Conversão atualizada:", updated.id);
        }

        return new Response(
          JSON.stringify({ success: true, action: "updated", id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insere nova conversão com suporte a live_id e source
    const { data, error } = await supabase
      .from("conversions")
      .insert({
        store_id,
        video_id: video_id || null,
        live_id: live_id || null,
        product_id: product_id || null,
        visitor_id,
        order_id: order_id ? String(order_id) : null,
        order_value: Number(order_value) || 0,
        status: status || "pending",
        source: source || "universal_tracker",
      })
      .select()
      .single();

    if (error) {
      console.error("[universal-conversion] Erro ao inserir conversão:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[universal-conversion] Conversão criada:", data.id, "- R$", order_value, "Live:", live_id);

    return new Response(
      JSON.stringify({ success: true, action: "created", id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[universal-conversion] Erro crítico:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
