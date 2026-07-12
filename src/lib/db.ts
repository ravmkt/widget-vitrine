import { supabase } from './supabase';

// Interfaces (Mantidas conforme solicitado)
export interface Video {
  id: string;
  store_id: string;
  title: string;
  description?: string;
  source_type: 'upload' | 'instagram' | 'tiktok' | 'external_url' | 'mobile_upload' | 'gallery';
  video_url: string;
  thumbnail_url: string;
  poster_url?: string;
  image_url?: string;
  duration?: number;
  file_size?: number;
  status: 'active' | 'inactive';
  active?: boolean;
  instagram_link?: string;
  tiktok_link?: string;
  product_id?: string | null;
  model_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

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
  border_radius: string;
  shadow_enabled: boolean;
  font_family: string;
  widget_shape: 'rounded' | 'square' | 'circle';
  widget_size: 'small' | 'medium' | 'large';
  widget_animation: 'none' | 'fade' | 'slide' | 'bounce';
  carousel_card_shape: 'rounded' | 'square';
  carousel_visible_items: number;
  carousel_gap: number;
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

export type DisplayPosition =
  | 'before_element'
  | 'after_element'
  | 'inside_start'
  | 'inside_end'
  | 'replace_element'
  | 'fixed_bottom_right'
  | 'fixed_bottom_left'
  | 'fixed_top_right'
  | 'fixed_top_left';

export interface DisplayLocation {
  id: string;
  store_id: string;
  story_id: string;
  selector: string;
  position: DisplayPosition;
  created_at?: string;
  updated_at?: string;
}

export type ConditionType =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'all_pages'
  | 'home_only'
  | 'product_pages'
  | 'category_pages';

export interface PageRule {
  id: string;
  store_id: string;
  story_id: string;
  condition_type: ConditionType;
  value?: string;
  created_at?: string;
  updated_at?: string;
}

export type StoryFormat = 'floating_widget' | 'carousel' | 'grid';
export type CTAType = 'product' | 'custom_link' | 'whatsapp' | 'none';
export type ScrollDirection = 'horizontal' | 'vertical';

export interface Story {
  id: string;
  store_id: string;
  title: string;
  format: StoryFormat;
  scroll_direction?: ScrollDirection;
  active: boolean;
  appearance_id?: string;
  model_id?: string;
  cta_enabled: boolean;
  cta_text?: string;
  cta_type: CTAType;
  cta_url?: string;
  whatsapp_message?: string;
  view_count?: number;
  click_count?: number;
  created_at?: string;
  updated_at?: string;
  position: number;
}

export interface StoryVideo {
  id: string;
  store_id: string;
  story_id: string;
  video_id: string;
  position: number;
  is_cover: boolean;
  created_at?: string;
}

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

export interface StoryProduct {
  id: string;
  store_id: string;
  story_id: string;
  video_id?: string;
  product_id: string;
  created_at?: string;
}

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface Comment {
  id: string;
  store_id: string;
  story_id: string;
  video_id?: string;
  user_name: string;
  user_email?: string;
  text: string;
  status: CommentStatus;
  created_at?: string;
}

export type EventType =
  | 'view'
  | 'play'
  | 'pause'
  | 'click'
  | 'cta_click'
  | 'product_click'
  | 'whatsapp_click'
  | 'like'
  | 'share'
  | 'comment'
  | 'close'
  | 'conversion';

export interface Metric {
  id: string;
  store_id: string;
  story_id: string;
  video_id?: string;
  product_id?: string;
  event_type: EventType;
  page_url: string;
  device_type: string;
  browser: string;
  referrer?: string;
  created_at?: string;
}

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
  default_appearance_id?: string;
  timezone: string;
  language: string;
  open_product_new_tab: boolean;
  autoplay: boolean;
  muted_by_default: boolean;
  show_video_controls: boolean;
  created_at?: string;
  updated_at?: string;
  whatsapp_button_enabled?: boolean;
  pause_on_invisible?: boolean;
  public_installation_key?: string;
  widget_enabled?: boolean;
  default_template?: string;
  whatsapp_enabled?: boolean;
  whatsapp_message_template?: string;
  pause_on_leave?: boolean;
  store_public_id?: string;
  public_live_key?: string;
}

