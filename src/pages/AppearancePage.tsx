'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  db,
  Appearance,
  generateUuid,
  resolveStoreId,
} from '@/lib/db';
import { logPanelActivity } from '@/lib/activityLog';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import {
  Plus,
  Trash2,
  Edit3,
  Star,
  Brush,
  X,
  Save,
  Loader2,
  Palette,
  Monitor,
  Smartphone,
  LayoutGrid,
  PlaySquare,
  Rows3,
  Settings2,
  Heart,
  MessageCircle,
  ChevronDown,
  Share2,
  Link,
  Link2Off,
  Play,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

// ──────────────────── utilitários de parsing ────────────────────

const parseJsonIfNeeded = <T,>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
};

// ──────────────────── tipos ────────────────────

type DeviceType = 'desktop' | 'mobile';

type ModalTab =
  | 'basic'
  | 'floating'
  | 'carousel'
  | 'dynamic_carousel'
  | 'grid'
  | 'modal';

type WidgetShape = 'circle' | 'square' | 'portrait' | 'landscape' | 'rounded';

type FloatingPosition =
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

type PositionValue =
  | 'fixed_bottom_right'
  | 'fixed_bottom_left'
  | 'fixed_top_right'
  | 'fixed_top_left';

type ResponsiveConfig<T> = {
  same_for_all: boolean;
  desktop: T;
  mobile: T;
};

type FloatingConfig = {
  shape: WidgetShape;
  width: string;
  height: string;
  border_radius: string;
  position: PositionValue;
  floating_position: FloatingPosition;
  bottom_spacing: string;
  top_spacing: string;
  left_spacing: string;
  right_spacing: string;
  border_color: string;
  border_style: string;
  show_play_icon: boolean;
  object_fit: string;
  draggable: boolean;
  allow_close: boolean;
  z_index: string;
  autoplay_videos: boolean;
  show_cta: boolean;
  cta_text: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_font_size: number;
  cta_is_bold: boolean;
};

type CarouselConfig = {
  spacing: number;
  shape: WidgetShape;
  view_mode: string;
  margin_top: string;
  margin_bottom: string;
  visible_items: number;
  show_product: boolean;
  show_play_icon: boolean;
  auto_center: boolean;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
show_title: boolean;
autoplay_videos: boolean;
auto_highlight: boolean; // true = destaque automático no centro a cada 5s
product_card_bg: string;
  product_card_border_color: string;
  product_card_border_width: string;
  product_card_border_radius: string;
  product_card_name_size: string;
  product_card_name_color: string;
  product_card_price_size: string;
  product_card_price_color: string;
  product_card_price_bold: boolean;
};

type DynamicCarouselConfig = Omit<
  CarouselConfig,
  'product_card_border_width' | 'product_card_border_radius' | 'product_card_name_size' | 'product_card_price_size'
> & {
  enabled: boolean;
  highlight_shadow: boolean;
  highlight_enlarge_active?: boolean;
  highlight_dim_inactive?: boolean;
  highlight_desaturate_inactive?: boolean;
  highlight_mode?: 'ring' | 'none';
  highlight_border_color?: string;
  margin_left?: string;
  margin_right?: string;
  product_card_border_width?: string;
  product_card_border_radius?: string;
  product_card_name_size?: string;
  product_card_price_size?: string;
  title_text?: string;
  title_font_size?: number;
  title_align?: 'left' | 'center' | 'right';
  title_bold?: boolean;
};

type GridConfig = {
  visible_items: number;
  margin_left?: string;
  margin_right?: string;
  margin_top?: string;
  margin_bottom?: string;
  rows: number;
  spacing: number;
  shape: WidgetShape;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
show_title: boolean;
autoplay_videos: boolean;
sequential_playback: boolean; // true = modo sequencial 5s por vídeo
};

type ModalConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_product_button: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
};

type ExtendedAppearance = Appearance & {
  useGlobalAppearance: boolean;
  use_global_appearance?: boolean;

  floating_config: ResponsiveConfig<FloatingConfig>;
  carousel_config: ResponsiveConfig<CarouselConfig>;
  dynamic_carousel_config: ResponsiveConfig<DynamicCarouselConfig>;
  grid_config: ResponsiveConfig<GridConfig>;
  modal_config: ModalConfig;

  width: string;
  unit: 'px' | 'percent';
  height: string;

  position: PositionValue;
  floating_position: FloatingPosition;

  bottom_spacing: string;
  top_spacing: string;
  left_spacing: string;
  right_spacing: string;

  cta_text: string;
  cta_size: string;
  cta_duration: string;
  border_style: string;
  color: string;
  show_play_icon: boolean;
  auto_center: boolean;
  carousel_view_mode: string;
  margin_top: string;
  margin_bottom: string;
  draggable: boolean;
  allow_close: boolean;
  object_fit: string;
  z_index: string;
  desktop_columns: number;
  desktop_rows: number;
  desktop_gap: number;
  mobile_columns: number;
  mobile_rows: number;
  mobile_gap: number;
  font_size: string;

  url?: string | null;

  show_product_button: boolean;

target_selector?: string;
  insert_position?: 'after' | 'before' | 'prepend' | 'append';
};

type PreviewColors = {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  button: string;
  floatingBorder: string;
};

// ──────────────────── utilitários ────────────────────

const inputClass =
  'w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] focus:bg-white dark:focus:bg-[#111524] disabled:cursor-not-allowed disabled:opacity-50';
const DEMO_PREVIEW_VIDEOS = [
  '/demo-videos/demo1.mp4',
  '/demo-videos/demo2.mp4',
  '/demo-videos/demo3.mp4',
];

const selectClass = inputClass;

const isValidHexColor = (value?: string) =>
  /^#[0-9A-Fa-f]{6}$/.test(value || '');

const isValidWidgetShape = (value?: string): value is WidgetShape =>
  value === 'circle' || value === 'square' || value === 'portrait' || value === 'landscape';

const normalizeWidgetShape = (
  value: unknown,
  fallback: WidgetShape = 'portrait',
): WidgetShape => {
  const text = String(value || '').trim();
  if (isValidWidgetShape(text)) return text;
  if (text === 'rounded' || text === 'custom') return 'portrait';
  return fallback;
};

const isValidPositionValue = (value?: string): value is PositionValue =>
  value === 'fixed_bottom_right' ||
  value === 'fixed_bottom_left' ||
  value === 'fixed_top_right' ||
  value === 'fixed_top_left';

const isValidFloatingPosition = (
  value?: string,
): value is FloatingPosition =>
  value === 'left' ||
  value === 'right' ||
  value === 'top-left' ||
  value === 'top-right' ||
  value === 'bottom-left' ||
  value === 'bottom-right';

const positionToFloatingPosition = (
  position?: string,
): FloatingPosition => {
  switch (position) {
    case 'fixed_bottom_left':
      return 'bottom-left';
    case 'fixed_top_left':
      return 'top-left';
    case 'fixed_top_right':
      return 'top-right';
    case 'fixed_bottom_right':
    default:
      return 'bottom-right';
  }
};

const floatingPositionToPosition = (
  floatingPosition?: string,
): PositionValue => {
  switch (floatingPosition) {
    case 'left':
    case 'bottom-left':
      return 'fixed_bottom_left';
    case 'top-left':
      return 'fixed_top_left';
    case 'top-right':
      return 'fixed_top_right';
    case 'right':
    case 'bottom-right':
    default:
      return 'fixed_bottom_right';
  }
};

const normalizePosition = (
  position?: string,
  floatingPosition?: string,
): PositionValue => {
  if (isValidPositionValue(position)) return position;
  return floatingPositionToPosition(floatingPosition);
};

const normalizeFloatingPosition = (
  floatingPosition?: string,
  position?: string,
): FloatingPosition => {
  if (isValidFloatingPosition(floatingPosition)) return floatingPosition;
  return positionToFloatingPosition(position);
};

const mapAnyPositionToPositionValueForSave = (
  value: unknown,
): PositionValue | null => {
  const text = String(value || '').trim();
  const map: Record<string, PositionValue> = {
    fixed_bottom_right: 'fixed_bottom_right',
    fixed_bottom_left: 'fixed_bottom_left',
    fixed_top_right: 'fixed_top_right',
    fixed_top_left: 'fixed_top_left',
    'bottom-right': 'fixed_bottom_right',
    'bottom-left': 'fixed_bottom_left',
    'top-right': 'fixed_top_right',
    'top-left': 'fixed_top_left',
    right: 'fixed_bottom_right',
    left: 'fixed_bottom_left',
    'Inferior direita': 'fixed_bottom_right',
    'Inferior esquerda': 'fixed_bottom_left',
    'Superior direita': 'fixed_top_right',
    'Superior esquerda': 'fixed_top_left',
    'inferior direita': 'fixed_bottom_right',
    'inferior esquerda': 'fixed_bottom_left',
    'superior direita': 'fixed_top_right',
    'superior esquerda': 'fixed_top_left',
  };
  return map[text] || null;
};

const normalizePositionForSave = (
  position?: unknown,
  floatingPosition?: unknown,
): PositionValue => {
  return (
    mapAnyPositionToPositionValueForSave(position) ||
    mapAnyPositionToPositionValueForSave(floatingPosition) ||
    'fixed_bottom_right'
  );
};

const normalizeFloatingPositionForSave = (
  position?: unknown,
  floatingPosition?: unknown,
): FloatingPosition => {
  const normalizedPosition = normalizePositionForSave(position, floatingPosition);
  return positionToFloatingPosition(normalizedPosition);
};

const normalizeFloatingConfigForSave = (
  config: FloatingConfig,
): FloatingConfig => {
  const normalizedPosition = normalizePositionForSave(
    config.position,
    config.floating_position,
  );
  const normalizedFloatingPosition = normalizeFloatingPositionForSave(
    normalizedPosition,
    config.floating_position,
  );
  
  return normalizeFloatingShapeValues({
    ...config,
    border_style: normalizeBorderWidth(config.border_style, '2'),
    position: normalizedPosition,
    floating_position: normalizedFloatingPosition,
    
    // 👇 NOVAS PROPRIEDADES DO CTA 👇
    show_cta: config.show_cta ?? false,
    cta_text: config.cta_text ?? 'VER VÍDEO',
    cta_bg_color: config.cta_bg_color ?? '#0094EB',
    cta_text_color: config.cta_text_color ?? '#FFFFFF',
    cta_font_size: safeNumber(config.cta_font_size, 14), // Usando seu helper nativo!
    cta_is_bold: config.cta_is_bold ?? true,
  });
};

const safeNumber = (value: unknown, fallback: number, min?: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  if (typeof min === 'number' && parsed < min) return min;
  return parsed;
};

const limitNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = safeNumber(value, fallback, min);
  return Math.min(max, Math.max(min, parsed));
};

const toNumberInputValue = (value: any) => {
  // Se for undefined, null, string vazia ou não for um número válido, força o zero
  if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
    return 0;
  }
  
  // Retorna o valor numérico limpo
  return Number(value);
};

const extractNumericCssSize = (value: unknown, fallback = '0px') => {
  const numeric = toNumberInputValue(value);
  if (!numeric) return fallback;
  return `${numeric}px`;
};

const formatNumberLikeCurrent = (value: unknown, fallback = '0') => {
  if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
    return fallback;
  }
  return String(Number(value));
};

const getPortraitHeightFromWidth = (width: unknown) => {
  const numeric = Number(toNumberInputValue(width));
  if (!numeric || Number.isNaN(numeric)) return '142';
  return String(Math.round((numeric * 16) / 9));
};

const getLandscapeHeightFromWidth = (width: unknown) => {
  const numeric = Number(toNumberInputValue(width));
  if (!numeric || Number.isNaN(numeric)) return '45';
  return String(Math.round((numeric * 9) / 16));
};

const getPortraitWidthFromHeight = (height: unknown) => {
  const numeric = Number(toNumberInputValue(height));
  if (!numeric || Number.isNaN(numeric)) return '80';
  return String(Math.round((numeric * 9) / 16));
};

const cssSize = (value: unknown, fallback = '0px') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (/^-?\d+(\.\d+)?$/.test(text)) return `${text}px`;
  return text;
};

const cssBorder = (borderWidth: string, color: string) => {
  const width = extractNumericCssSize(borderWidth, '0px');
  return `${width} solid ${color}`;
};

const normalizeBorderWidth = (value: unknown, fallback = '0') => {
  if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
    return fallback;
  }
  return String(Number(value));
};

const normalizeFloatingShapeValues = (
  config: FloatingConfig,
): FloatingConfig => {
  const shape = normalizeWidgetShape(config.shape);
  if (shape === 'portrait') {
    const width = formatNumberLikeCurrent(config.width, '80');
    return {
      ...config,
      shape,
      width,
      height: getPortraitHeightFromWidth(width),
      border_radius: normalizeBorderWidth(config.border_radius, '12'),
      border_style: normalizeBorderWidth(config.border_style, '2'),
    };
  }
  if (shape === 'landscape') {
    const width = formatNumberLikeCurrent(config.width, '80');
    return {
      ...config,
      shape,
      width,
      height: getLandscapeHeightFromWidth(width),
      border_radius: normalizeBorderWidth(config.border_radius, '12'),
      border_style: normalizeBorderWidth(config.border_style, '2'),
    };
  }
  if (shape === 'square') {
    const size = formatNumberLikeCurrent(config.width, '80');
    return {
      ...config,
      shape,
      width: size,
      height: size,
      border_radius: normalizeBorderWidth(config.border_radius, '12'),
      border_style: normalizeBorderWidth(config.border_style, '2'),
    };
  }
  const circleSize =
    toNumberInputValue(config.border_radius) ||
    toNumberInputValue(config.width) ||
    '80';
  return {
    ...config,
    shape,
    border_radius: circleSize,
    border_style: normalizeBorderWidth(config.border_style, '2'),
  };
};

const normalizeCarouselConfigShape = (
  config: CarouselConfig,
): CarouselConfig => {
  const shape = normalizeWidgetShape(config.shape, 'portrait');
  const width = formatNumberLikeCurrent(config.width, '80');
  return {
    ...config,
    shape,
    width,
  };
};

const normalizeGridConfigShape = (config: GridConfig): GridConfig => {
  const shape = normalizeWidgetShape(config.shape, 'portrait');
  return {
    ...config,
    shape,
  };
};

const createDefaultFloatingDesktopConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '80',
  height: '142',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '20',
  top_spacing: '20',
  left_spacing: '20',
  right_spacing: '20',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 14,
  cta_is_bold: true,
});

const createDefaultFloatingMobileConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '64',
  height: '114',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '16',
  top_spacing: '16',
  left_spacing: '16',
  right_spacing: '16',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 12,
  cta_is_bold: true,
});

const createDefaultCarouselDesktopConfig = (): CarouselConfig => ({
  spacing: 16,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 4,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

const createDefaultCarouselMobileConfig = (): CarouselConfig => ({
  spacing: 12,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 2,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
 show_title: false,
  autoplay_videos: true,
    product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '10',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

const createDefaultDynamicCarouselDesktopConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselDesktopConfig(),
  enabled: true,
  highlight_shadow: false,
  highlight_scale_up: false,
  highlight_scale_down_others: false,
  margin_left: '0',
  margin_right: '0',
});

const createDefaultDynamicCarouselMobileConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselMobileConfig(),
  enabled: true,
  highlight_shadow: false,
  highlight_scale_up: false,
  highlight_scale_down_others: false,
  margin_left: '0',
  margin_right: '0',
});

const createDefaultGridDesktopConfig = (): GridConfig => ({
  visible_items: 4,
  rows: 1,
  spacing: 16,
  shape: 'portrait',
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',

});

const createDefaultGridMobileConfig = (): GridConfig => ({
  visible_items: 2,
  rows: 2,
  spacing: 12,
  shape: 'portrait',
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',

});

const createDefaultModalConfig = (): ModalConfig & Record<string, any> => ({
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_product_button: true,
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_button_bg: '#0094EB',
  product_card_button_color: '#FFFFFF',
});

const createResponsiveConfig = <T,>(
  desktop: T,
  mobile: T,
  sameForAll = false,
): ResponsiveConfig<T> => ({
  same_for_all: sameForAll,
  desktop,
  mobile,
});

const normalizeResponsiveConfig = <T extends Record<string, any>>({
  rawValue,
  desktopDefault,
  mobileDefault,
  legacyDesktop = {},
  legacyMobile = {},
  sameForAll = false,
}: {
  rawValue: unknown;
  desktopDefault: T;
  mobileDefault: T;
  legacyDesktop?: Partial<T>;
  legacyMobile?: Partial<T>;
  sameForAll?: boolean;
}): ResponsiveConfig<T> => {
  const parsed = parseJsonIfNeeded<ResponsiveConfig<T>>(rawValue);
  return {
    same_for_all: Boolean(parsed?.same_for_all ?? sameForAll),
    desktop: {
      ...desktopDefault,
      ...legacyDesktop,
      ...(parsed?.desktop || {}),
    },
    mobile: {
      ...mobileDefault,
      ...legacyMobile,
      ...(parsed?.mobile || {}),
    },
  };
};

const getActiveResponsiveConfig = <T,>(
  config: ResponsiveConfig<T>,
  device: DeviceType,
  useGlobalAppearance: boolean,
): T => {
  if (useGlobalAppearance || config.same_for_all) return config.desktop;
  return config[device];
};

