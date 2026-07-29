import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════

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
  product_id?: string | null;
  model_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AppearanceDevice = 'desktop' | 'mobile';

export type ResponsiveAppearanceConfig<
  T extends Record<string, any> = Record<string, any>,
> = {
  desktop: T;
  mobile: T;
  [key: string]: any;
};

export interface Appearance {
  id: string;
  store_id: string;
  created_at?: string;
  updated_at?: string;

  // 🟦 Básico
  name?: string;
  is_default?: boolean;
  use_global_appearance?: boolean;

  // 🟨 Identidade Visual
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  button_color?: string;
  font_family?: string;
  font_size?: string;
  border_radius?: number;
  shadow_enabled?: boolean;

  // 🔴 Flutuante
  widget_shape?: string;
  widget_size?: string;
  widget_animation?: string;

  // 🟢 Carrossel — JSONB + CAMPOS PLANOS
  carousel_config?: ResponsiveAppearanceConfig;
  carousel_shape?: string;
  carousel_size?: string | number;
  carousel_card_shape?: string;
  carousel_visible_items?: number;
  carousel_spacing?: number;
  carousel_gap?: number;
  carousel_border_color?: string;
  carousel_border_width?: string | number;
  carousel_border_radius?: string | number;
  carousel_object_fit?: string;
  carousel_margin_top?: string | number;
  carousel_margin_bottom?: string | number;
  carousel_show_title?: boolean;
  carousel_show_product?: boolean;
  carousel_show_play_button?: boolean;
  carousel_auto_center?: boolean;
  carousel_view_mode?: string;

  // 🟣 Grade — JSONB + CAMPOS PLANOS
  grid_config?: ResponsiveAppearanceConfig;
  grid_shape?: string;
  grid_columns?: string;
  grid_rows?: string;
  grid_spacing?: string;
  grid_size?: string;
  grid_border_color?: string;
  grid_border_width?: string;
  grid_border_radius?: string;
  grid_object_fit?: string;
  grid_show_title?: boolean;

  // 🔵 Modal — JSONB + CAMPOS PLANOS
  modal_config?: ResponsiveAppearanceConfig;
  modal_show_title?: boolean;
  modal_show_play_button?: boolean;
  modal_show_product?: boolean;
  modal_show_like_button?: boolean;
  modal_show_comment_button?: boolean;
  modal_show_share_button?: boolean;
  modal_show_whatsapp_button?: boolean;
  modal_show_product_button?: boolean;
  modal_hide_stories?: boolean;
  modal_shadow_enabled?: boolean;
  modal_border_color?: string;
  modal_border_width?: string | number;
  modal_border_radius?: string | number;

  // 👁️ Visibilidade dos botões (legado)
  show_title?: boolean;
  show_play_button?: boolean;
  show_product?: boolean;
  show_like_button?: boolean;
  show_comment_button?: boolean;
  show_share_button?: boolean;
  show_whatsapp_button?: boolean;
  show_product_button?: boolean;

  // 🔗 Outros
  url?: string | null;

  // ⚠️ Aliases legados (normalizados em runtime, não salvos)
  isDefault?: boolean;
  useGlobalAppearance?: boolean;
}

export type DisplayPosition =
  | 'beforebegin'
  | 'afterend'
  | 'afterbegin'
  | 'beforeend';