export interface Store {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  created_at?: string;
}

export interface SizeMeasure {
  name: string;
  value: number;
  unit: 'cm' | 'm';
}

export interface SizingModel {
  id: string;
  store_id: string;
  name: string;
  image_url?: string;
  measures: SizeMeasure[];
  size_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !!supabase;

// Branding Vitrine Vídeo
const DEFAULT_STORE: Store = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Loja Exemplo',
  domain: 'lojaexemplo.com.br',
  active: true,
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  id: 'gs1',
  store_id: DEFAULT_STORE.id,
  store_name: DEFAULT_STORE.name,
  store_url: DEFAULT_STORE.domain,
  logo_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80',
  contact_email: 'contato@vitrinevideo.com.br',
  whatsapp_number: '5545999629702',
  whatsapp_default_message: 'Olá! Tenho interesse no vídeo: {{story_title}}',
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
  whatsapp_button_enabled: true,
  pause_on_invisible: true,
  public_installation_key: 'pub_live_vitrine_video_001',
  widget_enabled: true,
  default_template: 'minimalista',
  whatsapp_enabled: true,
  whatsapp_message_template: 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
  pause_on_leave: true,
  store_public_id: 'store_11111111-1111-1111-1111-111111111111',
  public_live_key: 'pub_live_' + Math.random().toString(36).substr(2, 24),
};

const DEFAULT_APPEARANCES: Appearance[] = [
  {
    id: 'ap1',
    store_id: DEFAULT_STORE.id,
    name: 'Estilo Vitrine Azul',
    is_default: true,
    primary_color: '#0094EB',
    secondary_color: '#0E4787',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    border_radius: '12px',
    shadow_enabled: true,
    font_family: 'Inter, sans-serif',
    widget_shape: 'circle',
    widget_size: 'medium',
    widget_animation: 'bounce',
    carousel_card_shape: 'rounded',
    carousel_visible_items: 4,
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
];

// Fallback de memória e inicialização local
let memoryStores = [DEFAULT_STORE];
let memoryGeneralSettings = [DEFAULT_GENERAL_SETTINGS];
let memoryAppearances = [...DEFAULT_APPEARANCES];
let memoryVideos: Video[] = [];
let memoryStories: Story[] = [];
let memoryStoryVideos: StoryVideo[] = [];
let memoryProducts: Product[] = [];
let memoryStoryProducts: StoryProduct[] = [];
let memoryDisplayLocations: DisplayLocation[] = [];
let memoryPageRules: PageRule[] = [];
let memoryComments: Comment[] = [];
let memoryMetrics: Metric[] = [];
let memorySizingModels: SizingModel[] = [];

const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = [
        { key: 'vidlytics_stores', default: [DEFAULT_STORE] },
        { key: 'vidlytics_general_settings', default: [DEFAULT_GENERAL_SETTINGS] },
        { key: 'vidlytics_appearances', default: DEFAULT_APPEARANCES },
        { key: 'vidlytics_videos', default: [] },
        { key: 'vidlytics_stories', default: [] },
        { key: 'vidlytics_story_videos', default: [] },
        { key: 'vidlytics_products', default: [] },
        { key: 'vidlytics_story_products', default: [] },
        { key: 'vidlytics_display_locations', default: [] },
        { key: 'vidlytics_page_rules', default: [] },
        { key: 'vidlytics_comments', default: [] },
        { key: 'vidlytics_metrics', default: [] },
        { key: 'vidlytics_sizing_models', default: [] },
      ];

      items.forEach(item => {
        if (!localStorage.getItem(item.key)) {
          localStorage.setItem(item.key, JSON.stringify(item.default));
        }
      });
    }
  } catch (e) {
    console.warn('Não foi possível inicializar localStorage:', e);
  }
};

