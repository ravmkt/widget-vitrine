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
  gap: number;
  card_shape: WidgetShape;
  view_mode: string;
  margin_top: string;
  margin_bottom: string;
  visible_items: number;
  show_product: boolean;
  show_play_icon: boolean;
  auto_center: boolean;
  card_size: string;
  border_color: string;
  border_width: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
};

type GridConfig = {
  columns: number;
  rows: number;
  gap: number;
  card_shape: WidgetShape;
  card_size: string;
  border_color: string;
  border_width: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
};

type ModalConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  show_whatsapp_button: boolean;
  show_product_button: boolean;
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
};

type PreviewColors = {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  button: string;
  floatingBorder: string;
};

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
  const normalizedPosition = normalizePositionForSave(
    position,
    floatingPosition,
  );

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

const safeNumber = (
  value: unknown,
  fallback: number,
  min?: number,
): number => {
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

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return `${text}px`;
  }

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
): CarouselConfig => ({
  ...config,
  card_shape: normalizeWidgetShape(config.card_shape, 'portrait'),
});

const normalizeGridConfigShape = (config: GridConfig): GridConfig => ({
  ...config,
  card_shape: normalizeWidgetShape(config.card_shape, 'portrait'),
});

const parseJsonIfNeeded = <T,>(value: unknown): Partial<T> | null => {
  if (!value) return null;

  if (typeof value === 'object') return value as Partial<T>;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Partial<T>;
    } catch {
      return null;
    }
  }

  return null;
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
  gap: 16,
  card_shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 4,
  show_product: true,
  show_play_icon: true,
  auto_center: false,
  card_size: '80',
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
});

const createDefaultCarouselMobileConfig = (): CarouselConfig => ({
  gap: 12,
  card_shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 2,
  show_product: true,
  show_play_icon: true,
  auto_center: false,
  card_size: '64',
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
});

const createDefaultGridDesktopConfig = (): GridConfig => ({
  columns: 4,
  rows: 1,
  gap: 16,
  card_shape: 'portrait',
  card_size: '80',
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
});

const createDefaultGridMobileConfig = (): GridConfig => ({
  columns: 2,
  rows: 2,
  gap: 12,
  card_shape: 'portrait',
  card_size: '64',
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
});