export interface DisplayLocation {
  id: string;
  store_id: string;
  story_id: string;
  location?: string | null;
  selector: string;
  position: DisplayPosition;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ConditionType =
  | 'home'
  | 'all_pages'
  | 'url_contains'
  | 'url_equals'
  | 'url_not_equals';

export interface PageRule {
  id: string;
  store_id: string;
  story_id: string;
  condition_type: ConditionType;
  value?: string | null;
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
  is_cover: number;
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
  origin?: 'manual' | 'integration' | string;
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
  | 'whatsapp_product_click'
  | 'like'
  | 'unlike'
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
  platform?: string | null;
  defaultAppearanceId?: string | null;
  timezone: string;
  language: string;
  open_product_new_tab: boolean;
  autoplay: boolean;
  muted_by_default: boolean;
  mutedByDefault?: boolean;
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
  url: string;
  active: boolean;
  platform?: string;
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

// ═══════════════════════════════════════════════════════
// CONSTANTES E DADOS PADRÃO
// ═══════════════════════════════════════════════════════

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !!supabase;

const DEFAULT_STORE_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_store_settings_ID = '22222222-2222-4222-8222-222222222222';
const DEFAULT_APPEARANCE_ID = '33333333-3333-4333-8333-333333333333';

const DEFAULT_STORE: Store = {
  id: DEFAULT_STORE_ID,
  name: 'Loja Exemplo',
  url: 'lojaexemplo.com.br',
  active: true,
};

const DEFAULT_store_settings: GeneralSettings = {
  id: DEFAULT_store_settings_ID,
  store_id: DEFAULT_STORE.id,
  store_name: DEFAULT_STORE.name,
  store_url: DEFAULT_STORE.url,
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
    use_global_appearance: true,
    primary_color: '#0094EB',
    secondary_color: '#0E4787',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    font_family: 'Inter, sans-serif',
    font_size: '14',
    border_radius: 12,
    shadow_enabled: true,

    // 🔴 Flutuante
    widget_shape: 'circle',
    widget_size: '80',
    widget_animation: 'pulse',
    floating_config: {
      desktop: {
        show_title: true,
        show_play_button: true,
        allow_drag: true,
        allow_close: true,
        position: 'bottom-right',
      },
      mobile: {
        show_title: true,
        show_play_button: true,
        allow_drag: true,
        allow_close: true,
        position: 'bottom-right',
      },
    },

    // 🟢 Carrossel — JSONB + CAMPOS PLANOS
    carousel_card_shape: 'rounded',
    carousel_visible_items: 3,
    carousel_gap: 12,
    carousel_shape: 'rounded',
    carousel_size: '30',
    carousel_spacing: 12,
    carousel_view_mode: 'carousel',
    carousel_auto_center: true,
    carousel_show_title: true,
    carousel_show_product: true,
    carousel_show_play_button: true,
    carousel_border_radius: 8,
    carousel_object_fit: 'cover',
    carousel_config: {
      desktop: {
        shape: 'rounded',
        width: '30',
        visible_items: 3,
        spacing: 12,
        show_title: true,
        show_product: true,
        show_play_icon: true,
        auto_center: true,
        view_mode: 'carousel',
        border_radius: 8,
        object_fit: 'cover',
        margin_top: 0,
        margin_bottom: 0,
        border_color: '#E2E8F0',
        border_style: '0',
      },
      mobile: {
        shape: 'rounded',
        width: '40',
        visible_items: 2,
        spacing: 8,
        show_title: true,
        show_product: true,
        show_play_icon: true,
        auto_center: true,
        view_mode: 'carousel',
        border_radius: 8,
        object_fit: 'cover',
        margin_top: 0,
        margin_bottom: 0,
        border_color: '#E2E8F0',
        border_style: '0',
      },
    },

    // 🟣 Grade — JSONB + CAMPOS PLANOS
    grid_shape: 'rounded',
    grid_columns: '3',
    grid_rows: '2',
    grid_spacing: '12',
    grid_size: 'medium',
    grid_show_title: true,
    grid_border_radius: '8',
    grid_object_fit: 'cover',
    grid_config: {
      desktop: {
        card_shape: 'rounded',
        columns: 3,
        rows: 2,
        gap: 12,
        card_size: 'medium',
        show_title: true,
        border_radius: 8,
        object_fit: 'cover',
        border_color: '#E2E8F0',
        border_width: '0',
      },
      mobile: {
        card_shape: 'rounded',
        columns: 2,
        rows: 2,
        gap: 8,
        card_size: 'small',
        show_title: true,
        border_radius: 8,
        object_fit: 'cover',
        border_color: '#E2E8F0',
        border_width: '0',
      },
    },

    // 👁️ Visibilidade dos botões (legado)
    show_title: true,
    show_play_button: true,
    show_product: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_whatsapp_button: true,
    show_product_button: true,

    // 🔵 Modal — JSONB + CAMPOS PLANOS
    modal_show_title: true,
    modal_show_play_button: true,
    modal_show_product: true,
    modal_show_like_button: true,
    modal_show_comment_button: true,
    modal_show_share_button: true,
    modal_show_whatsapp_button: true,
    modal_show_product_button: true,
    modal_hide_stories: false,
    modal_shadow_enabled: true,
    modal_border_radius: 12,
    modal_config: {
      desktop: {
        show_title: true,
        show_play_button: true,
        show_product: true,
        show_like_button: true,
        show_comment_button: true,
        show_share_button: true,
        show_whatsapp_button: true,
        show_product_button: true,
        hide_stories: false,
        shadow_enabled: true,
        border_color: '#E2E8F0',
        border_width: '0',
        border_radius: 12,
      },
      mobile: {
        show_title: true,
        show_play_button: true,
        show_product: true,
        show_like_button: true,
        show_comment_button: true,
        show_share_button: true,
        show_whatsapp_button: true,
        show_product_button: true,
        hide_stories: false,
        shadow_enabled: true,
        border_color: '#E2E8F0',
        border_width: '0',
        border_radius: 12,
      },
    },
  },
];

let memoryStores = [DEFAULT_STORE];
let memoryStoreSettings = [DEFAULT_store_settings];
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

// ═══════════════════════════════════════════════════════
// HELPERS DE UUID
// ═══════════════════════════════════════════════════════

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
  stores: { id: 'required', owner_user_id: 'optional' },
  videos: { id: 'required', store_id: 'required', product_id: 'optional', model_id: 'optional' },
  stories: { id: 'required', store_id: 'required', appearance_id: 'optional', model_id: 'optional' },
  story_videos: { id: 'required', store_id: 'required', story_id: 'required', video_id: 'required' },
  story_products: { id: 'required', store_id: 'required', story_id: 'required', video_id: 'optional', product_id: 'required' },
  display_locations: { id: 'required', store_id: 'required', story_id: 'required' },
  page_rules: { id: 'required', store_id: 'required', story_id: 'required' },
  comments: { id: 'required', store_id: 'required', story_id: 'required', video_id: 'optional' },
  metrics: { id: 'required', store_id: 'required', story_id: 'required', video_id: 'optional', product_id: 'optional' },
  sizing_models: { id: 'required', store_id: 'required' },
  store_settings: { id: 'required', store_id: 'required', default_appearance_id: 'optional' },
  appearances: { id: 'required', store_id: 'required' },
};
// ═══════════════════════════════════════════════════════
// CAMPOS PERMITIDOS POR TABELA (SANITIZAÇÃO)
// ═══════════════════════════════════════════════════════

