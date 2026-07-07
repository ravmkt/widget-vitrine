import { supabase } from './supabase';

// --- 1. Vídeos da galeria ---
export interface Video {
  id: string;
  store_id: string;
  title: string;
  source_type: 'upload' | 'instagram' | 'tiktok' | 'external_url' | 'mobile_upload' | 'gallery';
  video_url: string;
  thumbnail_url: string;
  duration?: number; // em segundos
  file_size?: number; // em bytes
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

// --- 6. Aparência ---
export interface Appearance {
  id: string;
  store_id: string;
  name: string;
  is_default: boolean;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  button_color: string;
  border_radius: string; // ex: '8px', '12px', 'full'
  shadow_enabled: boolean;
  font_family: string;
  widget_shape: 'rounded' | 'square' | 'circle';
  widget_size: 'small' | 'medium' | 'large';
  widget_animation: 'none' | 'fade' | 'slide' | 'bounce';
  carousel_card_shape: 'rounded' | 'square';
  carousel_visible_items: number;
  carousel_gap: number; // em pixels
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  show_whatsapp_button: boolean;
  show_product_button: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- 4. Local de exibição dentro da página ---
export type DisplayPosition = 'before_element' | 'after_element' | 'inside_start' | 'inside_end' | 'replace_element' | 'fixed_bottom_right' | 'fixed_bottom_left' | 'fixed_top_right' | 'fixed_top_left';

export interface DisplayLocation {
  id: string;
  store_id: string;
  story_id: string; // Relaciona a um story específico
  selector: string; // Seletor CSS do elemento alvo
  position: DisplayPosition;
  created_at?: string;
  updated_at?: string;
}

// --- 5. Regras de página ---
export type ConditionType = 'contains' | 'equals' | 'not_equals' | 'starts_with' | 'ends_with' | 'regex' | 'all_pages' | 'home_only' | 'product_pages' | 'category_pages';

export interface PageRule {
  id: string;
  store_id: string;
  story_id: string; // Relaciona a um story específico
  condition_type: ConditionType;
  value?: string; // O valor da URL ou padrão
  created_at?: string;
  updated_at?: string;
}

// --- 2. Story ou bloco de vídeo ---
export type StoryFormat = 'floating_widget' | 'carousel' | 'grid'; // Adicionado 'grid'
export type CTAType = 'product' | 'custom_link' | 'whatsapp' | 'none';
export type ScrollDirection = 'horizontal' | 'vertical';

export interface Story {
  id: string;
  store_id: string;
  title: string;
  format: StoryFormat;
  scroll_direction?: ScrollDirection;
  active: boolean;
  appearance_id?: string; // ID da aparência personalizada
  cta_enabled: boolean;
  cta_text?: string;
  cta_type: CTAType;
  cta_url?: string;
  whatsapp_message?: string;
  view_count?: number; // Métricas agregadas
  click_count?: number; // Métricas agregadas
  created_at?: string;
  updated_at?: string;
}

// --- 3. Relação entre story/carrossel e vídeos ---
export interface StoryVideo {
  id: string;
  story_id: string;
  video_id: string;
  position: number;
  is_cover: boolean; // Se for o vídeo principal/capa do story
  created_at?: string;
}

// --- 7. Produtos ---
export interface Product {
  id: string;
  store_id: string;
  name: string;
  image_url: string;
  product_url: string;
  price: number;
  sku?: string;
  short_description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- 8. Relação vídeo/story com produto ---
export interface StoryProduct {
  id: string;
  story_id: string;
  video_id?: string; // Opcional, se o produto estiver ligado a um vídeo específico dentro do story
  product_id: string;
  created_at?: string;
}

// --- 9. Comentários ---
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface Comment {
  id: string;
  story_id: string;
  video_id?: string; // Opcional, se o comentário for sobre um vídeo específico
  user_name: string;
  user_email?: string;
  text: string;
  status: CommentStatus;
  created_at?: string;
}

// --- 10. Métricas/eventos ---
export type EventType = 'view' | 'play' | 'pause' | 'click' | 'cta_click' | 'product_click' | 'whatsapp_click' | 'like' | 'share' | 'comment' | 'close' | 'conversion';

export interface Metric {
  id: string;
  story_id: string;
  video_id?: string;
  product_id?: string;
  event_type: EventType;
  page_url: string;
  device_type: string; // ex: 'mobile', 'desktop'
  browser: string; // ex: 'Chrome', 'Firefox'
  referrer?: string;
  created_at?: string;
}

// --- 11. Configurações gerais ---
export interface GeneralSettings {
  id: string;
  store_id: string;
  store_name: string;
  store_url: string;
  logo_url?: string;
  contact_email?: string;
  whatsapp_number?: string;
  whatsapp_default_message?: string;
  app_enabled: boolean;
  stories_enabled: boolean;
  carousel_enabled: boolean;
  floating_widget_enabled: boolean;
  default_appearance_id?: string; // ID da aparência padrão
  timezone: string;
  language: string;
  open_product_new_tab: boolean;
  autoplay: boolean;
  muted_by_default: boolean;
  show_video_controls: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- Store (mantida, mas com campos atualizados se necessário) ---
export interface Store {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  created_at?: string;
}


export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY && !!supabase;

// --- Dados Iniciais de Exemplo ---
const DEFAULT_STORE: Store = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Useanny',
  domain: 'useanny.com.br',
  active: true,
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  id: 'gs1',
  store_id: DEFAULT_STORE.id,
  store_name: DEFAULT_STORE.name,
  store_url: DEFAULT_STORE.domain,
  logo_url: 'https://via.placeholder.com/40x40?text=U',
  contact_email: 'contato@useanny.com.br',
  whatsapp_number: '5545999629702',
  whatsapp_default_message: 'Olá! Tenho interesse nos produtos da Useanny.',
  app_enabled: true,
  stories_enabled: true,
  carousel_enabled: true,
  floating_widget_enabled: true,
  default_appearance_id: 'ap1',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  open_product_new_tab: true,
  autoplay: true,
  muted_by_default: true,
  show_video_controls: false,
};

const DEFAULT_APPEARANCES: Appearance[] = [
  {
    id: 'ap1',
    store_id: DEFAULT_STORE.id,
    name: 'Padrão Violeta',
    is_default: true,
    primary_color: '#8B5CF6', // Violet-600
    secondary_color: '#EC4899', // Fuchsia-500
    text_color: '#1e293b', // Slate-800
    background_color: '#f8fafc', // Slate-50
    button_color: '#8B5CF6',
    border_radius: '12px',
    shadow_enabled: true,
    font_family: 'Inter, sans-serif',
    widget_shape: 'rounded',
    widget_size: 'medium',
    widget_animation: 'fade',
    carousel_card_shape: 'rounded',
    carousel_visible_items: 3,
    carousel_gap: 16,
    show_title: true,
    show_play_button: true,
    show_product: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_whatsapp_button: true,
    show_product_button: true,
  },
  {
    id: 'ap2',
    store_id: DEFAULT_STORE.id,
    name: 'Minimalista Escuro',
    is_default: false,
    primary_color: '#334155', // Slate-700
    secondary_color: '#64748b', // Slate-500
    text_color: '#f8fafc', // Slate-50
    background_color: '#0f172a', // Slate-900
    button_color: '#334155',
    border_radius: '8px',
    shadow_enabled: false,
    font_family: 'Roboto, sans-serif',
    widget_shape: 'square',
    widget_size: 'small',
    widget_animation: 'none',
    carousel_card_shape: 'square',
    carousel_visible_items: 4,
    carousel_gap: 8,
    show_title: false,
    show_play_button: true,
    show_product: false,
    show_like_button: false,
    show_comment_button: false,
    show_share_button: false,
    show_whatsapp_button: false,
    show_product_button: false,
  }
];

const DEFAULT_VIDEOS: Video[] = [
  {
    id: 'v1',
    store_id: DEFAULT_STORE.id,
    title: 'Vídeo de Apresentação da Loja',
    source_type: 'external_url',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250&auto=format&fit=crop&q=60',
    duration: 30,
    file_size: 5000000,
    status: 'active',
  },
  {
    id: 'v2',
    store_id: DEFAULT_STORE.id,
    title: 'Dicas de Moda Verão',
    source_type: 'external_url',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=250&auto=format&fit=crop&q=60',
    duration: 45,
    file_size: 8000000,
    status: 'active',
  },
  {
    id: 'v3',
    store_id: DEFAULT_STORE.id,
    title: 'Tutorial de Maquiagem',
    source_type: 'external_url',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=250&auto=format&fit=crop&q=60',
    duration: 60,
    file_size: 10000000,
    status: 'active',
  },
];

const DEFAULT_STORIES: Story[] = [
  {
    id: 's1',
    store_id: DEFAULT_STORE.id,
    title: 'Nova Coleção Outono 🍂',
    format: 'carousel',
    scroll_direction: 'horizontal',
    active: true,
    appearance_id: 'ap1',
    cta_enabled: true,
    cta_text: 'Comprar Agora',
    cta_type: 'custom_link',
    cta_url: 'https://useanny.com.br/collections/outono',
    whatsapp_message: 'Olá! Tenho interesse na nova coleção de outono.',
    view_count: 1200,
    click_count: 85,
  },
  {
    id: 's2',
    store_id: DEFAULT_STORE.id,
    title: 'Unboxing Especial 🎁',
    format: 'floating_widget',
    active: true,
    appearance_id: 'ap1',
    cta_enabled: true,
    cta_text: 'Ver Produto',
    cta_type: 'product',
    cta_url: 'https://useanny.com.br/products/vestido-especial',
    whatsapp_message: 'Olá! Gostaria de saber mais sobre o produto do unboxing.',
    view_count: 950,
    click_count: 60,
  },
  {
    id: 's3',
    store_id: DEFAULT_STORE.id,
    title: 'Provador Fashion ✨',
    format: 'carousel',
    scroll_direction: 'vertical',
    active: true,
    appearance_id: 'ap1',
    cta_enabled: false,
    cta_type: 'none',
    view_count: 1500,
    click_count: 110,
  },
];

const DEFAULT_STORY_VIDEOS: StoryVideo[] = [
  { id: 'sv1', story_id: 's1', video_id: 'v1', position: 1, is_cover: true },
  { id: 'sv2', story_id: 's1', video_id: 'v2', position: 2, is_cover: false },
  { id: 'sv3', story_id: 's2', video_id: 'v3', position: 1, is_cover: true },
  { id: 'sv4', story_id: 's3', video_id: 'v1', position: 1, is_cover: true },
  { id: 'sv5', story_id: 's3', video_id: 'v2', position: 2, is_cover: false },
  { id: 'sv6', story_id: 's3', video_id: 'v3', position: 3, is_cover: false },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    store_id: DEFAULT_STORE.id,
    name: 'Vestido Floral Verão',
    image_url: 'https://images.unsplash.com/photo-1581044777550-4cfa607037dc?w=200&auto=format&fit=crop&q=60',
    product_url: 'https://useanny.com.br/products/vestido-floral',
    price: 129.90,
    sku: 'VFV001',
    short_description: 'Vestido leve e elegante para o verão.',
    active: true,
  },
  {
    id: 'p2',
    store_id: DEFAULT_STORE.id,
    name: 'Bolsa de Couro Clássica',
    image_url: 'https://images.unsplash.com/photo-1566150905458-1bf1666d5023?w=200&auto=format&fit=crop&q=60',
    product_url: 'https://useanny.com.br/products/bolsa-couro',
    price: 299.00,
    sku: 'BCC002',
    short_description: 'Bolsa sofisticada para todas as ocasiões.',
    active: true,
  },
];

const DEFAULT_STORY_PRODUCTS: StoryProduct[] = [
  { id: 'sp1', story_id: 's1', product_id: 'p1' },
  { id: 'sp2', story_id: 's2', product_id: 'p2', video_id: 'v3' }, // Exemplo de produto vinculado a um vídeo específico dentro de um story
];

const DEFAULT_DISPLAY_LOCATIONS: DisplayLocation[] = [
  { id: 'dl1', store_id: DEFAULT_STORE.id, story_id: 's1', selector: '#main-content', position: 'after_element' },
  { id: 'dl2', store_id: DEFAULT_STORE.id, story_id: 's2', selector: 'body', position: 'fixed_bottom_right' },
];

const DEFAULT_PAGE_RULES: PageRule[] = [
  { id: 'pr1', store_id: DEFAULT_STORE.id, story_id: 's1', condition_type: 'all_pages' },
  { id: 'pr2', store_id: DEFAULT_STORE.id, story_id: 's2', condition_type: 'home_only' },
  { id: 'pr3', store_id: DEFAULT_STORE.id, story_id: 's3', condition_type: 'contains', value: '/colecoes/' },
];

const DEFAULT_COMMENTS: Comment[] = [
  { id: 'c1', story_id: 's1', user_name: 'Ana Silva', user_email: 'ana@example.com', text: 'Adorei a nova coleção! Os vídeos são incríveis.', status: 'approved', created_at: new Date().toISOString() },
  { id: 'c2', story_id: 's1', user_name: 'Bruno Costa', text: 'Qual o tecido do vestido floral?', status: 'pending', created_at: new Date(Date.now() - 60000).toISOString() },
  { id: 'c3', story_id: 's2', video_id: 'v3', user_name: 'Carla Dias', text: 'Essa bolsa é perfeita! Preciso de uma.', status: 'approved', created_at: new Date(Date.now() - 120000).toISOString() },
];

const DEFAULT_METRICS: Metric[] = [
  { id: 'm1', story_id: 's1', event_type: 'view', page_url: '/home', device_type: 'desktop', browser: 'Chrome', created_at: new Date().toISOString() },
  { id: 'm2', story_id: 's1', event_type: 'play', page_url: '/home', device_type: 'desktop', browser: 'Chrome', created_at: new Date().toISOString() },
  { id: 'm3', story_id: 's1', event_type: 'cta_click', page_url: '/home', device_type: 'desktop', browser: 'Chrome', created_at: new Date().toISOString() },
  { id: 'm4', story_id: 's2', event_type: 'view', page_url: '/home', device_type: 'mobile', browser: 'Safari', created_at: new Date().toISOString() },
  { id: 'm5', story_id: 's2', event_type: 'whatsapp_click', page_url: '/home', device_type: 'mobile', browser: 'Safari', created_at: new Date().toISOString() },
];


// --- Fallback em memória e inicialização do localStorage ---
let memoryStores = [DEFAULT_STORE];
let memoryGeneralSettings = [DEFAULT_GENERAL_SETTINGS];
let memoryAppearances = [...DEFAULT_APPEARANCES];
let memoryVideos = [...DEFAULT_VIDEOS];
let memoryStories = [...DEFAULT_STORIES];
let memoryStoryVideos = [...DEFAULT_STORY_VIDEOS];
let memoryProducts = [...DEFAULT_PRODUCTS];
let memoryStoryProducts = [...DEFAULT_STORY_PRODUCTS];
let memoryDisplayLocations = [...DEFAULT_DISPLAY_LOCATIONS];
let memoryPageRules = [...DEFAULT_PAGE_RULES];
let memoryComments = [...DEFAULT_COMMENTS];
let memoryMetrics = [...DEFAULT_METRICS];


const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = [
        { key: 'vidlytics_stores', default: [DEFAULT_STORE] },
        { key: 'vidlytics_general_settings', default: [DEFAULT_GENERAL_SETTINGS] },
        { key: 'vidlytics_appearances', default: DEFAULT_APPEARANCES },
        { key: 'vidlytics_videos', default: DEFAULT_VIDEOS },
        { key: 'vidlytics_stories', default: DEFAULT_STORIES },
        { key: 'vidlytics_story_videos', default: DEFAULT_STORY_VIDEOS },
        { key: 'vidlytics_products', default: DEFAULT_PRODUCTS },
        { key: 'vidlytics_story_products', default: DEFAULT_STORY_PRODUCTS },
        { key: 'vidlytics_display_locations', default: DEFAULT_DISPLAY_LOCATIONS },
        { key: 'vidlytics_page_rules', default: DEFAULT_PAGE_RULES },
        { key: 'vidlytics_comments', default: DEFAULT_COMMENTS },
        { key: 'vidlytics_metrics', default: DEFAULT_METRICS },
      ];