initLocalStorage();

/**
 * Garante que a loja exista na tabela `stores` do Supabase.
 *
 * Isso evita o erro:
 * insert or update on table "videos" violates foreign key constraint "videos_store_id_fkey"
 */
const ensureSupabaseStoreExists = async (storeId?: string) => {
  if (!isSupabaseConfigured || !storeId) return;

  const { data: existingStore, error: selectError } = await supabase
    .from('stores' as any)
    .select('id')
    .eq('id', storeId)
    .maybeSingle();

  if (selectError) {
    console.error('Erro ao verificar loja no Supabase:', selectError);
    throw selectError;
  }

  if (existingStore) return;

  let localStore: Store | null = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = localStorage.getItem('vidlytics_stores');
      const stores = local ? JSON.parse(local) as Store[] : [];

      localStore = stores.find(store => store.id === storeId) || null;
    }
  } catch (error) {
    console.warn('Não foi possível buscar loja no localStorage:', error);
  }

  const storeToInsert: Store = {
    id: storeId,
    name: localStore?.name || DEFAULT_STORE.name || 'Loja',
    domain: localStore?.domain || DEFAULT_STORE.domain || 'loja.com.br',
    active: localStore?.active ?? true,
    created_at: localStore?.created_at || new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('stores' as any)
    .insert(storeToInsert as any);

  if (insertError) {
    console.error('Erro ao criar loja no Supabase:', insertError);
    throw insertError;
  }
};

const createCrudFunctions = <
  T extends {
    id: string;
    store_id?: string;
    created_at?: string;
    updated_at?: string;
  }
>(
  tableName: string,
  memoryArray: T[],
) => {
  return {
    async getAll(storeId?: string): Promise<T[]> {
      const local = localStorage.getItem(`vidlytics_${tableName}`);
      const items = local ? JSON.parse(local) : memoryArray;

      return storeId
        ? items.filter((item: T) => item.store_id === storeId)
        : items;
    },

    async getById(id: string, storeId?: string): Promise<T | null> {
      const items = await this.getAll(storeId);

      return items.find((item: T) => item.id === id) || null;
    },

    async save(item: T): Promise<T> {
      const now = new Date().toISOString();
      const items = await this.getAll();
      const index = items.findIndex((s: T) => s.id === item.id);

      const updatedItem = {
        ...item,
        updated_at: now,
      };

      if (index >= 0) {
        items[index] = updatedItem;
      } else {
        items.push({
          ...updatedItem,
          created_at: item.created_at || now,
        });
      }

      localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(items));

      return updatedItem as T;
    },

    async delete(id: string): Promise<boolean> {
      const items = await this.getAll();
      const filtered = items.filter((s: T) => s.id !== id);

      localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(filtered));

      return true;
    },
  };
};

const createSupabaseCrudFunctions = <
  T extends {
    id: string;
    store_id?: string;
    created_at?: string;
    updated_at?: string;
  }