const TABLE_ALLOWED_FIELDS: Record<string, string[]> = {
  stores: ['id', 'name', 'url', 'platform', 'logo_url', 'contact_email', 'settings', 'owner_user_id'],
  videos: [
    'id', 'store_id', 'title', 'description', 'source_type',
    'video_url', 'thumbnail_url', 'poster_url', 'image_url',
    'duration', 'file_size', 'status', 'active', 'product_id',
    'model_id', 'created_at', 'updated_at',
  ],
  stories: [
    'id', 'store_id', 'title', 'format', 'scroll_direction',
    'active', 'appearance_id', 'model_id', 'position',
    'cta_enabled', 'cta_text', 'cta_type', 'cta_url',
    'whatsapp_message', 'view_count', 'click_count',
    'created_at', 'updated_at',
  ],
  story_videos: [
    'id', 'store_id', 'story_id', 'video_id', 'position', 'is_cover', 'created_at',
  ],
  products: [
    'id', 'store_id', 'name', 'image_url', 'product_url',
    'price', 'sku', 'short_description', 'active', 'origin',
    'import_source', 'external_id', 'xml_id', 'category',
    'is_active', 'last_imported_at', 'created_at', 'updated_at',
  ],
  story_products: [
    'id', 'store_id', 'story_id', 'video_id', 'product_id', 'created_at',
  ],
  display_locations: [
    'id', 'store_id', 'story_id', 'location', 'selector',
    'position', 'active', 'created_at', 'updated_at',
  ],
  page_rules: [
    'id', 'store_id', 'story_id', 'condition_type', 'value',
    'created_at', 'updated_at',
  ],
  comments: [
    'id', 'store_id', 'story_id', 'video_id', 'author_name',
    'author_email', 'content', 'status', 'active', 'reply_content',
    'reply_status', 'replied_at', 'replied_by', 'created_at', 'updated_at',
  ],
  metrics: [
    'id', 'store_id', 'story_id', 'video_id', 'product_id',
    'event_type', 'page_url', 'device_type', 'browser',
    'user_agent', 'referrer', 'metadata', 'created_at',
  ],
  sizing_models: [
    'id', 'store_id', 'name', 'image_url', 'measures',
    'size_name', 'created_at', 'updated_at',
  ],
  store_settings: [
    'id', 'store_id', 'store_name', 'store_url', 'logo_url',
    'contact_email', 'whatsapp_number', 'whatsapp_default_message',
    'app_enabled', 'stories_enabled', 'carousel_enabled',
    'floating_widget_enabled', 'default_appearance_id',
    'timezone', 'language', 'open_product_new_tab', 'autoplay',
    'muted_by_default', 'show_video_controls', 'created_at',
    'updated_at', 'whatsapp_button_enabled', 'pause_on_invisible',
    'public_installation_key', 'widget_enabled', 'default_template',
    'whatsapp_enabled', 'whatsapp_message_template', 'pause_on_leave',
    'store_public_id', 'public_live_key',
  ],
  appearances: [
    'id', 'store_id', 'created_at', 'updated_at',
    // 🟦 Básico
    'name', 'is_default', 'use_global_appearance',
    // 🟨 Identidade Visual
    'primary_color', 'secondary_color', 'text_color', 'background_color',
    'button_color', 'font_family', 'font_size', 'border_radius', 'shadow_enabled',
    // 🔴 Flutuante (não mexer — já funciona)
    'widget_shape', 'widget_size', 'widget_animation',
    // 🟢 Carrossel — JSONB + CAMPOS PLANOS
    'carousel_config',
    'carousel_shape', 'carousel_size', 'carousel_card_shape',
    'carousel_visible_items', 'carousel_spacing', 'carousel_gap',
    'carousel_border_color', 'carousel_border_width', 'carousel_border_radius',
    'carousel_object_fit', 'carousel_margin_top', 'carousel_margin_bottom',
    'carousel_show_title', 'carousel_show_product', 'carousel_show_play_button',
    'carousel_auto_center', 'carousel_view_mode',
    // 🟣 Grade — JSONB + CAMPOS PLANOS
    'grid_config',
    'grid_shape', 'grid_columns', 'grid_rows', 'grid_spacing', 'grid_size',
    'grid_border_color', 'grid_border_width', 'grid_border_radius',
    'grid_object_fit', 'grid_show_title',
    // 🔵 Modal — JSONB + CAMPOS PLANOS
    'modal_config',
    'modal_show_title', 'modal_show_play_button', 'modal_show_product',
    'modal_show_like_button', 'modal_show_comment_button', 'modal_show_share_button',
    'modal_show_whatsapp_button', 'modal_show_product_button',
    'modal_hide_stories', 'modal_shadow_enabled',
    'modal_border_color', 'modal_border_width', 'modal_border_radius',
    // 👁️ Visibilidade dos botões (legado)
    'show_title', 'show_play_button', 'show_product', 'show_like_button',
    'show_comment_button', 'show_share_button', 'show_whatsapp_button', 'show_product_button',
    // 📦 JSONB Configs
    'floating_config',
    // 🔗 Outros
    'url',
  ],
};

