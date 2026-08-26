import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const url = new URL(req.url);

  // ─── GET: Polling do React para buscar o seletor pelo Token ───
  if (req.method === "GET") {
    try {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, message: "Token é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("selector_sessions")
        .select("selector, story_id, store_id")
        .eq("token", token)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // ─── POST: Gravação em display_locations e selector_sessions ───
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { selector, token, story_id } = body;
      let { store_id } = body;

      if (!selector) {
        return new Response(
          JSON.stringify({ success: false, message: "Seletor é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();

      // 1️⃣ Se tem story_id, resolve o store_id e grava/atualiza em display_locations (Persistência Principal)
      if (story_id) {
        // Garante o store_id buscando do Story caso o widget não tenha enviado
        if (!store_id) {
          const { data: storyData, error: storyError } = await supabase
            .from("stories")
            .select("store_id")
            .eq("id", story_id)
            .maybeSingle();

          if (!storyError && storyData) {
            store_id = storyData.store_id;
          }
        }

        // Busca se já existe location para este story
        const { data: existing } = await supabase
          .from("display_locations")
          .select("id")
          .eq("story_id", story_id)
          .limit(1);

        if (existing && existing.length > 0) {
          // Atualiza o seletor existente
          await supabase
            .from("display_locations")
            .update({ selector, store_id: store_id || null, updated_at: now })
            .eq("id", existing[0].id);
        } else {
          // Cria uma nova localização
          await supabase
            .from("display_locations")
            .insert({
              store_id: store_id || null,
              story_id,
              selector,
              position: "beforeend",
              active: true,
              created_at: now,
              updated_at: now,
            });
        }
      }

      // 2️⃣ Se tem token, grava/atualiza em selector_sessions (Essencial para o Polling do React funcionar!)
      if (token) {
        const { data: existingToken } = await supabase
          .from("selector_sessions")
          .select("id")
          .eq("token", token)
          .maybeSingle();

        if (existingToken) {
          await supabase
            .from("selector_sessions")
            .update({ 
              selector, 
              story_id: story_id || null, 
              store_id: store_id || null, 
              updated_at: now 
            })
            .eq("token", token);
        } else {
          await supabase
            .from("selector_sessions")
            .insert({ 
              token, 
              selector, 
              story_id: story_id || null, 
              store_id: store_id || null,
              created_at: now,
              updated_at: now
            });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Seletor salvo e sincronizado com sucesso!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Fallback para outros métodos
  return new Response(
    JSON.stringify({ success: false, message: "Método não suportado" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
