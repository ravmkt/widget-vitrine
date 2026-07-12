import { supabase } from './supabase';

// Interfaces
export interface Video {
  id: string;
  store_id: string;
  title: string;
  description?: string;
  source_type:
    | 'upload'
    | 'instagram'
    | 'tiktok'
    | 'external_url'
    | 'mobile_upload'
    | 'gallery';
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
  appearance_id?: string | null;
  model_id?: string | null;
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
  video_id?: string | null;
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
  default_appearance_id?: string | null;
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
  owner_user_id?: string;
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

/**
 * UUIDs fixos válidos.
 */
const DEFAULT_STORE_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_GENERAL_SETTINGS_ID = '22222222-2222-4222-8222-222222222222';
const DEFAULT_APPEARANCE_ID = '33333333-3333-4333-8333-333333333333';

const DEFAULT_STORE: Store = {
  id: DEFAULT_STORE_ID,
  name: 'Loja Exemplo',
  domain: 'lojaexemplo.com.br',
  active: true,
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  id: DEFAULT_GENERAL_SETTINGS_ID,
  store_id: DEFAULT_STORE.id,
  store_name: DEFAULT_STORE.name,
  store_url: DEFAULT_STORE.domain,
  logo_url:
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80',
  contact_email: 'contato@vitrinevideo.com.br',
  whatsapp_number: '5545999629702',
  whatsapp_default_message: 'Olá! Tenho interesse no vídeo: {{story_title}}',
  app_enabled: true,
  stories_enabled: true,
  carousel_enabled: true,
  floating_widget_enabled: true,
  default_appearance_id: DEFAULT_APPEARANCE_ID,
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
  whatsapp_message_template:
    'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
  pause_on_leave: true,
  store_public_id: `store_${DEFAULT_STORE_ID}`,
  public_live_key: `pub_live_${Math.random().toString(36).substring(2, 26)}`,
};

const DEFAULT_APPEARANCES: Appearance[] = [
  {
    id: DEFAULT_APPEARANCE_ID,
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

/**
 * Helpers de UUID
 */
export const isValidUuid = (value: unknown): value is string => {
  if (!value || typeof value !== 'string') return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

export const generateUuid = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
};

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || value === '';

type UuidMode = 'required' | 'optional';

const TABLE_UUID_FIELDS: Record<string, Record<string, UuidMode>> = {
  stores: {
    id: 'required',
    owner_user_id: 'optional',
  },
  videos: {
    id: 'required',
    store_id: 'required',
    product_id: 'optional',
    model_id: 'optional',
  },
  stories: {
    id: 'required',
    store_id: 'required',
    appearance_id: 'optional',
    model_id: 'optional',
  },
  story_videos: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
    video_id: 'required',
  },
  products: {
    id: 'required',
    store_id: 'required',
  },
  story_products: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
    video_id: 'optional',
    product_id: 'required',
  },
  display_locations: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
  },
  page_rules: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
  },
  comments: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
    video_id: 'optional',
  },
  metrics: {
    id: 'required',
    store_id: 'required',
    story_id: 'required',
    video_id: 'optional',
    product_id: 'optional',
  },
  sizing_models: {
    id: 'required',
    store_id: 'required',
  },
  general_settings: {
    id: 'required',
    store_id: 'required',
    default_appearance_id: 'optional',
  },
  appearances: {
    id: 'required',
    store_id: 'required',
  },
};

const normalizeUuidPayload = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const payload: Record<string, any> = { ...item };
  const uuidFields = TABLE_UUID_FIELDS[tableName] || { id: 'required' };

  Object.entries(uuidFields).forEach(([field, mode]) => {
    const value = payload[field];

    /**
     * ID principal:
     * - Se vier vazio ou inválido, gera um UUID novo.
     */
    if (field === 'id') {
      if (isEmptyValue(value) || !isValidUuid(value)) {
        payload[field] = generateUuid();
      }

      return;
    }

    /**
     * Campos obrigatórios:
     * - Se vierem vazios ou inválidos, não dá para salvar com segurança.
     * - Exemplo: story_id, video_id, product_id em tabela de relação.
     */
    if (mode === 'required') {
      if (isEmptyValue(value) || !isValidUuid(value)) {
        throw new Error(
          `Campo UUID obrigatório inválido em "${tableName}.${field}": ${String(
            value,
          )}`,
        );
      }

      return;
    }

    /**
     * Campos opcionais:
     * - Se vierem vazios ou inválidos, converte para null.
     * - Isso evita erro: invalid input syntax for type uuid.
     */
    if (mode === 'optional') {
      if (isEmptyValue(value) || !isValidUuid(value)) {
        payload[field] = null;
      }
    }
  });

  return payload as T;
};