// ═══════════════════════════════════════════════════════
// NORMALIZAÇÃO DE PAYLOAD PARA SAVE
// ═══════════════════════════════════════════════════════

const normalizeAppearancePayloadBeforeSave = <T extends Record<string, any>>(
  item: T,
): T => {
  const payload: Record<string, any> = { ...item };

  if (
    payload.useGlobalAppearance !== undefined &&
    payload.use_global_appearance === undefined
  ) {
    payload.use_global_appearance = payload.useGlobalAppearance;
  }

  if (payload.isDefault !== undefined && payload.is_default === undefined) {
    payload.is_default = payload.isDefault;
  }

  delete payload.useGlobalAppearance;
  delete payload.isDefault;

  return payload as T;
};

const normalizeGeneralSettingsPayloadBeforeSave = <T extends Record<string, any>>(
  item: T,
): T => {
  const payload: Record<string, any> = { ...item };

  if (
    payload.defaultAppearanceId !== undefined &&
    payload.default_appearance_id === undefined
  ) {
    payload.default_appearance_id = payload.defaultAppearanceId;
  }

  if (
    payload.mutedByDefault !== undefined &&
    payload.muted_by_default === undefined
  ) {
    payload.muted_by_default = payload.mutedByDefault;
  }

  delete payload.defaultAppearanceId;
  delete payload.mutedByDefault;

  return payload as T;
};

const normalizeTablePayloadBeforeSave = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  if (tableName === 'appearances') {
    return normalizeAppearancePayloadBeforeSave(item);
  }
  if (tableName === 'store_settings') {
    return normalizeGeneralSettingsPayloadBeforeSave(item);
  }
  return item;
};

// ═══════════════════════════════════════════════════════
// NORMALIZAÇÃO DE DADOS PARA O CLIENT
// ═══════════════════════════════════════════════════════

