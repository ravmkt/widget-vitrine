import { supabase } from './supabase';

export interface Store {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  whatsapp_number?: string; // Adicionado campo para número de WhatsApp
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
    whatsapp_number: '5545999629702', // Exemplo de número de WhatsApp
  }
];

const DEFAULT_STORIES: Story[] = [
  {
    id: 's1',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Nova Coleção Outono 🍂',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/outono',
    active: true,
    position: 1,
  },
  {
    id: 's2',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Unboxing Especial 🎁',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/products/vestido-especial',
    active: true,
    position: 2,
  },
  {
    id: 's3',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Provador Fashion ✨',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/novidades',
    active: true,
    position: 3,
  },
  {
    id: 's4',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cupom de Desconto 🏷️',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
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

// Fallback em memória caso o localStorage esteja bloqueado ou indisponível no iframe
let memoryStores = [...DEFAULT_STORES];
let memoryStories = [...DEFAULT_STORIES];
let memorySettings = [...DEFAULT_SETTINGS];

const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!localStorage.getItem('vidlytics_stores')) {
        localStorage.setItem('vidlytics_stores', JSON.stringify(DEFAULT_STORES));
      }
      if (!localStorage.getItem('vidlytics_stories')) {
        localStorage.setItem('vidlytics_stories', JSON.stringify(DEFAULT_STORIES));
      }
      if (!localStorage.getItem('vidlytics_settings')) {
        localStorage.setItem('vidlytics_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    }
  } catch (e) {
    console.warn('[Vidlytics] LocalStorage indisponível. Usando fallback em memória.', e);
  }
};

initLocalStorage();

export const db = {
  async getStores(): Promise<Store[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('stores').select('*');
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao buscar lojas no Supabase:', e);
      }
    }
    try {
      const local = localStorage.getItem('vidlytics_stores');
      return local ? JSON.parse(local) : memoryStores;
    } catch (e) {
      return memoryStores;
    }
  },

  async saveStore(store: Store): Promise<Store> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('stores').upsert(store).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao salvar loja no Supabase:', e);
      }
    }
    try {
      const stores = JSON.parse(localStorage.getItem('vidlytics_stores') || '[]');
      const index = stores.findIndex((s: Store) => s.id === store.id);
      if (index >= 0) {
        stores[index] = store;
      } else {
        stores.push(store);
      }
      localStorage.setItem('vidlytics_stores', JSON.stringify(stores));
      memoryStores = stores;
    } catch (e) {
      const index = memoryStores.findIndex((s: Store) => s.id === store.id);
      if (index >= 0) {
        memoryStores[index] = store;
      } else {
        memoryStores.push(store);
      }
    }
    return store;
  },

  async getStories(storeId: string): Promise<Story[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .eq('store_id', storeId)
          .order('position', { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao buscar stories no Supabase:', e);
      }
    }
    try {
      const local = localStorage.getItem('vidlytics_stories');
      const stories = local ? JSON.parse(local) : memoryStories;
      return stories
        .filter((s: Story) => s.store_id === storeId)
        .sort((a: Story, b: Story) => a.position - b.position);
    } catch (e) {
      return memoryStories
        .filter((s: Story) => s.store_id === storeId)
        .sort((a: Story, b: Story) => a.position - b.position);
    }
  },

  async saveStory(story: Story): Promise<Story> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('stories').upsert(story).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao salvar story no Supabase:', e);
      }
    }
    const updatedStory = { ...story, updated_at: new Date().toISOString() };
    try {
      const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
      const index = stories.findIndex((s: Story) => s.id === story.id);
      if (index >= 0) {
        stories[index] = updatedStory;
      } else {
        stories.push({ ...updatedStory, created_at: new Date().toISOString() });
      }
      localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
      memoryStories = stories;
    } catch (e) {
      const index = memoryStories.findIndex((s: Story) => s.id === story.id);
      if (index >= 0) {
        memoryStories[index] = updatedStory;
      } else {
        memoryStories.push({ ...updatedStory, created_at: new Date().toISOString() });
      }
    }
    return story;
  },

  async deleteStory(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('stories').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('[Vidlytics] Erro ao deletar story no Supabase:', e);
      }
    }
    try {
      const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
      const filtered = stories.filter((s: Story) => s.id !== id);
      localStorage.setItem('vidlytics_stories', JSON.stringify(filtered));
      memoryStories = filtered;
    } catch (e) {
      memoryStories = memoryStories.filter((s: Story) => s.id !== id);
    }
    return true;
  },

  async getSettings(storeId: string): Promise<WidgetSettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('widget_settings')
          .select('*')
          .eq('store_id', storeId)
          .maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao buscar configurações no Supabase:', e);
      }
    }
    try {
      const local = localStorage.getItem('vidlytics_settings');
      const settings = local ? JSON.parse(local) : memorySettings;
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
        memorySettings = settings;
      }
      return storeSettings;
    } catch (e) {
      let storeSettings = memorySettings.find((s: WidgetSettings) => s.store_id === storeId);
      if (!storeSettings) {
        storeSettings = {
          id: Math.random().toString(36).substr(2, 9),
          store_id: storeId,
          position: 'bottom-center',
          theme_color: '#8B5CF6',
          display_mode: 'carousel',
          active: true,
        };
        memorySettings.push(storeSettings);
      }
      return storeSettings;
    }
  },

  async saveSettings(settings: WidgetSettings): Promise<WidgetSettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('widget_settings').upsert(settings).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao salvar configurações no Supabase:', e);
      }
    }
    const updatedSettings = { ...settings, updated_at: new Date().toISOString() };
    try {
      const allSettings = JSON.parse(localStorage.getItem('vidlytics_settings') || '[]');
      const index = allSettings.findIndex((s: WidgetSettings) => s.store_id === settings.store_id);
      if (index >= 0) {
        allSettings[index] = updatedSettings;
      } else {
        allSettings.push({ ...updatedSettings, created_at: new Date().toISOString() });
      }
      localStorage.setItem('vidlytics_settings', JSON.stringify(allSettings));
      memorySettings = allSettings;
    } catch (e) {
      const index = memorySettings.findIndex((s: WidgetSettings) => s.store_id === settings.store_id);
      if (index >= 0) {
        memorySettings[index] = updatedSettings;
      } else {
        memorySettings.push({ ...updatedSettings, created_at: new Date().toISOString() });
      }
    }
    return settings;
  }
};