      items.forEach(item => {
        if (!isSupabaseConfigured || !localStorage.getItem(item.key)) {
          localStorage.setItem(item.key, JSON.stringify(item.default));
        }
      });

      // Load into memory fallback
      memoryStores = JSON.parse(localStorage.getItem('vidlytics_stores') || '[]');
      memoryGeneralSettings = JSON.parse(localStorage.getItem('vidlytics_general_settings') || '[]');
      memoryAppearances = JSON.parse(localStorage.getItem('vidlytics_appearances') || '[]');
      memoryVideos = JSON.parse(localStorage.getItem('vidlytics_videos') || '[]');
      memoryStories = JSON.parse(localStorage.getItem('vidlytics_stories') || '[]');
      memoryStoryVideos = JSON.parse(localStorage.getItem('vidlytics_story_videos') || '[]');
      memoryProducts = JSON.parse(localStorage.getItem('vidlytics_products') || '[]');
      memoryStoryProducts = JSON.parse(localStorage.getItem('vidlytics_story_products') || '[]');
      memoryDisplayLocations = JSON.parse(localStorage.getItem('vidlytics_display_locations') || '[]');
      memoryPageRules = JSON.parse(localStorage.getItem('vidlytics_page_rules') || '[]');
      memoryComments = JSON.parse(localStorage.getItem('vidlytics_comments') || '[]');
      memoryMetrics = JSON.parse(localStorage.getItem('vidlytics_metrics') || '[]');

    }
  } catch (e) {
    console.warn('[Vidlytics] LocalStorage indisponível. Usando fallback em memória.', e);
  }
};