const normalizeTableItemForClient = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const normalized: Record<string, any> = { ...item };

  // Normalização de comentários
  if (tableName === 'comments') {
    if (item.author_name !== undefined) normalized.user_name = item.author_name;
    if (item.author_email !== undefined) normalized.user_email = item.author_email;
    if (item.content !== undefined) normalized.text = item.content;

    if (item.reply_content) {
      normalized.replies = [
        {
          id: `reply-${item.id}`,
          user_name: 'Loja',
          text: item.reply_content,
          created_at: item.replied_at || item.updated_at || item.created_at,
          is_store_reply: true,
        },
      ];
    } else {
      normalized.replies = [];
    }
  }

  if (tableName !== 'appearances') {
    return normalized as T;
  }

  const appearance: Record<string, any> = normalized;

  // Aliases camelCase → snake_case bidirecionais
  if (appearance.useGlobalAppearance !== undefined && appearance.use_global_appearance === undefined) {
    appearance.use_global_appearance = appearance.useGlobalAppearance;
  }
  if (appearance.use_global_appearance !== undefined && appearance.useGlobalAppearance === undefined) {
    appearance.useGlobalAppearance = appearance.use_global_appearance;
  }
  if (appearance.isDefault !== undefined && appearance.is_default === undefined) {
    appearance.is_default = appearance.isDefault;
  }
  if (appearance.is_default !== undefined && appearance.isDefault === undefined) {
    appearance.isDefault = appearance.is_default;
  }

  // Garante que os JSONBs sejam objetos (defensivo)
  ['floating_config', 'carousel_config', 'grid_config', 'modal_config'].forEach(key => {
    if (appearance[key] && typeof appearance[key] === 'string') {
      try { appearance[key] = JSON.parse(appearance[key]); } catch { /* mantém string */ }
    }
    if (!appearance[key] || typeof appearance[key] !== 'object') {
      appearance[key] = { desktop: {}, mobile: {} };
    }
  });

  return appearance as T;
};

// ═══════════════════════════════════════════════════════
// SANITIZAÇÃO E PREPARAÇÃO DE PAYLOAD
// ═══════════════════════════════════════════════════════

const sanitizeTablePayload = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const normalizedItem = normalizeTablePayloadBeforeSave(tableName, item);
  const allowedFields = TABLE_ALLOWED_FIELDS[tableName];

  if (!allowedFields) return normalizedItem;

  const clean: Record<string, any> = {};

  Object.entries(normalizedItem).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      clean[key] = value;
    }
  });

  return clean as T;
};

