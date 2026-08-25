'use client';

import React, {
  useCallback,
  useEffect,
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
  product_card_button_bg?: string;
  product_card_button_color?: string;
  title_text?: string;
  title_font_size?: number;
  title_align?: 'left' | 'center' | 'right';
  title_bold?: boolean;
};

type GridConfig = {
  visible_items: number;
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
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50';
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

const toNumberInputValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? match[0] : '';
};

const extractNumericCssSize = (value: unknown, fallback = '0px') => {
  const numeric = toNumberInputValue(value);
  if (!numeric) return fallback;
  return `${numeric}px`;
};

const formatNumberLikeCurrent = (value: unknown, fallback = '0') => {
  const numeric = toNumberInputValue(value);
  return numeric || fallback;
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
  return toNumberInputValue(value) || fallback;
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
  product_card_button_bg: '#0094EB',
  product_card_button_color: '#FFFFFF',
  margin_left: '0',
  margin_right: '0',
});

const createDefaultDynamicCarouselMobileConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselMobileConfig(),
  enabled: true,
  highlight_shadow: false,
  highlight_scale_up: false,
  highlight_scale_down_others: false,
  product_card_button_bg: '#0094EB',
  product_card_button_color: '#FFFFFF',
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
        mobile: prev.floating_config.desktop,
      },
      carousel_config: {
        same_for_all: true,
        desktop: prev.carousel_config.desktop,
        mobile: prev.carousel_config.desktop,
      },
      
      dynamic_carousel_config: {
        same_for_all: true,
        desktop: prev.dynamic_carousel_config.desktop,
        mobile: prev.dynamic_carousel_config.desktop,
      },

      grid_config: {
        same_for_all: true,
        desktop: {
          ...prev.grid_config.desktop,
          visible_items: limitNumber(prev.grid_config.desktop.visible_items, 10, 1, 10),
        },
        mobile: {
          ...prev.grid_config.desktop,
          visible_items: limitNumber(prev.grid_config.desktop.visible_items, 10, 1, 10),
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
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-[#0094EB] accent-[#0094EB] focus:ring-2 focus:ring-[#0094EB]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-800">{label}</span>
        {description && (
          <span className="block text-[11px] font-medium text-slate-500">
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
        className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 shadow-sm overflow-hidden"
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
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white"
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
    <div className="flex w-fit rounded-xl border border-slate-200 bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'desktop'
            ? 'bg-[#0094EB] text-white shadow-sm'
            : 'text-slate-500 hover:bg-white hover:text-slate-800',
        )}
      >
        <Monitor size={15} />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'mobile'
            ? 'bg-[#0094EB] text-white shadow-sm'
            : 'text-slate-500 hover:bg-white hover:text-slate-800',
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
    <div className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-[#0094EB]">
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
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
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
      <label className="block text-xs font-bold text-slate-700">
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
          ? 'bg-[#0094EB] text-white shadow-md shadow-blue-500/20'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800',
      )}
    >
      {icon}
      {label}
    </button>
  );
};

const PreviewInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <p className="mt-1 truncate font-black text-slate-700">{value}</p>
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

