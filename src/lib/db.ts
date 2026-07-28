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

  // 🟦 ABA BÁSICO
  style_name?: string;
  is_default?: boolean;
  isDefault?: boolean; // alias frontend
  same_appearance_all_devices?: boolean;

  // 🟨 ABA IDENTIDADE VISUAL
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  button_color?: string;
  font_family?: string;
  font_size?: string;

  // 🔴 ABA FLUTUANTE — Base
  floating_shape?: string;
  floating_size?: string;
  floating_border_radius?: string;
  floating_position?: string;
  floating_margin_bottom?: string;
  floating_margin_top?: string;
  floating_margin_side?: string;
  floating_border_color?: string;
  floating_border_width?: string;
  floating_object_fit?: string;
  floating_z_index?: string;
  floating_show_title?: boolean;
  floating_show_play_button?: boolean;
  floating_allow_drag?: boolean;
  floating_allow_close?: boolean;

  // 🔴 ABA FLUTUANTE — Mobile
  floating_shape_mobile?: string;
  floating_size_mobile?: string;
  floating_border_radius_mobile?: string;
  floating_position_mobile?: string;
  floating_margin_bottom_mobile?: string;
  floating_margin_top_mobile?: string;
  floating_margin_side_mobile?: string;
  floating_border_color_mobile?: string;
  floating_border_width_mobile?: string;
  floating_object_fit_mobile?: string;
  floating_z_index_mobile?: string;
  floating_show_title_mobile?: boolean;
  floating_show_play_button_mobile?: boolean;
  floating_allow_drag_mobile?: boolean;
  floating_allow_close_mobile?: boolean;

  // 🔴 ABA FLUTUANTE — Desktop
  floating_shape_desktop?: string;
  floating_size_desktop?: string;
  floating_border_radius_desktop?: string;
  floating_position_desktop?: string;
  floating_margin_bottom_desktop?: string;
  floating_margin_top_desktop?: string;
  floating_margin_side_desktop?: string;
  floating_border_color_desktop?: string;
  floating_border_width_desktop?: string;
  floating_object_fit_desktop?: string;
  floating_z_index_desktop?: string;
  floating_show_title_desktop?: boolean;
  floating_show_play_button_desktop?: boolean;
  floating_allow_drag_desktop?: boolean;
  floating_allow_close_desktop?: boolean;

  // 🟢 ABA CARROSSEL — Base
  carousel_shape?: string;
  carousel_size?: string;
  carousel_visible_items?: string;
  carousel_spacing?: string;
  carousel_border_color?: string;
  carousel_border_width?: string;
  carousel_border_radius?: string;
  carousel_object_fit?: string;
  carousel_margin_top?: string;
  carousel_margin_bottom?: string;
  carousel_show_title?: boolean;
  carousel_show_product?: boolean;
  carousel_show_play_button?: boolean;
  carousel_auto_center?: boolean;

  // 🟢 ABA CARROSSEL — Mobile
  carousel_shape_mobile?: string;
  carousel_size_mobile?: string;
  carousel_visible_items_mobile?: string;
  carousel_spacing_mobile?: string;
  carousel_border_color_mobile?: string;
  carousel_border_width_mobile?: string;
  carousel_border_radius_mobile?: string;
  carousel_object_fit_mobile?: string;
  carousel_margin_top_mobile?: string;
  carousel_margin_bottom_mobile?: string;
  carousel_show_title_mobile?: boolean;
  carousel_show_product_mobile?: boolean;
  carousel_show_play_button_mobile?: boolean;
  carousel_auto_center_mobile?: boolean;

  // 🟢 ABA CARROSSEL — Desktop
  carousel_shape_desktop?: string;
  carousel_size_desktop?: string;
  carousel_visible_items_desktop?: string;
  carousel_spacing_desktop?: string;
  carousel_border_color_desktop?: string;
  carousel_border_width_desktop?: string;
  carousel_border_radius_desktop?: string;
  carousel_object_fit_desktop?: string;
  carousel_margin_top_desktop?: string;
  carousel_margin_bottom_desktop?: string;
  carousel_show_title_desktop?: boolean;
  carousel_show_product_desktop?: boolean;
  carousel_show_play_button_desktop?: boolean;
  carousel_auto_center_desktop?: boolean;

  // 🟣 ABA GRADE — Base
  grid_shape?: string;
  grid_size?: string;
  grid_columns?: string;
  grid_rows?: string;
  grid_spacing?: string;
  grid_border_color?: string;
  grid_border_width?: string;
  grid_border_radius?: string;
  grid_object_fit?: string;
  grid_show_title?: boolean;

  // 🟣 ABA GRADE — Mobile
  grid_shape_mobile?: string;
  grid_size_mobile?: string;
  grid_columns_mobile?: string;
  grid_rows_mobile?: string;
  grid_spacing_mobile?: string;
  grid_border_color_mobile?: string;
  grid_border_width_mobile?: string;
  grid_border_radius_mobile?: string;
  grid_object_fit_mobile?: string;
  grid_show_title_mobile?: boolean;

  // 🟣 ABA GRADE — Desktop
  grid_shape_desktop?: string;
  grid_size_desktop?: string;
  grid_columns_desktop?: string;
  grid_rows_desktop?: string;
  grid_spacing_desktop?: string;
  grid_border_color_desktop?: string;
  grid_border_width_desktop?: string;
  grid_border_radius_desktop?: string;
  grid_object_fit_desktop?: string;
  grid_show_title_desktop?: boolean;

  // 🔵 ABA PLAYER MODAL
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
  modal_border_width?: string;
  modal_border_radius?: string;

  // ⚠️ DEPRECATED — mantidos para compatibilidade com código legado
  floating_config?: ResponsiveAppearanceConfig;
  carousel_config?: ResponsiveAppearanceConfig;
  grid_config?: ResponsiveAppearanceConfig;
  modal_config?: ResponsiveAppearanceConfig;
  use_global_appearance?: boolean;
  useGlobalAppearance?: boolean;
  name?: string;
  shadow_enabled?: boolean;
  border_radius?: string;
  button_text_color?: string;
  show_title?: boolean;
  show_progress?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  custom_css?: string | null;
  url?: string | null;
  active?: boolean;
  status?: string;
  apply_to_all_devices?: boolean;
  floating_height?: number | string | null;
  floating_draggable?: boolean;
  floating_closable?: boolean;
  carousel_format?: string;
  carousel_gap?: number;
  carousel_display_mode?: string;
  grid_format?: string;
  grid_gap?: number;
  player_show_title?: boolean;
  player_show_play_button?: boolean;
  player_show_like_button?: boolean;
  player_show_whatsapp_button?: boolean;
  player_show_product?: boolean;
  player_show_product_button?: boolean;
  player_show_share_button?: boolean;
  player_show_comments_button?: boolean;
  player_hide_stories?: boolean;
  player_enable_shadow?: boolean;
  player_border_color?: string;
  player_border_width?: number | string;
  player_border_radius?: number | string;
  border_width?: number | string;
  border_color?: string;
  font_size_legacy?: number | string;
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
    style_name: 'Estilo Vitrine Azul',
    is_default: true,
    isDefault: true,
    same_appearance_all_devices: true,
    primary_color: '#0094EB',
    secondary_color: '#0E4787',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    font_family: 'Inter, sans-serif',
    font_size: '16px',
    floating_shape: 'circle',
    floating_size: '80',
    floating_position: 'bottom-right',
    floating_show_title: true,
    floating_show_play_button: true,
    floating_allow_drag: true,
    floating_allow_close: true,
    carousel_show_title: true,
    carousel_show_product: true,
    carousel_show_play_button: true,
    carousel_auto_center: true,
    grid_show_title: true,
    modal_show_title: true,
    modal_show_play_button: true,
    modal_show_product: true,
    modal_show_like_button: true,
    modal_show_comment_button: true,
    modal_show_share_button: true,
    modal_show_whatsapp_button: true,
    modal_show_product_button: true,
    modal_shadow_enabled: true,
    use_global_appearance: true,
    useGlobalAppearance: true,
    shadow_enabled: true,
    border_radius: '12px',
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
    'style_name', 'is_default', 'same_appearance_all_devices',
    // 🟨 Identidade Visual
    'primary_color', 'secondary_color', 'text_color', 'background_color',
    'button_color', 'font_family', 'font_size',
    // 🔴 Flutuante — Base
    'floating_shape', 'floating_size', 'floating_border_radius',
    'floating_position', 'floating_margin_bottom', 'floating_margin_top',
    'floating_margin_side', 'floating_border_color', 'floating_border_width',
    'floating_object_fit', 'floating_z_index',
    'floating_show_title', 'floating_show_play_button',
    'floating_allow_drag', 'floating_allow_close',
    // 🔴 Flutuante — Mobile
    'floating_shape_mobile', 'floating_size_mobile', 'floating_border_radius_mobile',
    'floating_position_mobile', 'floating_margin_bottom_mobile', 'floating_margin_top_mobile',
    'floating_margin_side_mobile', 'floating_border_color_mobile', 'floating_border_width_mobile',
    'floating_object_fit_mobile', 'floating_z_index_mobile',
    'floating_show_title_mobile', 'floating_show_play_button_mobile',
    'floating_allow_drag_mobile', 'floating_allow_close_mobile',
    // 🔴 Flutuante — Desktop
    'floating_shape_desktop', 'floating_size_desktop', 'floating_border_radius_desktop',
    'floating_position_desktop', 'floating_margin_bottom_desktop', 'floating_margin_top_desktop',
    'floating_margin_side_desktop', 'floating_border_color_desktop', 'floating_border_width_desktop',
    'floating_object_fit_desktop', 'floating_z_index_desktop',
    'floating_show_title_desktop', 'floating_show_play_button_desktop',
    'floating_allow_drag_desktop', 'floating_allow_close_desktop',
    // 🟢 Carrossel — Base
    'carousel_shape', 'carousel_size', 'carousel_visible_items', 'carousel_spacing',
    'carousel_border_color', 'carousel_border_width', 'carousel_border_radius',
    'carousel_object_fit', 'carousel_margin_top', 'carousel_margin_bottom',
    'carousel_show_title', 'carousel_show_product', 'carousel_show_play_button',
    'carousel_auto_center',
    // 🟢 Carrossel — Mobile
    'carousel_shape_mobile', 'carousel_size_mobile', 'carousel_visible_items_mobile',
    'carousel_spacing_mobile', 'carousel_border_color_mobile', 'carousel_border_width_mobile',
    'carousel_border_radius_mobile', 'carousel_object_fit_mobile',
    'carousel_margin_top_mobile', 'carousel_margin_bottom_mobile',
    'carousel_show_title_mobile', 'carousel_show_product_mobile',
    'carousel_show_play_button_mobile', 'carousel_auto_center_mobile',
    // 🟢 Carrossel — Desktop
    'carousel_shape_desktop', 'carousel_size_desktop', 'carousel_visible_items_desktop',
    'carousel_spacing_desktop', 'carousel_border_color_desktop', 'carousel_border_width_desktop',
    'carousel_border_radius_desktop', 'carousel_object_fit_desktop',
    'carousel_margin_top_desktop', 'carousel_margin_bottom_desktop',
    'carousel_show_title_desktop', 'carousel_show_product_desktop',
    'carousel_show_play_button_desktop', 'carousel_auto_center_desktop',
    // 🟣 Grade — Base
    'grid_shape', 'grid_size', 'grid_columns', 'grid_rows', 'grid_spacing',
    'grid_border_color', 'grid_border_width', 'grid_border_radius',
    'grid_object_fit', 'grid_show_title',
    // 🟣 Grade — Mobile
    'grid_shape_mobile', 'grid_size_mobile', 'grid_columns_mobile',
    'grid_rows_mobile', 'grid_spacing_mobile', 'grid_border_color_mobile',
    'grid_border_width_mobile', 'grid_border_radius_mobile',
    'grid_object_fit_mobile', 'grid_show_title_mobile',
    // 🟣 Grade — Desktop
    'grid_shape_desktop', 'grid_size_desktop', 'grid_columns_desktop',
    'grid_rows_desktop', 'grid_spacing_desktop', 'grid_border_color_desktop',
    'grid_border_width_desktop', 'grid_border_radius_desktop',
    'grid_object_fit_desktop', 'grid_show_title_desktop',
    // 🔵 Player Modal
    'modal_show_title', 'modal_show_play_button', 'modal_show_product',
    'modal_show_like_button', 'modal_show_comment_button', 'modal_show_share_button',
    'modal_show_whatsapp_button', 'modal_show_product_button',
    'modal_hide_stories', 'modal_shadow_enabled',
    'modal_border_color', 'modal_border_width', 'modal_border_radius',
    // ⚠️ Deprecated — compatibilidade legada
    'name', 'use_global_appearance', 'floating_config', 'carousel_config',
    'grid_config', 'modal_config', 'shadow_enabled', 'border_radius',
    'button_text_color', 'show_title', 'show_progress', 'autoplay',
    'muted', 'custom_css', 'url',
  ],
};