const normalizeUuidPayload = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const payload: Record<string, any> = { ...item };
  const uuidFields = TABLE_UUID_FIELDS[tableName] || { id: 'required' };

  Object.entries(uuidFields).forEach(([field, mode]) => {
    const value = payload[field];

    if (field === 'id') {
      if (isEmptyValue(value) || !isValidUuid(value)) {
        payload[field] = generateUuid();
      }
      return;
    }

    if (mode === 'required') {
      if (isEmptyValue(value) || !isValidUuid(value)) {
        throw new Error(
          `Campo UUID obrigatório inválido em "${tableName}.${field}": ${String(value)}`,
        );
      }
      return;
    }

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

const preparePayloadForSave = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const normalizedPayload: Record<string, any> = { ...item };

  // Normalização inversa para comentários
  if (tableName === 'comments') {
    if (item.user_name !== undefined) normalizedPayload.author_name = item.user_name;
    if (item.user_email !== undefined) normalizedPayload.author_email = item.user_email;
    if (item.text !== undefined) normalizedPayload.content = item.text;

    if (item.replies && Array.isArray(item.replies) && item.replies.length > 0) {
      const storeReplies = item.replies.filter((r: any) => r.is_store_reply);
      if (storeReplies.length > 0) {
        const lastReply = storeReplies[storeReplies.length - 1];
        normalizedPayload.reply_content = lastReply.text;
        normalizedPayload.reply_status = 'replied';
        normalizedPayload.replied_at = lastReply.created_at || new Date().toISOString();
      }
    }

    delete normalizedPayload.user_name;
    delete normalizedPayload.user_email;
    delete normalizedPayload.text;
    delete normalizedPayload.replies;
    delete normalizedPayload.is_store_reply;
  }

  return normalizeUuidPayload(
    tableName,
    sanitizeTablePayload(tableName, removeUndefinedValues(normalizedPayload)),
  ) as T;
};

// ═══════════════════════════════════════════════════════
// INICIALIZAÇÃO DO LOCAL STORAGE
// ═══════════════════════════════════════════════════════

const initLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = [
        { key: 'vidlytics_stores', default: [DEFAULT_STORE] },
        { key: 'vidlytics_store_settings', default: [DEFAULT_store_settings] },
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

// ═══════════════════════════════════════════════════════
// VERIFICAÇÕES DE RELACIONAMENTO NO SUPABASE
// ═══════════════════════════════════════════════════════

const ensureSupabaseStoreExists = async (storeId?: string) => {
  if (!isSupabaseConfigured || !storeId) return;

  if (!isValidUuid(storeId)) {
    throw new Error(`store_id inválido: ${storeId}`);
  }

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

  const storeToInsert = sanitizeTablePayload('stores', {
    id: storeId,
    name: localStore?.name || 'Loja',
    url: localStore?.url || '',
    owner_user_id: user.id,
  });

  const { error } = await supabase
    .from('stores' as any)
    .upsert(storeToInsert as any, { onConflict: 'id' });

  if (error) {
    console.error('Erro ao criar/atualizar loja no Supabase:', error);
    throw error;
  }
};

const ensureSupabaseAppearanceExists = async (
  appearanceId?: string | null,
  storeId?: string,
): Promise<string | null> => {
  if (!isSupabaseConfigured) {
    return appearanceId || null;
  }

  if (!appearanceId || !isValidUuid(appearanceId)) {
    return null;
  }

  let query = supabase
    .from('appearances' as any)
    .select('id')
    .eq('id', appearanceId);

  if (storeId && isValidUuid(storeId)) {
    query = query.eq('store_id', storeId);
  }

  const { data: existingAppearance, error: selectError } =
    await query.maybeSingle();

  if (selectError) {
    console.error('Erro ao verificar appearance_id em appearances:', selectError);
    throw selectError;
  }

  if (existingAppearance) {
    return appearanceId;
  }

  let localAppearance: Appearance | null = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = localStorage.getItem('vidlytics_appearances');
      const appearances = local ? (JSON.parse(local) as Appearance[]) : [];
      localAppearance = appearances.find(appearance => appearance.id === appearanceId) || null;
    }
  } catch (error) {
    console.warn('Não foi possível buscar aparência no localStorage:', error);
  }

  if (!localAppearance) {
    console.warn(
      `appearance_id "${appearanceId}" não encontrado em appearances. Salvando Story sem aparência vinculada.`,
    );
    return null;
  }

  const now = new Date().toISOString();

  const payload = preparePayloadForSave('appearances', {
    ...localAppearance,
    id: appearanceId,
    store_id: storeId && isValidUuid(storeId) ? storeId : localAppearance.store_id,
    created_at: localAppearance.created_at || now,
    updated_at: now,
  } as any);

  const { data: insertedAppearance, error: insertError } = await supabase
    .from('appearances' as any)
    .upsert(payload as any, { onConflict: 'id' })
    .select('id')
    .single();

  if (insertError) {
    console.error('Erro ao migrar aparência local para o Supabase:', insertError);
    throw insertError;
  }

  return insertedAppearance?.id || appearanceId;
};

const normalizeSupabaseRelationsBeforeSave = async <T extends Record<string, any>>(
  tableName: string,
  payload: T,
): Promise<T> => {
  if (!isSupabaseConfigured) return payload;

  const normalizedPayload: Record<string, any> = { ...payload };

  // model_id em videos/stories
  if (
    (tableName === 'videos' || tableName === 'stories') &&
    normalizedPayload.model_id
  ) {
    if (!isValidUuid(normalizedPayload.model_id)) {
      normalizedPayload.model_id = null;
      return normalizedPayload as T;
    }

    let query = supabase
      .from('sizing_models' as any)
      .select('id')
      .eq('id', normalizedPayload.model_id);

    if (normalizedPayload.store_id && isValidUuid(normalizedPayload.store_id)) {
      query = query.eq('store_id', normalizedPayload.store_id);
    }

    const { data: existingModel, error } = await query.maybeSingle();

    if (error) {
      console.error('Erro ao verificar model_id em sizing_models:', error);
      throw error;
    }

    if (!existingModel) {
      console.warn(
        `model_id "${normalizedPayload.model_id}" não encontrado em sizing_models. Salvando como null.`,
      );
      normalizedPayload.model_id = null;
    }
  }

  // appearance_id em stories
  if (tableName === 'stories' && normalizedPayload.appearance_id) {
    normalizedPayload.appearance_id = await ensureSupabaseAppearanceExists(
      normalizedPayload.appearance_id,
      normalizedPayload.store_id,
    );
  }

  // default_appearance_id em store_settings
  if (tableName === 'store_settings' && normalizedPayload.default_appearance_id) {
    normalizedPayload.default_appearance_id = await ensureSupabaseAppearanceExists(
      normalizedPayload.default_appearance_id,
      normalizedPayload.store_id,
    );
  }

  // product_id em videos
  if (tableName === 'videos' && normalizedPayload.product_id) {
    if (!isValidUuid(normalizedPayload.product_id)) {
      normalizedPayload.product_id = null;
      return normalizedPayload as T;
    }

    let query = supabase
      .from('products' as any)
      .select('id')
      .eq('id', normalizedPayload.product_id);

    if (normalizedPayload.store_id && isValidUuid(normalizedPayload.store_id)) {
      query = query.eq('store_id', normalizedPayload.store_id);
    }

    const { data: existingProduct, error } = await query.maybeSingle();

    if (error) {
      console.error('Erro ao verificar product_id em products:', error);
      throw error;
    }

    if (!existingProduct) {
      console.warn(
        `product_id "${normalizedPayload.product_id}" não encontrado em products. Salvando como null.`,
      );
      normalizedPayload.product_id = null;
    }
  }

  return normalizedPayload as T;
};

