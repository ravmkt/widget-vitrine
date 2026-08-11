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
  product_card_bg: string;
  product_card_border_color: string;
  product_card_border_width: string;
  product_card_border_radius: string;
  product_card_name_size: string;
  product_card_name_color: string;
  product_card_price_size: string;
  product_card_price_color: string;
  product_card_price_bold: boolean;
  product_card_btn_bg: string;
  product_card_btn_color: string;
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
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  product_card_btn_bg: '#0094EB',
  product_card_btn_color: '#FFFFFF',
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
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '10',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  product_card_btn_bg: '#0094EB',
  product_card_btn_color: '#FFFFFF',
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
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
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
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
        {/* Moldura do player - reduzida e mais compacta */}
        <div
          className="relative mx-auto h-[400px] max-w-[240px] overflow-hidden rounded-[1.5rem]"
          style={{
            background: `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})`,
            color: '#FFFFFF',
            fontFamily: formData.font_family,
            borderColor: m.border_color || colors.primary,
            borderWidth: `${borderW}px`,
            borderStyle: borderW > 0 ? 'solid' : 'none',
            borderRadius: cssSize(m.border_radius, '1.5rem'),
          }}
        >
          {/* Overlay escuro */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

          {/* Título + fechar */}
          <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-2">
            {m.show_title && (
              <h4 className="line-clamp-1 text-sm font-black text-white drop-shadow">
                Blusa vermelha
              </h4>
            )}
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/60 bg-black/20 text-white backdrop-blur"
            >
              <X size={14} />
            </button>
          </div>

          {/* Navegação lateral */}
          <button
            type="button"
            className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/10 text-lg text-white backdrop-blur"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/10 text-lg text-white backdrop-blur"
          >
            ›
          </button>

          {/* Play */}
          {m.show_play_button && (
            <div className="absolute left-1/2 top-[45%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                <PlaySquare size={22} />
              </div>
            </div>
          )}

          {/* Botões laterais */}
          <div className="absolute bottom-28 right-2 z-20 flex flex-col gap-2">
            {m.show_like_button && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-black/10 text-white backdrop-blur"
              >
                <Heart size={16} />
              </button>
            )}
            {m.show_comment_button && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-black/10 text-white backdrop-blur"
              >
                <MessageCircle size={16} />
              </button>
            )}
            {m.show_share_button && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-black/10 text-white backdrop-blur"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>

          {/* Card do produto */}
          {m.show_product && (
            <div className="absolute bottom-2 left-2 right-2 z-30 rounded-xl border border-white/10 bg-white/95 p-2 text-slate-900 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2">
                <div
                  className="h-12 w-12 shrink-0 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black">Blusa vermelha</p>
                  <p className="text-xs font-black text-[#0094EB]">R$ 259,90</p>
                  <div className="mt-1.5 flex flex-nowrap items-center gap-1.5">
                    {m.show_product_button && (
                      <button
                        type="button"
                        className="flex-1 shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-[10px] font-black text-white"
                        style={{ backgroundColor: colors.button }}
                      >
                        Ver produto
                      </button>
                    )}
<button
  type="button"
  className="flex-1 shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-[10px] font-black text-white"
  style={{ backgroundColor: '#25D366' }}
>
  Comprar pelo WhatsApp
</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <PreviewInfo label="Borda" value={`${borderW}px`} />
        <PreviewInfo label="Raio" value={cssSize(m.border_radius)} />
        <PreviewInfo label="Cor borda" value={m.border_color} />
        <PreviewInfo
          label="Elementos"
          value={[
            m.show_title && 'Título',
            m.show_play_button && 'Play',
            m.show_like_button && 'Like',
            m.show_comment_button && 'Coment.',
            m.show_share_button && 'Compart.',
            m.show_product && 'Produto',
          ]
            .filter(Boolean)
            .join(', ') || 'Nenhum'}
        />
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
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div
        className="rounded-[1rem] border border-slate-200 p-5"
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: formData.font_family,
          fontSize: cssSize(formData.font_size, '14px'),
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl"
            style={{ backgroundColor: colors.primary }}
          />
          <div>
            <h4 className="font-black">Preview visual</h4>
            <p className="text-xs font-medium opacity-70">Fonte, cores e botões</p>
          </div>
        </div>
        <div
          className="mb-5 rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}25, ${colors.secondary}25)`,
          }}
        >
          <p className="font-black">Título do widget</p>
          <p className="mt-1 text-sm opacity-70">
            Exemplo de texto usando a identidade visual configurada.
          </p>
        </div>
        <button
          type="button"
          className="w-full rounded-2xl px-4 py-3 text-sm font-black text-white"
          style={{ backgroundColor: colors.button }}
        >
          Botão principal
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <PreviewInfo label="Principal" value={colors.primary} />
        <PreviewInfo label="Secundária" value={colors.secondary} />
        <PreviewInfo label="Texto" value={colors.text} />
        <PreviewInfo label="Fonte" value={formData.font_family} />
      </div>
    </div>
  );
};

