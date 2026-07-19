// sugiro: src/lib/server/saveRules.ts  (ou mantenha em src/server/saveRules.ts)
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

type Rule = {
  id?: string;
  store_id: string;
  story_id: string | null;
  condition_type:
    | 'all_pages'
    | 'home_only'
    | 'product_pages'
    | 'category_pages'
    | 'contains'
    | 'equals'
    | 'not_equals'
    | 'starts_with'
    | 'ends_with'
    | 'regex';
  url_pattern?: string | null;
  active?: boolean;
};

type Location = {
  id?: string;
  store_id: string;
  story_id: string | null;
  selector: string;
  position?: 'before'|'after'|'append'|'prepend';
  active?: boolean;
};

export async function saveRulesAndLocations(params: {
  store_id: string;
  story_id: string | null;
  rules: Rule[];
  locations: Location[];
}) {
  const { store_id, story_id, rules = [], locations = [] } = params;

  // Deleta respeitando NULL corretamente
  {
    let q = supabaseAdmin.from('page_rules').delete().eq('store_id', store_id);
    q = story_id === null ? q.is('story_id', null) : q.eq('story_id', story_id);
    const { error } = await q;
    if (error) throw error;
  }
  {
    let q = supabaseAdmin.from('display_locations').delete().eq('store_id', store_id);
    q = story_id === null ? q.is('story_id', null) : q.eq('story_id', story_id);
    const { error } = await q;
    if (error) throw error;
  }

  // Você está apagando antes; insert simples já basta.
  if (rules.length) {
    const { error } = await supabaseAdmin
      .from('page_rules')
      .insert(rules.map(r => ({ active: true, ...r, store_id, story_id })));
    if (error) throw error;
  }

  if (locations.length) {
    const { error } = await supabaseAdmin
      .from('display_locations')
      .insert(locations.map(l => ({
        active: true,
        position: l.position || 'append',
        ...l,
        store_id,
        story_id
      })));
    if (error) throw error;
  }

  return { ok: true };
}