// ═══════════════════════════════════════════════════════
// FUNÇÕES CRUD
// ═══════════════════════════════════════════════════════

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
  const getLocalItems = (): T[] => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = localStorage.getItem(`vidlytics_${tableName}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            return parsed as T[];
          }
        }
      }
    } catch (error) {
      console.warn(`Erro ao ler dados locais da tabela ${tableName}:`, error);
    }
    return memoryArray;
  };

  return {
    async getAll(storeId?: string): Promise<T[]> {
      const items = getLocalItems();
      const filteredItems = storeId
        ? items.filter(item => item.store_id === storeId)
        : items;
      return filteredItems.map(item =>
        normalizeTableItemForClient(tableName, item as any),
      ) as T[];
    },

    async getById(id: string, storeId?: string): Promise<T | null> {
      const items = await this.getAll(storeId);
      return items.find(item => item.id === id) || null;
    },

    async save(item: T): Promise<T> {
      const now = new Date().toISOString();
      const items = await this.getAll();
      const normalizedItem = preparePayloadForSave(tableName, item as any) as T;
      const index = items.findIndex(existing => existing.id === normalizedItem.id);
      const updatedItem = { ...normalizedItem, updated_at: now };

      if (index >= 0) {
        items[index] = updatedItem;
      } else {
        items.push({ ...updatedItem, created_at: normalizedItem.created_at || now });
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(items));
      }

      return normalizeTableItemForClient(tableName, updatedItem as any) as T;
    },

    async delete(id: string, storeId?: string): Promise<boolean> {
      const items = await this.getAll(storeId);
      const filtered = items.filter(item => item.id !== id);

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(filtered));
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
        if (!isValidUuid(storeId)) return [];
        query = query.eq('store_id', storeId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error(`Erro ao buscar dados da tabela ${tableName}:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        return localFallback.getAll(storeId);
      }

      return ((data || []) as T[]).map(item =>
        normalizeTableItemForClient(tableName, item as any),
      ) as T[];
    },

    async getById(id: string, storeId?: string): Promise<T | null> {
      if (!isSupabaseConfigured) {
        return localFallback.getById(id, storeId);
      }

      if (!isValidUuid(id)) return null;

      let query = supabase.from(tableName as any).select('*').eq('id', id);

      if (storeId) {
        if (!isValidUuid(storeId)) return null;
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(`Erro ao buscar ${tableName} por ID:`, error);
        throw error;
      }

      if (!data) return null;

      return normalizeTableItemForClient(tableName, data as any) as T;
    },

    async save(item: T): Promise<T> {
      if (!isSupabaseConfigured) {
        return localFallback.save(item);
      }

      const now = new Date().toISOString();
      const originalId = item.id;
      const originalIdIsValid = isValidUuid(originalId);

      let payload = preparePayloadForSave(tableName, {
        ...item,
        created_at: item.created_at || now,
        updated_at: now,
      } as any);

      if (tableName !== 'stores' && payload.store_id) {
        await ensureSupabaseStoreExists(payload.store_id);
      }

      payload = await normalizeSupabaseRelationsBeforeSave(tableName, payload);

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
          const { data, error: updateError } = await supabase
            .from(tableName as any)
            .update(payload as any)
            .eq('id', payload.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Erro ao atualizar ${tableName}:`, updateError);
            throw updateError;
          }

          return normalizeTableItemForClient(tableName, data as any) as T;
        }
      }

      const { data, error: insertError } = await supabase
        .from(tableName as any)
        .insert(payload as any)
        .select()
        .single();

      if (insertError) {
        console.error(`Erro ao inserir ${tableName}:`, insertError);
        throw insertError;
      }

      return normalizeTableItemForClient(tableName, data as any) as T;
    },

    async delete(id: string, storeId?: string): Promise<boolean> {
      if (!isSupabaseConfigured) {
        return localFallback.delete(id, storeId);
      }

      if (!isValidUuid(id)) {
        console.warn(`ID inválido ignorado ao deletar ${tableName}:`, id);
        return true;
      }

      let query = supabase.from(tableName as any).delete().eq('id', id);

      if (storeId && isValidUuid(storeId)) {
        query = query.eq('store_id', storeId);
      }

      const { error, count } = await query.select();

      if (error) {
        console.error(`Erro ao deletar ${tableName}:`, error);
        throw error;
      }

      if (count && count > 0) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const local = localStorage.getItem(`vidlytics_${tableName}`);
            if (local) {
              const items = JSON.parse(local);
              const filtered = items.filter((it: any) => it.id !== id);
              localStorage.setItem(`vidlytics_${tableName}`, JSON.stringify(filtered));
            }
          }
        } catch (e) {
          console.warn(`Erro ao limpar localStorage após delete em ${tableName}:`, e);
        }
      }

      if (count === 0) {
        console.warn(
          `Nenhum registro deletado em ${tableName} para id=${id}. ` +
          `Verifique se o RLS está bloqueando a operação.`,
        );
      }

      return true;
    },
  };
};

// ═══════════════════════════════════════════════════════
// HELPERS DE STORE ID E RELAÇÕES
// ═══════════════════════════════════════════════════════

export const resolveStoreId = async (
  storeId?: string | null,
): Promise<string> => {
  if (storeId && isValidUuid(storeId)) {
    return storeId;
  }

  try {
    const stores = await db.stores.getAll();
    const firstValidStore = stores.find(store => isValidUuid(store.id));
    if (firstValidStore?.id) {
      return firstValidStore.id;
    }
  } catch (error) {
    console.warn('Não foi possível buscar loja atual, usando loja padrão:', error);
  }

  return DEFAULT_STORE.id;
};

export const withStoreId = async <T extends { store_id?: string }>(
  item: T,
  storeId?: string | null,
): Promise<T & { store_id: string }> => {
  const resolvedStoreId =
    item.store_id && isValidUuid(item.store_id)
      ? item.store_id
      : await resolveStoreId(storeId);

  return { ...item, store_id: resolvedStoreId };
};

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
      preparePayloadForSave(tableName, {
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

  const local =
    typeof window !== 'undefined'
      ? localStorage.getItem(`vidlytics_${tableName}`)
      : null;

  const items = local ? JSON.parse(local) : [];

  const preserved = items.filter(
    (item: T) => !(item.store_id === storeId && item.story_id === storyId),
  );

  const normalizedRelations = relations.map(relation =>
    preparePayloadForSave(tableName, {
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

// ═══════════════════════════════════════════════════════
// EXPORT DO BANCO DE DADOS
// ═══════════════════════════════════════════════════════

export const db = {
  stores: createSupabaseCrudFunctions<Store>('stores', memoryStores),

  generalSettings: createSupabaseCrudFunctions<GeneralSettings>(
    'store_settings',
    memoryStoreSettings,
  ),

  getSettings: async (): Promise<GeneralSettings | null> => {
    const settings = await db.generalSettings.getAll();
    return settings[0] || null;
  },

  appearances: createSupabaseCrudFunctions<Appearance>(
    'appearances',
    memoryAppearances,
  ),

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

  displayLocations: createSupabaseCrudFunctions<DisplayLocation>(
    'display_locations',
    memoryDisplayLocations,
  ),

  pageRules: createSupabaseCrudFunctions<PageRule>('page_rules', memoryPageRules),

  comments: createSupabaseCrudFunctions<Comment>('comments', memoryComments),

  metrics: createSupabaseCrudFunctions<Metric>('metrics', memoryMetrics),

  sizingModels: createSupabaseCrudFunctions<SizingModel>(
    'sizing_models',
    memorySizingModels,
  ),

  profiles: createSupabaseCrudFunctions<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
  }>('profiles', []),

  storeMembers: createSupabaseCrudFunctions<{
    id: string;
    store_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at?: string;
  }>('store_members', []),

  subscriptions: createSupabaseCrudFunctions<{
    id: string;
    store_id: string;
    plan_name: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    current_period_start?: string;
    current_period_end?: string;
    created_at?: string;
  }>('subscriptions', []),

  usageCounters: createSupabaseCrudFunctions<{
    id: string;
    store_id: string;
    month: string;
    videos_count: number;
    views_count: number;
    users_count: number;
    created_at?: string;
    updated_at?: string;
  }>('usage_counters', []),

  resolveStoreId,

  withStoreId,

  replaceStoryRelations,
};
