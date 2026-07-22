// sugiro: src/lib/server/saveRules.ts  (ou mantenha em src/server/saveRules.ts)
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

type Rule = {
  id?: string;
  store_id: string;
  story_id: string | null;
  condition_type: 'home' | 'all_pages' | 'url_contains' | 'url_equals' | 'url_not_equals';
  value?: string | null;
};

type Location = {
  id?: string;
  store_id: string;
  story_id: string | null;
  selector: string;
  position?: 'beforebegin'|'afterend'|'afterbegin'|'beforeend';
};

export async function saveRulesAndLocations(params: {
  store_id: string;
  story_id: string | null;
  rules: Rule[];
  locations: Location[];
}) {
  const { store_id, story_id, rules = [], locations = [] } = params;

  await supabaseAdmin.from('page_rules').delete().eq('store_id', store_id).eq('story_id', story_id);
  await supabaseAdmin.from('display_locations').delete().eq('store_id', store_id).eq('story_id', story_id);

  if (rules.length) {
    const { error } = await supabaseAdmin
      .from('page_rules')
      .insert(rules.map(r => ({ ...r, store_id, story_id })));
    if (error) throw error;
  }

  if (locations.length) {
    const { error } = await supabaseAdmin
      .from('display_locations')
      .insert(locations.map(l => ({
        ...l,
        store_id,
        story_id,
        position: l.position || 'beforeend'
      })));
    if (error) throw error;
  }

  return { ok: true };
}
