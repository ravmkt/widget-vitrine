'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
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
  Share2,
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
  | 'visual'
  | 'floating'
  | 'carousel'
  | 'grid'
  | 'modal';

type WidgetShape = 'circle' | 'square' | 'portrait' | 'rounded';

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
  show_title: boolean;
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
};

type ModalConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_product_button: boolean;
  show_product_whatsapp_button: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  hide_stories: boolean;
  shadow_enabled: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
};

type ExtendedAppearance = Appearance & {
  useGlobalAppearance: boolean;
  use_global_appearance?: boolean;

  floating_config: ResponsiveConfig<FloatingConfig>;
  carousel_config: ResponsiveConfig<CarouselConfig>;
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
  hide_stories: boolean;
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
  show_product_whatsapp_button: boolean;
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
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-[#0094EB] focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50';

const selectClass = inputClass;

const isValidHexColor = (value?: string) =>
  /^#[0-9A-Fa-f]{6}$/.test(value || '');

const isValidWidgetShape = (value?: string): value is WidgetShape =>
  value === 'circle' || value === 'square' || value === 'portrait';

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
  show_title: true,
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
  show_title: true,
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
});

const createDefaultModalConfig = (): ModalConfig => ({
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_product_button: true,
  show_product_whatsapp_button: true,
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
  hide_stories: false,
  shadow_enabled: true,
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
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

    shadow_enabled: modalConfig.shadow_enabled,
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
    show_play_button: modalConfig.show_play_button,
    show_product: modalConfig.show_product,
    show_like_button: modalConfig.show_like_button,
    show_comment_button: modalConfig.show_comment_button,
    show_share_button: modalConfig.show_share_button,
    show_product_button: modalConfig.show_product_button,
    show_product_whatsapp_button: modalConfig.show_product_whatsapp_button,

    modal_show_title: modalConfig.show_title,
    modal_show_play_button: modalConfig.show_play_button,
    modal_show_product: modalConfig.show_product,
    modal_show_like_button: modalConfig.show_like_button,
    modal_show_comment_button: modalConfig.show_comment_button,
    modal_show_share_button: modalConfig.show_share_button,
    modal_show_product_button: modalConfig.show_product_button,
    modal_show_product_whatsapp_button: modalConfig.show_product_whatsapp_button,
    modal_hide_stories: modalConfig.hide_stories,
    modal_shadow_enabled: modalConfig.shadow_enabled,
    modal_border_color: modalConfig.border_color,
    modal_border_width: modalConfig.border_width,
    modal_border_radius: modalConfig.border_radius,

    created_at: now,
    updated_at: now,

    useGlobalAppearance: false,
    use_global_appearance: false,

    floating_config: createResponsiveConfig(floatingDesktop, floatingMobile),
    carousel_config: createResponsiveConfig(carouselDesktop, carouselMobile),
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
    hide_stories: modalConfig.hide_stories,
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
    show_product_whatsapp_button:
      item.show_product_whatsapp_button ?? modalRaw?.show_product_whatsapp_button ?? defaults.show_product_whatsapp_button,
    hide_stories:
      anyItem.hide_stories ?? modalRaw?.hide_stories ?? defaults.hide_stories,
    shadow_enabled:
      item.shadow_enabled ?? modalRaw?.shadow_enabled ?? defaults.shadow_enabled,
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

    shadow_enabled: modalConfig.shadow_enabled,
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
    show_product_whatsapp_button: modalConfig.show_product_whatsapp_button,

    created_at: item.created_at || defaults.created_at,
    updated_at: item.updated_at || defaults.updated_at,

    useGlobalAppearance: globalAppearance,
    use_global_appearance: globalAppearance,

    floating_config: { ...floatingConfig, same_for_all: globalAppearance },
    carousel_config: { ...carouselConfig, same_for_all: globalAppearance },
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
    hide_stories: modalConfig.hide_stories,
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
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#0094EB] accent-[#0094EB] focus:ring-2 focus:ring-[#0094EB]"
      />
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        {description && (
          <span className="mt-1 block text-xs font-medium text-slate-500">
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
    <div className="flex items-center gap-2">
      <div
        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
        style={{ backgroundColor: safeColor }}
      >
        <input
          type="color"
          aria-label={label}
          value={safeColor}
          onChange={onChange}
          className="h-8 w-8 cursor-pointer appearance-none rounded-full border-0 bg-transparent text-transparent"
        />
      </div>
      <input type="text" value={value} onChange={onChange} className={inputClass} />
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
        'space-y-6 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div>
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
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
    <div className={cn('space-y-3', className)}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
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
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all',
        active
          ? 'bg-[#0094EB] text-white shadow-lg shadow-blue-500/20'
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
    case 'portrait':
    default:
      return 'Retrato 9:16';
  }
};

// ──────────────────── previews ────────────────────

const FloatingPreview = ({
  floating,
  colors,
}: {
  floating: FloatingConfig;
  colors: PreviewColors;
}) => {
  const isCircle = floating.shape === 'circle';
  const width = cssSize(floating.width, '80px');
  const height = cssSize(floating.height, '142px');
  const circleSize = cssSize(floating.border_radius || floating.width, '80px');
  const finalWidth = isCircle ? circleSize : width;
  const finalHeight = isCircle ? circleSize : height;
  const lateralSpacing = cssSize(floating.left_spacing, '20px');
  const positionStyle: React.CSSProperties = {};

  if (
    floating.position === 'fixed_bottom_right' ||
    floating.position === 'fixed_bottom_left'
  ) {
    positionStyle.bottom = cssSize(floating.bottom_spacing, '20px');
  }
  if (
    floating.position === 'fixed_top_right' ||
    floating.position === 'fixed_top_left'
  ) {
    positionStyle.top = cssSize(floating.top_spacing, '20px');
  }
  if (
    floating.position === 'fixed_bottom_left' ||
    floating.position === 'fixed_top_left'
  ) {
    positionStyle.left = lateralSpacing;
  }
  if (
    floating.position === 'fixed_bottom_right' ||
    floating.position === 'fixed_top_right'
  ) {
    positionStyle.right = lateralSpacing;
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="relative h-[520px] overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
        <div className="p-5">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-48 rounded-full bg-slate-100" />
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div
          className="absolute flex items-center justify-center overflow-hidden bg-white shadow-xl"
          style={{
            width: finalWidth,
            height: finalHeight,
            borderRadius: isCircle ? '999px' : cssSize(floating.border_radius, '12px'),
            border: cssBorder(floating.border_style, colors.floatingBorder),
            zIndex: safeNumber(floating.z_index, 5, 1),
            ...positionStyle,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})`,
            }}
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
          {floating.show_title && (
            <div className="absolute bottom-2 left-3 right-3 z-10">
              <p className="truncate text-[11px] font-black text-white drop-shadow">
                Story
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {isCircle ? (
          <PreviewInfo label="Raio/Tamanho" value={circleSize} />
        ) : (
          <PreviewInfo label="Tamanho" value={`${width} x ${height}`} />
        )}
        <PreviewInfo label="Forma" value={getShapeLabel(floating.shape)} />
        <PreviewInfo
          label="Raio da borda"
          value={isCircle ? 'Circular fixo' : cssSize(floating.border_radius)}
        />
        <PreviewInfo
          label="Borda"
          value={`${extractNumericCssSize(floating.border_style)} solid`}
        />
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
  const visibleItems = safeNumber(carousel.visible_items, 1, 1);
  const shape = normalizeWidgetShape(carousel.shape, 'portrait');
  const items = Array.from({ length: Math.max(1, Math.min(visibleItems, 8)) });
  const isCircle = shape === 'circle';
  const isPortrait = shape === 'portrait';
  const isSquare = shape === 'square';

  const cardWidthPx = safeNumber(parseFloat(carousel.width || '80'), 80, 20);
  const cardWidth = `${cardWidthPx}px`;

  const cardHeightPx = isPortrait
    ? Math.round((cardWidthPx * 16) / 9)
    : cardWidthPx;
  const cardHeight = `${cardHeightPx}px`;

  const borderRadius = isCircle
    ? '50%'
    : cssSize(carousel.border_radius, '12px');

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Stories</h4>
            <p className="text-xs font-medium text-slate-500">Carrossel de vídeos</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
            {visibleItems} itens
          </span>
        </div>
        <div
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3"
          style={{
            marginTop: cssSize(carousel.margin_top, '0px'),
            marginBottom: cssSize(carousel.margin_bottom, '0px'),
          }}
        >
          <div
            className={cn(
              'flex overflow-hidden',
              carousel.auto_center && 'justify-center',
            )}
            style={{ gap: `${safeNumber(carousel.spacing, 0, 0)}px` }}
          >
            {items.map((_, index) => (
              <div
                key={index}
                className="relative shrink-0 overflow-hidden border shadow-sm"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  minWidth: cardWidth,
                  flexShrink: 0,
                  borderColor: carousel.border_color || colors.primary,
                  borderWidth: `${safeNumber(carousel.border_style, 2, 0)}px`,
                  borderStyle: 'solid',
                  borderRadius,
                  background:
                    index % 2 === 0
                      ? `linear-gradient(160deg, ${colors.primary}, #dbeafe)`
                      : `linear-gradient(160deg, ${colors.secondary}, #f8fafc)`,
                }}
              >
                {carousel.show_play_icon && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                      <PlaySquare size={16} />
                    </div>
                  </div>
                )}
                {carousel.show_product && !isCircle && (
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-center text-[10px] font-black text-slate-700">
                    Produto
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <PreviewInfo label="Forma" value={getShapeLabel(shape)} />
        <PreviewInfo label="Tamanho" value={`${cardWidth} × ${cardHeight}`} />
        <PreviewInfo label="Itens" value={`${visibleItems}`} />
        <PreviewInfo label="Margem topo" value={cssSize(carousel.margin_top)} />
        <PreviewInfo label="Margem inferior" value={cssSize(carousel.margin_bottom)} />
        <PreviewInfo label="Centralizar" value={carousel.auto_center ? 'Sim' : 'Não'} />
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
  const cols = limitNumber(grid.visible_items, 10, 1, 10);
  const rows = safeNumber(grid.rows, 1, 1);
  const shape = normalizeWidgetShape(grid.shape, 'portrait');
  const totalItems = Math.max(1, Math.min(cols * rows, 20));
  const items = Array.from({ length: totalItems });
  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const isPortrait = shape === 'portrait';

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Grade</h4>
            <p className="text-xs font-medium text-slate-500">Máximo de 10 colunas</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
            {cols} x {rows}
          </span>
        </div>
        <div
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3"
          style={{ padding: `${Math.max(8, safeNumber(grid.spacing, 0, 0))}px` }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: `${safeNumber(grid.spacing, 0, 0)}px`,
            }}
          >
            {items.map((_, index) => (
              <div key={index} className="flex min-w-0 justify-center">
                <div
                  className={cn(
                    'relative overflow-hidden border shadow-sm',
                    isCircle && 'rounded-full',
                    isSquare && 'rounded-2xl',
                    isPortrait && 'rounded-2xl',
                  )}
                  style={{
                    width: isPortrait ? '72%' : '100%',
                    maxWidth: isPortrait ? '90px' : '120px',
                    aspectRatio: isPortrait ? '9 / 16' : '1 / 1',
                    borderColor: grid.border_color || colors.primary,
                    borderWidth: `${safeNumber(grid.border_style, 2, 0)}px`,
                    borderStyle: 'solid',
                    borderRadius: isCircle ? '999px' : cssSize(grid.border_radius, '12px'),
                    objectFit: (grid.object_fit || 'cover') as any,
                    background:
                      index % 2 === 0
                        ? `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})`
                        : `linear-gradient(160deg, ${colors.secondary}, ${colors.primary})`,
                  }}
                >
                  <div className="absolute inset-0 bg-white/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                      <PlaySquare size={16} />
                    </div>
                  </div>
                  {!isCircle && (
                    <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-center text-[10px] font-black text-slate-700">
                      Vídeo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <PreviewInfo label="Forma" value={getShapeLabel(shape)} />
        <PreviewInfo label="Colunas" value={`${cols}`} />
        <PreviewInfo label="Linhas" value={`${rows}`} />
        <PreviewInfo label="Espaçamento" value={`${grid.spacing}px`} />
        <PreviewInfo label="Limite" value="10 colunas" />
      </div>
    </div>
  );
};