const PreviewCard = ({
  formData,
  floatingDevice,
  carouselDevice,
  gridDevice,
  activeTab,
}: {
  formData: ExtendedAppearance;
  floatingDevice: DeviceType;
  carouselDevice: DeviceType;
  gridDevice: DeviceType;
  activeTab: ModalTab;
}) => {
  const floating = getActiveResponsiveConfig(
    formData.floating_config,
    floatingDevice,
    formData.useGlobalAppearance,
  );
  const carousel = getActiveResponsiveConfig(
    formData.carousel_config,
    carouselDevice,
    formData.useGlobalAppearance,
  );
  const grid = getActiveResponsiveConfig(
    formData.grid_config,
    gridDevice,
    formData.useGlobalAppearance,
  );

  const colors: PreviewColors = {
    primary: isValidHexColor(formData.primary_color) ? formData.primary_color : '#0094EB',
    secondary: isValidHexColor(formData.secondary_color) ? formData.secondary_color : '#0094EB',
    text: isValidHexColor(formData.text_color) ? formData.text_color : '#0F172A',
    background: isValidHexColor(formData.background_color) ? formData.background_color : '#FFFFFF',
    button: isValidHexColor(formData.button_color) ? formData.button_color : '#0094EB',
    floatingBorder: isValidHexColor(floating.border_color) ? floating.border_color : '#0094EB',
  };

  const titleByTab: Record<ModalTab, string> = {
    basic: 'Resumo do estilo',
    visual: 'Identidade visual',
    floating: 'Preview do flutuante',
    carousel: 'Preview do carrossel',
    grid: 'Preview da grade',
    modal: 'Preview do player/modal',
  };

  const descriptionByTab: Record<ModalTab, string> = {
    basic: 'Visualização geral do estilo selecionado.',
    visual: 'Cores, fonte, fundo e botão.',
    floating: 'Tamanho, forma, borda e posição do widget.',
    carousel: 'Formato dos cards, espaçamento, margens e centralização.',
    grid: 'Colunas, linhas, formato e espaçamento da grade.',
    modal: 'Botões e elementos exibidos no player/modal.',
  };

  return (
    <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">
            {titleByTab[activeTab]}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {descriptionByTab[activeTab]}
          </p>
        </div>
        <span
          className="h-8 w-8 rounded-full border border-slate-200 shadow-sm"
          style={{ backgroundColor: colors.primary }}
        />
      </div>
      {activeTab === 'floating' && <FloatingPreview floating={floating} colors={colors} />}
      {activeTab === 'carousel' && <CarouselPreview carousel={carousel} colors={colors} />}
      {activeTab === 'grid' && <GridPreview grid={grid} colors={colors} />}
      {activeTab === 'modal' && <ModalPreview formData={formData} colors={colors} />}
      {(activeTab === 'basic' || activeTab === 'visual') && (
        <VisualPreview formData={formData} colors={colors} />
      )}
    </aside>
  );
};
// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

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

  const [resolvedStoreId, setResolvedStoreId] = useState<string>('');
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Appearance | null>(null);
  const [formData, setFormData] = useState<ExtendedAppearance>(() =>
    createDefaultFormData(storeId),
  );

  const [floatingDevice, setFloatingDevice] = useState<DeviceType>('desktop');
  const [carouselDevice, setCarouselDevice] = useState<DeviceType>('desktop');
  const [gridDevice, setGridDevice] = useState<DeviceType>('desktop');
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: '',
    name: '',
  });

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
      if (patch.floating_position) {
        updatedDeviceConfig = {
          ...updatedDeviceConfig,
          floating_position: normalizeFloatingPosition(patch.floating_position),
          position: floatingPositionToPosition(patch.floating_position),
        };
      }
      updatedDeviceConfig = normalizeFloatingShapeValues(updatedDeviceConfig);

      const nextConfig: ResponsiveConfig<FloatingConfig> = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.floating_config, same_for_all: false, [device]: updatedDeviceConfig };

      const desktop = nextConfig.desktop;
      return {
        ...prev,
        floating_config: nextConfig,
        width: desktop.width,
        height: desktop.height,
        widget_shape: desktop.shape as any,
        position: desktop.position,
        floating_position: desktop.floating_position,
        bottom_spacing: desktop.bottom_spacing,
        top_spacing: desktop.top_spacing,
        left_spacing: desktop.left_spacing,
        right_spacing: desktop.right_spacing,
        color: desktop.border_color,
        border_style: desktop.border_style,
        show_play_icon: desktop.show_play_icon,
        draggable: desktop.draggable,
        allow_close: desktop.allow_close,
        object_fit: desktop.object_fit,
        z_index: desktop.z_index,
      };
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
        visible_items: safeNumber(
          patch.visible_items ?? current.visible_items,
          current.visible_items || 1,
          1,
        ),
        auto_center: patch.auto_center ?? current.auto_center ?? true,
      };

      if (patch.shape !== undefined) {
        const newShape = normalizeWidgetShape(patch.shape, 'portrait');
        const width = formatNumberLikeCurrent(
          patch.width ?? current.width ?? '80',
          '80',
        );
        updatedDeviceConfig = {
          ...updatedDeviceConfig,
          shape: newShape,
          width,
        };
      }

      updatedDeviceConfig = normalizeCarouselConfigShape(updatedDeviceConfig);

      const nextConfig: ResponsiveConfig<CarouselConfig> = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.carousel_config, same_for_all: false, [device]: updatedDeviceConfig };

      const desktop = nextConfig.desktop;
      return {
        ...prev,
        carousel_config: nextConfig,
        carousel_spacing: desktop.spacing,
        carousel_shape: desktop.shape,
        carousel_size: desktop.width,
        carousel_border_color: desktop.border_color,
        carousel_border_width: desktop.border_style,
        carousel_border_radius: desktop.border_radius,
        carousel_object_fit: desktop.object_fit,
        carousel_view_mode: desktop.view_mode,
        carousel_margin_top: desktop.margin_top,
        carousel_margin_bottom: desktop.margin_bottom,
        carousel_visible_items: desktop.visible_items,
        carousel_show_product: desktop.show_product,
        carousel_show_play_button: desktop.show_play_icon,
        carousel_show_title: desktop.show_title,
        carousel_auto_center: desktop.auto_center,
      };
    });
  };

  const updateGridConfig = (patch: Partial<GridConfig>) => {
    setFormData(prev => {
      const device = prev.useGlobalAppearance ? 'desktop' : gridDevice;
      const current = prev.grid_config[device];

      const updatedDeviceConfig: GridConfig = normalizeGridConfigShape({
        ...current,
        ...patch,
        visible_items: limitNumber(
          patch.visible_items ?? current.visible_items,
          current.visible_items || 1,
          1,
          10,
        ),
        rows: safeNumber(patch.rows ?? current.rows, current.rows || 1, 1),
        spacing: safeNumber(patch.spacing ?? current.spacing, current.spacing || 0, 0),
      });

      const nextConfig: ResponsiveConfig<GridConfig> = prev.useGlobalAppearance
        ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
        : { ...prev.grid_config, same_for_all: false, [device]: updatedDeviceConfig };

      return {
        ...prev,
        grid_config: nextConfig,
        desktop_columns: nextConfig.desktop.visible_items,
        desktop_rows: nextConfig.desktop.rows,
        desktop_gap: nextConfig.desktop.spacing,
        mobile_columns: nextConfig.mobile.visible_items,
        mobile_rows: nextConfig.mobile.rows,
        mobile_gap: nextConfig.mobile.spacing,
      };
    });
  };

  const updateModalConfig = (patch: Partial<ModalConfig>) => {
    setFormData(prev => {
      const modalConfig: ModalConfig = { ...prev.modal_config, ...patch };
      return {
        ...prev,
        modal_config: modalConfig,
        show_title: modalConfig.show_title,
        show_play_button: modalConfig.show_play_button,
        show_product: modalConfig.show_product,
        show_like_button: modalConfig.show_like_button,
        show_comment_button: modalConfig.show_comment_button,
        show_share_button: modalConfig.show_share_button,
        show_product_button: modalConfig.show_product_button,
      } as ExtendedAppearance;
    });
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
          db.appearances.save({
            ...style,
            store_id: finalStoreId,
            is_default: style.id === id,
            updated_at: now,
          } as Appearance),
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
          await db.appearances.save({
            ...nextDefault,
            store_id: finalStoreId,
            is_default: true,
            updated_at: now,
          } as Appearance);
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
    setGridDevice('desktop');
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleEditStyle = (style: Appearance) => {
    setEditingStyle(style);
    setFormData(normalizeAppearance(style, resolvedStoreId || storeId));
    setFloatingDevice('desktop');
    setCarouselDevice('desktop');
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

      const floatingConfig: ResponsiveConfig<FloatingConfig> = {
        ...formData.floating_config,
        desktop: normalizeFloatingShapeValues(formData.floating_config.desktop),
        mobile: normalizeFloatingShapeValues(formData.floating_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      const carouselConfig: ResponsiveConfig<CarouselConfig> = {
        ...formData.carousel_config,
        desktop: normalizeCarouselConfigShape(formData.carousel_config.desktop),
        mobile: normalizeCarouselConfigShape(formData.carousel_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      const gridConfig: ResponsiveConfig<GridConfig> = {
        ...formData.grid_config,
        desktop: normalizeGridConfigShape(formData.grid_config.desktop),
        mobile: normalizeGridConfigShape(formData.grid_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      gridConfig.desktop = { ...gridConfig.desktop, visible_items: limitNumber(gridConfig.desktop.visible_items, 10, 1, 10) };
      gridConfig.mobile = { ...gridConfig.mobile, visible_items: limitNumber(gridConfig.mobile.visible_items, 2, 1, 10) };

      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
        carouselConfig.mobile = carouselConfig.desktop;
        gridConfig.mobile = gridConfig.desktop;
      }

      floatingConfig.desktop = normalizeFloatingConfigForSave(floatingConfig.desktop);
      floatingConfig.mobile = normalizeFloatingConfigForSave(floatingConfig.mobile);
      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
      }

      const floatingDesktop = floatingConfig.desktop;
      const modalConfig = formData.modal_config;
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
  font_size: String(formData.font_size || '14'),

  floating_config: floatingConfig,
  carousel_config: carouselConfig,
  grid_config: gridConfig,
  modal_config: modalConfig,

  use_global_appearance: formData.useGlobalAppearance,
  url: formData.url || null,

  created_at: formData.created_at || editingStyle?.created_at || now,
  updated_at: now,
};

      if (stylePayload.is_default) {
        await Promise.all(
          appearances
            .filter(style => style.id !== id)
            .map(style =>
              db.appearances.save({
                ...style,
                store_id: finalStoreId,
                is_default: false,
                updated_at: now,
              } as Appearance),
            ),
        );
      }

      await db.appearances.save(stylePayload as unknown as Appearance);

      if (supabase) {
        const { error: storeSettingsError } = await supabase
          .from('store_settings')
          .upsert(
            {
              store_id: finalStoreId,
              default_appearance_id: shouldBeDefault ? id : null,
              updated_at: now,
            },
            { onConflict: 'store_id' },
          );
        if (storeSettingsError) {
          console.error('Erro ao sincronizar store_settings:', storeSettingsError);
        }
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

  const activeFloatingConfig = useMemo(
    () =>
      getActiveResponsiveConfig(formData.floating_config, floatingDevice, formData.useGlobalAppearance),
    [formData.floating_config, floatingDevice, formData.useGlobalAppearance],
  );

  const activeCarouselConfig = useMemo(
    () =>
      getActiveResponsiveConfig(formData.carousel_config, carouselDevice, formData.useGlobalAppearance),
    [formData.carousel_config, carouselDevice, formData.useGlobalAppearance],
  );

  const activeGridConfig = useMemo(
    () =>
      getActiveResponsiveConfig(formData.grid_config, gridDevice, formData.useGlobalAppearance),
    [formData.grid_config, gridDevice, formData.useGlobalAppearance],
  );

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Aparência</h1>
          <p className="mt-1 font-medium text-slate-500">
            Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewStyle}
          className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0E4787]"
        >
          <Plus size={18} />
          Novo Estilo
        </button>
      </div>

      {/* Tabela de estilos */}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <Brush className="h-5 w-5 text-[#0094EB]" />
          <h3 className="font-extrabold text-slate-800">Estilos Cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Template
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Cor Principal
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appearances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                    Nenhum estilo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                appearances.map(app => (
                  <tr key={app.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg border border-slate-200 shadow-sm"
                          style={{ backgroundColor: app.primary_color || '#0094EB' }}
                        />
                        <span className="text-sm font-bold text-slate-800">{app.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                      {app.primary_color}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.is_default ? (
                        <span className="mx-auto flex w-fit items-center justify-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB]">
                          <Star size={12} className="fill-[#0094EB]" />
                          Padrão
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(app.id)}
                          className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0094EB]"
                        >
                          Definir Padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditStyle(app)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#0094EB]"
                          aria-label="Editar estilo"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(app)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Excluir estilo"
                        >
                          <Trash2 size={18} />
                        </button>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            {/* Header do modal */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Configure a identidade visual por área: global, flutuante, carrossel, grade e player.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <ModalTabButton active={activeTab === 'basic'} icon={<Settings2 size={16} />} label="Básico" onClick={() => setActiveTab('basic')} />
                <ModalTabButton active={activeTab === 'visual'} icon={<Palette size={16} />} label="Identidade Visual" onClick={() => setActiveTab('visual')} />
                <ModalTabButton active={activeTab === 'floating'} icon={<PlaySquare size={16} />} label="Flutuante" onClick={() => setActiveTab('floating')} />
                <ModalTabButton active={activeTab === 'carousel'} icon={<Rows3 size={16} />} label="Carrossel" onClick={() => setActiveTab('carousel')} />
                <ModalTabButton active={activeTab === 'grid'} icon={<LayoutGrid size={16} />} label="Grade" onClick={() => setActiveTab('grid')} />
                <ModalTabButton active={activeTab === 'modal'} icon={<PlaySquare size={16} />} label="Player / Modal" onClick={() => setActiveTab('modal')} />
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  {/* ── Básico ── */}
                  {activeTab === 'basic' && (
                    <SectionCard title="Dados Básicos" description="Defina o nome do estilo e o comportamento global entre Desktop e Mobile.">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Nome do Estilo">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Estilo padrão"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Definir como padrão">
                          <ToggleSwitch
                            label="Definir como padrão da loja"
                            checked={formData.is_default}
                            onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                          />
                        </FormField>
                      </div>
                      <FormField label="Usar aparência em todos os dispositivos">
                        <ToggleSwitch
                          label="Usar aparência em todos os dispositivos"
                          checked={formData.useGlobalAppearance}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFormData(prev => syncGlobalConfig(checked, prev));
                            if (checked) {
                              setFloatingDevice('desktop');
                              setCarouselDevice('desktop');
                              setGridDevice('desktop');
                            }
                          }}
                          description="Quando ativado, as configurações de Desktop serão aplicadas também no Mobile."
                        />
                      </FormField>
                    </SectionCard>
                  )}

                  {/* ── Identidade Visual ── */}
                  {activeTab === 'visual' && (
                    <SectionCard title="Identidade Visual" description="Configure as cores, fonte e elementos globais da experiência visual.">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Cor principal">
                          <ColorInput
                            label="Cor principal"
                            value={formData.primary_color}
                            onChange={e => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Cor secundária">
                          <ColorInput
                            label="Cor secundária"
                            value={formData.secondary_color}
                            onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Cor do texto">
                          <ColorInput
                            label="Cor do texto"
                            value={formData.text_color}
                            onChange={e => setFormData({ ...formData, text_color: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Cor do fundo">
                          <ColorInput
                            label="Cor do fundo"
                            value={formData.background_color}
                            onChange={e => setFormData({ ...formData, background_color: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Cor do botão">
                          <ColorInput
                            label="Cor do botão"
                            value={formData.button_color}
                            onChange={e => setFormData({ ...formData, button_color: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Fonte de texto">
                          <select
                            value={formData.font_family}
                            onChange={e => setFormData({ ...formData, font_family: e.target.value })}
                            className={selectClass}
                          >
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Roboto, sans-serif">Roboto</option>
                            <option value="Open Sans, sans-serif">Open Sans</option>
                            <option value="Lato, sans-serif">Lato</option>
                            <option value="Montserrat, sans-serif">Montserrat</option>
                            <option value="Poppins, sans-serif">Poppins</option>
                          </select>
                        </FormField>
                        <FormField label="Tamanho do texto">
                          <input
                            type="number"
                            min="8"
                            step="1"
                            value={toNumberInputValue(formData.font_size)}
                            onChange={e => setFormData({ ...formData, font_size: e.target.value })}
                            placeholder="Ex: 14"
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── Flutuante ── */}
                  {activeTab === 'floating' && (
                    <SectionCard title="Widget Flutuante" description="Controle tamanho, posição, borda, play, fechamento e comportamento do widget flutuante.">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">Configuração ativa</h4>
                        {formData.useGlobalAppearance ? <GlobalDeviceNotice /> : <DeviceTabs activeDevice={floatingDevice} onChange={setFloatingDevice} />}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeFloatingConfig.shape}
                            onChange={e => {
                              const shape = e.target.value as WidgetShape;
                              if (shape === 'portrait') {
                                const size = formatNumberLikeCurrent(activeFloatingConfig.width, '80');
                                updateFloatingConfig({ shape, width: size, height: getPortraitHeightFromWidth(size) });
                                return;
                              }
                              if (shape === 'square') {
                                const size = formatNumberLikeCurrent(activeFloatingConfig.width, '80');
                                updateFloatingConfig({ shape, width: size, height: size });
                                return;
                              }
                              const size = toNumberInputValue(activeFloatingConfig.border_radius) || toNumberInputValue(activeFloatingConfig.width) || '80';
                              updateFloatingConfig({ shape, border_radius: size });
                            }}
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato</option>
                          </select>
                        </FormField>
                        <FormField label="Tamanho">
                          <input
                            type="number" min="20" step="1"
                            value={toNumberInputValue(activeFloatingConfig.width)}
                            onChange={e => {
                              const value = e.target.value;
                              if (activeFloatingConfig.shape === 'portrait') {
                                updateFloatingConfig({ width: value, height: getPortraitHeightFromWidth(value) });
                                return;
                              }
                              if (activeFloatingConfig.shape === 'square') {
                                updateFloatingConfig({ width: value, height: value });
                                return;
                              }
                              updateFloatingConfig({ border_radius: value, width: value, height: value });
                            }}
                            placeholder="Ex: 80"
                            className={inputClass}
                          />
                          <p className="text-xs font-semibold text-slate-400">
                            {activeFloatingConfig.shape === 'circle'
                              ? 'Controla o diâmetro do círculo.'
                              : activeFloatingConfig.shape === 'portrait'
                                ? 'A altura é ajustada automaticamente na proporção 9:16.'
                                : 'Largura e altura são mantidas iguais (quadrado).'}
                          </p>
                        </FormField>
                        <FormField label="Raio da borda">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.border_radius)} onChange={e => updateFloatingConfig({ border_radius: e.target.value })} placeholder="Ex: 12" className={inputClass} />
                        </FormField>
                        <FormField label="Posição do widget">
                          <select value={activeFloatingConfig.position} onChange={e => updateFloatingConfig({ position: e.target.value as PositionValue })} className={selectClass}>
                            <option value="fixed_bottom_right">Inferior direita</option>
                            <option value="fixed_bottom_left">Inferior esquerda</option>
                            <option value="fixed_top_right">Superior direita</option>
                            <option value="fixed_top_left">Superior esquerda</option>
                          </select>
                        </FormField>
                        <FormField label="Margem inferior">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.bottom_spacing)} onChange={e => updateFloatingConfig({ bottom_spacing: e.target.value })} placeholder="Ex: 20" className={inputClass} />
                        </FormField>
                        <FormField label="Margem superior">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.top_spacing)} onChange={e => updateFloatingConfig({ top_spacing: e.target.value })} placeholder="Ex: 20" className={inputClass} />
                        </FormField>
                        <FormField label="Margem lateral">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.left_spacing)} onChange={e => updateFloatingConfig({ left_spacing: e.target.value, right_spacing: e.target.value })} placeholder="Ex: 20" className={inputClass} />
                        </FormField>
                        <FormField label="Cor da borda">
                          <ColorInput label="Cor da borda" value={activeFloatingConfig.border_color} onChange={e => updateFloatingConfig({ border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeFloatingConfig.border_style)} onChange={e => updateFloatingConfig({ border_style: e.target.value })} placeholder="Ex: 2" className={inputClass} />
                          <p className="text-xs font-semibold text-slate-400">O estilo da borda será sempre sólido.</p>
                        </FormField>
                        <FormField label="Object fit">
                          <select value={activeFloatingConfig.object_fit} onChange={e => updateFloatingConfig({ object_fit: e.target.value })} className={selectClass}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </select>
                        </FormField>
                        <FormField label="Z-index">
                          <input type="number" min="1" step="1" value={toNumberInputValue(activeFloatingConfig.z_index)} onChange={e => updateFloatingConfig({ z_index: e.target.value })} placeholder="Ex: 2147483647" className={inputClass} />
                        </FormField>
                        <FormField label="Mostrar título">
                          <ToggleSwitch label="Mostrar título no flutuante" checked={activeFloatingConfig.show_title ?? true} onChange={e => updateFloatingConfig({ show_title: e.target.checked })} />
                        </FormField>
                        <FormField label="Mostrar botão play">
                          <ToggleSwitch label="Mostrar botão play no flutuante" checked={activeFloatingConfig.show_play_icon} onChange={e => updateFloatingConfig({ show_play_icon: e.target.checked })} />
                        </FormField>
                        <FormField label="Permitir arrastar">
                          <ToggleSwitch label="Permitir arrastar widget" checked={activeFloatingConfig.draggable} onChange={e => updateFloatingConfig({ draggable: e.target.checked })} />
                        </FormField>
                        <FormField label="Permitir fechar">
                          <ToggleSwitch label="Permitir fechar widget" checked={activeFloatingConfig.allow_close} onChange={e => updateFloatingConfig({ allow_close: e.target.checked })} />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── Carrossel ── */}
                  {activeTab === 'carousel' && (
                    <SectionCard title="Carrossel" description="Configure a exibição dos vídeos em carrossel, quantidade de itens, formato e margens.">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">Configuração ativa</h4>
                        {formData.useGlobalAppearance ? <GlobalDeviceNotice /> : <DeviceTabs activeDevice={carouselDevice} onChange={setCarouselDevice} />}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeCarouselConfig.shape}
                            onChange={e => updateCarouselConfig({ shape: e.target.value as WidgetShape })}
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato 9:16</option>
                          </select>
                          {activeCarouselConfig.shape === 'portrait' && (
                            <p className="text-xs font-semibold text-slate-400">No formato retrato, os cards ficam fixos na proporção 9:16.</p>
                          )}
                        </FormField>
                        <FormField label="Tamanho">
                          <input
                            type="number" min="20" step="1"
                            value={toNumberInputValue(activeCarouselConfig.width)}
                            onChange={e => updateCarouselConfig({ width: e.target.value })}
                            placeholder="Ex: 80"
                            className={inputClass}
                          />
                          <p className="text-xs font-semibold text-slate-400">Tamanho base dos cards no carrossel.</p>
                        </FormField>
                        <FormField label="Itens visíveis">
                          <input
                            type="number" min="1" step="1"
                            value={activeCarouselConfig.visible_items}
                            onChange={e => updateCarouselConfig({ visible_items: safeNumber(e.target.value, 1, 1) })}
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Espaçamento">
                          <input
                            type="number" min="0" step="1"
                            value={activeCarouselConfig.spacing}
                            onChange={e => updateCarouselConfig({ spacing: safeNumber(e.target.value, 0, 0) })}
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Cor da borda">
                          <ColorInput label="Cor da borda" value={activeCarouselConfig.border_color || formData.primary_color} onChange={e => updateCarouselConfig({ border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda">
                          <input
                            type="number" min="0" step="1"
                            value={toNumberInputValue(activeCarouselConfig.border_style)}
                            onChange={e => updateCarouselConfig({ border_style: e.target.value })}
                            placeholder="Ex: 2"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Raio da borda">
                          <input
                            type="number" min="0" step="1"
                            value={toNumberInputValue(activeCarouselConfig.border_radius)}
                            onChange={e => updateCarouselConfig({ border_radius: e.target.value })}
                            placeholder="Ex: 12"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Object fit">
                          <select value={activeCarouselConfig.object_fit || 'cover'} onChange={e => updateCarouselConfig({ object_fit: e.target.value })} className={selectClass}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </select>
                        </FormField>
                        <FormField label="Margem superior">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.margin_top)} onChange={e => updateCarouselConfig({ margin_top: e.target.value })} placeholder="Ex: 0" className={inputClass} />
                        </FormField>
                        <FormField label="Margem inferior">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.margin_bottom)} onChange={e => updateCarouselConfig({ margin_bottom: e.target.value })} placeholder="Ex: 0" className={inputClass} />
                        </FormField>
                        <FormField label="Mostrar título">
                          <ToggleSwitch label="Mostrar título no carrossel" checked={activeCarouselConfig.show_title ?? false} onChange={e => updateCarouselConfig({ show_title: e.target.checked })} />
                        </FormField>
<FormField label="Mostrar produto">
                          <ToggleSwitch label="Mostrar produto no carrossel" checked={activeCarouselConfig.show_product} onChange={e => updateCarouselConfig({ show_product: e.target.checked })} />
                        </FormField>
                        {/* Customização Completa do Card de Produto do Carrossel */}
                        <FormField label="Fundo do card de produto">
                          <ColorInput label="Fundo do card" value={activeCarouselConfig.product_card_bg || '#FFFFFF'} onChange={e => updateCarouselConfig({ product_card_bg: e.target.value })} />
                        </FormField>
                        <FormField label="Cor da borda do produto">
                          <ColorInput label="Cor da borda" value={activeCarouselConfig.product_card_border_color || '#E2E8F0'} onChange={e => updateCarouselConfig({ product_card_border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda (px)">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.product_card_border_width)} onChange={e => updateCarouselConfig({ product_card_border_width: e.target.value })} placeholder="Ex: 1" className={inputClass} />
                        </FormField>
                        <FormField label="Raio da borda (px)">
                          <input type="number" min="0" step="1" value={toNumberInputValue(activeCarouselConfig.product_card_border_radius)} onChange={e => updateCarouselConfig({ product_card_border_radius: e.target.value })} placeholder="Ex: 12" className={inputClass} />
                        </FormField>
                        <FormField label="Tamanho da fonte do nome">
                          <input type="number" min="8" step="1" value={toNumberInputValue(activeCarouselConfig.product_card_name_size)} onChange={e => updateCarouselConfig({ product_card_name_size: e.target.value })} placeholder="Ex: 11" className={inputClass} />
                        </FormField>
                        <FormField label="Cor da fonte do nome">
                          <ColorInput label="Cor do nome" value={activeCarouselConfig.product_card_name_color || '#0F172A'} onChange={e => updateCarouselConfig({ product_card_name_color: e.target.value })} />
                        </FormField>
                        <FormField label="Tamanho da fonte do preço">
                          <input type="number" min="8" step="1" value={toNumberInputValue(activeCarouselConfig.product_card_price_size)} onChange={e => updateCarouselConfig({ product_card_price_size: e.target.value })} placeholder="Ex: 12" className={inputClass} />
                        </FormField>
                        <FormField label="Cor da fonte do preço">
                          <ColorInput label="Cor do preço" value={activeCarouselConfig.product_card_price_color || '#0094EB'} onChange={e => updateCarouselConfig({ product_card_price_color: e.target.value })} />
                        </FormField>
                        <FormField label="Preço em Destaque (Negrito)">
                          <ToggleSwitch label="Deixar preço em negrito" checked={activeCarouselConfig.product_card_price_bold ?? true} onChange={e => updateCarouselConfig({ product_card_price_bold: e.target.checked })} />
                        </FormField>
                        <FormField label="Cor do botão">
                          <ColorInput label="Cor do botão" value={activeCarouselConfig.product_card_btn_bg || formData.primary_color} onChange={e => updateCarouselConfig({ product_card_btn_bg: e.target.value })} />
                        </FormField>
                        <FormField label="Cor da fonte do botão">
                          <ColorInput label="Cor do texto do botão" value={activeCarouselConfig.product_card_btn_color || '#FFFFFF'} onChange={e => updateCarouselConfig({ product_card_btn_color: e.target.value })} />
                        </FormField>
                        <FormField label="Fundo do card de produto">
                          <ColorInput label="Fundo do card" value={activeCarouselConfig.product_card_bg || '#FFFFFF'} onChange={e => updateCarouselConfig({ product_card_bg: e.target.value })} />
                        </FormField>
                        <FormField label="Cor da borda do produto">
                          <ColorInput label="Cor da borda" value={activeCarouselConfig.product_card_border_color || '#E2E8F0'} onChange={e => updateCarouselConfig({ product_card_border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda do produto">
                          <input 
                            type="number" 
                            min="0" 
                            step="1" 
                            value={toNumberInputValue(activeCarouselConfig.product_card_border_width)} 
                            onChange={e => updateCarouselConfig({ product_card_border_width: e.target.value })} 
                            placeholder="Ex: 1" 
                            className={inputClass} 
                          />
                        </FormField>
                        <FormField label="Raio da borda do produto">
                          <input 
                            type="number" 
                            min="0" 
                            step="1" 
                            value={toNumberInputValue(activeCarouselConfig.product_card_border_radius)} 
                            onChange={e => updateCarouselConfig({ product_card_border_radius: e.target.value })} 
                            placeholder="Ex: 12" 
                            className={inputClass} 
                          />
                        </FormField>
                        <FormField label="Mostrar botão play">
                          <ToggleSwitch label="Mostrar botão play no carrossel" checked={activeCarouselConfig.show_play_icon} onChange={e => updateCarouselConfig({ show_play_icon: e.target.checked })} />
                        </FormField>
                                              </div>
                    </SectionCard>
                  )}

                  {/* ── Grade ── */}
                  {activeTab === 'grid' && (
                    <SectionCard title="Grade" description="Configure a exibição dos vídeos em grade, colunas, formato e espaçamento.">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">Configuração ativa</h4>
                        {formData.useGlobalAppearance ? <GlobalDeviceNotice /> : <DeviceTabs activeDevice={gridDevice} onChange={setGridDevice} />}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeGridConfig.shape}
                            onChange={e => updateGridConfig({ shape: e.target.value as WidgetShape })}
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato 9:16</option>
                          </select>
                          {activeGridConfig.shape === 'portrait' && (
                            <p className="text-xs font-semibold text-slate-400">No formato retrato, os cards ficam fixos na proporção 9:16.</p>
                          )}
                        </FormField>
                        <FormField label="Tamanho">
                          <input
                            type="number" min="20" step="1"
                            value={toNumberInputValue(activeGridConfig.width)}
                            onChange={e => updateGridConfig({ width: e.target.value })}
                            placeholder="Ex: 80"
                            className={inputClass}
                          />
                          <p className="text-xs font-semibold text-slate-400">Tamanho base dos cards na grade.</p>
                        </FormField>
                        <FormField label="Colunas">
                          <input
                            type="number" min="1" max="10" step="1"
                            value={activeGridConfig.visible_items}
                            onChange={e => updateGridConfig({ visible_items: limitNumber(e.target.value, 1, 1, 10) })}
                            className={inputClass}
                          />
                          <p className="text-xs font-semibold text-slate-400">Máximo de 10 colunas por linha.</p>
                        </FormField>
                        <FormField label="Espaçamento">
                          <input
                            type="number" min="0" step="1"
                            value={activeGridConfig.spacing}
                            onChange={e => updateGridConfig({ spacing: safeNumber(e.target.value, 0, 0) })}
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Cor da borda">
                          <ColorInput label="Cor da borda" value={activeGridConfig.border_color || formData.primary_color} onChange={e => updateGridConfig({ border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda">
                          <input
                            type="number" min="0" step="1"
                            value={toNumberInputValue(activeGridConfig.border_style)}
                            onChange={e => updateGridConfig({ border_style: e.target.value })}
                            placeholder="Ex: 2"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Raio da borda">
                          <input
                            type="number" min="0" step="1"
                            value={toNumberInputValue(activeGridConfig.border_radius)}
                            onChange={e => updateGridConfig({ border_radius: e.target.value })}
                            placeholder="Ex: 12"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="Object fit">
                          <select value={activeGridConfig.object_fit || 'cover'} onChange={e => updateGridConfig({ object_fit: e.target.value })} className={selectClass}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </select>
                        </FormField>
                        <FormField label="Mostrar título">
                          <ToggleSwitch label="Mostrar título na grade" checked={activeGridConfig.show_title ?? false} onChange={e => updateGridConfig({ show_title: e.target.checked })} />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── Modal ── */}
                  {activeTab === 'modal' && (
                    <SectionCard title="Player / Modal" description="Controle quais elementos são exibidos dentro do player de vídeo.">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Mostrar título">
                      <ToggleSwitch label="Mostrar título" checked={formData.modal_config.show_title} onChange={e => updateModalConfig({ show_title: e.target.checked })} />
                    </FormField>

                    <FormField label="Mostrar botão play">
                      <ToggleSwitch label="Mostrar botão play/pause no player" checked={formData.modal_config.show_play_button} onChange={e => updateModalConfig({ show_play_button: e.target.checked })} />
                    </FormField>

                    <FormField label="Mostrar produto">
                      <ToggleSwitch label="Mostrar card de produto no player" checked={formData.modal_config.show_product} onChange={e => updateModalConfig({ show_product: e.target.checked })} />
                    </FormField>

                        <FormField label="Mostrar botão like">
                          <ToggleSwitch label="Mostrar botão like" checked={formData.modal_config.show_like_button} onChange={e => updateModalConfig({ show_like_button: e.target.checked })} />
                        </FormField>
                        <FormField label="Mostrar botão comentário">
                          <ToggleSwitch label="Mostrar botão comentário" checked={formData.modal_config.show_comment_button} onChange={e => updateModalConfig({ show_comment_button: e.target.checked })} />
                        </FormField>
                        <FormField label="Mostrar botão compartilhar">
                          <ToggleSwitch label="Mostrar botão compartilhar" checked={formData.modal_config.show_share_button} onChange={e => updateModalConfig({ show_share_button: e.target.checked })} />
                        </FormField>
                        <FormField label="Cor da borda">
                          <ColorInput label="Cor da borda" value={formData.modal_config.border_color || formData.primary_color} onChange={e => updateModalConfig({ border_color: e.target.value })} />
                        </FormField>
                        <FormField label="Largura da borda">
                          <input type="number" min="0" step="1" value={toNumberInputValue(formData.modal_config.border_width)} onChange={e => updateModalConfig({ border_width: e.target.value })} placeholder="Ex: 2" className={inputClass} />
                        </FormField>
                        <FormField label="Raio da borda">
                          <input type="number" min="0" step="1" value={toNumberInputValue(formData.modal_config.border_radius)} onChange={e => updateModalConfig({ border_radius: e.target.value })} placeholder="Ex: 12" className={inputClass} />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  </div>

                <PreviewCard
                  formData={formData}
                  floatingDevice={floatingDevice}
                  carouselDevice={carouselDevice}
                  gridDevice={gridDevice}
                  activeTab={activeTab}
                />
              </div>
            </div>

            {/* Footer do modal */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStyle}
                disabled={saving}
                className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0E4787] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title="Excluir estilo?"
        description={`Tem certeza que deseja excluir "${deleteModal.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default AppearancePage;