const createDefaultFormData = (storeId?: string): ExtendedAppearance => {
  const now = new Date().toISOString();
  const floatingDesktop = createDefaultFloatingDesktopConfig();
  const floatingMobile = createDefaultFloatingMobileConfig();
  const carouselDesktop = createDefaultCarouselDesktopConfig();
  const carouselMobile = createDefaultCarouselMobileConfig();
  const dynamicCarouselDesktop = createDefaultDynamicCarouselDesktopConfig();
  const dynamicCarouselMobile = createDefaultDynamicCarouselMobileConfig();
  const gridDesktop = createDefaultGridDesktopConfig();
  const gridMobile = createDefaultGridMobileConfig();
  const modalConfig = createDefaultModalConfig();

  return {
    id: '',
    store_id: storeId || '',
    name: '',
    is_default: false,

    primary_color: '#0094EB',
    secondary_color: '#0094EB',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',

    font_family: 'Inter, sans-serif',
    widget_shape: floatingDesktop.shape,
    widget_size: 'medium',
    widget_animation: 'none',

    carousel_shape: carouselDesktop.shape,
    carousel_visible_items: carouselDesktop.visible_items,
    carousel_spacing: carouselDesktop.spacing,
    carousel_size: carouselDesktop.width,
    carousel_border_color: carouselDesktop.border_color,
    carousel_border_width: carouselDesktop.border_style,
    carousel_border_radius: carouselDesktop.border_radius,
    carousel_object_fit: carouselDesktop.object_fit,
    carousel_margin_top: carouselDesktop.margin_top,
    carousel_margin_bottom: carouselDesktop.margin_bottom,
    carousel_show_title: carouselDesktop.show_title,
    carousel_show_product: carouselDesktop.show_product,
    carousel_show_play_button: carouselDesktop.show_play_icon,
    carousel_auto_center: carouselDesktop.auto_center,

    grid_shape: gridDesktop.shape,
    grid_columns: String(gridDesktop.visible_items),
    grid_rows: String(gridDesktop.rows),
    grid_spacing: String(gridDesktop.spacing),
    grid_size: gridDesktop.width,
    grid_border_color: gridDesktop.border_color,
    grid_border_width: gridDesktop.border_style,
    grid_border_radius: gridDesktop.border_radius,
    grid_object_fit: gridDesktop.object_fit,
    grid_show_title: gridDesktop.show_title,

    show_title: modalConfig.show_title,
    show_play_button: true,
    show_product: true,
    show_like_button: modalConfig.show_like_button,
    show_comment_button: modalConfig.show_comment_button,
    show_share_button: modalConfig.show_share_button,
    show_product_button: true,

    modal_show_title: modalConfig.show_title,
    modal_show_play_button: modalConfig.show_play_button,
    modal_show_product: modalConfig.show_product,
    modal_show_like_button: modalConfig.show_like_button,
    modal_show_comment_button: modalConfig.show_comment_button,
    modal_show_share_button: modalConfig.show_share_button,
    modal_show_product_button: modalConfig.show_product_button,
    modal_border_color: modalConfig.border_color,
    modal_border_width: modalConfig.border_width,
    modal_border_radius: modalConfig.border_radius,

    created_at: now,
    updated_at: now,

    useGlobalAppearance: false,
    use_global_appearance: false,

    floating_config: createResponsiveConfig(floatingDesktop, floatingMobile),
    carousel_config: createResponsiveConfig(carouselDesktop, carouselMobile),
    dynamic_carousel_config: createResponsiveConfig(dynamicCarouselDesktop, dynamicCarouselMobile),
    grid_config: createResponsiveConfig(gridDesktop, gridMobile),
    modal_config: modalConfig,

    width: floatingDesktop.width,
    unit: 'px',
    height: floatingDesktop.height,

    position: floatingDesktop.position,
    floating_position: floatingDesktop.floating_position,

    bottom_spacing: floatingDesktop.bottom_spacing,
    top_spacing: floatingDesktop.top_spacing,
    left_spacing: floatingDesktop.left_spacing,
    right_spacing: floatingDesktop.right_spacing,

    cta_text: '',
    cta_size: '',
    cta_duration: '',
    border_style: floatingDesktop.border_style,
    color: floatingDesktop.border_color,
    show_play_icon: floatingDesktop.show_play_icon,
    auto_center: carouselDesktop.auto_center,
    carousel_view_mode: carouselDesktop.view_mode,
    margin_top: carouselDesktop.margin_top,
    margin_bottom: carouselDesktop.margin_bottom,
    draggable: floatingDesktop.draggable,
    allow_close: floatingDesktop.allow_close,
    object_fit: floatingDesktop.object_fit,
    z_index: floatingDesktop.z_index,
    desktop_columns: gridDesktop.visible_items,
    desktop_rows: gridDesktop.rows,
    desktop_gap: gridDesktop.spacing,
    mobile_columns: gridMobile.visible_items,
    mobile_rows: gridMobile.rows,
    mobile_gap: gridMobile.spacing,
    font_size: '14',
    target_selector: 'body',
    insert_position: 'append',
  } as ExtendedAppearance;
};

const normalizeAppearance = (
  style: Appearance,
  storeId?: string,
): ExtendedAppearance => {
  const defaults = createDefaultFormData(storeId);
  const item = style as Appearance & Partial<ExtendedAppearance>;
  const anyItem = item as any;

  const normalizedPosition = normalizePosition(
    anyItem.position,
    anyItem.floating_position,
  );
  const normalizedFloatingPosition = normalizeFloatingPosition(
    anyItem.floating_position,
    normalizedPosition,
  );

  const globalAppearance = Boolean(
    anyItem.useGlobalAppearance ??
      anyItem.use_global_appearance ??
      anyItem.floating_config?.same_for_all ??
      anyItem.grid_config?.same_for_all ??
      defaults.useGlobalAppearance,
  );

  const floatingConfig = normalizeResponsiveConfig<FloatingConfig>({
    rawValue: anyItem.floating_config,
    desktopDefault: createDefaultFloatingDesktopConfig(),
    mobileDefault: createDefaultFloatingMobileConfig(),
    sameForAll: globalAppearance,
    legacyDesktop: {
      shape: normalizeWidgetShape(item.widget_shape, defaults.widget_shape),
      width: anyItem.width ?? defaults.width,
      height: anyItem.height ?? defaults.height,
      position: normalizedPosition,
      floating_position: normalizedFloatingPosition,
      bottom_spacing:
        anyItem.bottom_spacing ??
        anyItem.spacing_bottom ??
        anyItem.offset_bottom ??
        defaults.bottom_spacing,
      top_spacing:
        anyItem.top_spacing ??
        anyItem.spacing_top ??
        anyItem.offset_top ??
        defaults.top_spacing,
      left_spacing:
        anyItem.left_spacing ??
        anyItem.spacing_left ??
        anyItem.offset_left ??
        defaults.left_spacing,
      right_spacing:
        anyItem.right_spacing ??
        anyItem.spacing_right ??
        anyItem.offset_right ??
        anyItem.left_spacing ??
        anyItem.spacing_left ??
        anyItem.offset_left ??
        defaults.right_spacing,
      border_color: anyItem.color || item.primary_color || defaults.color,
      border_style: anyItem.border_style ?? defaults.border_style,
      show_play_icon: anyItem.show_play_icon ?? item.show_play_button ?? true,
      object_fit: anyItem.object_fit ?? defaults.object_fit,
            draggable: anyItem.draggable ?? defaults.draggable,
      allow_close: anyItem.allow_close ?? defaults.allow_close,
      z_index: anyItem.z_index ?? defaults.z_index,
      show_cta: anyItem.show_cta ?? false,
      cta_text: anyItem.cta_text ?? 'VER VÍDEO',
      cta_bg_color: anyItem.cta_bg_color || item.primary_color || '#0094EB',
      cta_text_color: anyItem.cta_text_color || '#FFFFFF',
      cta_font_size: safeNumber(anyItem.cta_font_size, 14),
      cta_is_bold: anyItem.cta_is_bold ?? true,
    },
    legacyMobile: {
      border_color: anyItem.color || item.primary_color || defaults.color,
    },
  });

  floatingConfig.desktop = normalizeFloatingShapeValues(floatingConfig.desktop);
  floatingConfig.mobile = normalizeFloatingShapeValues(floatingConfig.mobile);

  const carouselConfig = normalizeResponsiveConfig<CarouselConfig>({
    rawValue: anyItem.carousel_config,
    desktopDefault: createDefaultCarouselDesktopConfig(),
    mobileDefault: createDefaultCarouselMobileConfig(),
    sameForAll: globalAppearance,
    legacyDesktop: {
      spacing: safeNumber(
        anyItem.carousel_spacing ?? item.carousel_gap,
        defaults.carousel_spacing ?? 0,
        0,
      ),
      shape: normalizeWidgetShape(
        anyItem.carousel_shape ?? item.carousel_card_shape,
        'portrait',
      ),
      width: anyItem.carousel_size ?? defaults.carousel_size ?? '80',
      border_color:
        anyItem.carousel_border_color ||
        item.primary_color ||
        '#0094EB',
      border_style:
        anyItem.carousel_border_width ?? defaults.carousel_border_width ?? '2',
      border_radius:
        anyItem.carousel_border_radius ?? defaults.carousel_border_radius ?? '12',
      object_fit:
        anyItem.carousel_object_fit ?? defaults.carousel_object_fit ?? 'cover',
      margin_top: anyItem.carousel_margin_top ?? '0',
      margin_bottom: anyItem.carousel_margin_bottom ?? '0',
      show_title: anyItem.carousel_show_title ?? false,
      show_product:
        anyItem.carousel_show_product ?? item.show_product ?? true,
      show_play_icon:
        anyItem.carousel_show_play_button ?? item.show_play_button ?? true,
      auto_center:
        anyItem.carousel_auto_center ?? item.auto_center ?? true,
      view_mode: anyItem.carousel_view_mode ?? defaults.carousel_view_mode,
      visible_items: safeNumber(
        anyItem.carousel_visible_items ?? item.carousel_visible_items,
        4,
        1,
      ),
    },
    legacyMobile: {
      auto_center:
        anyItem.carousel_auto_center ?? item.auto_center ?? true,
    },
  });

  carouselConfig.desktop = normalizeCarouselConfigShape(carouselConfig.desktop);
  carouselConfig.mobile = normalizeCarouselConfigShape(carouselConfig.mobile);

  const dynamicCarouselConfig = normalizeResponsiveConfig<DynamicCarouselConfig>({
    rawValue: anyItem.dynamic_carousel_config,
    desktopDefault: createDefaultDynamicCarouselDesktopConfig(),
    mobileDefault: createDefaultDynamicCarouselMobileConfig(),
    sameForAll: globalAppearance,
  });
  dynamicCarouselConfig.desktop = normalizeCarouselConfigShape(dynamicCarouselConfig.desktop) as DynamicCarouselConfig;
  dynamicCarouselConfig.mobile = normalizeCarouselConfigShape(dynamicCarouselConfig.mobile) as DynamicCarouselConfig;

  const gridConfig = normalizeResponsiveConfig<GridConfig>({
    rawValue: anyItem.grid_config,
    desktopDefault: createDefaultGridDesktopConfig(),
    mobileDefault: createDefaultGridMobileConfig(),
    sameForAll: globalAppearance,
    legacyDesktop: {
      visible_items: limitNumber(anyItem.desktop_columns, defaults.desktop_columns, 1, 10),
      rows: safeNumber(anyItem.desktop_rows, defaults.desktop_rows, 1),
      spacing: safeNumber(anyItem.desktop_gap, defaults.desktop_gap, 0),
      shape: normalizeWidgetShape(anyItem.grid_card_shape, 'portrait'),
    },
    legacyMobile: {
      visible_items: limitNumber(anyItem.mobile_columns, defaults.mobile_columns, 1, 10),
      rows: safeNumber(anyItem.mobile_rows, defaults.mobile_rows, 1),
      spacing: safeNumber(anyItem.mobile_gap, defaults.mobile_gap, 0),
      shape: normalizeWidgetShape(anyItem.grid_card_shape, 'portrait'),
    },
  });

  gridConfig.desktop = normalizeGridConfigShape(gridConfig.desktop);
  gridConfig.mobile = normalizeGridConfigShape(gridConfig.mobile);
  gridConfig.desktop.visible_items = limitNumber(gridConfig.desktop.visible_items, 10, 1, 10);
  gridConfig.mobile.visible_items = limitNumber(gridConfig.mobile.visible_items, 2, 1, 10);

  const modalRaw = parseJsonIfNeeded<ModalConfig>(anyItem.modal_config);
  const modalConfig: ModalConfig = {
    ...createDefaultModalConfig(),
    ...modalRaw,
    show_title: item.show_title ?? modalRaw?.show_title ?? defaults.show_title,
    show_play_button:
      item.show_play_button ?? modalRaw?.show_play_button ?? defaults.show_play_button,
    show_product:
      item.show_product ?? modalRaw?.show_product ?? defaults.show_product,
    show_like_button:
      item.show_like_button ?? modalRaw?.show_like_button ?? defaults.show_like_button,
    show_comment_button:
      item.show_comment_button ?? modalRaw?.show_comment_button ?? defaults.show_comment_button,
    show_share_button:
      item.show_share_button ?? modalRaw?.show_share_button ?? defaults.show_share_button,
    show_product_button:
      item.show_product_button ?? modalRaw?.show_product_button ?? defaults.show_product_button,
  };

  const floatingDesktop = floatingConfig.desktop;
  const carouselDesktop = carouselConfig.desktop;
  const gridDesktop = gridConfig.desktop;
  const gridMobile = gridConfig.mobile;

  return {
    ...defaults,
    ...item,

    id: item.id || '',
    store_id: item.store_id || storeId || '',
    name: item.name || '',
    is_default: Boolean(item.is_default),

    primary_color: item.primary_color || defaults.primary_color,
    secondary_color: item.secondary_color || defaults.secondary_color,
    text_color: item.text_color || defaults.text_color,
    background_color: item.background_color || defaults.background_color,
    button_color: item.button_color || defaults.button_color,

    font_family: item.font_family || defaults.font_family,
    widget_shape: floatingDesktop.shape as any,
    widget_size: item.widget_size || defaults.widget_size,
    widget_animation: item.widget_animation || defaults.widget_animation,

    carousel_shape: carouselDesktop.shape,
    carousel_visible_items: carouselDesktop.visible_items,
    carousel_spacing: carouselDesktop.spacing,
    carousel_size: carouselDesktop.width,
    carousel_border_color: carouselDesktop.border_color,
    carousel_border_width: carouselDesktop.border_style,
    carousel_border_radius: carouselDesktop.border_radius,
    carousel_object_fit: carouselDesktop.object_fit,
    carousel_margin_top: carouselDesktop.margin_top,
    carousel_margin_bottom: carouselDesktop.margin_bottom,
    carousel_show_title: carouselDesktop.show_title,
    carousel_show_product: carouselDesktop.show_product,
    carousel_show_play_button: carouselDesktop.show_play_icon,
    carousel_auto_center: carouselDesktop.auto_center,

    grid_shape: gridDesktop.shape,
    grid_columns: String(gridDesktop.visible_items),
    grid_rows: String(gridDesktop.rows),
    grid_spacing: String(gridDesktop.spacing),
    grid_size: gridDesktop.width,
    grid_border_color: gridDesktop.border_color,
    grid_border_width: gridDesktop.border_style,
    grid_border_radius: gridDesktop.border_radius,
    grid_object_fit: gridDesktop.object_fit,
    grid_show_title: gridDesktop.show_title,

    show_title: modalConfig.show_title,
    show_play_button: modalConfig.show_play_button,
    show_product: modalConfig.show_product,
    show_like_button: modalConfig.show_like_button,
    show_comment_button: modalConfig.show_comment_button,
    show_share_button: modalConfig.show_share_button,
    show_product_button: modalConfig.show_product_button,

    created_at: item.created_at || defaults.created_at,
    updated_at: item.updated_at || defaults.updated_at,

    useGlobalAppearance: globalAppearance,
    use_global_appearance: globalAppearance,

    floating_config: { ...floatingConfig, same_for_all: globalAppearance },
    carousel_config: { ...carouselConfig, same_for_all: globalAppearance },
    dynamic_carousel_config: { ...dynamicCarouselConfig, same_for_all: globalAppearance },
    grid_config: { ...gridConfig, same_for_all: globalAppearance },
    modal_config: modalConfig,

    width: floatingDesktop.width ?? defaults.width,
    unit: anyItem.unit ?? defaults.unit,
    height: floatingDesktop.height ?? defaults.height,

    position: floatingDesktop.position,
    floating_position: floatingDesktop.floating_position,

    bottom_spacing: floatingDesktop.bottom_spacing,
    top_spacing: floatingDesktop.top_spacing,
    left_spacing: floatingDesktop.left_spacing,
    right_spacing: floatingDesktop.right_spacing,

    cta_text: anyItem.cta_text ?? defaults.cta_text,
    cta_size: anyItem.cta_size ?? defaults.cta_size,
    cta_duration: anyItem.cta_duration ?? defaults.cta_duration,
    border_style: floatingDesktop.border_style,
    color: floatingDesktop.border_color || item.primary_color || defaults.color,
    show_play_icon: floatingDesktop.show_play_icon,
    auto_center: carouselDesktop.auto_center ?? defaults.auto_center,
    carousel_view_mode: carouselDesktop.view_mode,
    margin_top: carouselDesktop.margin_top,
    margin_bottom: carouselDesktop.margin_bottom,
    draggable: floatingDesktop.draggable,
    allow_close: floatingDesktop.allow_close,
    object_fit: floatingDesktop.object_fit,
    z_index: floatingDesktop.z_index,
    desktop_columns: gridDesktop.visible_items,
    desktop_rows: gridDesktop.rows,
    desktop_gap: gridDesktop.spacing,
    mobile_columns: gridMobile.visible_items,
    mobile_rows: gridMobile.rows,
    mobile_gap: gridMobile.spacing,
    font_size: anyItem.font_size ?? defaults.font_size,
    target_selector: anyItem.target_selector || 'body',
    insert_position: anyItem.insert_position || 'append',
  } as ExtendedAppearance;
};
// ──────────────────── DB helpers ────────────────────

const getAppearancesSafe = async (storeId: string): Promise<Appearance[]> => {
  try {
    return await db.appearances.getAll(storeId);
  } catch {
    try {
      return await db.appearances.getAll();
    } catch {
      return [];
    }
  }
};

const deleteAppearanceSafe = async (id: string, storeId?: string) => {
  try {
    if (storeId) {
      await (db.appearances as any).delete(id, storeId);
      return;
    }
    await db.appearances.delete(id);
  } catch {
    await db.appearances.delete(id);
  }
};

const getGeneralSettingsSafe = async (storeId?: string): Promise<any[]> => {
  const collection = (db as any).generalSettings;
  if (!collection?.getAll) return [];
  try {
    if (storeId) return await collection.getAll(storeId);
    return await collection.getAll();
  } catch {
    try {
      return await collection.getAll();
    } catch {
      return [];
    }
  }
};

const saveGeneralSettingsSafe = async (payload: any) => {
  const collection = (db as any).generalSettings;
  if (!collection?.save) return;
  await collection.save(payload);
};

