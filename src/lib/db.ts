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