>(
  tableName: string,
  fallbackMemoryArray: T[],
) => {
  const localFallback = createCrudFunctions<T>(tableName, fallbackMemoryArray);

  return {
    async getAll(storeId?: string): Promise<T[]> {
      if (!isSupabaseConfigured) {
        return localFallback.getAll(storeId);
      }

      let query = supabase
        .from(tableName as any)
        .select('*');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error(`Erro ao buscar ${tableName}:`, error);
        throw error;
      }

      return (data || []) as T[];
    },

    async getById(id: string, storeId?: string): Promise<T | null> {
      if (!isSupabaseConfigured) {
        return localFallback.getById(id, storeId);
      }

      let query = supabase
        .from(tableName as any)
        .select('*')
        .eq('id', id);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(`Erro ao buscar ${tableName} por ID:`, error);
        throw error;
      }

      return data as T | null;
    },

    async save(item: T): Promise<T> {
      if (!isSupabaseConfigured) {
        return localFallback.save(item);
      }

      /**
       * Antes de salvar qualquer registro com store_id no Supabase,
       * garante que a loja exista na tabela `stores`.
       *
       * Principalmente necessário para `videos`,
       * pois a tabela possui FK `videos_store_id_fkey`.
       */
      if (tableName !== 'stores' && item.store_id) {
        await ensureSupabaseStoreExists(item.store_id);
      }

      const now = new Date().toISOString();

      const payload = {
        ...item,
        created_at: item.created_at || now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from(tableName as any)
        .upsert(payload as any, {
          onConflict: 'id',
        })
        .select()
        .single();

      if (error) {
        console.error(`Erro ao salvar ${tableName}:`, error);
        throw error;
      }

      return data as T;
    },

    async delete(id: string): Promise<boolean> {
      if (!isSupabaseConfigured) {
        return localFallback.delete(id);
      }

      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Erro ao deletar ${tableName}:`, error);
        throw error;
      }

      return true;
    },
  };
};

export const resolveStoreId = async (storeId?: string) => {
  if (storeId) return storeId;

  const stores = await db.stores.getAll();

  return stores[0]?.id || DEFAULT_STORE.id;
};

export const withStoreId = async <T extends { store_id?: string }>(
  item: T,
  storeId?: string,
) => ({
  ...item,
  store_id: item.store_id || (await resolveStoreId(storeId)),
});

export const replaceStoryRelations = async <
  T extends {
    id: string;
    store_id: string;
    story_id: string;
  }
>(
  tableName: 'story_videos' | 'story_products',
  storeId: string,
  storyId: string,
  relations: T[],
) => {
  const local = localStorage.getItem(`vidlytics_${tableName}`);
  const items = local ? JSON.parse(local) : [];

  const preserved = items.filter(
    (item: T) => !(item.store_id === storeId && item.story_id === storyId),
  );

  localStorage.setItem(
    `vidlytics_${tableName}`,
    JSON.stringify([
      ...preserved,
      ...relations.map(relation => ({
        ...relation,
        store_id: storeId,
      })),
    ]),
  );
};

export const db = {
  stores: createCrudFunctions<Store>('stores', memoryStores),
  generalSettings: createCrudFunctions<GeneralSettings>('general_settings', memoryGeneralSettings),
  appearances: createCrudFunctions<Appearance>('appearances', memoryAppearances),

  // Vídeos agora usam Supabase quando configurado.
  // Isso evita salvar base64/blob no localStorage.
  // Também garante que o store_id exista na tabela stores antes de salvar.
  videos: createSupabaseCrudFunctions<Video>('videos', memoryVideos),

  stories: createCrudFunctions<Story>('stories', memoryStories),
  storyVideos: createCrudFunctions<StoryVideo>('story_videos', memoryStoryVideos),
  products: createCrudFunctions<Product>('products', memoryProducts),
  storyProducts: createCrudFunctions<StoryProduct>('story_products', memoryStoryProducts),
  displayLocations: createCrudFunctions<DisplayLocation>('display_locations', memoryDisplayLocations),
  pageRules: createCrudFunctions<PageRule>('page_rules', memoryPageRules),
  comments: createCrudFunctions<Comment>('comments', memoryComments),
  metrics: createCrudFunctions<Metric>('metrics', memoryMetrics),
  sizingModels: createCrudFunctions<SizingModel>('sizing_models', memorySizingModels),

  profiles: createCrudFunctions<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    created_at?: string;
  }>('profiles', []),

  storeMembers: createCrudFunctions<{
    id: string;
    store_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at?: string;
  }>('store_members', []),

  subscriptions: createCrudFunctions<{
    id: string;
    store_id: string;
    plan_name: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    current_period_start?: string;
    current_period_end?: string;
    created_at?: string;
  }>('subscriptions', []),

  usageCounters: createCrudFunctions<{
    id: string;
    store_id: string;
    month: string;
    videos_count: number;
    views_count: number;
    users_count: number;
    created_at?: string;
    updated_at?: string;
  }>('usage_counters', []),
};