const syncDefaultAppearanceId = async (
  finalStoreId: string,
  appearanceId: string | null,
) => {
  try {
    const settingsList = await getGeneralSettingsSafe(finalStoreId);
    const currentSettings = settingsList?.[0];
    if (!currentSettings) {
      console.warn(
        'Nenhuma configuração geral encontrada para sincronizar default_appearance_id.',
      );
      return;
    }
    await saveGeneralSettingsSafe({
      ...currentSettings,
      store_id: currentSettings.store_id || finalStoreId,
      default_appearance_id: appearanceId,
      defaultAppearanceId: appearanceId,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao sincronizar default_appearance_id:', error);
  }
};

const syncGlobalConfig = (
  checked: boolean,
  prev: ExtendedAppearance,
): ExtendedAppearance => {
  if (checked) {
    return {
      ...prev,
      useGlobalAppearance: true,
      use_global_appearance: true,
      floating_config: {
        same_for_all: true,
        desktop: prev.floating_config.desktop,
        mobile: {
          ...prev.floating_config.desktop,
          width: prev.floating_config.mobile.width || '64',
          height: prev.floating_config.mobile.height || '114',
        },
      },
      carousel_config: {
        same_for_all: true,
        desktop: prev.carousel_config.desktop,
        mobile: {
          ...prev.carousel_config.desktop,
          visible_items: prev.carousel_config.mobile.visible_items || 2,
          width: prev.carousel_config.mobile.width || '64',
        },
      },
      dynamic_carousel_config: {
        same_for_all: true,
        desktop: prev.dynamic_carousel_config.desktop,
        mobile: {
          ...prev.dynamic_carousel_config.desktop,
          width: prev.dynamic_carousel_config.mobile.width || '64',
        },
      },
      grid_config: {
        same_for_all: true,
        desktop: {
          ...prev.grid_config.desktop,
          visible_items: limitNumber(prev.grid_config.desktop.visible_items, 10, 1, 10),
        },
        mobile: {
          ...prev.grid_config.desktop,
          visible_items: limitNumber(prev.grid_config.mobile.visible_items || 2, 10, 1, 10),
          rows: prev.grid_config.mobile.rows || 2,
        },
      },
    };
  }

  return {
    ...prev,
    useGlobalAppearance: false,
    use_global_appearance: false,
    floating_config: {
      ...prev.floating_config,
      same_for_all: false,
    },
    carousel_config: {
      ...prev.carousel_config,
      same_for_all: false,
    },
    dynamic_carousel_config: {
      ...prev.dynamic_carousel_config,
      same_for_all: false,
    },
    grid_config: {
      ...prev.grid_config,
      same_for_all: false,
      desktop: {
        ...prev.grid_config.desktop,
        visible_items: limitNumber(prev.grid_config.desktop.visible_items, 10, 1, 10),
      },
      mobile: {
        ...prev.grid_config.mobile,
        visible_items: limitNumber(prev.grid_config.mobile.visible_items, 2, 1, 10),
      },
    },
  };
};

// ──────────────────── componentes de UI ────────────────────

const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}) => {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/20 dark:hover:border-[#ff7a29]/60 dark:hover:bg-[#ff7a29]/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-[#0091ff] accent-[#0091ff] focus:ring-2 focus:ring-[#0091ff]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-800 dark:text-white">{label}</span>
        {description && (
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const safeColor = isValidHexColor(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div
        className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 shadow-xs overflow-hidden"
        style={{ backgroundColor: safeColor }}
      >
        <input
          type="color"
          aria-label={label}
          value={safeColor}
          onChange={onChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-2 py-1.5 font-mono text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29]"
      />
    </div>
  );
};

const DeviceTabs = ({
  activeDevice,
  onChange,
}: {
  activeDevice: DeviceType;
  onChange: (device: DeviceType) => void;
}) => {
  return (
    <div className="flex w-fit rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-100 dark:bg-[#111524] p-1">
      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'desktop'
            ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1a1f35] hover:text-slate-800 dark:hover:text-white',
        )}
      >
        <Monitor size={15} />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'mobile'
            ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1a1f35] hover:text-slate-800 dark:hover:text-white',
        )}
      >
        <Smartphone size={15} />
        Mobile
      </button>
    </div>
  );
};

const GlobalDeviceNotice = () => {
  return (
    <div className="w-fit rounded-xl border border-blue-200 dark:border-[#ff7a29]/30 bg-blue-50 dark:bg-[#ff7a29]/10 px-4 py-2 text-xs font-bold text-[#0091ff] dark:text-[#ff7a29]">
      Aplicando Desktop também no Mobile.
    </div>
  );
};

// trecho novo
const SectionCard = ({
  title,
  description,
  children,
  className,
  onReset,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  onReset?: () => void;
}) => {
  return (
    <div
      className={cn(
        'space-y-5 rounded-2xl border border-slate-200/80 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] p-5 shadow-xs transition-all duration-300 hover:shadow-md',
        className,
      )}
    >
      <div className="border-b border-slate-100 dark:border-[#ff7a29]/20 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-500/25 transition-all cursor-pointer shrink-0"
          >
            Resetar Aba
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

const FormField = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
};

const ModalTabButton = ({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all',
        active
          ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20'
          : 'bg-slate-100 dark:bg-[#111524] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1a1f35] hover:text-slate-800 dark:hover:text-white',
      )}
    >
      {icon}
      {label}
    </button>
  );
};

const PreviewInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-[#111524] border border-slate-100 dark:border-[#ff7a29]/20 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1 truncate font-black text-slate-700 dark:text-white">{value}</p>
  </div>
);

const getShapeLabel = (shape: WidgetShape) => {
  switch (shape) {
    case 'circle':
      return 'Círculo';
    case 'square':
      return 'Quadrado';
    case 'landscape':
      return 'Paisagem 16:9';
    case 'portrait':
    default:
      return 'Retrato 9:16';
  }
};

// ──────────────────── PREVIEWS (SANDBOX REAL) ────────────────────

export const FloatingPreview = ({
  floating,
  colors,
  device,
}: {
  floating: any;
  colors: any;
  device: any;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (floating?.autoplay_videos ?? true) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [floating?.autoplay_videos]);

  const shape = floating?.shape || 'portrait';
  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const isMobile = device === 'mobile';

  const scale = isMobile ? 0.85 : 1;
  const baseWidth = (Number(floating?.width || 80)) * scale;

  const baseHeight = (isCircle || isSquare)
    ? baseWidth
    : shape === 'landscape'
      ? Math.round(baseWidth * 9 / 16)
      : Math.round(baseWidth * 16 / 9);

  // ==========================================
  // CORREÇÃO: TRATAMENTO ESTRITO DE RAIO E BORDA (ACEITA 0)
  // ==========================================
  const rawRadius = floating?.border_radius;
  const radiusNum = (rawRadius !== undefined && rawRadius !== null && rawRadius !== '' && !isNaN(Number(rawRadius)))
    ? Math.max(0, Number(rawRadius)) // Evita números negativos, aceita 0
    : 12; // Fallback se vier totalmente vazio
  
  const borderRadius = isCircle ? '50%' : `${radiusNum}px`;

// Removido o fallback para border_style, pois 'solid' gera NaN
const rawBorderWidth = floating?.border_style;
const parsedBorderWidth = (rawBorderWidth !== undefined && rawBorderWidth !== null && rawBorderWidth !== '' && !isNaN(Number(rawBorderWidth)))
  ? Math.max(0, Number(rawBorderWidth))
  : 0;

  const borderColor = floating?.border_color || colors?.primary || '#0094EB';

  const pos = floating?.position || 'fixed_bottom_right';
  const gapBottom = isMobile ? '12px' : (floating?.bottom_spacing !== undefined ? `${floating.bottom_spacing}px` : '20px');
  const gapTop = isMobile ? '12px' : (floating?.top_spacing !== undefined ? `${floating.top_spacing}px` : '20px');
  const gapLeft = isMobile ? '12px' : (floating?.left_spacing !== undefined ? `${floating.left_spacing}px` : '20px');
  const gapRight = isMobile ? '12px' : (floating?.right_spacing !== undefined ? `${floating.right_spacing}px` : '20px');

  const positionStyle: React.CSSProperties = {
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
  };

  if (pos.includes('bottom')) positionStyle.bottom = gapBottom;
  if (pos.includes('top')) positionStyle.top = gapTop;
  if (pos.includes('left')) positionStyle.left = gapLeft;
  if (pos.includes('right')) positionStyle.right = gapRight;

  const resolveBool = (val: any, fallback: boolean) => {
    if (val === undefined || val === null || val === '') return fallback;
    return String(val) === 'true' || val === true || val === 1 || val === '1';
  };

  const showPlay = resolveBool(floating?.show_play_icon, true);
  const showClose = resolveBool(floating?.allow_close, false);
  const showTooltip = resolveBool(floating?.show_tooltip ?? floating?.show_cta ?? floating?.cta_active ?? floating?.cta_enabled, false);

  const ctaText = floating?.cta_text ?? 'VER VÍDEO';
  const ctaBgColor = floating?.cta_bg_color ?? colors?.primary ?? '#0094EB';
  const ctaTextColor = floating?.cta_text_color ?? '#FFFFFF';
  const ctaFontSize = floating?.cta_font_size ?? 14;
  const ctaBold = resolveBool(floating?.cta_is_bold ?? true, true);

  return (
    <div
      style={positionStyle}
      className={cn(
        "absolute shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer z-10",
        isCircle ? "aspect-square" : "",
        "overflow-visible" 
      )}
    >
      {/* CONTAINER DO VÍDEO */}
      <div 
        className="w-full h-full relative overflow-hidden bg-slate-950 shadow-sm transition-all duration-300"
        style={{ 
          borderRadius: borderRadius,
          border: `${parsedBorderWidth}px solid ${borderColor}`,
          boxSizing: 'border-box'
        }}
      >
        <video
          ref={videoRef}
          src={DEMO_PREVIEW_VIDEOS[0]}
          loop
          muted
          playsInline
          className="w-full h-full pointer-events-none"
          style={{ objectFit: floating?.object_fit || 'cover' }}
        />
        {showPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all">
            <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center">
              <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
            </div>
          </div>
        )}

        {showClose && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-white text-slate-500 rounded-full flex items-center justify-center z-20 shadow-md transition-opacity">
            <X size={14} />
          </div>
        )}
      </div>

      {/* CTA - Pílula Vazando (Tooltip) */}
      {showTooltip && (
        <div 
          className="absolute z-20 shadow-md flex items-center justify-center whitespace-nowrap transition-all duration-300"
          style={{
            backgroundColor: ctaBgColor,
            color: ctaTextColor,
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: `${ctaFontSize}px`,
            fontWeight: ctaBold ? 'bold' : 'normal',
            bottom: '12px',
            ...(pos.includes('left') 
                ? { left: 'calc(100% - 15px)' } 
                : { right: 'calc(100% - 15px)' })
          }}
        >
          {ctaText}
        </div>
      )}
    </div>
  );
};