const createDefaultModalConfig = (): ModalConfig => ({
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

    border_radius: floatingDesktop.border_radius,
    shadow_enabled: modalConfig.shadow_enabled,
    font_family: 'Inter, sans-serif',
    widget_shape: floatingDesktop.shape,
    widget_size: 'medium',
    widget_animation: 'none',

    carousel_card_shape: carouselDesktop.card_shape as any,
    carousel_visible_items: carouselDesktop.visible_items,
    carousel_gap: carouselDesktop.gap,

    show_title: modalConfig.show_title,
    show_play_button: modalConfig.show_play_button,
    show_product: modalConfig.show_product,
    show_like_button: modalConfig.show_like_button,
    show_comment_button: modalConfig.show_comment_button,
    show_share_button: modalConfig.show_share_button,
    show_whatsapp_button: modalConfig.show_whatsapp_button,
    show_product_button: modalConfig.show_product_button,

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
    desktop_columns: gridDesktop.columns,
    desktop_rows: gridDesktop.rows,
    desktop_gap: gridDesktop.gap,
    mobile_columns: gridMobile.columns,
    mobile_rows: gridMobile.rows,
    mobile_gap: gridMobile.gap,
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
      border_radius: item.border_radius || defaults.border_radius,
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
    desktopDefault: createDefaultCarouselDesktopConfig(),
    mobileDefault: createDefaultCarouselMobileConfig(),
    sameForAll: globalAppearance,
    legacyDesktop: {
      gap: safeNumber(item.carousel_gap, defaults.carousel_gap, 0),
      card_shape: normalizeWidgetShape(
        item.carousel_card_shape,
        defaults.carousel_card_shape as WidgetShape,
      ),
      view_mode: anyItem.carousel_view_mode ?? defaults.carousel_view_mode,
      margin_top: anyItem.margin_top ?? defaults.margin_top,
      margin_bottom: anyItem.margin_bottom ?? defaults.margin_bottom,
      visible_items: safeNumber(
        item.carousel_visible_items,
        defaults.carousel_visible_items || 4,
        1,
      ),
      show_product: item.show_product ?? defaults.show_product,
      show_play_icon: anyItem.show_play_icon ?? item.show_play_button ?? true,
      auto_center: anyItem.auto_center ?? defaults.auto_center ?? false,
    },
    legacyMobile: {
      auto_center: anyItem.auto_center ?? defaults.auto_center ?? false,
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
      columns: limitNumber(
        anyItem.desktop_columns,
        defaults.desktop_columns,
        1,
        4,
      ),
      rows: safeNumber(anyItem.desktop_rows, defaults.desktop_rows, 1),
      gap: safeNumber(anyItem.desktop_gap, defaults.desktop_gap, 0),
      card_shape: normalizeWidgetShape(anyItem.grid_card_shape, 'portrait'),
    },
    legacyMobile: {
      columns: limitNumber(
        anyItem.mobile_columns,
        defaults.mobile_columns,
        1,
        4,
      ),
      rows: safeNumber(anyItem.mobile_rows, defaults.mobile_rows, 1),
      gap: safeNumber(anyItem.mobile_gap, defaults.mobile_gap, 0),
      card_shape: normalizeWidgetShape(anyItem.grid_card_shape, 'portrait'),
    },
  });

  gridConfig.desktop = normalizeGridConfigShape(gridConfig.desktop);
  gridConfig.mobile = normalizeGridConfigShape(gridConfig.mobile);

  gridConfig.desktop.columns = limitNumber(gridConfig.desktop.columns, 4, 1, 4);
  gridConfig.mobile.columns = limitNumber(gridConfig.mobile.columns, 2, 1, 4);

  const modalRaw = parseJsonIfNeeded<ModalConfig>(anyItem.modal_config);

  const modalConfig: ModalConfig = {
    ...createDefaultModalConfig(),
    ...modalRaw,
    show_title: item.show_title ?? modalRaw?.show_title ?? defaults.show_title,
    show_play_button:
      item.show_play_button ??
      modalRaw?.show_play_button ??
      defaults.show_play_button,
    show_product:
      item.show_product ?? modalRaw?.show_product ?? defaults.show_product,
    show_like_button:
      item.show_like_button ??
      modalRaw?.show_like_button ??
      defaults.show_like_button,
    show_comment_button:
      item.show_comment_button ??
      modalRaw?.show_comment_button ??
      defaults.show_comment_button,
    show_share_button:
      item.show_share_button ??
      modalRaw?.show_share_button ??
      defaults.show_share_button,
    show_whatsapp_button:
      item.show_whatsapp_button ??
      modalRaw?.show_whatsapp_button ??
      defaults.show_whatsapp_button,
    show_product_button:
      item.show_product_button ??
      modalRaw?.show_product_button ??
      defaults.show_product_button,
    hide_stories:
      anyItem.hide_stories ?? modalRaw?.hide_stories ?? defaults.hide_stories,
    shadow_enabled:
      item.shadow_enabled ??
      modalRaw?.shadow_enabled ??
      defaults.shadow_enabled,
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

    border_radius: floatingDesktop.border_radius || defaults.border_radius,
    shadow_enabled: modalConfig.shadow_enabled,
    font_family: item.font_family || defaults.font_family,
    widget_shape: floatingDesktop.shape as any,
    widget_size: item.widget_size || defaults.widget_size,
    widget_animation: item.widget_animation || defaults.widget_animation,

    carousel_card_shape: carouselDesktop.card_shape as any,
    carousel_visible_items: carouselDesktop.visible_items,
    carousel_gap: carouselDesktop.gap,

    show_title: modalConfig.show_title,
    show_play_button: modalConfig.show_play_button,
    show_product: modalConfig.show_product,
    show_like_button: modalConfig.show_like_button,
    show_comment_button: modalConfig.show_comment_button,
    show_share_button: modalConfig.show_share_button,
    show_whatsapp_button: modalConfig.show_whatsapp_button,
    show_product_button: modalConfig.show_product_button,

    created_at: item.created_at || defaults.created_at,
    updated_at: item.updated_at || defaults.updated_at,

    useGlobalAppearance: globalAppearance,
    use_global_appearance: globalAppearance,

    // ✅ CORRIGIDO: faltava "carousel_config: {" antes do spread
    floating_config: {
      ...floatingConfig,
      same_for_all: globalAppearance,
    },
    carousel_config: {
      ...carouselConfig,
      same_for_all: globalAppearance,
    },
    grid_config: {
      ...gridConfig,
      same_for_all: globalAppearance,
    },
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
    desktop_columns: gridDesktop.columns,
    desktop_rows: gridDesktop.rows,
    desktop_gap: gridDesktop.gap,
    mobile_columns: gridMobile.columns,
    mobile_rows: gridMobile.rows,
    mobile_gap: gridMobile.gap,
    font_size: anyItem.font_size ?? defaults.font_size,
  } as ExtendedAppearance;
};