const FloatingPreview = ({
  floating,
  colors,
  device,
}: {
  floating: FloatingConfig;
  colors: PreviewColors;
  device: DeviceType;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (floating.autoplay_videos ?? true) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [floating.autoplay_videos]);

  const isCircle = floating.shape === 'circle';
  const width = cssSize(floating.width, '80px');
  const height = cssSize(floating.height, '142px');
  const circleSize = cssSize(floating.border_radius || floating.width, '80px');
  const finalWidth = isCircle ? circleSize : width;
  const finalHeight = isCircle ? circleSize : height;

  const positionStyle: React.CSSProperties = {};
  const gapBottom = cssSize(floating.bottom_spacing, '20px');
  const gapTop = cssSize(floating.top_spacing, '20px');
  const gapLeft = cssSize(floating.left_spacing, '20px');
  const gapRight = cssSize(floating.right_spacing, '20px');

  if (floating.position === 'fixed_bottom_right' || floating.position === 'fixed_bottom_left') {
    positionStyle.bottom = gapBottom;
  }
  if (floating.position === 'fixed_top_right' || floating.position === 'fixed_top_left') {
    positionStyle.top = gapTop;
  }
  if (floating.position === 'fixed_bottom_left' || floating.position === 'fixed_top_left') {
    positionStyle.left = gapLeft;
  }
  if (floating.position === 'fixed_bottom_right' || floating.position === 'fixed_top_right') {
    positionStyle.right = gapRight;
  }

  const isRightAligned = floating.position.includes('right') || floating.floating_position.includes('right');

  return (
    <div 
      className="relative w-full h-[440px] overflow-hidden rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/50"
      style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Wrapper dinâmico que carrega o Widget + CTA de forma sincronizada na UI de teste */}
      <div
        className="absolute transition-all duration-300 animate-fade-in flex items-center"
        style={{
          ...positionStyle,
          zIndex: safeNumber(floating.z_index, 5, 1),
        }}
      >
        {/* Pílula do CTA Lateral */}
        {floating.show_cta && floating.cta_text && (
          <div
            className="absolute whitespace-nowrap shadow-md pointer-events-none transition-all duration-300"
            style={{
              backgroundColor: floating.cta_bg_color || '#0094EB',
              color: floating.cta_text_color || '#FFFFFF',
              fontSize: `${floating.cta_font_size || 14}px`,
              fontWeight: floating.cta_is_bold ? 'bold' : 'normal',
              padding: '6px 14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              zIndex: -1, // Fica atrás do flutuante
              ...(isRightAligned ? {
                right: '100%',
                marginRight: '-15px', // Sobreposição para efeito visual
                paddingRight: '25px',
                borderRadius: '30px 0 0 30px'
              } : {
                left: '100%',
                marginLeft: '-15px',
                paddingLeft: '25px',
                borderRadius: '0 30px 30px 0'
              })
            }}
          >
            {floating.cta_text}
          </div>
        )}

        {/* Widget Flutuante em si */}
        <div
          className="relative flex items-center justify-center overflow-hidden bg-white shadow-xl shrink-0"
          style={{
            width: finalWidth,
            height: finalHeight,
            borderRadius: isCircle ? '999px' : cssSize(floating.border_radius, '12px'),
            border: cssBorder(floating.border_style, colors.floatingBorder),
          }}
        >
          <video
            ref={videoRef}
            src={DEMO_PREVIEW_VIDEOS[0]}
            loop={floating.autoplay_videos ?? true}
            muted
            playsInline
            preload="auto"
            poster="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />

          {floating.show_play_icon && (
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
              <PlaySquare size={16} />
            </div>
          )}
          {floating.allow_close && (
            <div className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <X size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CarouselPreview = ({
  carousel,
  colors,
}: {
  carousel: CarouselConfig;
  colors: PreviewColors;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const visibleItems = safeNumber(carousel.visible_items, 4, 1);
  const shape = normalizeWidgetShape(carousel.shape, 'portrait');
  const items = Array.from({ length: Math.max(1, visibleItems + 2) }); // Margem para scroll visível
  const isCircle = shape === 'circle';
  const isPortrait = shape === 'portrait';
  const isLandscape = shape === 'landscape';

  useEffect(() => {
    videoRefs.current.forEach((vid) => {
      if (!vid) return;
      if (carousel.autoplay_videos ?? true) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [carousel.autoplay_videos]);

  const rawWidth = safeNumber(parseFloat(carousel.width || '120'), 120, 40);
  const spacing = safeNumber(carousel.spacing, 8, 0);
  const cardHeightPx = isPortrait
    ? Math.round((rawWidth * 16) / 9)
    : isLandscape
      ? Math.round((rawWidth * 9) / 16)
      : rawWidth;

  const cardWidth = `${rawWidth}px`;
  const cardHeight = `${cardHeightPx}px`;
  const borderRadius = isCircle ? '50%' : cssSize(carousel.border_radius, '12px');

  return (
    <div className="relative w-full h-[440px] flex items-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/50 p-6 overflow-hidden">
      <div 
        className="w-full flex items-start overflow-x-auto py-6 px-2 scrollbar-none"
        style={{ gap: `${spacing}px` }}
      >
        {items.map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5 shrink-0" style={{ width: cardWidth }}>
            <div
              className="relative overflow-hidden shadow-sm bg-slate-900 transition-all"
              style={{
                width: cardWidth,
                height: cardHeight,
                borderColor: carousel.border_color || colors.primary,
                borderWidth: `${safeNumber(carousel.border_style, 2, 0)}px`,
                borderStyle: 'solid',
                borderRadius,
              }}
            >
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(index, el);
                  else videoRefs.current.delete(index);
                }}
                src={DEMO_PREVIEW_VIDEOS[index % DEMO_PREVIEW_VIDEOS.length]}
                loop={carousel.autoplay_videos ?? true}
                muted
                playsInline
                preload="auto"
                poster="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                className="h-full w-full object-cover pointer-events-none"
              />

              {carousel.show_play_icon && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                    <PlaySquare size={12} />
                  </div>
                </div>
              )}
            </div>

            {carousel.show_product && !isCircle && (
              <div
                className="flex items-center gap-1.5 p-1 shadow-sm"
                style={{
                  backgroundColor: carousel.product_card_bg || '#FFFFFF',
                  borderColor: carousel.product_card_border_color || '#E2E8F0',
                  borderWidth: `${safeNumber(carousel.product_card_border_width, 1, 0)}px`,
                  borderStyle: 'solid',
                  borderRadius: `${safeNumber(carousel.product_card_border_radius, 8, 0)}px`,
                }}
              >
                <div className="h-7 w-7 shrink-0 rounded bg-slate-200" />
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <div
                    className="truncate font-bold leading-tight"
                    style={{
                      fontSize: `${safeNumber(carousel.product_card_name_size, 10, 8)}px`,
                      color: carousel.product_card_name_color || '#0F172A',
                    }}
                  >
                    Calça Confort
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span
                      style={{
                        fontSize: `${safeNumber(carousel.product_card_price_size, 10, 8)}px`,
                        fontWeight: carousel.product_card_price_bold ?? true ? '800' : '600',
                        color: carousel.product_card_price_color || colors.primary,
                      }}
                    >
                      R$ 149,95
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DynamicCarouselPreview = ({
  carousel,
  colors,
}: {
  carousel: DynamicCarouselConfig;
  colors: PreviewColors;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const shape = normalizeWidgetShape(carousel.shape, 'portrait');
  
  // Criamos uma lista de 18 itens para preencher as laterais perfeitamente sem nunca mostrar fundo vazio
  const items = Array.from({ length: 18 }); 
  const isCircle = shape === 'circle';
  const isPortrait = shape === 'portrait';
  const isLandscape = shape === 'landscape';

  // Começa no índice 4 para garantir que já existam itens renderizados preenchendo o lado esquerdo
  const [activeIndex, setActiveIndex] = useState(4); 

  // Troca automática infinita
  useEffect(() => {
    const delay = carousel.autoplay_delay || 4000;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, delay);
    return () => clearInterval(interval);
  }, [carousel.autoplay_delay, items.length]);

  // Controle de reprodução dos vídeos (Ativo vs Inativos)
  useEffect(() => {
    videoRefs.current.forEach((vid, index) => {
      if (!vid) return;
      const isActive = index === activeIndex;
      
      // O destaque sempre roda. Os outros dependem da flag de autoplay inativo
      const shouldPlay = isActive || (carousel.autoplay_inactive_videos ?? false);

      if (shouldPlay) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.currentTime = 0; // Pausa estática no frame inicial
      }
    });
  }, [carousel.autoplay_inactive_videos, activeIndex]);

  const rawWidth = safeNumber(parseFloat(carousel.width || '120'), 120, 40);
  const spacing = safeNumber(carousel.spacing, 12, 0);
  const cardHeightPx = isPortrait
    ? Math.round((rawWidth * 16) / 9)
    : isLandscape
      ? Math.round((rawWidth * 9) / 16)
      : rawWidth;

  const cardWidth = `${rawWidth}px`;
  const cardHeight = `${cardHeightPx}px`;
  const borderRadius = isCircle ? '50%' : cssSize(carousel.border_radius, '12px');

  // Ajuste matemático de centralização absoluta do item ativo de ponta a ponta
  const centerAdjustment = `calc(50% - ${rawWidth / 2}px)`;
  const translateOffset = `${-activeIndex * (rawWidth + spacing)}px`;

  // Fotos reais para o carrossel ficar perfeito
  const productImages = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=120&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=120&auto=format&fit=crop&q=80"
  ];

  return (
    <div className="relative w-full h-[440px] flex flex-col items-center justify-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/50 py-4 px-0 overflow-hidden">
      {carousel.show_title && carousel.title_text && (
        <div 
          className="w-full mb-4 px-6 z-10"
          style={{
            textAlign: carousel.title_align || 'center',
            fontSize: `${carousel.title_font_size || 14}px`,
            fontWeight: carousel.title_bold ? 'bold' : 'normal',
            color: colors.text,
          }}
        >
          {carousel.title_text}
        </div>
      )}

      {/* Viewport 100% de largura (Ponta a ponta do site) */}
      <div className="w-full overflow-hidden py-4">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(calc(${centerAdjustment} + ${translateOffset}))`,
            gap: `${spacing}px`,
          }}
        >
          {items.map((_, index) => {
            const isActive = index === activeIndex;
            
            // 1. Efeito de Escala
            const applyScale = isActive && carousel.highlight_enlarge_active ? 'scale(1.12)' : 'scale(1)';
            
            // 2. Sombra isolada na moldura do vídeo (Sem invadir ou sobrepor o card do produto)
            const applyShadow = isActive && carousel.highlight_shadow 
              ? '0 10px 20px -6px rgba(0, 0, 0, 0.35)' 
              : 'none';
              
            // 3. Dessaturação de inativos
            const applySaturation = !isActive && carousel.highlight_desaturate_inactive 
              ? 'grayscale(60%) opacity(60%)' 
              : 'grayscale(0%) opacity(100%)';

            // 4. Espaçamento extra dinâmico para evitar colisão quando o item ativo expande
            const dynamicMarginX = isActive && carousel.highlight_enlarge_active
              ? '10px' 
              : '0px';

            return (
              <div 
                key={index} 
                className="flex flex-col shrink-0 transition-all duration-500 relative" 
                style={{ 
                  width: cardWidth,
                  transform: applyScale,
                  filter: applySaturation,
                  marginLeft: dynamicMarginX,
                  marginRight: dynamicMarginX,
                  zIndex: isActive ? 30 : 10,
                }}
              >
                {/* MOLDURA DO VÍDEO */}
                <div
                  className="relative overflow-hidden bg-slate-900 transition-all duration-500"
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    borderColor: isActive && carousel.highlight_border_color ? carousel.highlight_border_color : (carousel.border_color || colors.primary),
                    borderWidth: `${safeNumber(carousel.border_style, 2, 0)}px`,
                    borderStyle: 'solid',
                    borderRadius,
                    boxShadow: applyShadow,
                  }}
                >
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(index, el);
                      else videoRefs.current.delete(index);
                    }}
                    src={DEMO_PREVIEW_VIDEOS[index % DEMO_PREVIEW_VIDEOS.length]}
                    loop
                    muted
                    playsInline
                    preload="auto"
                    poster="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                    className="h-full w-full object-cover pointer-events-none"
                  />

                  {carousel.show_play_icon && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                        <PlaySquare size={12} />
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD DO PRODUTO (Z-INDEX SUPERIOR PARA IMUNIDADE DE SOMBRA) */}
                {carousel.show_product && !isCircle && (
                  <div
                    className="flex flex-col gap-1.5 p-1.5 shadow-md transition-all duration-500 relative z-40 bg-white"
                    style={{
                      backgroundColor: carousel.product_card_bg || '#FFFFFF',
                      borderColor: carousel.product_card_border_color || '#E2E8F0',
                      borderWidth: `${safeNumber(carousel.product_card_border_width, 1, 0)}px`,
                      borderStyle: 'solid',
                      borderRadius: `${safeNumber(carousel.product_card_border_radius, 8, 0)}px`,
                      marginTop: '8px',
                    }}
                  >
                    {/* Linha Horizontal: Foto Esquerda + Textos Direita */}
                    <div className="flex items-center gap-2">
                      <img
                        src={productImages[index % productImages.length]}
                        alt="Preview Produto"
                        className="w-9 h-9 rounded object-cover bg-slate-100 shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div
                          className="truncate font-bold leading-tight"
                          style={{
                            fontSize: `${safeNumber(carousel.product_card_name_size, 10, 8)}px`,
                            color: carousel.product_card_name_color || '#0F172A',
                          }}
                        >
                          Calça Confort
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span
                            className="font-black"
                            style={{
                              fontSize: `${safeNumber(carousel.product_card_price_size, 10, 8)}px`,
                              color: carousel.product_card_price_color || colors.primary,
                            }}
                          >
                            R$ 149,95
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Redirecionamento */}
                    {carousel.show_product_button && (
                      <button
                        type="button"
                        className="w-full rounded py-1 text-[9px] font-black uppercase text-center tracking-wider transition-colors duration-300"
                        style={{
                          backgroundColor: isActive 
                            ? (carousel.product_card_button_bg || colors.button) 
                            : '#94A3B8', // Cinza sutil (Slate 400) para cards inativos
                          color: carousel.product_card_button_color || '#FFFFFF',
                        }}
                      >
                        Ver No Site
                      </button>
                    )}
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

const GridPreview = ({
  grid,
  colors,
}: {
  grid: GridConfig;
  colors: PreviewColors;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const cols = limitNumber(grid.visible_items, 10, 1, 10);
  const rows = 2; // Forçamos pelo menos 2 linhas para exibir o distanciamento vertical!
  const totalItems = cols * rows;
  const items = Array.from({ length: totalItems });

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!grid.sequential_playback) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }, 5000);
    return () => clearInterval(interval);
  }, [grid.sequential_playback, totalItems]);

  useEffect(() => {
    videoRefs.current.forEach((vid, index) => {
      if (!vid) return;
      if (grid.sequential_playback) {
        if (index === activeIndex) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      } else if (grid.autoplay_videos ?? true) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [grid.autoplay_videos, grid.sequential_playback, activeIndex, totalItems]);

  const rawWidth = safeNumber(parseFloat(grid.width || '90'), 90, 40);
  const cardWidth = `${rawWidth}px`;
  const shape = normalizeWidgetShape(grid.shape, 'portrait');
  const isCircle = shape === 'circle';
  const isPortrait = shape === 'portrait';
  const isLandscape = shape === 'landscape';

  return (
    <div className="flex h-[440px] w-full items-center justify-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/50 p-6 overflow-auto">
      <div
        className="grid justify-center mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cardWidth})`,
          gridTemplateRows: `repeat(${rows}, auto)`,
          gap: `${safeNumber(grid.spacing, 8, 0)}px`,
        }}
      >
        {items.map((_, index) => (
          <div key={index} className="flex min-w-0 justify-center">
            <div
              className={cn(
                'relative overflow-hidden shadow-sm flex items-center justify-center bg-slate-900',
                isCircle ? 'rounded-full' : 'rounded-xl'
              )}
              style={{
                width: cardWidth,
                aspectRatio: isPortrait ? '9 / 16' : isLandscape ? '16 / 9' : '1 / 1',
                borderColor: grid.border_color || colors.primary,
                borderWidth: `${safeNumber(grid.border_style, 2, 0)}px`,
                borderStyle: 'solid',
                borderRadius: isCircle ? '999px' : cssSize(grid.border_radius, '12px'),
                opacity: grid.sequential_playback && index !== activeIndex ? 0.4 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(index, el);
                  else videoRefs.current.delete(index);
                }}
                src={DEMO_PREVIEW_VIDEOS[index % DEMO_PREVIEW_VIDEOS.length]}
                loop={grid.autoplay_videos ?? true}
                muted
                playsInline
                preload="auto"
                poster="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80"
                className="h-full w-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                  <PlaySquare size={12} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ModalPreview = ({
  formData,
  colors,
}: {
  formData: ExtendedAppearance;
  colors: PreviewColors;
}) => {
  const { modal_config: m } = formData;
  const borderW = safeNumber(m.border_width, 0, 0);

  return (
    <div className="overflow-hidden rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center h-[440px] w-full">
      <div
        className="relative h-[400px] w-[220px] overflow-hidden rounded-[1.25rem] shadow-2xl shrink-0 bg-slate-900"
        style={{
          color: '#FFFFFF',
          fontFamily: formData.font_family,
          borderColor: m.border_color || colors.primary,
          borderWidth: `${borderW}px`,
          borderStyle: borderW > 0 ? 'solid' : 'none',
          borderRadius: cssSize(m.border_radius, '1.25rem'),
        }}
      >
        <video
          src={DEMO_PREVIEW_VIDEOS[0]}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

        <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-2">
          {m.show_title && (
            <h4 className="line-clamp-1 text-xs font-black text-white drop-shadow">
              Calça Confort
            </h4>
          )}
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/60 bg-black/30 text-white backdrop-blur"
          >
            <X size={12} />
          </button>
        </div>

        {m.show_play_button && (
          <div className="absolute left-1/2 top-[42%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
              <PlaySquare size={18} />
            </div>
          </div>
        )}

        <div className="absolute bottom-24 right-2 z-20 flex flex-col gap-2">
          {m.show_like_button && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/20 text-white backdrop-blur">
              <Heart size={14} />
            </div>
          )}
          {m.show_comment_button && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/20 text-white backdrop-blur">
              <MessageCircle size={14} />
            </div>
          )}
          {m.show_share_button && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/20 text-white backdrop-blur">
              <Share2 size={14} />
            </div>
          )}
        </div>

        {m.show_product && (
          <div
            className="absolute bottom-2 left-2 right-2 z-30 p-2 text-slate-900 shadow-lg backdrop-blur"
            style={{
              backgroundColor: (m as any).product_card_bg || '#FFFFFF',
              borderColor: (m as any).product_card_border_color || '#E2E8F0',
              borderWidth: `${safeNumber((m as any).product_card_border_width, 1, 0)}px`,
              borderStyle: 'solid',
              borderRadius: `${safeNumber((m as any).product_card_border_radius, 12, 0)}px`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="h-10 w-10 shrink-0 rounded"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-black"
                  style={{
                    fontSize: `${safeNumber((m as any).product_card_name_size, 11, 8)}px`,
                    color: (m as any).product_card_name_color || '#0F172A',
                  }}
                >
                  Calça Confort
                </p>
                <p
                  className="font-black"
                  style={{
                    fontSize: `${safeNumber((m as any).product_card_price_size, 12, 8)}px`,
                    color: (m as any).product_card_price_color || colors.primary,
                  }}
                >
                  R$ 149,95
                </p>
                <div className="mt-1 flex gap-1">
                  {m.show_product_button && (
                    <button
                      type="button"
                      className="flex-1 rounded px-1.5 py-1 text-[8px] font-black"
                      style={{
                        backgroundColor: (m as any).product_card_button_bg || colors.button,
                        color: (m as any).product_card_button_color || '#FFFFFF',
                      }}
                    >
                      Ver produto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
              <div className="h-1 w-full bg-[#0094EB] rounded-full relative mb-3 flex items-center justify-center">
                <span className="absolute bg-white px-3 py-1 border-2 border-[#0094EB] rounded-full shadow-md text-sm">
                  🔗
                </span>
              </div>
              <span className="text-[10px] font-black text-[#0094EB] uppercase tracking-widest">Unificados</span>
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

const PreviewCard = ({
  formData,
  floatingDevice, setFloatingDevice,
  carouselDevice, setCarouselDevice,
  dynamicCarouselDevice, setDynamicCarouselDevice,
  gridDevice, setGridDevice,
  activeTab,
}: any) => {
  // Estado local apenas para o Player, já que os outros sincronizam com a barra lateral
  const [playerDevice, setPlayerDevice] = useState<'desktop' | 'mobile'>('mobile');

  // Descobre qual dispositivo está ativo agora baseado na aba
  const activeDevice = 
    activeTab === 'floating' ? floatingDevice :
    activeTab === 'carousel' ? carouselDevice :
    activeTab === 'dynamic_carousel' ? dynamicCarouselDevice :
    activeTab === 'grid' ? gridDevice : 
    playerDevice;

  // Função para mudar o dispositivo clicando nos botões acima do preview
  const handleDeviceChange = (device: 'desktop' | 'mobile') => {
    if (formData.useGlobalAppearance) return; // Se estiver travado no global, não faz nada
    if (activeTab === 'floating') setFloatingDevice(device);
    if (activeTab === 'carousel') setCarouselDevice(device);
    if (activeTab === 'dynamic_carousel') setDynamicCarouselDevice(device);
    if (activeTab === 'grid') setGridDevice(device);
    if (activeTab === 'modal') setPlayerDevice(device);
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

  const isMobileFrame = !formData.useGlobalAppearance && activeDevice === 'mobile';

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      {/* HEADER DO PREVIEW: Toggles de Dispositivo */}
      <div className="flex items-center justify-center border-b border-slate-100 bg-slate-50/80 p-2 shrink-0">
        <div className="flex items-center bg-slate-200/60 p-1 rounded-lg gap-1">
          <button
            type="button"
            onClick={() => handleDeviceChange('desktop')}
            className={cn(
              "flex items-center justify-center p-1.5 rounded-md transition-all duration-200",
              activeDevice === 'desktop' ? "bg-white shadow-sm text-[#0094EB]" : "text-slate-500 hover:text-slate-700"
            )}
            title="Visualizar em Desktop"
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleDeviceChange('mobile')}
            className={cn(
              "flex items-center justify-center p-1.5 rounded-md transition-all duration-200",
              activeDevice === 'mobile' ? "bg-white shadow-sm text-[#0094EB]" : "text-slate-500 hover:text-slate-700"
            )}
            title="Visualizar em Mobile"
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>

      {/* ÁREA DO PREVIEW EM SI */}
      <div className="relative flex-1 flex flex-col items-center p-4 bg-slate-50/50 overflow-y-auto">
        <div className="my-auto w-full flex justify-center">
          {isMobileFrame ? (
            /* FRAME MOCKUP DE CELULAR FÍSICO */
            <div className="relative mx-auto w-[320px] h-[650px] bg-slate-800 rounded-[3rem] p-2.5 shadow-2xl flex shrink-0 ring-1 ring-slate-900/10">
              {/* Entalhe (Notch) e Câmera */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-3xl z-50 flex justify-center items-center">
                <div className="w-10 h-1.5 rounded-full bg-slate-700/50"></div>
              </div>
              
              {/* Tela do Celular */}
              <div className="flex-1 w-full h-full bg-white rounded-[2.25rem] overflow-hidden relative overflow-y-auto hide-scrollbar">
                {activeTab === 'floating' && <FloatingPreview floating={floating} colors={colors} device={activeDevice} />}
                {activeTab === 'carousel' && <CarouselPreview carousel={carousel} colors={colors} />}
                {activeTab === 'dynamic_carousel' && <DynamicCarouselPreview carousel={dynamicCarousel} colors={colors} />}
                {activeTab === 'grid' && <GridPreview grid={grid} colors={colors} />}
                {activeTab === 'modal' && <ModalPreview formData={formData} colors={colors} />}
                {activeTab === 'basic' && <VisualPreview formData={formData} colors={colors} />}
              </div>
            </div>
          ) : (
            /* FRAME DESKTOP LIVRE */
            <div className="w-full transition-all duration-500 ease-in-out">
              {activeTab === 'floating' && <FloatingPreview floating={floating} colors={colors} device={activeDevice} />}
              {activeTab === 'carousel' && <CarouselPreview carousel={carousel} colors={colors} />}
              {activeTab === 'dynamic_carousel' && <DynamicCarouselPreview carousel={dynamicCarousel} colors={colors} />}
              {activeTab === 'grid' && <GridPreview grid={grid} colors={colors} />}
              {activeTab === 'modal' && <ModalPreview formData={formData} colors={colors} />}
              {activeTab === 'basic' && <VisualPreview formData={formData} colors={colors} />}
            </div>
          )}
        </div>
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

  const [floatingDevice, setFloatingDevice] = useState<DeviceType>('desktop');
  const [carouselDevice, setCarouselDevice] = useState<DeviceType>('desktop');
  const [dynamicCarouselDevice, setDynamicCarouselDevice] = useState<DeviceType>('desktop');
  const [gridDevice, setGridDevice] = useState<DeviceType>('desktop');
  
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
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
            .select('id, is_active, status')
            .eq('store_id', finalStoreId);

          if (!storiesError && storiesData) {
            const count = storiesData.filter((item: any) => 
              !(item.is_active === false || item.active === false || item.status === 'inactive' || item.status === 'inativo')
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

  const activeFloatingConfig = useMemo(() => getActiveResponsiveConfig(formData.floating_config, floatingDevice, formData.useGlobalAppearance), [formData.floating_config, floatingDevice, formData.useGlobalAppearance]);
  const activeCarouselConfig = useMemo(() => getActiveResponsiveConfig(formData.carousel_config, carouselDevice, formData.useGlobalAppearance), [formData.carousel_config, carouselDevice, formData.useGlobalAppearance]);
  const activeDynamicCarouselConfig = useMemo(() => getActiveResponsiveConfig(formData.dynamic_carousel_config, dynamicCarouselDevice, formData.useGlobalAppearance), [formData.dynamic_carousel_config, dynamicCarouselDevice, formData.useGlobalAppearance]);
  const activeGridConfig = useMemo(() => getActiveResponsiveConfig(formData.grid_config, gridDevice, formData.useGlobalAppearance), [formData.grid_config, gridDevice, formData.useGlobalAppearance]);

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" />
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
        <button type="button" onClick={handleNewStyle} className="flex items-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer">
          <Plus size={16} className="!text-white stroke-[2.5]" /> Novo Estilo
        </button>
      </div>

      {/* Módulo de Estilos Cadastrados no Padrão Modular do Dashboard */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-[#0094EB] dark:bg-[#ff7a29] shadow-[0_0_15px_rgba(0,148,235,0.35)] dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
              <Palette size={18} className="!text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Estilos Cadastrados</h3>
              <p className="text-xs text-slate-500 dark:text-[#8a90a0] font-medium">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-[#0094EB] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-1 rounded-full border border-blue-100 dark:border-[#ff7a29]/20">
            {appearances.length} {appearances.length === 1 ? 'Tema' : 'Temas'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
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
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-600 dark:text-[#c0c5d4] bg-slate-100 dark:bg-[#0f1220] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: app.primary_color || '#0094EB' }} />
                        {app.primary_color || '#0094EB'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.is_default ? (
                        <span className="mx-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 dark:bg-[#ff7a29]/15 border border-blue-200 dark:border-[#ff7a29]/30 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB] dark:text-[#ff7a29] shadow-xs">
                          <Star size={11} className="fill-[#0094EB] text-[#0094EB] dark:fill-[#ff7a29] dark:text-[#ff7a29]" /> Padrão
                        </span>
                      ) : (
                        <button type="button" onClick={() => handleSetDefault(app.id)} className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#8a90a0] hover:text-[#0094EB] dark:hover:text-[#ff7a29] transition-colors cursor-pointer">
                          Definir Padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleEditStyle(app)} className="p-2 rounded-xl text-slate-400 hover:text-[#0094EB] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all" aria-label="Editar estilo"><Edit3 size={15} /></button>
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
          <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900">{editingStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Configure a identidade visual por área: global, flutuante, carrossel, grade e player.</p>
              </div>
              <button type="button" onClick={handleCancel} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"><X size={20} /></button>
            </div>

            {/* ABAS (Menu Básico, Flutuante, etc) - Reduzido o py */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 shrink-0">
              <div className="flex flex-wrap gap-2">
                <ModalTabButton active={activeTab === 'basic'} icon={<Settings2 size={16} />} label="Básico" onClick={() => setActiveTab('basic')} />
                <ModalTabButton active={activeTab === 'floating'} icon={<PlaySquare size={16} />} label="Flutuante" onClick={() => setActiveTab('floating')} />
                <ModalTabButton active={activeTab === 'carousel'} icon={<Rows3 size={16} />} label="Carrossel" onClick={() => setActiveTab('carousel')} />
                <ModalTabButton active={activeTab === 'dynamic_carousel'} icon={<Rows3 size={16} />} label="Carrossel Dinâmico" onClick={() => setActiveTab('dynamic_carousel')} />
                <ModalTabButton active={activeTab === 'grid'} icon={<LayoutGrid size={16} />} label="Grade" onClick={() => setActiveTab('grid')} />
                <ModalTabButton active={activeTab === 'modal'} icon={<PlaySquare size={16} />} label="Player" onClick={() => setActiveTab('modal')} />
              </div>
            </div>

            {/* CORPO DO MODAL - Reduzido paddings e gap */}
            <div className="flex-1 overflow-hidden bg-slate-50/60 p-4 xl:p-5">
              <div className="grid h-full grid-cols-1 gap-4 items-start xl:grid-cols-[380px_minmax(0,1fr)]">
                
                {/* LADO ESQUERDO: BARRA DE CONFIGURAÇÕES - Reduzido space-y-6 para space-y-4 */}
                <div className="h-full overflow-y-auto pr-3 pb-12 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                  
                  {/* ... MANTENHA AQUI TODO O CONTEÚDO DOS SEUS "if (activeTab === ...)" INTACTOS ... */}
                  
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
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/60 mb-4">
                        <span className="text-xs font-bold text-slate-700">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0094EB] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0094EB]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button type="button" onClick={() => setFloatingDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', floatingDevice === 'desktop' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setFloatingDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', floatingDevice === 'mobile' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Smartphone size={13} />Mobile</button>
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
                            <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 space-y-4">
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
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/60 mb-4">
                        <span className="text-xs font-bold text-slate-700">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0094EB] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0094EB]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button type="button" onClick={() => setCarouselDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', carouselDevice === 'desktop' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setCarouselDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', carouselDevice === 'mobile' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Smartphone size={13} />Mobile</button>
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
                            <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeCarouselConfig.show_title ?? false} onChange={e => updateCarouselConfig({ show_title: e.target.checked })} />
                              {activeCarouselConfig.show_title && (
                                <>
                                  <FormField label="Texto do título">
                                    <input type="text" value={activeCarouselConfig.title_text ?? ''} onChange={e => updateCarouselConfig({ title_text: e.target.value })} className={inputClass} />
                                  </FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <FormField label="Tamanho da fonte">
                                      <input type="number" min="8" max="48" step="1" value={activeCarouselConfig.title_font_size ?? 14} onChange={e => updateCarouselConfig({ title_font_size: safeNumber(e.target.value, 14, 8) })} className={inputClass} />
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
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5">
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
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/60 mb-4">
                        <span className="text-xs font-bold text-slate-700">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0094EB] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0094EB]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button type="button" onClick={() => setDynamicCarouselDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', dynamicCarouselDevice === 'desktop' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setDynamicCarouselDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', dynamicCarouselDevice === 'mobile' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Smartphone size={13} />Mobile</button>
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
                            <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeDynamicCarouselConfig.show_title ?? false} onChange={e => updateDynamicCarouselConfig({ show_title: e.target.checked })} />
                              {activeDynamicCarouselConfig.show_title && (
                                <>
                                  <FormField label="Texto do título"><input type="text" value={activeDynamicCarouselConfig.title_text ?? ''} onChange={e => updateDynamicCarouselConfig({ title_text: e.target.value })} className={inputClass} /></FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <FormField label="Tamanho da fonte"><input type="number" min="8" value={activeDynamicCarouselConfig.title_font_size ?? 14} onChange={e => updateDynamicCarouselConfig({ title_font_size: safeNumber(e.target.value, 14, 8) })} className={inputClass} /></FormField>
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
                              <input type="number" min="1" step="0.5" value={activeDynamicCarouselConfig.autoplay_delay ? activeDynamicCarouselConfig.autoplay_delay / 1000 : 5} onChange={e => updateDynamicCarouselConfig({ autoplay_delay: Number(e.target.value) * 1000 })} className={inputClass} />
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
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5">
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
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/60 mb-4">
                        <span className="text-xs font-bold text-slate-700">Dispositivo</span>
                        {formData.useGlobalAppearance ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0094EB] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0094EB]" /><Smartphone size={14} /></div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button type="button" onClick={() => setGridDevice('desktop')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', gridDevice === 'desktop' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Monitor size={13} />Desktop</button>
                            <Link2Off size={12} className="text-slate-300 mx-0.5" />
                            <button type="button" onClick={() => setGridDevice('mobile')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all', gridDevice === 'mobile' ? 'bg-[#0094EB] text-white' : 'text-slate-500 hover:text-slate-800')}><Smartphone size={13} />Mobile</button>
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
                          </div>
                        </AccordionSection>

                        {/* 2. BORDAS */}
                        <AccordionSection title="2. Bordas" isOpen={activeSection === 'grid-2'} onToggle={() => setActiveSection(activeSection === 'grid-2' ? null : 'grid-2')}>
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Cor da Borda"><ColorInput label="Cor" value={activeGridConfig.border_color || formData.primary_color} onChange={e => updateGridConfig({ border_color: e.target.value })} /></FormField>
                            <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeGridConfig.border_style)} onChange={e => updateGridConfig({ border_style: e.target.value })} className={inputClass} /></FormField>
                            <FormField label="Raio da Borda (px)"><input type="number" min="0" value={toNumberInputValue(activeGridConfig.border_radius)} onChange={e => updateGridConfig({ border_radius: e.target.value })} className={inputClass} /></FormField>
                          </div>
                        </AccordionSection>

                        {/* 3. ELEMENTOS VISÍVEIS */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'grid-3'} onToggle={() => setActiveSection(activeSection === 'grid-3' ? null : 'grid-3')}>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 space-y-2.5">
                              <ToggleSwitch label="Exibir título da vitrine" checked={activeGridConfig.show_title ?? false} onChange={e => updateGridConfig({ show_title: e.target.checked })} />
                              {activeGridConfig.show_title && (
                                <>
                                  <FormField label="Texto do título"><input type="text" value={(activeGridConfig as any).title_text ?? ''} onChange={e => updateGridConfig({ title_text: e.target.value } as any)} className={inputClass} /></FormField>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <FormField label="Tamanho da fonte"><input type="number" min="8" value={(activeGridConfig as any).title_font_size ?? 14} onChange={e => updateGridConfig({ title_font_size: safeNumber(e.target.value, 14, 8) } as any)} className={inputClass} /></FormField>
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
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5">
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
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/60 mb-4">
                        <span className="text-xs font-bold text-slate-700">Dispositivo</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[#0094EB] text-xs font-bold"><Monitor size={14} /><Link size={12} className="text-[#0094EB]" /><Smartphone size={14} /></div>
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

                        {/* 3. ELEMENTOS VISÍVEIS (Numeração da UI segue o seu guia "3. ELEMENTOS VISÍVEIS") */}
                        <AccordionSection title="3. Elementos Visíveis" isOpen={activeSection === 'mod-3'} onToggle={() => setActiveSection(activeSection === 'mod-3' ? null : 'mod-3')}>
                          <div className="space-y-1.5">
                            <ToggleSwitch label="Exibir título do vídeo" checked={formData.modal_config.show_title} onChange={e => updateModalConfig({ show_title: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão Play/Pause central" checked={formData.modal_config.show_play_button} onChange={e => updateModalConfig({ show_play_button: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão Like (Curtir)" checked={formData.modal_config.show_like_button} onChange={e => updateModalConfig({ show_like_button: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão de Comentários" checked={formData.modal_config.show_comment_button} onChange={e => updateModalConfig({ show_comment_button: e.target.checked })} />
                            <ToggleSwitch label="Exibir botão de Compartilhar" checked={formData.modal_config.show_share_button} onChange={e => updateModalConfig({ show_share_button: e.target.checked })} />
                          </div>
                        </AccordionSection>

                        {/* 4. CARD DE PRODUTO */}
                        <AccordionSection title="4. Card de Produto" isOpen={activeSection === 'mod-4'} onToggle={() => setActiveSection(activeSection === 'mod-4' ? null : 'mod-4')}>
                          <ToggleSwitch label="Exibir card de produto" checked={formData.modal_config.show_product} onChange={e => updateModalConfig({ show_product: e.target.checked })} />
                          {formData.modal_config.show_product && (
                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5">
                              <FormField label="Cor do fundo"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_bg || '#FFFFFF'} onChange={e => updateModalConfig({ product_card_bg: e.target.value } as any)} /></FormField>
                              <FormField label="Cor da Borda"><ColorInput label="Borda" value={(formData.modal_config as any).product_card_border_color || '#E2E8F0'} onChange={e => updateModalConfig({ product_card_border_color: e.target.value } as any)} /></FormField>
                              <FormField label="Largura Borda (px)"><input type="number" min="0" value={toNumberInputValue((formData.modal_config as any).product_card_border_width)} onChange={e => updateModalConfig({ product_card_border_width: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Raio Borda (px)"><input type="number" min="0" value={toNumberInputValue((formData.modal_config as any).product_card_border_radius)} onChange={e => updateModalConfig({ product_card_border_radius: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Tamanho Título"><input type="number" min="8" value={toNumberInputValue((formData.modal_config as any).product_card_name_size)} onChange={e => updateModalConfig({ product_card_name_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Título"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_name_color || '#0F172A'} onChange={e => updateModalConfig({ product_card_name_color: e.target.value } as any)} /></FormField>
                              <FormField label="Tamanho Preço"><input type="number" min="8" value={toNumberInputValue((formData.modal_config as any).product_card_price_size)} onChange={e => updateModalConfig({ product_card_price_size: e.target.value } as any)} className={inputClass} /></FormField>
                              <FormField label="Cor Preço"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_price_color || formData.primary_color} onChange={e => updateModalConfig({ product_card_price_color: e.target.value } as any)} /></FormField>
                              <FormField label="Cor Botão Produto"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_button_bg || formData.primary_color} onChange={e => updateModalConfig({ product_card_button_bg: e.target.value } as any)} /></FormField>
                              <FormField label="Cor Texto Botão"><ColorInput label="Cor" value={(formData.modal_config as any).product_card_button_color || '#FFFFFF'} onChange={e => updateModalConfig({ product_card_button_color: e.target.value } as any)} /></FormField>
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

            <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3 shrink-0">
              {/* Aviso alinhado à esquerda */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} className="text-[#0094EB]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use a visualização direta da loja.</span>
              </div>

              {/* Botões à direita */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleCancel} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
                  <X size={14} /> Cancelar
                </button>
                
                {storeUrl && (
                  <button type="button" onClick={() => {
                    let targetUrl = storeUrl.trim();
                    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;
                    const connector = targetUrl.includes('?') ? '&' : '?';
                    window.open(`${targetUrl}${connector}vidlytics_preview=true`, '_blank', 'noopener,noreferrer');
                  }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Ver na Loja
                  </button>
                )}
                
                <button type="button" onClick={handleSaveStyle} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-[#0094EB] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#0E4787] disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
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