export const CarouselPreview = ({
  carousel,
  colors,
  isMobile = false,
}: {
  carousel: any;
  colors: any;
  isMobile?: boolean;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(isMobile ? 320 : 850);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const videoSources = DEMO_PREVIEW_VIDEOS;
  const len = videoSources.length;
  const REPEAT_TILES = 16;
  const baseIndex = Math.floor(REPEAT_TILES / 2) * len;
  const trackVideos = Array.from({ length: REPEAT_TILES }, () => videoSources).flat();

  const [trackIndex, setTrackIndex] = useState(baseIndex);
  const [noTransition, setNoTransition] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Loop infinito na navegação
  useEffect(() => {
    if (trackIndex - baseIndex >= len || trackIndex - baseIndex <= -len) {
      const t = setTimeout(() => {
        setNoTransition(true);
        setTrackIndex(baseIndex + ((trackIndex - baseIndex) % len));
        requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
      }, 500);
      return () => clearTimeout(t);
    }
  }, [trackIndex, baseIndex, len]);

  const cw = containerWidth || (isMobile ? 320 : 850);
  const isMobileView = isMobile || cw <= 480;

  const shape = normalizeWidgetShape(carousel?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const showTitle = carousel?.show_title ?? false;
  const spacingNum = Number(carousel?.spacing ?? carousel?.gap ?? 12) || 0;

  const visibleItemsDesktop = Math.max(1, Number(carousel?.visible_items ?? carousel?.visibleItems ?? 4));

  const rawBorderWidth = carousel?.border_width ?? carousel?.border_style;
  const borderWidth = rawBorderWidth !== undefined && rawBorderWidth !== '' ? Number(rawBorderWidth) : 0;
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  
  // CORREÇÃO DO RAIO DA BORDA: aceita o valor 0 corretamente
  const rawBorderRadius = carousel?.border_radius ?? carousel?.borderRadius;
  const borderRadiusNum = rawBorderRadius !== undefined && rawBorderRadius !== '' ? Number(rawBorderRadius) : 12;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;

  // CORREÇÃO DO ALINHAMENTO DO TÍTULO: pega a prop do painel ou centraliza por padrão
  const titleAlign = carousel?.title_align ?? carousel?.title_alignment ?? (isMobileView ? 'left' : 'center');

  const baseItemWidth = isMobileView
    ? cw * 0.60
    : Math.max(40, (cw - (spacingNum * (visibleItemsDesktop - 1))) / visibleItemsDesktop);
  const step = baseItemWidth + spacingNum;

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const isVisible = isMobileView
        ? (i >= trackIndex - 1 && i <= trackIndex + 1)
        : (i >= trackIndex && i < trackIndex + visibleItemsDesktop);
      if (isVisible && (carousel?.autoplay_videos ?? true)) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [carousel?.autoplay_videos, trackIndex, isMobileView, visibleItemsDesktop]);

  const handleDragStart = (x: number) => { setNoTransition(true); setDragStartX(x); };
  const handleDragMove = (x: number) => { if (dragStartX !== null) setDragOffset(x - dragStartX); };
  const handleDragEnd = () => {
    if (dragStartX === null) return;
    if (dragOffset > 40) setTrackIndex(prev => prev - 1);
    else if (dragOffset < -40) setTrackIndex(prev => prev + 1);
    setDragStartX(null);
    setDragOffset(0);
    setNoTransition(false);
  };

  const transformStyle = isMobileView
    ? `translateX(${(cw / 2) - ((trackIndex * step) + (baseItemWidth / 2)) + dragOffset}px)`
    : `translateX(${-trackIndex * step + dragOffset}px)`;

  return (
    <div className="w-full py-2 flex flex-col space-y-3 select-none overflow-hidden" ref={containerRef}>
      {showTitle && (
        <h4
          style={{ 
            fontSize: `${carousel?.title_font_size || 14}px`, 
            fontWeight: carousel?.title_bold ? 'bold' : 'normal',
            textAlign: titleAlign as any // <- Aplica o alinhamento aqui
          }}
          className={cn('tracking-wider w-full px-1', isMobile ? 'text-slate-800' : 'text-slate-100')}
        >
          {carousel?.title_text || 'Stories'}
        </h4>
      )}

      <div
        className="relative w-full cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          className="flex items-start"
          style={{
            gap: `${spacingNum}px`,
            transform: transformStyle,
            transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {trackVideos.map((videoSrc, i) => (
            <div
              key={i}
              className="shrink-0 flex flex-col transition-all duration-300"
              style={{
                width: `${baseItemWidth}px`,
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: isCircle || shape === 'square'
                    ? `${baseItemWidth}px`
                    : shape === 'landscape'
                      ? `${Math.round(baseItemWidth * (9 / 16))}px`
                      : `${Math.round(baseItemWidth * (16 / 9))}px`,
                  borderRadius, // <- Agora respeita o valor 0 corretamente
                  border: `${borderWidth}px solid ${borderColor}`,
                  boxSizing: 'border-box'
                }}
                className="relative overflow-hidden bg-slate-950 flex items-center justify-center shadow-sm"
              >
                <video
                  ref={el => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }}
                  src={videoSrc}
                  loop
                  muted
                  playsInline
                  style={{ objectFit: carousel?.object_fit || 'cover' }}
                  className="w-full h-full pointer-events-none"
                />
                {carousel?.show_play_icon !== false && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center">
                      <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {carousel?.show_product && !isCircle && (
                <div
                  className="w-full flex items-center gap-2 transition-all duration-300 overflow-hidden box-border pointer-events-none"
                  style={{
                    backgroundColor: carousel?.product_card_bg || '#FFFFFF',
                    border: `${Number(carousel?.product_card_border_width ?? 1)}px solid ${carousel?.product_card_border_color || '#E2E8F0'}`,
                    borderRadius: `${Number(carousel?.product_card_border_radius ?? 12)}px`,
                    padding: '8px',
                  }}
                >
                  <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                    <img src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p style={{ fontSize: `${Number(carousel?.product_card_name_size ?? 9)}px`, color: carousel?.product_card_name_color || '#0F172A' }} className="font-bold truncate">Calça Confort</p>
                    <p style={{ fontSize: `${Number(carousel?.product_card_price_size ?? 8)}px`, color: carousel?.product_card_price_color || colors?.primary || '#0094EB' }} className="font-black">R$ 149,95</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export const DynamicCarouselPreview = ({
  carousel,
  colors,
  isMobile = false,
}: {
  carousel: any;
  colors: any;
  isMobile?: boolean;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(isMobile ? 320 : 850);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const videoSources = DEMO_PREVIEW_VIDEOS;
  const len = videoSources.length;
  const REPEAT_TILES = 16;
  const baseIndex = Math.floor(REPEAT_TILES / 2) * len;
  const trackVideos = Array.from({ length: REPEAT_TILES }, () => videoSources).flat();

  const [trackIndex, setTrackIndex] = useState(baseIndex);
  const [noTransition, setNoTransition] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const delay = Number(carousel?.autoplay_delay) || 5000;
    if (delay <= 0 || dragStartX !== null) return;
    const interval = setInterval(() => setTrackIndex((prev) => prev + 1), delay);
    return () => clearInterval(interval);
  }, [carousel?.autoplay_delay, dragStartX]);

  useEffect(() => {
    if (trackIndex - baseIndex >= len || trackIndex - baseIndex <= -len) {
      const t = setTimeout(() => {
        setNoTransition(true);
        setTrackIndex(baseIndex + ((trackIndex - baseIndex) % len));
        requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
      }, 600);
      return () => clearTimeout(t);
    }
  }, [trackIndex, baseIndex, len]);

  const shape = normalizeWidgetShape(carousel?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const spacingNum = Number(carousel?.spacing ?? 8) || 0;
  const visibleItems = Math.max(1, Number(carousel?.visible_items ?? 4));

  const ml = Number(carousel?.margin_left ?? 0);
  const mr = Number(carousel?.margin_right ?? 0);
  const mt = Number(carousel?.margin_top ?? 0);
  const mb = Number(carousel?.margin_bottom ?? 0);

  const cw = containerWidth || (isMobile ? 320 : 850);
  const availableWidth = Math.max(1, cw - ml - mr);

  const baseItemWidth = isMobile 
    ? cw * 0.6 
    : Math.max(80, (availableWidth - (spacingNum * (visibleItems - 1))) / visibleItems);

  const step = baseItemWidth + spacingNum;

  const rawBorderWidth = carousel?.border_width ?? carousel?.border_style;
  const borderWidth = rawBorderWidth !== undefined && rawBorderWidth !== '' ? Number(rawBorderWidth) : 0;
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  const borderRadiusNum = Number(carousel?.border_radius ?? 12) || 0;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;

  // CORREÇÃO: alinhamento do título
  const titleAlign = carousel?.title_align ?? 'center';
  const titleJustifyClass = titleAlign === 'left' ? 'text-left' : titleAlign === 'right' ? 'text-right' : 'text-center';

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === trackIndex || (carousel?.autoplay_videos ?? true)) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [carousel?.autoplay_videos, trackIndex]);

  const handleDragStart = (clientX: number) => { setNoTransition(true); setDragStartX(clientX); };
  const handleDragMove = (clientX: number) => { if (dragStartX !== null) setDragOffset(clientX - dragStartX); };
  const handleDragEnd = () => {
    if (dragStartX === null) return;
    if (dragOffset > 50) setTrackIndex(prev => prev - 1);
    else if (dragOffset < -50) setTrackIndex(prev => prev + 1);
    setDragStartX(null); setDragOffset(0); setNoTransition(false);
  };

  return (
    <div 
      className="w-full overflow-hidden select-none box-border" 
      ref={containerRef}
      style={{
        paddingTop: `${mt}px`,
        paddingBottom: `${mb}px`,
        paddingLeft: `${ml}px`,
        paddingRight: `${mr}px`,
      }}
    >
      {carousel?.show_title && (
        <div className={cn("w-full px-4", titleJustifyClass)}>
          <h4 
            style={{ fontSize: `${Number(carousel?.title_font_size ?? 14)}px`, fontWeight: carousel?.title_bold ?? true ? 'bold' : 'normal' }} 
            className={isMobile ? 'text-slate-800' : 'text-slate-100 uppercase tracking-wider'}
          >
            {carousel?.title_text ?? 'Destaques'}
          </h4>
        </div>
      )}

      <div 
        className="relative w-full py-4 cursor-grab active:cursor-grabbing touch-pan-y"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          className="flex items-center"
          style={{
            gap: `${spacingNum}px`,
            // CORREÇÃO: destaque SEMPRE centralizado, tanto mobile quanto desktop
            transform: `translateX(calc(50% - ${trackIndex * step + baseItemWidth / 2}px + ${dragOffset}px))`,
            transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {trackVideos.map((videoSrc, i) => {
            const isAct = i === trackIndex;
            // CORREÇÃO: inatividade não depende mais do device
            const isInactive = !isAct;

            let cardHeightStr = isCircle || shape === 'square' ? `${baseItemWidth}px` : shape === 'landscape' ? `${Math.round(baseItemWidth * (9 / 16))}px` : `${Math.round(baseItemWidth * (16 / 9))}px`;

            // CORREÇÃO: ampliação do destaque funciona em mobile E desktop
            let scaleVal = 1;
            if (carousel?.highlight_enlarge_active) {
              scaleVal = isAct ? 1.05 : 0.95;
            } else if (!isAct) {
              scaleVal = 0.95;
            }

            return (
              <div
                key={i}
                className="shrink-0 flex flex-col items-center transition-all duration-500"
                style={{ width: `${baseItemWidth}px`, transform: `scale(${scaleVal})`, zIndex: isAct ? 10 : 1, gap: '12px' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: cardHeightStr,
                    borderRadius,
                    border: isInactive ? `${borderWidth}px solid transparent` : `${borderWidth}px solid ${borderColor}`,
                    boxShadow: isAct && carousel?.highlight_shadow ? '0 12px 28px -5px rgba(0,0,0,0.45)' : 'none',
                    // CORREÇÃO: desaturação funciona em mobile E desktop
                    opacity: isInactive && carousel?.highlight_desaturate_inactive ? 0.7 : 1,
                    filter: isInactive && carousel?.highlight_desaturate_inactive ? 'grayscale(80%)' : 'none',
                    boxSizing: 'border-box'
                  }}
                  className="relative overflow-hidden bg-slate-950 transition-all duration-500 box-border pointer-events-none"
                >
                  <video
                    ref={el => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }}
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    style={{ objectFit: carousel?.object_fit || 'cover' }}
                    className="w-full h-full"
                  />
                  {isInactive && <div className="absolute inset-0 bg-black/60 z-10" />}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                  
                  {isAct && carousel?.show_play_icon !== false && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-10 h-10 rounded-full bg-white/95 shadow-md flex items-center justify-center">
                        <Play size={14} className="text-slate-900 fill-slate-900 ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {carousel?.show_product && !isCircle && (
                  <div
                    className="w-full flex items-center gap-2 transition-all duration-300 overflow-hidden box-border pointer-events-none"
                    style={{
                      backgroundColor: carousel?.product_card_bg || '#FFFFFF',
                      border: `${Number(carousel?.product_card_border_width ?? 1)}px solid ${carousel?.product_card_border_color || '#E2E8F0'}`,
                      borderRadius: `${Number(carousel?.product_card_border_radius ?? 12)}px`,
                      padding: '8px',
                      filter: isInactive ? 'grayscale(80%)' : 'none'
                    }}
                  >
                    <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                      <img src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p style={{ fontSize: `${Number(carousel?.product_card_name_size ?? 9)}px`, color: carousel?.product_card_name_color || '#0F172A' }} className="font-bold truncate">Calça Confort</p>
                      <p style={{ fontSize: `${Number(carousel?.product_card_price_size ?? 8)}px`, color: carousel?.product_card_price_color || colors?.primary || '#0094EB' }} className="font-black">R$ 149,95</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const GridPreview = ({
  grid,
  colors,
  isMobile = false,
}: {
  grid: any;
  colors: any;
  isMobile?: boolean;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [activeSeqIndex, setActiveSeqIndex] = useState(0);
  
  const shape = normalizeWidgetShape(grid?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const objectFit = grid?.object_fit || 'cover';
  const spacing = safeNumber(grid?.spacing, 12, 0);
  const showPlayIcon = grid?.show_play_icon ?? true;
  const showProduct = grid?.show_product ?? false;
  const isSequential = grid?.sequential_playback ?? false;

  const totalPreviewItems = isMobile ? 4 : limitNumber(grid?.visible_items, 10, 1, 10) * 2;

  // Reprodução sequencial
  useEffect(() => {
    if (!isSequential) return;
    const interval = setInterval(() => {
      setActiveSeqIndex(prev => (prev + 1) % totalPreviewItems);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSequential, totalPreviewItems]);

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      const shouldPlay = isSequential
        ? idx === activeSeqIndex
        : (grid?.autoplay_videos ?? true);
      if (shouldPlay) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [grid?.autoplay_videos, isSequential, activeSeqIndex]);

  // CORREÇÃO: Tratamento rigoroso para o Raio da Borda (Aceitar 0px e não voltar para 12px)
  const rawBorderRadius = grid?.border_radius;
  const borderRadiusNum = rawBorderRadius !== undefined && rawBorderRadius !== '' ? Number(rawBorderRadius) : 12;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;
  
  // CORREÇÃO: Tratamento rigoroso para a largura da borda
  const rawBorder = grid?.border_width ?? grid?.border_style;
  const parsedBorderWidth = rawBorder !== undefined && rawBorder !== null && rawBorder !== '' && !isNaN(Number(rawBorder)) ? Number(rawBorder) : 0;
  
  const rawCardBorder = grid?.product_card_border_width;
  const parsedCardBorderWidth = rawCardBorder !== undefined && rawCardBorder !== null && rawCardBorder !== '' && !isNaN(Number(rawCardBorder)) ? Number(rawCardBorder) : 0;

  const desktopCanvasWidth = 850;
  const desktopScale = isMobile ? 1 : Math.min(1, desktopCanvasWidth / Math.max(1, limitNumber(grid?.visible_items, 10, 1, 10) * 160));

  const titleAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[grid?.title_align ?? 'center'] || 'text-center';

  const titleStyle: React.CSSProperties = {
    fontSize: `${safeNumber(grid?.title_font_size, 14, 8)}px`,
    fontWeight: (grid?.title_bold ?? true) ? 900 : 500,
  };

  const renderProductCard = (i: number, compact = false) => (
    <div
      style={{
        backgroundColor: grid?.product_card_bg || '#FFFFFF',
        borderColor: grid?.product_card_border_color || '#E2E8F0',
        borderWidth: `${parsedCardBorderWidth}px`,
        borderRadius: `${safeNumber(grid?.product_card_border_radius, 8, 0)}px`,
        boxSizing: 'border-box'
      }}
      className={`border flex items-center gap-1 shadow-sm overflow-hidden ${compact ? 'p-1' : 'p-2'}`}
    >
      <div className={`rounded shrink-0 overflow-hidden ${compact ? 'w-5 h-5' : 'w-8 h-8'} bg-slate-200 border border-slate-100`}>
        <img
          src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p
          className="truncate"
          style={{
            fontSize: `${safeNumber(grid?.product_card_name_size, compact ? 7 : 9, 6)}px`,
            color: grid?.product_card_name_color || '#0F172A',
            fontWeight: 700,
          }}
        >
          Calça Confort
        </p>
        <p
          style={{
            fontSize: `${safeNumber(grid?.product_card_price_size, compact ? 6.5 : 8, 6)}px`,
            color: grid?.product_card_price_color || colors?.primary || '#0094EB',
            fontWeight: 900,
          }}
        >
          R$ 149,95
        </p>
      </div>
    </div>
  );

  // --- MOBILE ---
  if (isMobile) {
    const items = Array.from({ length: 4 });

    let aspectClass = "aspect-[9/15]";
    if (isCircle) {
      aspectClass = "aspect-square";
    } else if (shape === 'landscape') {
      aspectClass = "aspect-[16/9]";
    } else if (shape === 'square') {
      aspectClass = "aspect-square";
    }

    return (
      <div className="w-full py-2 flex flex-col space-y-3 box-border">
        {grid?.show_title && (
          <h4 className={`uppercase tracking-wider text-slate-800 ${titleAlignClass}`} style={titleStyle}>
            {grid?.title_text || 'Grade de Vídeos'}
          </h4>
        )}

<div
  style={{
    marginLeft: `${Number(grid?.margin_left ?? 0)}px`,
    marginRight: `${Number(grid?.margin_right ?? 0)}px`,
    marginTop: `${Number(grid?.margin_top ?? 0)}px`,
    marginBottom: `${Number(grid?.margin_bottom ?? 0)}px`,
  }}
  className="grid grid-cols-2 w-full px-2"
          style={{ gap: `${spacing}px` }}
        >
          {items.map((_, i) => (
            <div key={i} className="flex flex-col" style={{ gap: '6px' }}>
              <div
                className={`relative bg-slate-950 overflow-hidden shadow-sm flex items-center justify-center transition-all duration-300 ${aspectClass}`}
                style={{
                  borderRadius: borderRadius, // Usa a nova variável tratada
                  border: `${parsedBorderWidth}px solid ${grid?.border_color || colors?.primary || '#0094EB'}`,
                  boxSizing: 'border-box' 
                }}
              >
                <video
                  ref={el => { if (el) videoRefs.current.set(i, el); }}
                  src={DEMO_PREVIEW_VIDEOS[i % DEMO_PREVIEW_VIDEOS.length]}
                  loop
                  muted
                  playsInline
                  className="w-full h-full pointer-events-none"
                  style={{ objectFit: objectFit as any }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
                {showPlayIcon && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                      <Play size={8} className="text-slate-900 fill-slate-900 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {showProduct && !isCircle && renderProductCard(i, true)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- DESKTOP ---
  const cols = limitNumber(grid?.visible_items, 10, 1, 10);
  const totalItems = cols * 2;
  const items = Array.from({ length: totalItems });
  const shapeRatio = shape === 'landscape' ? (9 / 16) : (16 / 9);

  return (
    <div className="w-full py-3 space-y-3 box-border">
      {grid?.show_title && (
        <h4 className={`tracking-wider text-slate-100 ${titleAlignClass}`} style={titleStyle}>
          {grid?.title_text || 'Grade de Vídeos'}
        </h4>
      )}
      <div
        className="grid w-full"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, 
          gap: `${spacing * desktopScale}px`, 
          transform: `scale(${desktopScale})`, 
          transformOrigin: 'center center' 
        }}
      >
        {items.map((_, i) => (
          <div key={i} className="w-full flex flex-col space-y-2">
            <div
              style={{
                width: '100%',
                aspectRatio: isCircle ? '1 / 1' : `${1} / ${shapeRatio}`,
                borderRadius, // Usa a nova variável tratada
                border: `${parsedBorderWidth}px solid ${grid?.border_color || colors?.primary || '#0094EB'}`,
                boxSizing: 'border-box'
              }}
              className="relative overflow-hidden bg-slate-950 shadow-sm flex items-center justify-center shrink-0"
            >
              <video
                ref={el => { if (el) videoRefs.current.set(i, el); }}
                src={DEMO_PREVIEW_VIDEOS[i % DEMO_PREVIEW_VIDEOS.length]}
                loop
                muted
                playsInline
                className="w-full h-full pointer-events-none"
                style={{ objectFit: objectFit as any }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
              {showPlayIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                    <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
            {showProduct && !isCircle && renderProductCard(i)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ModalPreview = ({
  formData,
  colors,
  isMobile = false,
}: {
  formData: ExtendedAppearance;
  colors: PreviewColors;
  isMobile?: boolean;
}) => {
  const { modal_config: m } = formData;
  
  // Tratamento da borda do modal
  const parsedBorderWidth = m.border_width !== undefined && m.border_width !== null && m.border_width !== '' 
    ? Number(m.border_width) 
    : 0;

  // Tratamento rigoroso para propriedades do Card do Produto
  const rawCardBorder = m.product_card_border_width;
  const parsedCardBorderWidth = rawCardBorder !== undefined && rawCardBorder !== null && rawCardBorder !== '' && !isNaN(Number(rawCardBorder)) ? Number(rawCardBorder) : 0;
  
  const getCardStyle = () => ({
    backgroundColor: m.product_card_bg || 'rgba(255,255,255,0.95)',
    borderColor: m.product_card_border_color || 'rgba(255,255,255,0.2)',
    borderWidth: `${parsedCardBorderWidth}px`,
    borderStyle: parsedCardBorderWidth > 0 ? 'solid' : 'none',
    borderRadius: m.product_card_border_radius !== undefined ? `${m.product_card_border_radius}px` : '1rem',
  });

  const getFontSize = (sizeVal: any, defaultSize: number, mobileScale = 1) => {
    const size = sizeVal !== undefined && sizeVal !== null && sizeVal !== '' ? Number(sizeVal) : defaultSize;
    return `${size * mobileScale}px`;
  };

  // ==========================================
  // FLAGS DE EXIBIÇÃO (Resilientes a variações de nome no form)
  // ==========================================
  const showLike = m.show_like_button !== false;
  const showComments = m.show_comments_button !== false && m.show_comment_button !== false && m.show_comments !== false;
  const showShare = m.show_share_button !== false;
  const showProduct = m.show_product !== false;

  if (isMobile) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-950/90 flex items-center justify-center p-4">
        <div 
          className="relative w-full h-[85%] max-h-[700px] overflow-hidden flex flex-col justify-between shadow-2xl bg-black"
          style={{
            color: '#FFFFFF',
            fontFamily: formData.font_family,
            borderColor: m.border_color || colors.primary,
            borderWidth: `${parsedBorderWidth}px`,
            borderStyle: parsedBorderWidth > 0 ? 'solid' : 'none',
            borderRadius: m.border_radius ? `${m.border_radius}px` : '1rem',
          }}
        >
          <video
            src={DEMO_PREVIEW_VIDEOS[0]}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10" />

          {/* Header do Player */}
          <div className="relative z-20 flex items-center justify-between p-3 pt-3">
            {m.show_title && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm" />
                <div>
                  <h4 className="text-xs font-bold text-white drop-shadow leading-tight">Calça Confort</h4>
                  <p className="text-[9px] text-white/70">Vidlytics Store</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/60"
            >
              <X size={14} />
            </button>
          </div>

          {/* Botões de engajamento Lateral */}
          <div className="absolute right-3 bottom-[110px] z-20 flex flex-col items-center gap-3.5">
            {showLike && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Heart size={16} className="text-white fill-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">1.2k</span>
              </button>
            )}
            {showComments && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">48</span>
              </button>
            )}
            {showShare && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Share2 size={16} className="text-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">Enviar</span>
              </button>
            )}
          </div>

          {/* Rodapé com Card e Linha de Progresso */}
          <div className="relative z-20 w-full p-3 space-y-2.5">
            {showProduct && (
              <div 
                className="backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-2xl transition hover:scale-[1.01]"
                style={getCardStyle()}
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=150&q=80"
                    alt="Product"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 
                    className="font-bold truncate" 
                    style={{ 
                      color: m.product_card_name_color || '#0F172A',
                      fontSize: getFontSize(m.product_card_name_size, 11)
                    }}
                  >
                    Calça Confort Premium
                  </h5>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span 
                      className="font-black" 
                      style={{ 
                        color: m.product_card_price_color || colors.primary,
                        fontSize: getFontSize(m.product_card_price_size, 11)
                      }}
                    >
                      R$ 149,95
                    </span>
                    <span className="text-[9px] text-slate-400 line-through">R$ 199,90</span>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="shrink-0"
                  style={{ color: m.product_card_price_color || colors.primary }}
                />
              </div>
            )}

            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full w-2/3" style={{ backgroundColor: colors.primary }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP: Player simulado
// DEPOIS:
return (
  <div className="relative h-full w-full overflow-hidden bg-[#0f111a] border border-slate-800/80 rounded-2xl">
    <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-12 rounded-full bg-white/10" />
            <div className="h-2 w-12 rounded-full bg-white/10" />
            <div className="h-2 w-12 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="mt-4 flex-1 rounded-2xl bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center gap-3">
          <div className="h-4 w-44 rounded-full bg-white/10" />
          <div className="h-2.5 w-64 rounded-full bg-white/[0.07]" />
          <div className="h-2.5 w-52 rounded-full bg-white/[0.07]" />
        </div>
      </div>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="relative h-full max-h-[410px] w-full max-w-[230px] overflow-hidden shadow-2xl shrink-0 bg-slate-900 flex flex-col justify-between"
          style={{
            color: '#FFFFFF',
            fontFamily: formData.font_family,
            borderColor: m.border_color || colors.primary,
            borderWidth: `${parsedBorderWidth}px`,
            borderStyle: parsedBorderWidth > 0 ? 'solid' : 'none',
            borderRadius: m.border_radius ? `${m.border_radius}px` : '1.25rem',
          }}
        >
          <video
            src={DEMO_PREVIEW_VIDEOS[0]}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10" />

          {/* Header */}
          <div className="relative z-20 flex items-center justify-between p-3">
            {m.show_title && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm" />
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-white drop-shadow truncate w-24 leading-tight">Calça Confort</h4>
                  <p className="text-[8px] text-white/70 truncate w-24">Vidlytics Store</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <X size={12} />
            </button>
          </div>

          {/* Botões Desktop */}
          <div className="absolute right-2.5 bottom-[88px] z-20 flex flex-col items-center gap-2.5">
            {showLike && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Heart size={13} className="text-white fill-white" />
                </div>
                <span className="text-[7px] font-semibold mt-0.5 drop-shadow">1.2k</span>
              </button>
            )}
            {showComments && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <MessageCircle size={13} className="text-white" />
                </div>
                <span className="text-[7px] font-semibold mt-0.5 drop-shadow">48</span>
              </button>
            )}
            {showShare && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150">
                <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Share2 size={13} className="text-white" />
                </div>
                <span className="text-[7px] font-semibold mt-0.5 drop-shadow">Enviar</span>
              </button>
            )}
          </div>

          {/* Card Produto Desktop */}
          <div className="relative z-20 w-full p-2.5 space-y-2">
            {showProduct && (
              <div 
                className="backdrop-blur-md p-2 flex items-center gap-2 shadow-2xl transition hover:scale-[1.01]"
                style={getCardStyle()}
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=150&q=80"
                    alt="Product"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 
                    className="font-bold truncate"
                    style={{ 
                      color: m.product_card_name_color || '#0F172A',
                      fontSize: getFontSize(m.product_card_name_size, 9, 0.8) 
                    }}
                  >
                    Calça Confort Premium
                  </h5>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span 
                      className="font-black"
                      style={{ 
                        color: m.product_card_price_color || colors.primary,
                        fontSize: getFontSize(m.product_card_price_size, 9, 0.8)
                      }}
                    >
                      R$ 149,95
                    </span>
                    <span className="text-[7px] text-slate-400 line-through">R$ 199,90</span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0"
                  style={{ color: m.product_card_price_color || colors.primary }}
                />
              </div>
            )}

            <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full w-2/3" style={{ backgroundColor: colors.primary }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VisualPreview = ({
  formData,
  colors,
}: {
  formData: ExtendedAppearance;
  colors: PreviewColors;
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-white rounded-[1.25rem] border border-dashed border-slate-200 shadow-xs space-y-6 w-full max-w-lg mx-auto">
      {formData.is_default && (
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1.5">
          <Star size={12} className="fill-emerald-500 text-emerald-500" />
          Estilo Padrão da Loja
        </div>
      )}

      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identificação</span>
        <h3 className="mt-1 text-2xl font-black text-slate-900 truncate max-w-[300px]">
          {formData.name || 'Nome do Estilo'}
        </h3>
      </div>

      <div className="w-full flex items-center justify-between px-6 py-8 bg-slate-50/60 rounded-2xl border border-slate-100">
        <div className="flex flex-col items-center gap-3.5">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-700 shadow-xs transition-all hover:scale-105 duration-200">
            <Monitor size={40} className="stroke-[1.5]" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Desktop</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {formData.useGlobalAppearance ? (
            <>
              <div className="h-1 w-full bg-[#0091ff] rounded-full relative mb-3 flex items-center justify-center">
                <span className="absolute bg-white px-3 py-1 border-2 border-[#0091ff] rounded-full shadow-md text-sm">
                  🔗
                </span>
              </div>
              <span className="text-[10px] font-black text-[#0091ff] uppercase tracking-widest">Unificados</span>
            </>
          ) : (
            <>
              <div className="h-0.5 w-full border-dashed border-t-2 border-slate-300 mb-3" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Separados</span>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-3.5">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-700 shadow-xs transition-all hover:scale-105 duration-200">
            <Smartphone size={40} className="stroke-[1.5]" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mobile</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed text-center max-w-[360px]">
        {formData.useGlobalAppearance
          ? 'Configuração unificada: As alterações que você fizer em Desktop serão aplicadas automaticamente ao Mobile.'
          : 'Configuração independente: Personalize aparências diferentes para Desktop e Mobile de forma isolada.'}
      </p>
    </div>
  );
};

const AccordionSection = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] shadow-xs transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-slate-50/50 dark:bg-[#111524]/60 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-[#111524] transition-colors"
      >
        {title}
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-500 dark:text-slate-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>
      {isOpen && <div className="border-t border-slate-100 dark:border-[#ff7a29]/20 p-4">{children}</div>}
    </div>
  );
};

const ScaleToFit = ({ children }: { children: React.ReactNode }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculate = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const outerRect = outer.getBoundingClientRect();
      const innerHeight = inner.scrollHeight;
      const innerWidth = inner.scrollWidth;

      if (innerHeight === 0 || innerWidth === 0) return;

      const scaleY = outerRect.height / innerHeight;
      const scaleX = outerRect.width / innerWidth;
      const nextScale = Math.min(scaleX, scaleY, 1);

      setScale(nextScale > 0 ? nextScale : 1);
    };

    calculate();

    const resizeObserver = new ResizeObserver(calculate);
    if (outerRef.current) resizeObserver.observe(outerRef.current);
    if (innerRef.current) resizeObserver.observe(innerRef.current);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const PreviewCard = ({
  formData,
  floatingDevice, setFloatingDevice,
  carouselDevice, setCarouselDevice,
  dynamicCarouselDevice, setDynamicCarouselDevice,
  gridDevice, setGridDevice,
  activeTab,
}: any) => {
  const [playerDevice, setPlayerDevice] = useState<'desktop' | 'mobile'>('mobile');

  const activeDevice = 
    activeTab === 'floating' ? floatingDevice :
    activeTab === 'carousel' ? carouselDevice :
    activeTab === 'dynamic_carousel' ? dynamicCarouselDevice :
    activeTab === 'grid' ? gridDevice : 
    playerDevice;

  const handleDeviceChange = (device: 'desktop' | 'mobile') => {
    if (activeTab === 'floating') setFloatingDevice(device);
    if (activeTab === 'carousel') setCarouselDevice(device);
    if (activeTab === 'dynamic_carousel') setDynamicCarouselDevice(device);
    if (activeTab === 'grid') setGridDevice(device);
    if (activeTab === 'modal' || activeTab === 'basic') setPlayerDevice(device);
  };

  const floating = getActiveResponsiveConfig(formData.floating_config, activeDevice, formData.useGlobalAppearance);
  const carousel = getActiveResponsiveConfig(formData.carousel_config, activeDevice, formData.useGlobalAppearance);
  const dynamicCarousel = getActiveResponsiveConfig(formData.dynamic_carousel_config, activeDevice, formData.useGlobalAppearance);
  const grid = getActiveResponsiveConfig(formData.grid_config, activeDevice, formData.useGlobalAppearance);

  const colors = {
    primary: formData.primary_color,
    secondary: formData.secondary_color,
    text: formData.text_color,
    background: formData.background_color,
    button: formData.button_color,
    floatingBorder: floating.border_color || formData.primary_color,
  };

  const isMobileFrame = activeDevice === 'mobile';
  const isBasicTab = activeTab === 'basic';

  return (
    <aside className="relative flex h-full min-h-[580px] max-h-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] shadow-xs transition-all duration-300 hover:shadow-md">
      
      {/* Toggles de Dispositivo: Ocultados na aba Básico */}
      {!isBasicTab && (
        <div className="absolute top-4 right-4 z-50 flex items-center bg-[#111524]/90 backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => handleDeviceChange('desktop')}
            className={cn(
              "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
              activeDevice === 'desktop' ? "bg-[#ff7a29] text-white shadow-md shadow-orange-500/40" : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
            title="Visualizar em Desktop"
          >
            <Monitor size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleDeviceChange('mobile')}
            className={cn(
              "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
              activeDevice === 'mobile' ? "bg-[#ff7a29] text-white shadow-md shadow-orange-500/40" : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
            title="Visualizar em Mobile"
          >
            <Smartphone size={18} />
          </button>
        </div>
      )}

      {/* ÁREA DO PREVIEW */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4 bg-slate-50/50 dark:bg-[#111524]/60 overflow-hidden">
        
        {isBasicTab ? (
          /* 1. ABA BÁSICA: Sem mockup de celular, centralizado */
          <div className="w-full max-w-[460px] p-6 bg-white dark:bg-[#111524] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-300">
            <VisualPreview formData={formData} colors={colors} />
          </div>
        ) : (
          /* 2. OUTRAS ABAS (Flutuante, Carrossel, Grade, Player) */
          <div className="w-full flex justify-center items-center h-full preview-container-canvas">
            {/* CSS de Hardening para garantir que nenhum scrollbar apareça nos previews */}
            <style>{`
              .preview-container-canvas *::-webkit-scrollbar {
                display: none !important;
              }
              .preview-container-canvas * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
            `}</style>

            {isMobileFrame ? (
              /* ================== MOCKUP DO CELULAR PREMIUM (Autoajustável) ================== */
              <div className="relative mx-auto w-[275px] h-[550px] bg-[#07080d] rounded-[2.5rem] p-2 flex shrink-0 ring-4 ring-[#ff7a29]/20 shadow-2xl border border-[#ff7a29]/30 transition-all duration-300">
                {/* Notch / Câmera */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#07080d] rounded-b-xl z-50 flex justify-center items-center">
                  <div className="w-6 h-0.5 rounded-full bg-slate-800"></div>
                </div>

                {/* Tela interna do Celular */}
                <div className="flex-1 w-full h-full bg-[#0d0f17] rounded-[1.9rem] overflow-hidden relative flex flex-col border border-[#ff7a29]/10">
                  {activeTab === 'floating' ? (
                    <div className="relative w-full h-full p-2 flex flex-col justify-end">
                      <div className="relative w-full h-full z-10">
                        <FloatingPreview floating={floating} colors={colors} device={activeDevice} />
                      </div>
                    </div>
                  ) : activeTab === 'modal' ? (
                    <div className="w-full h-full">
                      <ModalPreview formData={formData} colors={colors} isMobile={true} />
                    </div>
                  ) : (
                    /* Mobile: Carrosséis encostam 100% nas bordas laterais (px-0) */
                    <div className={`flex-1 w-full h-full overflow-hidden flex flex-col justify-center bg-[#0d0f17] ${
                      activeTab === 'grid' ? 'p-3' : 'px-0 py-3'
                    }`}>
                      {activeTab === 'carousel' && (
                        <CarouselPreview
                          carousel={{
                            ...carousel,
                            // Suporta propriedades snake_case e camelCase de forma segura
                            itemWidth: Math.floor((850 - (Number(carousel.spacing || carousel.gap || 16) * (Number(carousel.visible_items || carousel.visibleItems || 4) - 1))) / Number(carousel.visible_items || carousel.visibleItems || 4))
                          }}
                          colors={colors}
                          isMobile={false}
                        />
                      )}
{activeTab === 'dynamic_carousel' && (
  <DynamicCarouselPreview
    carousel={dynamicCarousel}
    colors={colors}
    isMobile={true}
  />
)}
                      {activeTab === 'grid' && <GridPreview grid={grid} colors={colors} isMobile={true} />}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ================== CANVAS DESKTOP PREMIUM UNIFICADO ================== */
              <div className="relative w-full h-[500px] overflow-hidden bg-[#0d0f17] border-2 border-[#ff7a29] rounded-2xl shadow-xl transition-all duration-300">
                
                {activeTab === 'floating' && (
                  <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-[#0d0f17] z-0" />
                    <div className="relative z-10 w-full h-full">
                      <FloatingPreview floating={floating} colors={colors} device={activeDevice} />
                    </div>
                  </div>
                )}

                {activeTab === 'carousel' && (
                  <div className="absolute inset-0 flex items-center justify-center px-4 py-8 bg-[#0d0f17]">
                    <ScaleToFit>
                      <div className="w-[850px] max-w-full flex justify-center">
                        <CarouselPreview 
                          carousel={{
                            ...carousel,
                            // Cálculo matemático dinâmico para forçar a renderização exata do número de colunas configuradas
                            itemWidth: Math.floor((850 - (Number(carousel.gap || 16) * (Number(carousel.visibleItems || 4) - 1))) / Number(carousel.visibleItems || 4))
                          }} 
                          colors={colors} 
                          isMobile={false} 
                        />
                      </div>
                    </ScaleToFit>
                  </div>
                )}

                {activeTab === 'dynamic_carousel' && (
                  <div className="absolute inset-0 flex items-center justify-center px-4 py-8 bg-[#0d0f17]">
                    <ScaleToFit>
                      <div className="w-[850px] max-w-full flex justify-center">
                        <DynamicCarouselPreview 
                          carousel={{
                            ...dynamicCarousel,
                            // Mesma inteligência dinâmica para preencher de ponta a ponta sem cortes laterais
                            itemWidth: Math.floor((850 - (Number(dynamicCarousel.gap || 16) * (Number(dynamicCarousel.visibleItems || 3) - 1))) / Number(dynamicCarousel.visibleItems || 3))
                          }} 
                          colors={colors} 
                          isMobile={false} 
                        />
                      </div>
                    </ScaleToFit>
                  </div>
                )}

                {activeTab === 'grid' && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#0d0f17]">
                    <ScaleToFit>
                      <div className="w-[850px] max-w-full flex justify-center">
                        <GridPreview grid={grid} colors={colors} isMobile={false} />
                      </div>
                    </ScaleToFit>
                  </div>
                )}

                {activeTab === 'modal' && (
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#0d0f17]">
                    <div className="w-full max-w-[820px] h-[440px] rounded-2xl overflow-hidden shadow-2xl border border-white/5 transition-all duration-300">
                      <ModalPreview formData={formData} colors={colors} isMobile={false} />
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

const AppearancePage = () => {
  const tenantContext = useTenant() as any;
  const storeId =
    tenantContext?.storeId ||
    tenantContext?.store?.id ||
    tenantContext?.tenant?.store_id ||
    tenantContext?.tenant?.id ||
    tenantContext?.tenantId ||
    '';
  const tenantLoading =
    tenantContext?.loading ||
    tenantContext?.isLoading ||
    tenantContext?.tenantLoading ||
    false;
  const storeUrl = tenantContext?.currentStore?.url || '';

  const [resolvedStoreId, setResolvedStoreId] = useState<string>('');
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStoriesCount, setActiveStoriesCount] = useState<number>(0);

  const [showModal, setShowModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Appearance | null>(null);
  const [formData, setFormData] = useState<ExtendedAppearance>(() =>
    createDefaultFormData(storeId),
  );

  const [floatingDevice, setFloatingDevice] = useState<DeviceType>('mobile');
  const [carouselDevice, setCarouselDevice] = useState<DeviceType>('mobile');
  const [dynamicCarouselDevice, setDynamicCarouselDevice] = useState<DeviceType>('mobile');
  const [gridDevice, setGridDevice] = useState<DeviceType>('mobile');
  
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');

  // Sempre que a aba de customizacao mudar, forca os previews para o modo Mobile (Celular)
  useEffect(() => {
    setFloatingDevice('mobile');
    setCarouselDevice('mobile');
    setDynamicCarouselDevice('mobile');
    setGridDevice('mobile');
  }, [activeTab]);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const activeFloating = getActiveResponsiveConfig(formData.floating_config, floatingDevice, formData.useGlobalAppearance);
    const activeCarousel = getActiveResponsiveConfig(formData.carousel_config, carouselDevice, formData.useGlobalAppearance);
    const activeDynamic = getActiveResponsiveConfig(formData.dynamic_carousel_config, dynamicCarouselDevice, formData.useGlobalAppearance);
    const activeGrid = getActiveResponsiveConfig(formData.grid_config, gridDevice, formData.useGlobalAppearance);

    const livePreviewConfig = {
      activeTab,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      text_color: formData.text_color,
      background_color: formData.background_color,
      button_color: formData.button_color,
      font_family: formData.font_family,
      target_selector: formData.target_selector || 'body',
      insert_position: formData.insert_position || 'append',
      floating: activeFloating,
      carousel: activeCarousel,
      dynamic_carousel: activeDynamic,
      grid: activeGrid,
      modal: formData.modal_config,
    };

    localStorage.setItem('vidlytics_live_preview', JSON.stringify(livePreviewConfig));
    window.dispatchEvent(new Event('storage'));
  }, [formData, activeTab, floatingDevice, carouselDevice, dynamicCarouselDevice, gridDevice]);

  useEffect(() => {
    setActiveSection(null);
  }, [activeTab]);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
      if (!finalStoreId) {
        setAppearances([]);
        return;
      }
      setResolvedStoreId(finalStoreId);
      const styles = await getAppearancesSafe(finalStoreId);
      setAppearances(styles);

      try {
        if (supabase) {
          const { data: storiesData, error: storiesError } = await supabase
            .from('stories')
.select('id, is_active, active')
            .eq('store_id', finalStoreId);

          if (!storiesError && storiesData) {
            const count = storiesData.filter((item: any) => 
!(item.is_active === false || item.active === false)
            ).length;
            setActiveStoriesCount(count);
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar stories count:', err);
      }
    } catch (error) {
      console.error('Erro ao carregar aparências:', error);
      showError('Erro ao carregar aparências.');
      setAppearances([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedStoreId, storeId]);

  useEffect(() => {
    if (!tenantLoading) {
      loadData();
    }
  }, [tenantLoading, loadData]);

  const updateFloatingConfig = (patch: Partial<FloatingConfig>) => {
    setFormData(prev => {
      const device = prev.useGlobalAppearance ? 'desktop' : floatingDevice;
      const current = prev.floating_config[device];
      let updatedDeviceConfig: FloatingConfig = { ...current, ...patch };

      if (patch.position) {
        updatedDeviceConfig = {
          ...updatedDeviceConfig,
          position: normalizePosition(patch.position),
          floating_position: positionToFloatingPosition(patch.position),
        };
      }
      updatedDeviceConfig = normalizeFloatingShapeValues(updatedDeviceConfig);

      const nextConfig = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.floating_config, same_for_all: false, [device]: updatedDeviceConfig };

      return { ...prev, floating_config: nextConfig };
    });
  };

  const updateCarouselConfig = (patch: Partial<CarouselConfig>) => {
    setFormData(prev => {
      const device = prev.useGlobalAppearance ? 'desktop' : carouselDevice;
      const current = prev.carousel_config[device];
      let updatedDeviceConfig: CarouselConfig = {
        ...current,
        ...patch,
        spacing: safeNumber(patch.spacing ?? current.spacing, current.spacing || 0, 0),
        visible_items: safeNumber(patch.visible_items ?? current.visible_items, current.visible_items || 1, 1),
      };

      if (patch.shape !== undefined) {
        const newShape = normalizeWidgetShape(patch.shape, 'portrait');
        const width = formatNumberLikeCurrent(patch.width ?? current.width ?? '80', '80');
        updatedDeviceConfig = { ...updatedDeviceConfig, shape: newShape, width };
      }

      updatedDeviceConfig = normalizeCarouselConfigShape(updatedDeviceConfig);

      const nextConfig = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.carousel_config, same_for_all: false, [device]: updatedDeviceConfig };

      return { ...prev, carousel_config: nextConfig };
    });
  };

  const updateDynamicCarouselConfig = (patch: Partial<DynamicCarouselConfig>) => {
    setFormData(prev => {
      const device = prev.useGlobalAppearance ? 'desktop' : dynamicCarouselDevice;
      const current = prev.dynamic_carousel_config[device];
      let updatedDeviceConfig: DynamicCarouselConfig = {
        ...current,
        ...patch,
        enabled: true,
        spacing: safeNumber(patch.spacing ?? current.spacing, current.spacing || 0, 0),
      };

      if (patch.shape !== undefined) {
        const newShape = normalizeWidgetShape(patch.shape, 'portrait');
        const width = formatNumberLikeCurrent(patch.width ?? current.width ?? '80', '80');
        updatedDeviceConfig = { ...updatedDeviceConfig, shape: newShape, width };
      }

      updatedDeviceConfig = normalizeCarouselConfigShape(updatedDeviceConfig) as DynamicCarouselConfig;

      const nextConfig = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.dynamic_carousel_config, same_for_all: false, [device]: updatedDeviceConfig };

      return { ...prev, dynamic_carousel_config: nextConfig };
    });
  };

  const updateGridConfig = (patch: Partial<GridConfig>) => {
    setFormData(prev => {
      const device = prev.useGlobalAppearance ? 'desktop' : gridDevice;
      const current = prev.grid_config[device];
      const updatedDeviceConfig: GridConfig = normalizeGridConfigShape({
        ...current,
        ...patch,
        visible_items: limitNumber(patch.visible_items ?? current.visible_items, current.visible_items || 1, 1, 10),
        spacing: safeNumber(patch.spacing ?? current.spacing, current.spacing || 0, 0),
      });

      const nextConfig = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.grid_config, same_for_all: false, [device]: updatedDeviceConfig };

      return { ...prev, grid_config: nextConfig };
    });
  };

  const updateModalConfig = (patch: Partial<ModalConfig>) => {
    setFormData(prev => ({
      ...prev,
      modal_config: { ...prev.modal_config, ...patch }
    } as ExtendedAppearance));
  };

  const handleSetDefault = async (id: string) => {
    try {
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
      if (!finalStoreId) {
        showError('Não foi possível identificar a loja atual.');
        return;
      }
      const now = new Date().toISOString();
      await Promise.all(
        appearances.map(style =>
          db.appearances.save({ ...style, store_id: finalStoreId, is_default: style.id === id, updated_at: now } as Appearance),
        ),
      );
      await syncDefaultAppearanceId(finalStoreId, id);
      window.dispatchEvent(new Event('storage'));
      logPanelActivity('appearance.default', (appearances.find(style => style.id === id)?.name) || 'Estilo', finalStoreId);
      showSuccess('Estilo padrão atualizado!');
      await loadData();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      showError('Erro ao definir padrão.');
    }
  };

  const handleDeleteClick = (app: Appearance) => {
    setDeleteModal({ isOpen: true, id: app.id, name: app.name });
  };

  const handleConfirmDelete = async () => {
    try {
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
      const deletedAppearance = appearances.find(app => app.id === deleteModal.id);
      await deleteAppearanceSafe(deleteModal.id, finalStoreId);
      const remainingAppearances = appearances.filter(app => app.id !== deleteModal.id);

      if (deletedAppearance?.is_default) {
        const nextDefault = remainingAppearances[0];
        if (nextDefault) {
          const now = new Date().toISOString();
          await db.appearances.save({ ...nextDefault, store_id: finalStoreId, is_default: true, updated_at: now } as Appearance);
          await syncDefaultAppearanceId(finalStoreId, nextDefault.id);
        } else if (finalStoreId) {
          await syncDefaultAppearanceId(finalStoreId, null);
        }
      }
      window.dispatchEvent(new Event('storage'));
      logPanelActivity('appearance.deleted', deleteModal.name, finalStoreId);
      showSuccess('Estilo excluído com sucesso.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir estilo:', error);
      showError('Erro ao excluir estilo.');
    }
  };

  const handleNewStyle = async () => {
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
    setEditingStyle(null);
    setFormData(createDefaultFormData(finalStoreId));
    setFloatingDevice('desktop');
    setCarouselDevice('desktop');
    setDynamicCarouselDevice('desktop');
    setGridDevice('desktop');
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleEditStyle = (style: Appearance) => {
    setEditingStyle(style);
    setFormData(normalizeAppearance(style, resolvedStoreId || storeId));
    setFloatingDevice('desktop');
    setCarouselDevice('desktop');
    setDynamicCarouselDevice('desktop');
    setGridDevice('desktop');
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleSaveStyle = async () => {
    if (saving) return;
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
    if (!finalStoreId) {
      showError('Não foi possível identificar a loja atual.');
      return;
    }
    if (!formData.name.trim()) {
      showError('Nome do estilo é obrigatório.');
      setActiveTab('basic');
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const id = editingStyle?.id || formData.id || generateUuid();

      const floatingConfig = { ...formData.floating_config, same_for_all: formData.useGlobalAppearance };
      const carouselConfig = { ...formData.carousel_config, same_for_all: formData.useGlobalAppearance };
      const dynamicCarouselConfig = { ...formData.dynamic_carousel_config, same_for_all: formData.useGlobalAppearance };
      const gridConfig = { ...formData.grid_config, same_for_all: formData.useGlobalAppearance };

      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
        carouselConfig.mobile = carouselConfig.desktop;
        dynamicCarouselConfig.mobile = dynamicCarouselConfig.desktop;
        gridConfig.mobile = gridConfig.desktop;
      }

      const shouldBeDefault = formData.is_default || appearances.length === 0;

      const stylePayload = {
        id,
        store_id: finalStoreId,
        name: formData.name.trim(),
        is_default: shouldBeDefault,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        text_color: formData.text_color,
        background_color: formData.background_color,
        button_color: formData.button_color,
        font_family: formData.font_family,
        floating_config: floatingConfig,
        carousel_config: carouselConfig,
        dynamic_carousel_config: dynamicCarouselConfig,
        grid_config: gridConfig,
        modal_config: formData.modal_config,
        use_global_appearance: formData.useGlobalAppearance,
        created_at: formData.created_at || editingStyle?.created_at || now,
        updated_at: now,
      };

      if (stylePayload.is_default) {
        await Promise.all(
          appearances.filter(style => style.id !== id).map(style =>
            db.appearances.save({ ...style, store_id: finalStoreId, is_default: false, updated_at: now } as Appearance),
          ),
        );
      }

      await db.appearances.save(stylePayload as unknown as Appearance);
      logPanelActivity(editingStyle ? 'appearance.updated' : 'appearance.created', formData.name.trim(), finalStoreId);

      if (supabase) {
        await supabase.from('store_settings').upsert({ store_id: finalStoreId, default_appearance_id: shouldBeDefault ? id : null, updated_at: now }, { onConflict: 'store_id' });
      }

      if (stylePayload.is_default) {
        await syncDefaultAppearanceId(finalStoreId, id);
      }

      window.dispatchEvent(new Event('storage'));
      showSuccess(editingStyle ? 'Estilo atualizado com sucesso!' : 'Estilo criado com sucesso!');
      setShowModal(false);
      setEditingStyle(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar estilo:', error);
      showError('Erro ao salvar estilo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setShowModal(false);
    setEditingStyle(null);
  };

  const handleResetTab = () => {
    const finalStoreId = resolvedStoreId || storeId;
    const defaults = createDefaultFormData(finalStoreId);
    
    if (activeTab === 'basic') {
      setFormData(prev => ({
        ...prev,
        name: '',
        is_default: false,
        useGlobalAppearance: false,
        use_global_appearance: false,
      }));
      showSuccess('Configurações básicas resetadas!');
    } else if (activeTab === 'floating') {
      setFormData(prev => ({
        ...prev,
        floating_config: defaults.floating_config,
      }));
      showSuccess('Aparência flutuante resetada para o padrão!');
    } else if (activeTab === 'carousel') {
      setFormData(prev => ({
        ...prev,
        carousel_config: defaults.carousel_config,
      }));
      showSuccess('Carrossel resetado para o padrão!');
    } else if (activeTab === 'dynamic_carousel') {
      setFormData(prev => ({
        ...prev,
        dynamic_carousel_config: defaults.dynamic_carousel_config,
      }));
      showSuccess('Carrossel dinâmico resetado para o padrão!');
    } else if (activeTab === 'grid') {
      setFormData(prev => ({
        ...prev,
        grid_config: defaults.grid_config,
      }));
      showSuccess('Grade resetada para o padrão!');
    } else if (activeTab === 'modal') {
      setFormData(prev => ({
        ...prev,
        modal_config: defaults.modal_config,
      }));
      showSuccess('Player de vídeo resetado para o padrão!');
    }
  };

  const activeFloatingConfig = useMemo(() => getActiveResponsiveConfig(formData.floating_config, floatingDevice, formData.useGlobalAppearance), [formData.floating_config, floatingDevice, formData.useGlobalAppearance]);
  const activeCarouselConfig = useMemo(() => getActiveResponsiveConfig(formData.carousel_config, carouselDevice, formData.useGlobalAppearance), [formData.carousel_config, carouselDevice, formData.useGlobalAppearance]);
  const activeDynamicCarouselConfig = useMemo(() => getActiveResponsiveConfig(formData.dynamic_carousel_config, dynamicCarouselDevice, formData.useGlobalAppearance), [formData.dynamic_carousel_config, dynamicCarouselDevice, formData.useGlobalAppearance]);
  const activeGridConfig = useMemo(() => getActiveResponsiveConfig(formData.grid_config, gridDevice, formData.useGlobalAppearance), [formData.grid_config, gridDevice, formData.useGlobalAppearance]);

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0091ff]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header com Estética Dashboard Vidlytics */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Aparência</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.</p>
        </div>
        <button type="button" onClick={handleNewStyle} className="flex items-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer">
          <Plus size={16} className="!text-white stroke-[2.5]" /> Novo Estilo
        </button>
      </div>

      {/* Módulo de Estilos Cadastrados no Padrão Modular do Dashboard */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-[#0091ff] dark:bg-[#ff7a29] shadow-[0_0_15px_rgba(0,145,255,0.35)] dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
              <Palette size={18} className="!text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Estilos Cadastrados</h3>
              <p className="text-xs text-slate-500 dark:text-[#8a90a0] font-medium">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-[#0091ff] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-1 rounded-full border border-blue-100 dark:border-[#ff7a29]/20">
            {appearances.length} {appearances.length === 1 ? 'Tema' : 'Temas'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111524]/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                <th className="px-6 py-4 rounded-l-2xl">Template</th>
                <th className="px-6 py-4 text-center">Cor Principal</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right rounded-r-2xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {appearances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-xs font-semibold text-slate-400 dark:text-[#8a90a0]">
                    Nenhum estilo cadastrado ainda. Clique em "+ Novo Estilo" para criar o primeiro.
                  </td>
                </tr>
              ) : (
                appearances.map(app => (
                  <tr key={app.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-9 w-9 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0 flex items-center justify-center" style={{ backgroundColor: app.primary_color || '#0094EB' }} />
                        <div>
                          <span className="text-xs font-black text-slate-800 dark:text-[#e8ecf4] block">{app.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#8a90a0] uppercase">Identidade Visual</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-600 dark:text-[#c0c5d4] bg-slate-100 dark:bg-[#111524] px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: app.primary_color || '#0094EB' }} />
                        {app.primary_color || '#0094EB'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.is_default ? (
                        <span className="mx-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 dark:bg-[#ff7a29]/15 border border-blue-200 dark:border-[#ff7a29]/30 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29] shadow-xs">
                          <Star size={11} className="fill-[#0091ff] text-[#0091ff] dark:fill-[#ff7a29] dark:text-[#ff7a29]" /> Padrão
                        </span>
                      ) : (
                        <button type="button" onClick={() => handleSetDefault(app.id)} className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#8a90a0] hover:text-[#0091ff] dark:hover:text-[#ff7a29] transition-colors cursor-pointer">
                          Definir Padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleEditStyle(app)} className="p-2 rounded-xl text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all" aria-label="Editar estilo"><Edit3 size={15} /></button>
                        <button type="button" onClick={() => handleDeleteClick(app)} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all" aria-label="Excluir estilo"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#ff7a29]/20 bg-white dark:bg-[#111524] px-6 py-3 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{editingStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}</h2>
                
              </div>
              <button type="button" onClick={handleCancel} disabled={saving} className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-60"><X size={20} /></button>
            </div>

            {/* ABAS (Menu Básico, Flutuante, etc) */}
            <div className="border-b border-slate-100 dark:border-[#ff7a29]/20 bg-slate-50/70 dark:bg-[#1a1f35]/60 px-6 py-2.5 shrink-0">
              <div className="flex flex-wrap gap-2">
                <ModalTabButton active={activeTab === 'basic'} icon={<Settings2 size={16} />} label="Básico" onClick={() => setActiveTab('basic')} />
                <ModalTabButton active={activeTab === 'floating'} icon={<PlaySquare size={16} />} label="Flutuante" onClick={() => setActiveTab('floating')} />
                <ModalTabButton active={activeTab === 'carousel'} icon={<Rows3 size={16} />} label="Carrossel" onClick={() => setActiveTab('carousel')} />
                <ModalTabButton active={activeTab === 'dynamic_carousel'} icon={<Rows3 size={16} />} label="Carrossel Dinâmico" onClick={() => setActiveTab('dynamic_carousel')} />
                <ModalTabButton active={activeTab === 'grid'} icon={<LayoutGrid size={16} />} label="Grade" onClick={() => setActiveTab('grid')} />
                <ModalTabButton active={activeTab === 'modal'} icon={<PlaySquare size={16} />} label="Player" onClick={() => setActiveTab('modal')} />
              </div>
            </div>

            {/* CORPO DO MODAL */}
            <div className="flex-1 overflow-hidden bg-slate-50/60 dark:bg-[#0d1120] p-4 xl:p-5">
              <div className="grid h-full grid-cols-1 gap-4 items-start xl:grid-cols-[380px_minmax(0,1fr)]">
                
                {/* LADO ESQUERDO: BARRA DE CONFIGURAÇÕES */}
                <div className="h-full overflow-y-auto pr-3 pb-12 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                  
                  {/* BÁSICO */}
                  {activeTab === 'basic' && (
                    <SectionCard title="Dados Básicos" description="Defina o nome do estilo e o comportamento global entre Desktop e Mobile.">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Nome do Estilo">
                          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Estilo padrão" className={inputClass} />
                        </FormField>
                        <FormField label="Definir como padrão">
                          <ToggleSwitch label="Definir como padrão da loja" checked={formData.is_default} onChange={e => setFormData({ ...formData, is_default: e.target.checked })} />
                        </FormField>
                      </div>
                      <div className="pt-2">
                        <FormField label="Usar aparência em todos os dispositivos">
                          <ToggleSwitch label="Usar aparência em todos os dispositivos" checked={formData.useGlobalAppearance} onChange={e => { const checked = e.target.checked; setFormData(prev => syncGlobalConfig(checked, prev)); if (checked) { setFloatingDevice('desktop'); setCarouselDevice('desktop'); setGridDevice('desktop'); } }} description="Quando ativado, as configurações de Desktop serão aplicadas também no Mobile." />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {/* FLUTUANTE */}
                  {activeTab === 'floating' && (
                    <SectionCard title="Configurações do Flutuante">
                      {/* Seletor Dispositivo */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#111524] px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#ff7a29]/20 mb-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-[#0091ff]/10 border border-blue-200/60 dark:border-[#0091ff]/20 text-[#0091ff] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0091ff]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white dark:bg-[#1a1f35] p-1 rounded-xl border border-slate-200 dark:border-[#ff7a29]/20 shadow-xs">
                            <button type="button" onClick={() => setFloatingDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', floatingDevice === 'desktop' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setFloatingDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', floatingDevice === 'mobile' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Smartphone size={13} />Mobile</button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 1. FORMATO & DIMENSÕES */}
                        <AccordionSection title="1. Formato & Dimensões" isOpen={activeSection === 'float-1'} onToggle={() => setActiveSection(activeSection === 'float-1' ? null : 'float-1')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Formato">
                              <select value={activeFloatingConfig.shape} onChange={e => updateFloatingConfig({ shape: e.target.value as WidgetShape })} className={selectClass}>
                                <option value="circle">Circular</option>
                                <option value="square">Quadrado</option>
                                <option value="portrait">Retrato 9:16</option>
                                <option value="landscape">Paisagem 16:9</option>
                              </select>
                            </FormField>
                            <FormField label="Ajuste Imagem">
                              <select value={activeFloatingConfig.object_fit || 'cover'} onChange={e => updateFloatingConfig({ object_fit: e.target.value })} className={selectClass}>
                                <option value="cover">Cover (Preencher)</option>
                                <option value="contain">Contain (Ajustar)</option>
                                <option value="fill">Fill (Esticar)</option>
                              </select>
                            </FormField>
                            <FormField label="Largura (px)">
                              <input type="number" min="20" step="1" value={toNumberInputValue(activeFloatingConfig.width)} onChange={e => updateFloatingConfig({ width: e.target.value })} placeholder="Ex: 80" className={inputClass} />
                            </FormField>
                            <FormField label="Altura Calculada">
                              <input type="text" disabled value={`${activeFloatingConfig.height || activeFloatingConfig.width}px`} className={cn(inputClass, "opacity-70 bg-slate-100 cursor-not-allowed border-dashed")} />
                            </FormField>
                          </div>
                        </AccordionSection>

                        {/* 2. POSIÇÃO & MARGENS */}
                        <AccordionSection title="2. Posição & Margens" isOpen={activeSection === 'float-2'} onToggle={() => setActiveSection(activeSection === 'float-2' ? null : 'float-2')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Posição na Tela" className="col-span-2">
                              <select value={activeFloatingConfig.position} onChange={e => updateFloatingConfig({ position: e.target.value as PositionValue })} className={selectClass}>
                                <option value="fixed_bottom_right">Inferior Direita</option>
                                <option value="fixed_bottom_left">Inferior Esquerda</option>
                                <option value="fixed_top_right">Superior Direita</option>
                                <option value="fixed_top_left">Superior Esquerda</option>
                              </select>
                            </FormField>
                            <FormField label="Margem Inferior (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.bottom_spacing)} onChange={e => updateFloatingConfig({ bottom_spacing: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Margem Superior (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.top_spacing)} onChange={e => updateFloatingConfig({ top_spacing: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Margem Lateral (px)" className="col-span-2">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.left_spacing)} onChange={e => updateFloatingConfig({ left_spacing: e.target.value, right_spacing: e.target.value })} className={inputClass} />
                            </FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. BORDAS */}
                        <AccordionSection title="3. Bordas" isOpen={activeSection === 'float-3'} onToggle={() => setActiveSection(activeSection === 'float-3' ? null : 'float-3')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda">
                              <ColorInput label="Cor da borda" value={activeFloatingConfig.border_color} onChange={e => updateFloatingConfig({ border_color: e.target.value })} />
                            </FormField>
                            <FormField label="Largura Borda (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.border_style)} onChange={e => updateFloatingConfig({ border_style: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Raio da Borda (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.border_radius)} onChange={e => updateFloatingConfig({ border_radius: e.target.value })} className={inputClass} />
                            </FormField>
                          </div>
                        </AccordionSection>

                        {/* 4. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="4. Elementos Visíveis" isOpen={activeSection === 'float-4'} onToggle={() => setActiveSection(activeSection === 'float-4' ? null : 'float-4')}>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-blue-200/80 dark:border-[#0091ff]/20 bg-blue-50/30 dark:bg-[#0091ff]/5 p-3.5 space-y-4">
                              <ToggleSwitch label="Exibir CTA (Pílula)" checked={activeFloatingConfig.show_cta ?? false} onChange={e => updateFloatingConfig({ show_cta: e.target.checked })} />
                              {activeFloatingConfig.show_cta && (
                                <div className="space-y-3 pt-2 border-t border-blue-100/50">
                                  <FormField label="Texto do CTA (máx 12 caract.)">
                                    <input type="text" maxLength={12} value={activeFloatingConfig.cta_text ?? ''} onChange={e => updateFloatingConfig({ cta_text: e.target.value })} className={inputClass} />
                                  </FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <FormField label="Tamanho da fonte (px)">
                                      <input type="number" min="10" max="24" step="1" value={activeFloatingConfig.cta_font_size ?? 14} onChange={e => updateFloatingConfig({ cta_font_size: safeNumber(e.target.value, 14, 10) })} className={inputClass} />
                                    </FormField>
                                    <div className="flex items-end pb-1.5">
                                      <ToggleSwitch label="Título em negrito" checked={activeFloatingConfig.cta_is_bold ?? true} onChange={e => updateFloatingConfig({ cta_is_bold: e.target.checked })} />
                                    </div>
                                    <FormField label="Cor de Fundo">
                                      <ColorInput label="Cor de Fundo" value={activeFloatingConfig.cta_bg_color || formData.primary_color} onChange={e => updateFloatingConfig({ cta_bg_color: e.target.value })} />
                                    </FormField>
                                    <FormField label="Cor do Texto">
                                      <ColorInput label="Cor do Texto" value={activeFloatingConfig.cta_text_color || '#FFFFFF'} onChange={e => updateFloatingConfig({ cta_text_color: e.target.value })} />
                                    </FormField>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <ToggleSwitch label="Reproduzir vídeos" checked={activeFloatingConfig.autoplay_videos ?? true} onChange={e => updateFloatingConfig({ autoplay_videos: e.target.checked })} />
                              <ToggleSwitch label="Exibir ícone de Play" checked={activeFloatingConfig.show_play_icon} onChange={e => updateFloatingConfig({ show_play_icon: e.target.checked })} />
                              <ToggleSwitch label="Exibir botão de fechar (X)" checked={activeFloatingConfig.allow_close} onChange={e => updateFloatingConfig({ allow_close: e.target.checked })} />
                            </div>
                          </div>
                        </AccordionSection>
                      </div>
                    </SectionCard>
                  )}

                  {/* CARROSSEL */}
                  {activeTab === 'carousel' && (
                    <SectionCard title="Configurações do Carrossel">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#111524] px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#ff7a29]/20 mb-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-[#0091ff]/10 border border-blue-200/60 dark:border-[#0091ff]/20 text-[#0091ff] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0091ff]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white dark:bg-[#1a1f35] p-1 rounded-xl border border-slate-200 dark:border-[#ff7a29]/20 shadow-xs">
                            <button type="button" onClick={() => setCarouselDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', carouselDevice === 'desktop' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setCarouselDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', carouselDevice === 'mobile' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Smartphone size={13} />Mobile</button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 1. LAYOUT & DIMENSÕES */}
                        <AccordionSection title="1. Layout & Dimensões" isOpen={activeSection === 'car-1'} onToggle={() => setActiveSection(activeSection === 'car-1' ? null : 'car-1')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Formato">
                              <select value={activeCarouselConfig.shape} onChange={e => updateCarouselConfig({ shape: e.target.value as WidgetShape })} className={selectClass}>
                                <option value="circle">Circular</option>
                                <option value="square">Quadrado</option>
                                <option value="portrait">Retrato 9:16</option>
                                <option value="landscape">Paisagem 16:9</option>
                              </select>
                            </FormField>
                            <FormField label="Ajuste Imagem">
                              <select value={activeCarouselConfig.object_fit || 'cover'} onChange={e => updateCarouselConfig({ object_fit: e.target.value })} className={selectClass}>
                                <option value="cover">Cover (Preencher)</option>
                                <option value="contain">Contain (Ajustar)</option>
                                <option value="fill">Fill (Esticar)</option>
                              </select>
                            </FormField>
                            <FormField label="Largura (px)">
                              <input type="number" min="20" step="1" value={toNumberInputValue(activeCarouselConfig.width)} onChange={e => updateCarouselConfig({ width: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Itens Visíveis">
                              <input type="number" min="1" step="1" value={activeCarouselConfig.visible_items} onChange={e => updateCarouselConfig({ visible_items: safeNumber(e.target.value, 1, 1) })} className={inputClass} />
                            </FormField>
                            <FormField label="Espaçamento (px)" className="col-span-2">
                              <input type="number" min="0" step="1" value={activeCarouselConfig.spacing} onChange={e => updateCarouselConfig({ spacing: safeNumber(e.target.value, 0, 0) })} className={inputClass} />
                            </FormField>
                            <FormField label="Margem Superior (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.margin_top)} onChange={e => updateCarouselConfig({ margin_top: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Margem Inferior (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.margin_bottom)} onChange={e => updateCarouselConfig({ margin_bottom: e.target.value })} className={inputClass} />
                            </FormField>
                          </div>
                          <div className="mt-3 p-2 bg-sky-50 dark:bg-sky-500/5 rounded-xl border border-sky-100 dark:border-sky-500/20">
<p className="text-[12px] text-white font-medium leading-snug">
                              💡 No mobile, o carrossel exibe no máximo 3 itens (1 completo + 2 parciais nas laterais), independente do número configurado aqui.
                            </p>
                          </div>
                        </AccordionSection>

                        {/* 2. BORDAS */}
                        <AccordionSection title="2. Bordas" isOpen={activeSection === 'car-2'} onToggle={() => setActiveSection(activeSection === 'car-2' ? null : 'car-2')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda">
                              <ColorInput label="Cor da borda" value={activeCarouselConfig.border_color || formData.primary_color} onChange={e => updateCarouselConfig({ border_color: e.target.value })} />
                            </FormField>
                            <FormField label="Largura Borda (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.border_style)} onChange={e => updateCarouselConfig({ border_style: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Raio da Borda (px)">
                              <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.border_radius)} onChange={e => updateCarouselConfig({ border_radius: e.target.value })} className={inputClass} />
                            </FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'car-3'} onToggle={() => setActiveSection(activeSection === 'car-3' ? null : 'car-3')}>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-blue-200/80 dark:border-[#0091ff]/20 bg-blue-50/30 dark:bg-[#0091ff]/5 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeCarouselConfig.show_title ?? false} onChange={e => updateCarouselConfig({ show_title: e.target.checked })} />
                              {activeCarouselConfig.show_title && (
                                <>
                                  <FormField label="Texto do título">
                                    <input type="text" value={activeCarouselConfig.title_text ?? ''} onChange={e => updateCarouselConfig({ title_text: e.target.value })} className={inputClass} />
                                  </FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <FormField label="Tamanho da fonte">
<input 
  type="number" 
  min="8" 
  max="48" 
  step="1" 
  value={activeCarouselConfig.title_font_size ?? ''} 
  onChange={e => {
    const val = e.target.value;
    updateCarouselConfig({ title_font_size: val === '' ? undefined : Number(val) });
  }}
  onBlur={e => {
    const val = activeCarouselConfig.title_font_size;
    updateCarouselConfig({ title_font_size: limitNumber(val ?? 14, 14, 8, 48) });
  }}
  className={inputClass} 
/>
                                    </FormField>
                                    <FormField label="Alinhamento">
                                      <select value={activeCarouselConfig.title_align ?? 'center'} onChange={e => updateCarouselConfig({ title_align: e.target.value as 'left' | 'center' | 'right' })} className={selectClass}>
                                        <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
                                      </select>
                                    </FormField>
                                  </div>
                                  <ToggleSwitch label="Título em negrito" checked={activeCarouselConfig.title_bold ?? true} onChange={e => updateCarouselConfig({ title_bold: e.target.checked })} />
                                </>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <ToggleSwitch label="Reproduzir vídeos" checked={activeCarouselConfig.autoplay_videos ?? true} onChange={e => updateCarouselConfig({ autoplay_videos: e.target.checked })} />
                              <ToggleSwitch label="Exibir ícone de Play" checked={activeCarouselConfig.show_play_icon} onChange={e => updateCarouselConfig({ show_play_icon: e.target.checked })} />
                            </div>
                          </div>
                        </AccordionSection>

                        {/* 4. CARD DE PRODUTO */}
                        <AccordionSection title="4. Card de Produto" isOpen={activeSection === 'car-4'} onToggle={() => setActiveSection(activeSection === 'car-4' ? null : 'car-4')}>
                          <ToggleSwitch label="Exibir card de produto abaixo de cada vídeo" checked={activeCarouselConfig.show_product} onChange={e => updateCarouselConfig({ show_product: e.target.checked })} />
                          {activeCarouselConfig.show_product && (
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-[#ff7a29]/20 pt-3.5">
                              <FormField label="Cor do fundo"><ColorInput label="Cor" value={(activeCarouselConfig as any).product_card_bg || '#FFFFFF'} onChange={e => updateCarouselConfig({ product_card_bg: e.target.value } as any)} /></FormField>
                              <FormField label="Cor da Borda"><ColorInput label="Borda" value={(activeCarouselConfig as any).product_card_border_color || '#E2E8F0'} onChange={e => updateCarouselConfig({ product_card_border_color: e.target.value } as any)} /></FormField>
                              <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue((activeCarouselConfig as any).product_card_border_width)} onChange={e => updateCarouselConfig({ product_card_border_width: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Raio Borda (px)"><input type="number" min="0" value={toNumberInputValue((activeCarouselConfig as any).product_card_border_radius)} onChange={e => updateCarouselConfig({ product_card_border_radius: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Tamanho Título"><input type="number" min="8" value={toNumberInputValue((activeCarouselConfig as any).product_card_name_size)} onChange={e => updateCarouselConfig({ product_card_name_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Título"><ColorInput label="Cor" value={(activeCarouselConfig as any).product_card_name_color || '#0F172A'} onChange={e => updateCarouselConfig({ product_card_name_color: e.target.value } as any)} /></FormField>
                              <FormField label="Tamanho Preço"><input type="number" min="8" value={toNumberInputValue((activeCarouselConfig as any).product_card_price_size)} onChange={e => updateCarouselConfig({ product_card_price_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Preço"><ColorInput label="Cor" value={(activeCarouselConfig as any).product_card_price_color || formData.primary_color} onChange={e => updateCarouselConfig({ product_card_price_color: e.target.value } as any)} /></FormField>
                            </div>
                          )}
                        </AccordionSection>
                      </div>
                    </SectionCard>
                  )}

                  {/* CARROSSEL DINÂMICO */}
                  {activeTab === 'dynamic_carousel' && (
                    <SectionCard title="Configurações do Carrossel Dinâmico">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#111524] px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#ff7a29]/20 mb-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-[#0091ff]/10 border border-blue-200/60 dark:border-[#0091ff]/20 text-[#0091ff] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0091ff]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white dark:bg-[#1a1f35] p-1 rounded-xl border border-slate-200 dark:border-[#ff7a29]/20 shadow-xs">
                            <button type="button" onClick={() => setDynamicCarouselDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', dynamicCarouselDevice === 'desktop' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setDynamicCarouselDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', dynamicCarouselDevice === 'mobile' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Smartphone size={13} />Mobile</button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 1. LAYOUT & DIMENSÕES */}
                        <AccordionSection title="1. Layout & Dimensões" isOpen={activeSection === 'dyn-1'} onToggle={() => setActiveSection(activeSection === 'dyn-1' ? null : 'dyn-1')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Formato">
                              <select value={activeDynamicCarouselConfig.shape} onChange={e => updateDynamicCarouselConfig({ shape: e.target.value as WidgetShape })} className={selectClass}><option value="circle">Circular</option><option value="square">Quadrado</option><option value="portrait">Retrato 9:16</option><option value="landscape">Paisagem 16:9</option></select>
                            </FormField>
                            <FormField label="Ajuste Imagem">
                              <select value={activeDynamicCarouselConfig.object_fit || 'cover'} onChange={e => updateDynamicCarouselConfig({ object_fit: e.target.value })} className={selectClass}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select>
                            </FormField>
                            <FormField label="Largura (px)">
                              <input type="number" min="20" step="1" value={toNumberInputValue(activeDynamicCarouselConfig.width)} onChange={e => updateDynamicCarouselConfig({ width: e.target.value })} className={inputClass} />
                            </FormField>
                            <FormField label="Espaçamento (px)">
                              <input type="number" min="0" step="1" value={activeDynamicCarouselConfig.spacing} onChange={e => updateDynamicCarouselConfig({ spacing: safeNumber(e.target.value, 0, 0) })} className={inputClass} />
                            </FormField>
                            <FormField label="Margem Esquerda (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.margin_left)} onChange={e => updateDynamicCarouselConfig({ margin_left: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Margem Direita (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.margin_right)} onChange={e => updateDynamicCarouselConfig({ margin_right: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Margem Superior (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.margin_top)} onChange={e => updateDynamicCarouselConfig({ margin_top: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Margem Inferior (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.margin_bottom)} onChange={e => updateDynamicCarouselConfig({ margin_bottom: e.target.value })} className={inputClass} /></FormField>
                          </div>
                        </AccordionSection>

                        {/* 2. BORDAS */}
                        <AccordionSection title="2. Bordas" isOpen={activeSection === 'dyn-2'} onToggle={() => setActiveSection(activeSection === 'dyn-2' ? null : 'dyn-2')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda"><ColorInput label="Cor" value={activeDynamicCarouselConfig.border_color || formData.primary_color} onChange={e => updateDynamicCarouselConfig({ border_color: e.target.value })} /></FormField>
                            <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.border_style)} onChange={e => updateDynamicCarouselConfig({ border_style: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Raio da Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.border_radius)} onChange={e => updateDynamicCarouselConfig({ border_radius: e.target.value })} className={inputClass} /></FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'dyn-3'} onToggle={() => setActiveSection(activeSection === 'dyn-3' ? null : 'dyn-3')}>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-blue-200/80 dark:border-[#0091ff]/20 bg-blue-50/30 dark:bg-[#0091ff]/5 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeDynamicCarouselConfig.show_title ?? false} onChange={e => updateDynamicCarouselConfig({ show_title: e.target.checked })} />
                              {activeDynamicCarouselConfig.show_title && (
                                <>
                                  <FormField label="Texto do título"><input type="text" value={activeDynamicCarouselConfig.title_text ?? ''} onChange={e => updateDynamicCarouselConfig({ title_text: e.target.value })} className={inputClass} /></FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
<FormField label="Tamanho da fonte">
  <input 
    type="number" 
    min="8" 
    value={activeDynamicCarouselConfig.title_font_size ?? ''} 
    onChange={e => {
      const val = e.target.value;
      updateDynamicCarouselConfig({ title_font_size: val === '' ? undefined : Number(val) });
    }} 
    onBlur={e => {
      const val = activeDynamicCarouselConfig.title_font_size;
      updateDynamicCarouselConfig({ title_font_size: safeNumber(val ?? 14, 14, 8) });
    }}
    className={inputClass} 
  />
</FormField>
                                    <FormField label="Alinhamento"><select value={activeDynamicCarouselConfig.title_align ?? 'center'} onChange={e => updateDynamicCarouselConfig({ title_align: e.target.value as 'left' | 'center' | 'right' })} className={selectClass}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></FormField>
                                  </div>
                                  <ToggleSwitch label="Título em negrito" checked={activeDynamicCarouselConfig.title_bold ?? true} onChange={e => updateDynamicCarouselConfig({ title_bold: e.target.checked })} />
                                </>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <ToggleSwitch label="Reproduzir vídeos inativos" checked={activeDynamicCarouselConfig.autoplay_videos ?? true} onChange={e => updateDynamicCarouselConfig({ autoplay_videos: e.target.checked })} />
                              <ToggleSwitch label="Exibir ícone de Play" checked={activeDynamicCarouselConfig.show_play_icon} onChange={e => updateDynamicCarouselConfig({ show_play_icon: e.target.checked })} />
                            </div>
                          </div>
                        </AccordionSection>

                        {/* 4. DESTAQUE DE VÍDEO */}
                        <AccordionSection title="4. Destaque de Vídeo" isOpen={activeSection === 'dyn-4'} onToggle={() => setActiveSection(activeSection === 'dyn-4' ? null : 'dyn-4')}>
                          <div className="space-y-3">
                            <FormField label="Intervalo automático (seg)">
                              <input type="number" min="1" step="1" value={activeDynamicCarouselConfig.autoplay_delay ? activeDynamicCarouselConfig.autoplay_delay / 1000 : 5} onChange={e => updateDynamicCarouselConfig({ autoplay_delay: Number(e.target.value) * 1000 })} className={inputClass} />
                            </FormField>
                            <ToggleSwitch label="Aplicar sombra no vídeo" checked={activeDynamicCarouselConfig.highlight_shadow ?? false} onChange={e => updateDynamicCarouselConfig({ highlight_shadow: e.target.checked })} />
                            <ToggleSwitch label="Ampliar vídeo em destaque" checked={activeDynamicCarouselConfig.highlight_enlarge_active ?? false} onChange={e => updateDynamicCarouselConfig({ highlight_enlarge_active: e.target.checked })} />
                            <ToggleSwitch label="Dessaturar vídeos inativos (50%)" checked={activeDynamicCarouselConfig.highlight_desaturate_inactive ?? false} onChange={e => updateDynamicCarouselConfig({ highlight_desaturate_inactive: e.target.checked })} />
                          </div>
                        </AccordionSection>

                        {/* 5. CARD DE PRODUTO */}
                        <AccordionSection title="5. Card de Produto" isOpen={activeSection === 'dyn-5'} onToggle={() => setActiveSection(activeSection === 'dyn-5' ? null : 'dyn-5')}>
                          <ToggleSwitch label="Exibir card de produto abaixo de cada vídeo" checked={activeDynamicCarouselConfig.show_product} onChange={e => updateDynamicCarouselConfig({ show_product: e.target.checked })} />
                          {activeDynamicCarouselConfig.show_product && (
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-[#ff7a29]/20 pt-3.5">
                              <FormField label="Cor do fundo"><ColorInput label="Cor" value={activeDynamicCarouselConfig.product_card_bg || '#FFFFFF'} onChange={e => updateDynamicCarouselConfig({ product_card_bg: e.target.value })} /></FormField>
                              <FormField label="Cor da Borda"><ColorInput label="Borda" value={activeDynamicCarouselConfig.product_card_border_color || '#E2E8F0'} onChange={e => updateDynamicCarouselConfig({ product_card_border_color: e.target.value })} /></FormField>
                              <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.product_card_border_width)} onChange={e => updateDynamicCarouselConfig({ product_card_border_width: e.target.value })} className={inputClass} /></FormField>
                              <FormField label="Raio Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeDynamicCarouselConfig.product_card_border_radius)} onChange={e => updateDynamicCarouselConfig({ product_card_border_radius: e.target.value })} className={inputClass} /></FormField>
                              <FormField label="Tamanho Título"><input type="number" min="8" value={toNumberInputValue(activeDynamicCarouselConfig.product_card_name_size)} onChange={e => updateDynamicCarouselConfig({ product_card_name_size: e.target.value })} className={inputClass} /></FormField>
                              <FormField label="Cor Título"><ColorInput label="Cor" value={activeDynamicCarouselConfig.product_card_name_color || '#0F172A'} onChange={e => updateDynamicCarouselConfig({ product_card_name_color: e.target.value })} /></FormField>
                              <FormField label="Tamanho Preço"><input type="number" min="8" value={toNumberInputValue(activeDynamicCarouselConfig.product_card_price_size)} onChange={e => updateDynamicCarouselConfig({ product_card_price_size: e.target.value })} className={inputClass} /></FormField>
                              <FormField label="Cor Preço"><ColorInput label="Cor" value={activeDynamicCarouselConfig.product_card_price_color || formData.primary_color} onChange={e => updateDynamicCarouselConfig({ product_card_price_color: e.target.value })} /></FormField>
                            </div>
                          )}
                        </AccordionSection>
                      </div>
                    </SectionCard>
                  )}

                  {/* GRADE */}
                  {activeTab === 'grid' && (
                    <SectionCard title="Configurações da Grade">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#111524] px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#ff7a29]/20 mb-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-[#0091ff]/10 border border-blue-200/60 dark:border-[#0091ff]/20 text-[#0091ff] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0091ff]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white dark:bg-[#1a1f35] p-1 rounded-xl border border-slate-200 dark:border-[#ff7a29]/20 shadow-xs">
                            <button type="button" onClick={() => setGridDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', gridDevice === 'desktop' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setGridDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', gridDevice === 'mobile' ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}><Smartphone size={13} />Mobile</button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 1. LAYOUT & DIMENSÕES */}
                        <AccordionSection title="1. Layout & Dimensões" isOpen={activeSection === 'grid-1'} onToggle={() => setActiveSection(activeSection === 'grid-1' ? null : 'grid-1')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Formato">
                              <select value={activeGridConfig.shape} onChange={e => updateGridConfig({ shape: e.target.value as WidgetShape })} className={selectClass}><option value="circle">Circular</option><option value="square">Quadrado</option><option value="portrait">Retrato 9:16</option><option value="landscape">Paisagem 16:9</option></select>
                            </FormField>
                            <FormField label="Ajuste Imagem">
                              <select value={activeGridConfig.object_fit || 'cover'} onChange={e => updateGridConfig({ object_fit: e.target.value })} className={selectClass}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select>
                            </FormField>
                            <FormField label="Largura (px)"><input type="number" min="20" value={toNumberInputValue(activeGridConfig.width)} onChange={e => updateGridConfig({ width: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Colunas"><input type="number" min="1" max="10" value={activeGridConfig.visible_items} onChange={e => updateGridConfig({ visible_items: limitNumber(e.target.value, 1, 1, 10) })} className={inputClass} /></FormField>
                            <FormField label="Espaçamento (px)" className="col-span-2"><input type="number" min="0" value={activeGridConfig.spacing} onChange={e => updateGridConfig({ spacing: safeNumber(e.target.value, 0, 0) })} className={inputClass} /></FormField>
                            <FormField label="Margem Esquerda (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).margin_left)} onChange={e => updateGridConfig({ margin_left: e.target.value } as any)} className={inputClass} /></FormField>
                            <FormField label="Margem Direita (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).margin_right)} onChange={e => updateGridConfig({ margin_right: e.target.value } as any)} className={inputClass} /></FormField>
                            <FormField label="Margem Superior (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).margin_top)} onChange={e => updateGridConfig({ margin_top: e.target.value } as any)} className={inputClass} /></FormField>
                            <FormField label="Margem Inferior (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).margin_bottom)} onChange={e => updateGridConfig({ margin_bottom: e.target.value } as any)} className={inputClass} /></FormField>
                          </div>
                          <div className="mt-3 p-2 bg-sky-50 dark:bg-sky-500/5 rounded-xl border border-sky-100 dark:border-sky-500/20">
<p className="text-[12px] text-white font-medium leading-snug">
                              💡 No mobile, a grade é otimizada para exibir no máximo 2 colunas.
                            </p>
                          </div>
                        </AccordionSection>

                        {/* 2. BORDAS */}
                        <AccordionSection title="2. Bordas" isOpen={activeSection === 'grid-2'} onToggle={() => setActiveSection(activeSection === 'grid-2' ? null : 'grid-2')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda"><ColorInput label="Cor" value={activeGridConfig.border_color || formData.primary_color} onChange={e => updateGridConfig({ border_color: e.target.value })} /></FormField>
<FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeGridConfig.border_width)} onChange={e => updateGridConfig({ border_width: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Raio da Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeGridConfig.border_radius)} onChange={e => updateGridConfig({ border_radius: e.target.value })} className={inputClass} /></FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'grid-3'} onToggle={() => setActiveSection(activeSection === 'grid-3' ? null : 'grid-3')}>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-blue-200/80 dark:border-[#0091ff]/20 bg-blue-50/30 dark:bg-[#0091ff]/5 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeGridConfig.show_title ?? false} onChange={e => updateGridConfig({ show_title: e.target.checked })} />
                              {activeGridConfig.show_title && (
                                <>
                                  <FormField label="Texto do título"><input type="text" value={(activeGridConfig as any).title_text ?? ''} onChange={e => updateGridConfig({ title_text: e.target.value } as any)} className={inputClass} /></FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
<FormField label="Tamanho da fonte">
  <input 
    type="number" 
    min="8" 
    value={(activeGridConfig as any).title_font_size ?? ''} 
    onChange={e => {
      const val = e.target.value;
      updateGridConfig({ title_font_size: val === '' ? undefined : Number(val) } as any);
    }} 
    onBlur={e => {
      const val = (activeGridConfig as any).title_font_size;
      updateGridConfig({ title_font_size: safeNumber(val ?? 14, 14, 8) } as any);
    }}
    className={inputClass} 
  />
</FormField>
                                    <FormField label="Alinhamento"><select value={(activeGridConfig as any).title_align ?? 'center'} onChange={e => updateGridConfig({ title_align: e.target.value } as any)} className={selectClass}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></FormField>
                                  </div>
                                  <ToggleSwitch label="Título em negrito" checked={(activeGridConfig as any).title_bold ?? true} onChange={e => updateGridConfig({ title_bold: e.target.checked } as any)} />
                                </>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <ToggleSwitch label="Reproduzir vídeos automaticamente" checked={activeGridConfig.autoplay_videos ?? true} onChange={e => updateGridConfig({ autoplay_videos: e.target.checked })} />
                              <ToggleSwitch label="Reprodução sequencial (1 vídeo por vez, 5s cada)" checked={activeGridConfig.sequential_playback ?? false} onChange={e => updateGridConfig({ sequential_playback: e.target.checked })} />
                              <ToggleSwitch label="Exibir ícone de Play" checked={(activeGridConfig as any).show_play_icon ?? true} onChange={e => updateGridConfig({ show_play_icon: e.target.checked } as any)} />
                            </div>
                          </div>
                        </AccordionSection>

                        {/* 4. CARD DE PRODUTO */}
                        <AccordionSection title="4. Card de Produto" isOpen={activeSection === 'grid-4'} onToggle={() => setActiveSection(activeSection === 'grid-4' ? null : 'grid-4')}>
                          <ToggleSwitch label="Exibir card de produto abaixo de cada vídeo" checked={(activeGridConfig as any).show_product} onChange={e => updateGridConfig({ show_product: e.target.checked } as any)} />
                          {(activeGridConfig as any).show_product && (
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-[#ff7a29]/20 pt-3.5">
                              <FormField label="Cor do fundo"><ColorInput label="Cor" value={(activeGridConfig as any).product_card_bg || '#FFFFFF'} onChange={e => updateGridConfig({ product_card_bg: e.target.value } as any)} /></FormField>
                              <FormField label="Cor da Borda"><ColorInput label="Borda" value={(activeGridConfig as any).product_card_border_color || '#E2E8F0'} onChange={e => updateGridConfig({ product_card_border_color: e.target.value } as any)} /></FormField>
                              <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).product_card_border_width)} onChange={e => updateGridConfig({ product_card_border_width: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Raio Borda (px)"><input type="number" min="0" value={toNumberInputValue((activeGridConfig as any).product_card_border_radius)} onChange={e => updateGridConfig({ product_card_border_radius: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Tamanho Título"><input type="number" min="8" value={toNumberInputValue((activeGridConfig as any).product_card_name_size)} onChange={e => updateGridConfig({ product_card_name_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Título"><ColorInput label="Cor" value={(activeGridConfig as any).product_card_name_color || '#0F172A'} onChange={e => updateGridConfig({ product_card_name_color: e.target.value } as any)} /></FormField>
                              <FormField label="Tamanho Preço"><input type="number" min="8" value={toNumberInputValue((activeGridConfig as any).product_card_price_size)} onChange={e => updateGridConfig({ product_card_price_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Preço"><ColorInput label="Cor" value={(activeGridConfig as any).product_card_price_color || formData.primary_color} onChange={e => updateGridConfig({ product_card_price_color: e.target.value } as any)} /></FormField>
                            </div>
                          )}
                        </AccordionSection>
                      </div>
                    </SectionCard>
                  )}

                  {/* PLAYER */}
                  {activeTab === 'modal' && (
                    <SectionCard title="Configurações do Player">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#111524] px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#ff7a29]/20 mb-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-[#0091ff]/10 border border-blue-200/60 dark:border-[#0091ff]/20 text-[#0091ff] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0091ff]" /><Smartphone size={14} /></div>
                      </div>

                      <div className="space-y-3">
                        {/* 1. BORDA */}
                        <AccordionSection title="1. Borda" isOpen={activeSection === 'mod-1'} onToggle={() => setActiveSection(activeSection === 'mod-1' ? null : 'mod-1')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda" className="col-span-2"><ColorInput label="Cor da borda" value={formData.modal_config.border_color || formData.primary_color} onChange={e => updateModalConfig({ border_color: e.target.value })} /></FormField>
                            <FormField label="Largura Borda (px)"><input type="number" min="0" step="1" value={toNumberInputValue(formData.modal_config.border_width)} onChange={e => updateModalConfig({ border_width: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Raio da Borda (px)"><input type="number" min="0" step="1" value={toNumberInputValue(formData.modal_config.border_radius)} onChange={e => updateModalConfig({ border_radius: e.target.value })} className={inputClass} /></FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'mod-3'} onToggle={() => setActiveSection(activeSection === 'mod-3' ? null : 'mod-3')}>
                          <div className="space-y-1.5">
                            <ToggleSwitch label="Exibir título do vídeo" checked={formData.modal_config.show_title} onChange={e => updateModalConfig({ show_title: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão Like (Curtir)" checked={formData.modal_config.show_like_button} onChange={e => updateModalConfig({ show_like_button: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão de Comentários" checked={formData.modal_config.show_comment_button} onChange={e => updateModalConfig({ show_comment_button: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão de Compartilhar" checked={formData.modal_config.show_share_button} onChange={e => updateModalConfig({ show_share_button: e.target.checked })} />
                          </div>
                        </AccordionSection>

                        {/* 4. CARD DE PRODUTO */}
                        <AccordionSection title="4. Card de Produto" isOpen={activeSection === 'mod-4'} onToggle={() => setActiveSection(activeSection === 'mod-4' ? null : 'mod-4')}>
                          <ToggleSwitch label="Exibir card de produto" checked={formData.modal_config.show_product} onChange={e => updateModalConfig({ show_product: e.target.checked })} />
                          {formData.modal_config.show_product && (
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-[#ff7a29]/20 pt-3.5">
                              <FormField label="Cor do fundo"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_bg || '#FFFFFF'} onChange={e => updateModalConfig({ product_card_bg: e.target.value } as any)} /></FormField>
                              <FormField label="Cor da Borda"><ColorInput label="Borda" value={(formData.modal_config as any).product_card_border_color || '#E2E8F0'} onChange={e => updateModalConfig({ product_card_border_color: e.target.value } as any)} /></FormField>
                              <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue((formData.modal_config as any).product_card_border_width)} onChange={e => updateModalConfig({ product_card_border_width: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Raio Borda (px)"><input type="number" min="0" value={toNumberInputValue((formData.modal_config as any).product_card_border_radius)} onChange={e => updateModalConfig({ product_card_border_radius: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Tamanho Título"><input type="number" min="8" value={toNumberInputValue((formData.modal_config as any).product_card_name_size)} onChange={e => updateModalConfig({ product_card_name_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Título"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_name_color || '#0F172A'} onChange={e => updateModalConfig({ product_card_name_color: e.target.value } as any)} /></FormField>
                              <FormField label="Tamanho Preço"><input type="number" min="8" value={toNumberInputValue((formData.modal_config as any).product_card_price_size)} onChange={e => updateModalConfig({ product_card_price_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Preço"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_price_color || formData.primary_color} onChange={e => updateModalConfig({ product_card_price_color: e.target.value } as any)} /></FormField>
                            </div>
                          )}
                        </AccordionSection>
                      </div>
                    </SectionCard>
                  )}

                </div>

                <PreviewCard
                  formData={formData}
                  floatingDevice={floatingDevice}
                  setFloatingDevice={setFloatingDevice}
                  carouselDevice={carouselDevice}
                  setCarouselDevice={setCarouselDevice}
                  dynamicCarouselDevice={dynamicCarouselDevice}
                  setDynamicCarouselDevice={setDynamicCarouselDevice}
                  gridDevice={gridDevice}
                  setGridDevice={setGridDevice}
                  activeTab={activeTab}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#ff7a29]/20 bg-white dark:bg-[#111524] px-6 py-3 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleResetTab}
                  className="text-[11px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-100 dark:border-rose-500/25 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Resetar
                </button>
                <div className="hidden md:flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#1a1f35] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#ff7a29]/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} className="text-[#0091ff]"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
<span>Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleCancel} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a1f35] disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
                  <X size={14} /> Cancelar
                </button>
                

                
                <button type="button" onClick={handleSaveStyle} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#0070f3] dark:hover:bg-[#e05e10] disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} onConfirm={handleConfirmDelete} title="Excluir estilo?" description={`Tem certeza que deseja excluir "${deleteModal.name}"? Esta ação não pode ser desfeita.`} />
    </div>
  );
};

export default AppearancePage;

