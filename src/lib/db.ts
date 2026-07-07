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
  view_count?: number; // Novo campo para contagem de visualizações
  click_count?: number; // Novo campo para contagem de cliques no CTA
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
  whatsapp_number?: string;
  display_urls?: string; // Novo campo para URLs onde o widget deve aparecer (separadas por vírgula)
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  story_id: string;
  username: string;
  text: string;
  created_at?: string;
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
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/outono',
    active: true,
    position: 1,
    view_count: 1200,
    click_count: 85,
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
    view_count: 950,
    click_count: 60,
  },
  {
    id: 's3',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Provador Fashion ✨',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/collections/novidades',
    active: true,
    position: 3,
    view_count: 1500,
    click_count: 110,
  },
  {
    id: 's4',
    store_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cupom de Desconto 🏷️',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=250&auto=format&fit=crop&q=60',
    cta_link: 'https://useanny.com.br/discount/PROMO10',
    active: true,
    position: 4,
    view_count: 800,
    click_count: 45,
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
    whatsapp_number: '5545999629702', // Exemplo de número de WhatsApp padrão
    display_urls: '', // Padrão: exibir em todas as URLs
  }
];

const DEFAULT_COMMENTS: Comment[] = [
  { id: 'c1', story_id: 's1', username: 'Cliente Feliz', text: 'Adorei esse story! O produto é incrível!', created_at: new Date().toISOString() },
  { id: 'c2', story_id: 's1', username: 'Comprador VIP', text: 'Já comprei e recomendo muito!', created_at: new Date().toISOString() },
  { id: 'c3', story_id: 's2', username: 'Curioso', text: 'Qual o preço desse item?', created_at: new Date().toISOString() },
];


// Fallback em memória caso o localStorage esteja bloqueado ou indisponível no iframe
let memoryStores = [...DEFAULT_STORES];
let memoryStories = [...DEFAULT_STORIES];
let memorySettings = [...DEFAULT_SETTINGS];
let memoryComments = [...DEFAULT_COMMENTS];

const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Se Supabase não estiver configurado, sempre sobrescrever o localStorage com os dados padrão.
      // Isso garante que dados antigos do localStorage não persistam e que os defaults sejam a fonte primária.
      if (!isSupabaseConfigured) {
        localStorage.setItem('vidlytics_stores', JSON.stringify(DEFAULT_STORES));
        localStorage.setItem('vidlytics_stories', JSON.stringify(DEFAULT_STORIES));
        localStorage.setItem('vidlytics_settings', JSON.stringify(DEFAULT_SETTINGS));
        localStorage.setItem('vidlytics_comments', JSON.stringify(DEFAULT_COMMENTS));
      } else {
        // Se Supabase estiver configurado, garantir que os defaults existam se não houver nada no localStorage.
        // O Supabase será a fonte primária, mas o localStorage serve como um cache inicial.
        if (!localStorage.getItem('vidlytics_stores')) {
          localStorage.setItem('vidlytics_stores', JSON.stringify(DEFAULT_STORES));
        }
        if (!localStorage.getItem('vidlytics_stories')) {
          localStorage.setItem('vidlytics_stories', JSON.stringify(DEFAULT_STORIES));
        }
        if (!localStorage.getItem('vidlytics_settings')) {
          localStorage.setItem('vidlytics_settings', JSON.stringify(DEFAULT_SETTINGS));
        }
        if (!localStorage.getItem('vidlytics_comments')) {
          localStorage.setItem('vidlytics_comments', JSON.stringify(DEFAULT_COMMENTS));
        }
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

  async incrementViewCount(storyId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('increment_story_view', { story_id_param: storyId });
        if (error) throw error;
      } catch (e) {
        console.error('[Vidlytics] Erro ao incrementar visualização no Supabase:', e);
      }
    }
    // Fallback para memória/localStorage
    try {
      const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
      const story = stories.find((s: Story) => s.id === storyId);
      if (story) {
        story.view_count = (story.view_count || 0) + 1;
        localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
        memoryStories = stories;
      }
    } catch (e) {
      const story = memoryStories.find((s: Story) => s.id === storyId);
      if (story) {
        story.view_count = (story.view_count || 0) + 1;
      }
    }
  },

  async incrementClickCount(storyId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('increment_story_click', { story_id_param: storyId });
        if (error) throw error;
      } catch (e) {
        console.error('[Vidlytics] Erro ao incrementar clique no Supabase:', e);
      }
    }
    // Fallback para memória/localStorage
    try {
      const stories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
      const story = stories.find((s: Story) => s.id === storyId);
      if (story) {
        story.click_count = (story.click_count || 0) + 1;
        localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
        memoryStories = stories;
      }
    } catch (e) {
      const story = memoryStories.find((s: Story) => s.id === storyId);
      if (story) {
        story.click_count = (story.click_count || 0) + 1;
      }
    }
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
          whatsapp_number: DEFAULT_SETTINGS[0].whatsapp_number,
          display_urls: DEFAULT_SETTINGS[0].display_urls,
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
          whatsapp_number: DEFAULT_SETTINGS[0].whatsapp_number,
          display_urls: DEFAULT_SETTINGS[0].display_urls,
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
  },

  async getComments(storyId: string): Promise<Comment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('story_id', storyId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao buscar comentários no Supabase:', e);
      }
    }
    try {
      const local = localStorage.getItem('vidlytics_comments');
      const comments = local ? JSON.parse(local) : memoryComments;
      return comments
        .filter((c: Comment) => c.story_id === storyId)
        .sort((a: Comment, b: Comment) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    } catch (e) {
      return memoryComments
        .filter((c: Comment) => c.story_id === storyId)
        .sort((a: Comment, b: Comment) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    }
  },

  async saveComment(comment: Comment): Promise<Comment> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('comments').upsert(comment).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.error('[Vidlytics] Erro ao salvar comentário no Supabase:', e);
      }
    }
    const newComment = { ...comment, id: comment.id || Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    try {
      const comments = JSON.parse(localStorage.getItem('vidlytics_comments') || '[]');
      comments.push(newComment);
      localStorage.setItem('vidlytics_comments', JSON.stringify(comments));
      memoryComments = comments;
    } catch (e) {
      memoryComments.push(newComment);
    }
    return newComment;
  }
};