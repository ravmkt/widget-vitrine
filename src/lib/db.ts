import { supabase } from './supabase';

export interface Store {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  created_at?: string;
}

export interface Story {
  id: string;
  store_id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  cta_link?: string;
  active: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface WidgetSettings {
  id: string;
  store_id: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
  theme_color: string;
  display_mode: 'carousel' | 'grid' | 'bubbles';
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY && !!supabase;

// Dados Iniciais de Exemplo (Useanny)
const DEFAULT_STORES: Store[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Useanny',
    domain: 'useanny.com.br',
    active: true,
  }
];

const DEFAULT_STORIES: Story[] = [
  {
    id: 's1',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Nova Coleção Outono 🍂',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-in-a-futuristic-setting-41809-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/outono',
    active: true,
    position: 1,
  },
  {
    id: 's2',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Unboxing Especial 🎁',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-opening-a-gift-box-41604-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/products/vestido-especial',
    active: true,
    position: 2,
  },
  {
    id: 's3',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Provador Fashion ✨',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-holding-shopping-bags-and-smiling-40358-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/novidades',
    active: true,
    position: 3,
  },
  {
    id: 's4',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cupom de Desconto 🏷️',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-41618-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/discount/PROMO10',
    active: true,
    position: 4,
  }
];

const DEFAULT_SETTINGS: WidgetSettings[] = [
  {
    id: 'w1',
    store_id: '11111111-1111-1111-1111-111111111111',
    position: 'bottom-center',
    theme_color: '#8B5CF6',
    display_mode: 'carousel',
    active: true,
  }
];

const initLocalStorage = () => {
  if (!localStorage.getItem('vidlytics_stores')) {
    localStorage.setItem('vidlytics_stores', JSON.stringify(DEFAULT_STORES));
  }
  if (!localStorage.getItem('vidlytics_stories')) {
    localStorage.setItem('vidlytics_stories', JSON.stringify(DEFAULT_STORIES));
  }
  if (!localStorage.getItem('vidlytics_settings')) {
    localStorage.setItem('vidlytics_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
};

initLocalStorage();

export const db = {
  async getStores(): Promise<Store[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('stores').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('vidlytics_stores') || '[]');
  },

  async saveStore(store: Store): Promise<Store> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('stores').upsert(store).select().single();
      if (!error && data) return data;
    }
    const stores = JSON.parse(localStorage.getItem('vidlytics_stores') || '[]');
    const index = stores.findIndex((s: Store) => s.id === store.id);
    if (index >= 0) {
      stores[index] = store;
    } else {
      stores.push(store);
    }
    localStorage.setItem('vidlytics_stores', JSON.stringify(stores));
    return store;
  },

  async getStories(storeId: string): Promise<Story[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('store_id', storeId)
        .order('position', { ascending: true });
      if (!error && data) return data;
    }
    const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
    return stories
      .filter((s: Story) => s.store_id === storeId)
      .sort((a: Story, b: Story) => a.position - b.position);
  },

  async saveStory(story: Story): Promise<Story> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('stories').upsert(story).select().single();
      if (!error && data) return data;
    }
    const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
    const index = stories.findIndex((s: Story) => s.id === story.id);
    if (index >= 0) {
      stories[index] = { ...story, updated_at: new Date().toISOString() };
    } else {
      stories.push({ ...story, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
    return story;
  },

  async deleteStory(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('stories').delete().eq('id', id);
      return !error;
    }
    const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
    const filtered = stories.filter((s: Story) => s.id !== id);
    localStorage.setItem('vidlytics_stories', JSON.stringify(filtered));
    return true;
  },

  async getSettings(storeId: string): Promise<WidgetSettings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      if (!error && data) return data;
    }
    const settings = JSON.parse(localStorage.getItem('vidlytics_settings') || '[]');
    let storeSettings = settings.find((s: WidgetSettings) => s.store_id === storeId);
    if (!storeSettings) {
      storeSettings = {
        id: Math.random().toString(36).substr(2, 9),
        store_id: storeId,
        position: 'bottom-center',
        theme_color: '#8B5CF6',
        display_mode: 'carousel',
        active: true,
      };
      settings.push(storeSettings);
      localStorage.setItem('vidlytics_settings', JSON.stringify(settings));
    }
    return storeSettings;
  },

  async saveSettings(settings: WidgetSettings): Promise<WidgetSettings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('widget_settings').upsert(settings).select().single();
      if (!error && data) return data;
    }
    const allSettings = JSON.parse(localStorage.getItem('vidlytics_settings') || '[]');
    const index = allSettings.findIndex((s: WidgetSettings) => s.store_id === settings.store_id);
    if (index >= 0) {
      allSettings[index] = { ...settings, updated_at: new Date().toISOString() };
    } else {
      allSettings.push({ ...settings, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem('vidlytics_settings', JSON.stringify(allSettings));
    return settings;
  }
};