initLocalStorage();

// --- Funções Genéricas de CRUD para Supabase e LocalStorage ---
const createCrudFunctions = <T extends { id: string; store_id?: string; created_at?: string; updated_at?: string }>(
  tableName: string,
  memoryArray: T[],
  defaultData: T[],
) => {
  return {
    async getAll(storeId?: string): Promise<T[]> {
      if (isSupabaseConfigured && supabase) {
        try {
          let query = supabase.from(tableName).select('*');
          if (storeId) {
            query = query.eq('store_id', storeId);
          }
          const { data, error } = await query;
          if (!error && data) return data as T[];
        } catch (e) {
          console.error(`[Vidlytics] Erro ao buscar ${tableName} no Supabase:`, e);
        }
      }
      try {
        const local = localStorage.getItem(`vidlytics_${tableName}`);
        const items = local ? JSON.parse(local) : memoryArray;
        return storeId ? items.filter((item: T) => item.store_id === storeId) : items;
      } catch (e) {
        return storeId ? memoryArray.filter((item: T) => item.store_id === storeId) : memoryArray;
      }
    },

    async getById(id: string): Promise<T | null> {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
          if (!error && data) return data as T;
        } catch (e) {
          console.error(`[Vidlytics] Erro ao buscar ${tableName} por ID no Supabase:`, e);
        }
      }
      try {
        const local = localStorage.getItem(`vidlytics_${tableName}`);
        const items = local ? JSON.parse(local) : memoryArray;
        return items.find((item: T) => item.id === id) || null;
      } catch (e) {
        return memoryArray.find((item: T) => item.id === id) || null;
      }
    },

    async save(item: T): Promise<T> {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from(tableName).upsert(item).select().single();
          if (!error && data) return data as T;
        } catch (e) {
          console.error(`[Vidlytics] Erro ao salvar ${tableName} no Supabase:`, e);
        }
      }
      const now = new Date().toISOString();
      const updatedItem = { ...item, updated_at: now };
      try {
        const items = JSON.parse(localStorage.getItem(`vidlytics_${tableName}`) || '[]');
        const index = items.findIndex((s: T) => s.id === item.id);
        if (index >= 0) {
          items[index] = updatedItem;
        } else {
          items.push({ ...updatedItem, created_at: now });
        }
        localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(items));
        // Update memory array reference
        const newMemoryArray = [...memoryArray];
        const memoryIndex = newMemoryArray.findIndex((s: T) => s.id === item.id);
        if (memoryIndex >= 0) {
          newMemoryArray[memoryIndex] = updatedItem;
        } else {
          newMemoryArray.push({ ...updatedItem, created_at: now });
        }
        // This is a hack to update the module-level memory array. In a real app,
        // you'd pass a setter or use a state management library.
        switch (tableName) {
          case 'stores': memoryStores = newMemoryArray as Store[]; break;
          case 'general_settings': memoryGeneralSettings = newMemoryArray as GeneralSettings[]; break;
          case 'appearances': memoryAppearances = newMemoryArray as Appearance[]; break;
          case 'videos': memoryVideos = newMemoryArray as Video[]; break;
          case 'stories': memoryStories = newMemoryArray as Story[]; break;
          case 'story_videos': memoryStoryVideos = newMemoryArray as StoryVideo[]; break;
          case 'products': memoryProducts = newMemoryArray as Product[]; break;
          case 'story_products': memoryStoryProducts = newMemoryArray as StoryProduct[]; break;
          case 'display_locations': memoryDisplayLocations = newMemoryArray as DisplayLocation[]; break;
          case 'page_rules': memoryPageRules = newMemoryArray as PageRule[]; break;
          case 'comments': memoryComments = newMemoryArray as Comment[]; break;
          case 'metrics': memoryMetrics = newMemoryArray as Metric[]; break;
        }
      } catch (e) {
        const index = memoryArray.findIndex((s: T) => s.id === item.id);
        if (index >= 0) {
          memoryArray[index] = updatedItem;
        } else {
          memoryArray.push({ ...updatedItem, created_at: now });
        }
      }
      return item;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from(tableName).delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.error(`[Vidlytics] Erro ao deletar ${tableName} no Supabase:`, e);
        }
      }
      try {
        const items = JSON.parse(localStorage.getItem(`vidlytics_${tableName}`) || '[]');
        const filtered = items.filter((s: T) => s.id !== id);
        localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(filtered));
        // Update memory array reference
        const newMemoryArray = memoryArray.filter((s: T) => s.id !== id);
        switch (tableName) {
          case 'stores': memoryStores = newMemoryArray as Store[]; break;
          case 'general_settings': memoryGeneralSettings = newMemoryArray as GeneralSettings[]; break;
          case 'appearances': memoryAppearances = newMemoryArray as Appearance[]; break;
          case 'videos': memoryVideos = newMemoryArray as Video[]; break;
          case 'stories': memoryStories = newMemoryArray as Story[]; break;
          case 'story_videos': memoryStoryVideos = newMemoryArray as StoryVideo[]; break;
          case 'products': memoryProducts = newMemoryArray as Product[]; break;
          case 'story_products': memoryStoryProducts = newMemoryArray as StoryProduct[]; break;
          case 'display_locations': memoryDisplayLocations = newMemoryArray as DisplayLocation[]; break;
          case 'page_rules': memoryPageRules = newMemoryArray as PageRule[]; break;
          case 'comments': memoryComments = newMemoryArray as Comment[]; break;
          case 'metrics': memoryMetrics = newMemoryArray as Metric[]; break;
        }
      } catch (e) {
        // Update memory array directly
        const index = memoryArray.findIndex((s: T) => s.id === id);
        if (index > -1) {
          memoryArray.splice(index, 1);
        }
      }
      return true;
    },
  };
};