const removeUndefinedValues = <T extends Record<string, any>>(item: T): T => {
  const clean: Record<string, any> = {};

  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined) {
      clean[key] = value;
    }
  });

  return clean as T;
};

const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = [
        { key: 'vidlytics_stores', default: [DEFAULT_STORE] },
        {
          key: 'vidlytics_general_settings',
          default: [DEFAULT_GENERAL_SETTINGS],
        },
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

const ensureSupabaseStoreExists = async (storeId?: string) => {
  if (!isSupabaseConfigured || !storeId) return;

  if (!isValidUuid(storeId)) {
    throw new Error(`store_id inválido: ${storeId}`);
  }

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Erro ao buscar usuário autenticado:', userError);
    throw userError;
  }

  if (!user) {
    throw new Error(
      'Usuário não autenticado. Faça login antes de criar uma loja no Supabase.',
    );
  }

  let localStore: Store | null = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = localStorage.getItem('vidlytics_stores');
      const stores = local ? (JSON.parse(local) as Store[]) : [];

      localStore = stores.find(store => store.id === storeId) || null;
    }
  } catch (error) {
    console.warn('Não foi possível buscar loja no localStorage:', error);
  }

  const storeToInsert = {
    id: storeId,
    name: localStore?.name || DEFAULT_STORE.name || 'Loja',
    owner_user_id: user.id,
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
  },
