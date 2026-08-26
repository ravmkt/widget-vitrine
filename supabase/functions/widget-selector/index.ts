import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ─── GET: Leitura do seletor (por story_id) ───
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const storyId = url.searchParams.get("story_id");
      // Mantém compatibilidade com token antigo
      const token = url.searchParams.get("token");

      if (!storyId && !token) {
        return new Response(
          JSON.stringify({ success: false, message: "story_id ou token é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Se tem token, busca na tabela antiga (legado) e retorna
      if (token && !storyId) {
        const { data, error } = await supabase
          .from("selector_sessions")
          .select("id, token, selector, story_id, store_id, created_at, updated_at")
          .eq("token", token)
          .maybeSingle();

        if (error || !data) {
          return new Response(
            JSON.stringify({ success: false, message: "Sessão não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Busca direto da tabela display_locations pelo story_id
      const query = storyId
        ? supabase.from("display_locations").select("*").eq("story_id", storyId).order("created_at", { ascending: true }).limit(1)
        : supabase.from("display_locations").select("*").order("created_at", { ascending: true }).limit(1);

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: "Nenhum seletor encontrado para este story" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data[0] }),
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
s
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

      // Fallback: sem story_id, grava na tabela legada (backward compat)
      if (token) {
        const { data: existingToken } = await supabase
          .from("selector_sessions")
          .select("id")
          .eq("token", token)
          .maybeSingle();

        let error = null;
        if (existingToken) {
          const result = await supabase
            .from("selector_sessions")
            .update({ selector, story_id: story_id || null, updated_at: new Date().toISOString() })
            .eq("token", token);
          error = result.error;
        } else {
          const result = await supabase
            .from("selector_sessions")
            .insert({ token, selector, story_id: story_id || null });
          error = result.error;
        }

        if (error) {
          return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, message: "story_id ou token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