export const db = {
  stores: createCrudFunctions<Store>('stores', memoryStores, [DEFAULT_STORE]),
  generalSettings: createCrudFunctions<GeneralSettings>('general_settings', memoryGeneralSettings, [DEFAULT_GENERAL_SETTINGS]),
  appearances: createCrudFunctions<Appearance>('appearances', memoryAppearances, DEFAULT_APPEARANCES),
  videos: createCrudFunctions<Video>('videos', memoryVideos, DEFAULT_VIDEOS),
  stories: createCrudFunctions<Story>('stories', memoryStories, DEFAULT_STORIES),
  storyVideos: createCrudFunctions<StoryVideo>('story_videos', memoryStoryVideos, DEFAULT_STORY_VIDEOS),
  products: createCrudFunctions<Product>('products', memoryProducts, DEFAULT_PRODUCTS),
  storyProducts: createCrudFunctions<StoryProduct>('story_products', memoryStoryProducts, DEFAULT_STORY_PRODUCTS),
  displayLocations: createCrudFunctions<DisplayLocation>('display_locations', memoryDisplayLocations, DEFAULT_DISPLAY_LOCATIONS),
  pageRules: createCrudFunctions<PageRule>('page_rules', memoryPageRules, DEFAULT_PAGE_RULES),
  comments: createCrudFunctions<Comment>('comments', memoryComments, DEFAULT_COMMENTS),
  metrics: createCrudFunctions<Metric>('metrics', memoryMetrics, DEFAULT_METRICS),

  // Métodos específicos para incrementar contadores (mantidos para simplicidade no dashboard)
  async incrementViewCount(storyId: string): Promise<void> {
    const story = await db.stories.getById(storyId);
    if (story) {
      const updatedStory = { ...story, view_count: (story.view_count || 0) + 1 };
      await db.stories.save(updatedStory);
    }
  },

  async incrementClickCount(storyId: string): Promise<void> {
    const story = await db.stories.getById(storyId);
    if (story) {
      const updatedStory = { ...story, click_count: (story.click_count || 0) + 1 };
      await db.stories.save(updatedStory);
    }
  },
};