>(
  tableName: string,
  memoryArray: T[],
) => {
  return {
    async getAll(storeId?: string): Promise<T[]> {
      const local =
        typeof window !== 'undefined'
          ? localStorage.getItem(`vidlytics_${tableName}`)
          : null;

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

      const normalizedItem = normalizeUuidPayload(
        tableName,
        removeUndefinedValues(item as any),
      ) as T;

      const index = items.findIndex((s: T) => s.id === normalizedItem.id);

      const updatedItem = {
        ...normalizedItem,
        updated_at: now,
      };

      if (index >= 0) {
        items[index] = updatedItem;
      } else {
        items.push({
          ...updatedItem,
          created_at: normalizedItem.created_at || now,
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(items));
      }

      return updatedItem as T;
    },

    async delete(id: string): Promise<boolean> {
      const items = await this.getAll();
      const filtered = items.filter((s: T) => s.id !== id);

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `vidlytics_${tableName}`,
          JSON.stringify(filtered),
        );
      }

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
  },
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

      let query = supabase.from(tableName as any).select('*');

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

      if (!isValidUuid(id)) {
        return null;
      }

      let query = supabase.from(tableName as any).select('*').eq('id', id);

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

      const now = new Date().toISOString();

      const originalId = item.id;
      const originalIdIsValid = isValidUuid(originalId);

      const payload = normalizeUuidPayload(
        tableName,
        removeUndefinedValues({
          ...item,
          created_at: item.created_at || now,
          updated_at: now,
        } as any),
      );

      if (tableName !== 'stores' && payload.store_id) {
        await ensureSupabaseStoreExists(payload.store_id);
      }

      /**
       * Se o ID original era válido, tentamos atualizar primeiro.
       * Se não existir registro, fazemos insert.
       *
       * Se o ID original era inválido/local temporário, fazemos insert direto
       * com UUID novo.
       */
      if (originalIdIsValid) {
        const { data: existingItem, error: selectError } = await supabase
          .from(tableName as any)
          .select('id')
          .eq('id', payload.id)
          .maybeSingle();

        if (selectError) {
          console.error(`Erro ao verificar ${tableName}:`, selectError);
          throw selectError;
        }

        if (existingItem) {
          const { data, error } = await supabase
            .from(tableName as any)
            .update(payload as any)
            .eq('id', payload.id)
            .select()
            .single();

          if (error) {
            console.error(`Erro ao atualizar ${tableName}:`, error);
            throw error;
          }

          return data as T;
        }
      }

      const { data, error } = await supabase
        .from(tableName as any)
        .insert(payload as any)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao inserir ${tableName}:`, error);
        throw error;
      }

      return data as T;
    },

    async delete(id: string): Promise<boolean> {
      if (!isSupabaseConfigured) {
        return localFallback.delete(id);
      }

      if (!isValidUuid(id)) {
        console.warn(`ID inválido ignorado ao deletar ${tableName}:`, id);
        return true;
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
  if (storeId && isValidUuid(storeId)) return storeId;

  const stores = await db.stores.getAll();
  const firstValidStore = stores.find(store => isValidUuid(store.id));

  return firstValidStore?.id || DEFAULT_STORE.id;
};

export const withStoreId = async <T extends { store_id?: string }>(
  item: T,
  storeId?: string,
) => ({
  ...item,
  store_id:
    item.store_id && isValidUuid(item.store_id)
      ? item.store_id
      : await resolveStoreId(storeId),
});

export const replaceStoryRelations = async <
  T extends {
    id: string;
    store_id: string;
    story_id: string;
  },
>(
  tableName: 'story_videos' | 'story_products',
  storeId: string,
  storyId: string,
  relations: T[],
) => {
  if (!isValidUuid(storeId)) {
    throw new Error(`storeId inválido em replaceStoryRelations: ${storeId}`);
  }

  if (!isValidUuid(storyId)) {
    throw new Error(`storyId inválido em replaceStoryRelations: ${storyId}`);
  }

  /**
   * Versão Supabase.
   */
  if (isSupabaseConfigured) {
    await ensureSupabaseStoreExists(storeId);

    const { error: deleteError } = await supabase
      .from(tableName as any)
      .delete()
      .eq('store_id', storeId)
      .eq('story_id', storyId);

    if (deleteError) {
      console.error(`Erro ao limpar relações em ${tableName}:`, deleteError);
      throw deleteError;
    }

    if (!relations.length) return;

    const payload = relations.map(relation =>
      normalizeUuidPayload(tableName, {
        ...relation,
        id: isValidUuid(relation.id) ? relation.id : generateUuid(),
        store_id: storeId,
        story_id: storyId,
      } as any),
    );

    const { error: insertError } = await supabase
      .from(tableName as any)
      .insert(payload as any);

    if (insertError) {
      console.error(`Erro ao inserir relações em ${tableName}:`, insertError);
      throw insertError;
    }

    return;
  }

  /**
   * Versão localStorage.
   */
  const local =
    typeof window !== 'undefined'
      ? localStorage.getItem(`vidlytics_${tableName}`)
      : null;

  const items = local ? JSON.parse(local) : [];

  const preserved = items.filter(
    (item: T) => !(item.store_id === storeId && item.story_id === storyId),
  );

  const normalizedRelations = relations.map(relation =>
    normalizeUuidPayload(tableName, {
      ...relation,
      id: isValidUuid(relation.id) ? relation.id : generateUuid(),
      store_id: storeId,
      story_id: storyId,
    } as any),
  );

  if (typeof window !== 'undefined') {
    localStorage.setItem(
      `vidlytics_${tableName}`,
      JSON.stringify([...preserved, ...normalizedRelations]),
    );
  }
};

export const db = {
  stores: createCrudFunctions<Store>('stores', memoryStores),
  generalSettings: createCrudFunctions<GeneralSettings>(
    'general_settings',
    memoryGeneralSettings,
  ),
  appearances: createCrudFunctions<Appearance>('appearances', memoryAppearances),

  videos: createSupabaseCrudFunctions<Video>('videos', memoryVideos),
  stories: createSupabaseCrudFunctions<Story>('stories', memoryStories),
  storyVideos: createSupabaseCrudFunctions<StoryVideo>(
    'story_videos',
    memoryStoryVideos,
  ),
  products: createSupabaseCrudFunctions<Product>('products', memoryProducts),
  storyProducts: createSupabaseCrudFunctions<StoryProduct>(
    'story_products',
    memoryStoryProducts,
  ),

  displayLocations: createCrudFunctions<DisplayLocation>(
    'display_locations',
    memoryDisplayLocations,
  ),
  pageRules: createCrudFunctions<PageRule>('page_rules', memoryPageRules),
  comments: createCrudFunctions<Comment>('comments', memoryComments),
  metrics: createCrudFunctions<Metric>('metrics', memoryMetrics),
  sizingModels: createCrudFunctions<SizingModel>(
    'sizing_models',
    memorySizingModels,
  ),

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
