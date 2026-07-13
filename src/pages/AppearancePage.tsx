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

type WidgetShape = 'circle' | 'square' | 'portrait';

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
};

type GridConfig = {
  columns: number;
  rows: number;
  gap: number;
  card_shape: WidgetShape;
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
});

const createDefaultGridDesktopConfig = (): GridConfig => ({
  columns: 4,
  rows: 1,
  gap: 16,
  card_shape: 'portrait',
});

const createDefaultGridMobileConfig = (): GridConfig => ({
  columns: 2,
  rows: 2,
  gap: 12,
  card_shape: 'portrait',
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
      anyItem.carousel_config?.same_for_all ??
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
    rawValue: anyItem.carousel_config,
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
          columns: limitNumber(prev.grid_config.desktop.columns, 4, 1, 4),
        },
        mobile: {
          ...prev.grid_config.desktop,
          columns: limitNumber(prev.grid_config.desktop.columns, 4, 1, 4),
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
        columns: limitNumber(prev.grid_config.desktop.columns, 4, 1, 4),
      },
      mobile: {
        ...prev.grid_config.mobile,
        columns: limitNumber(prev.grid_config.mobile.columns, 2, 1, 4),
      },
    },
  };
};

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
        <span className="block text-sm font-bold text-slate-800">
          {label}
        </span>

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
        style={{
          backgroundColor: safeColor,
        }}
      >
        <input
          type="color"
          aria-label={label}
          value={safeColor}
          onChange={onChange}
          className="h-8 w-8 cursor-pointer appearance-none rounded-full border-0 bg-transparent text-transparent"
        />
      </div>

      <input
        type="text"
        value={value}
        onChange={onChange}
        className={inputClass}
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
          <p className="mt-1 text-sm font-medium text-slate-500">
            {description}
          </p>
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
            borderRadius: isCircle
              ? '999px'
              : cssSize(floating.border_radius, '12px'),
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
  const shape = normalizeWidgetShape(carousel.card_shape, 'portrait');

  const items = Array.from({
    length: Math.max(1, Math.min(visibleItems, 8)),
  });

  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const isPortrait = shape === 'portrait';

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Stories</h4>
            <p className="text-xs font-medium text-slate-500">
              Carrossel de vídeos
            </p>
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
            style={{
              gap: `${safeNumber(carousel.gap, 0, 0)}px`,
            }}
          >
            {items.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'relative shrink-0 overflow-hidden border shadow-sm',
                  isCircle && 'h-24 w-24 rounded-full',
                  isSquare && 'h-24 w-24 rounded-2xl',
                  isPortrait && 'h-[142px] w-20 rounded-2xl',
                )}
                style={{
                  aspectRatio: isPortrait ? '9 / 16' : '1 / 1',
                  borderColor: colors.primary,
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
        <PreviewInfo label="Espaçamento" value={`${carousel.gap}px`} />
        <PreviewInfo label="Itens" value={`${visibleItems}`} />
        <PreviewInfo label="Margem topo" value={cssSize(carousel.margin_top)} />
        <PreviewInfo
          label="Margem inferior"
          value={cssSize(carousel.margin_bottom)}
        />
        <PreviewInfo
          label="Centralizar"
          value={carousel.auto_center ? 'Sim' : 'Não'}
        />
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
  const columns = limitNumber(grid.columns, 4, 1, 4);
  const rows = safeNumber(grid.rows, 1, 1);
  const shape = normalizeWidgetShape(grid.card_shape, 'portrait');
  const totalItems = Math.max(1, Math.min(columns * rows, 20));

  const items = Array.from({
    length: totalItems,
  });

  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const isPortrait = shape === 'portrait';

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Grade</h4>
            <p className="text-xs font-medium text-slate-500">
              Máximo de 4 colunas
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
            {columns} x {rows}
          </span>
        </div>

        <div
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3"
          style={{
            padding: `${Math.max(8, safeNumber(grid.gap, 0, 0))}px`,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: `${safeNumber(grid.gap, 0, 0)}px`,
            }}
          >
            {items.map((_, index) => (
              <div
                key={index}
                className="flex min-w-0 justify-center"
              >
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
                    borderColor: colors.primary,
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
        <PreviewInfo label="Colunas" value={`${columns}`} />
        <PreviewInfo label="Linhas" value={`${rows}`} />
        <PreviewInfo label="Espaçamento" value={`${grid.gap}px`} />
        <PreviewInfo label="Limite" value="4 colunas" />
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
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 p-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-4">
        <div
          className="relative mx-auto h-[560px] max-w-[320px] overflow-hidden rounded-[1.75rem] border border-slate-900/10 shadow-xl"
          style={{
            background: `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})`,
            color: '#FFFFFF',
            fontFamily: formData.font_family,
            fontSize: cssSize(formData.font_size, '14px'),
            boxShadow: formData.modal_config.shadow_enabled
              ? '0 22px 55px rgba(15, 23, 42, 0.22)'
              : 'none',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/75" />

          <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
            {formData.modal_config.show_title && (
              <h4 className="line-clamp-2 text-lg font-black text-white drop-shadow">
                Blusa vermelha
              </h4>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-black/20 text-white backdrop-blur"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/10 text-2xl text-white backdrop-blur"
          >
            ‹
          </button>

          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/10 text-2xl text-white backdrop-blur"
          >
            ›
          </button>

          <div className="absolute right-4 top-[58%] z-20 flex -translate-y-1/2 flex-col items-center gap-3">
            {formData.modal_config.show_like_button && (
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-black/10 text-white backdrop-blur"
              >
                <Heart size={24} />
              </button>
            )}

            {formData.modal_config.show_comment_button && (
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-black/10 text-white backdrop-blur"
              >
                <MessageCircle size={24} />
              </button>
            )}

            {formData.modal_config.show_share_button && (
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-black/10 text-white backdrop-blur"
              >
                <Share2 size={24} />
              </button>
            )}

            {formData.modal_config.show_whatsapp_button && (
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-sm font-black text-white shadow-lg"
              >
                W
              </button>
            )}
          </div>

          {formData.modal_config.show_play_button && (
            <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                <PlaySquare size={28} />
              </div>
            </div>
          )}

          {formData.modal_config.show_product && (
            <div className="absolute bottom-4 left-4 right-4 z-30 rounded-2xl border border-slate-900/10 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div
                  className="h-16 w-16 shrink-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">
                    Blusa vermelha
                  </p>

                  <p className="text-sm font-black text-slate-700">
                    R$ 259,90
                  </p>

                  {formData.modal_config.show_product_button && (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-black text-white"
                      style={{ backgroundColor: colors.button }}
                    >
                      Ver produto &gt;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
            <p className="text-xs font-medium opacity-70">
              Fonte, cores e botões
            </p>
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
    primary: isValidHexColor(formData.primary_color)
      ? formData.primary_color
      : '#0094EB',
    secondary: isValidHexColor(formData.secondary_color)
      ? formData.secondary_color
      : '#0094EB',
    text: isValidHexColor(formData.text_color)
      ? formData.text_color
      : '#0F172A',
    background: isValidHexColor(formData.background_color)
      ? formData.background_color
      : '#FFFFFF',
    button: isValidHexColor(formData.button_color)
      ? formData.button_color
      : '#0094EB',
    floatingBorder: isValidHexColor(floating.border_color)
      ? floating.border_color
      : '#0094EB',
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

      {activeTab === 'floating' && (
        <FloatingPreview floating={floating} colors={colors} />
      )}

      {activeTab === 'carousel' && (
        <CarouselPreview carousel={carousel} colors={colors} />
      )}

      {activeTab === 'grid' && <GridPreview grid={grid} colors={colors} />}

      {activeTab === 'modal' && (
        <ModalPreview formData={formData} colors={colors} />
      )}

      {(activeTab === 'basic' || activeTab === 'visual') && (
        <VisualPreview formData={formData} colors={colors} />
      )}
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

  const [resolvedStoreId, setResolvedStoreId] = useState<string>('');
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Appearance | null>(null);
  const [formData, setFormData] = useState<ExtendedAppearance>(() =>
    createDefaultFormData(storeId),
  );

  const [floatingDevice, setFloatingDevice] =
    useState<DeviceType>('desktop');
  const [carouselDevice, setCarouselDevice] =
    useState<DeviceType>('desktop');
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

      const finalStoreId =
        resolvedStoreId || (await resolveStoreId(storeId));

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

      let updatedDeviceConfig: FloatingConfig = {
        ...current,
        ...patch,
      };

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
          floating_position: normalizeFloatingPosition(
            patch.floating_position,
          ),
          position: floatingPositionToPosition(patch.floating_position),
        };
      }

      updatedDeviceConfig = normalizeFloatingShapeValues(updatedDeviceConfig);

      const nextConfig: ResponsiveConfig<FloatingConfig> =
        prev.useGlobalAppearance
          ? {
              same_for_all: true,
              desktop: updatedDeviceConfig,
              mobile: updatedDeviceConfig,
            }
          : {
              ...prev.floating_config,
              same_for_all: false,
              [device]: updatedDeviceConfig,
            };

      const desktop = nextConfig.desktop;

      return {
        ...prev,
        floating_config: nextConfig,
        width: desktop.width,
        height: desktop.height,
        border_radius: desktop.border_radius,
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

      const updatedDeviceConfig: CarouselConfig = normalizeCarouselConfigShape({
        ...current,
        ...patch,
        gap: safeNumber(patch.gap ?? current.gap, current.gap || 0, 0),
        visible_items: safeNumber(
          patch.visible_items ?? current.visible_items,
          current.visible_items || 1,
          1,
        ),
        auto_center: patch.auto_center ?? current.auto_center ?? false,
      });

      const nextConfig: ResponsiveConfig<CarouselConfig> =
        prev.useGlobalAppearance
          ? {
              same_for_all: true,
              desktop: updatedDeviceConfig,
              mobile: updatedDeviceConfig,
            }
          : {
              ...prev.carousel_config,
              same_for_all: false,
              [device]: updatedDeviceConfig,
            };

      const desktop = nextConfig.desktop;

      return {
        ...prev,
        carousel_config: nextConfig,
        carousel_gap: desktop.gap,
        carousel_card_shape: desktop.card_shape as any,
        carousel_view_mode: desktop.view_mode,
        margin_top: desktop.margin_top,
        margin_bottom: desktop.margin_bottom,
        carousel_visible_items: desktop.visible_items,
        show_product: desktop.show_product,
        show_play_icon: desktop.show_play_icon,
        auto_center: desktop.auto_center,
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
        columns: limitNumber(
          patch.columns ?? current.columns,
          current.columns || 1,
          1,
          4,
        ),
        rows: safeNumber(patch.rows ?? current.rows, current.rows || 1, 1),
        gap: safeNumber(patch.gap ?? current.gap, current.gap || 0, 0),
      });

      const nextConfig: ResponsiveConfig<GridConfig> =
        prev.useGlobalAppearance
          ? {
              same_for_all: true,
              desktop: updatedDeviceConfig,
              mobile: updatedDeviceConfig,
            }
          : {
              ...prev.grid_config,
              same_for_all: false,
              [device]: updatedDeviceConfig,
            };

      return {
        ...prev,
        grid_config: nextConfig,
        desktop_columns: nextConfig.desktop.columns,
        desktop_rows: nextConfig.desktop.rows,
        desktop_gap: nextConfig.desktop.gap,
        mobile_columns: nextConfig.mobile.columns,
        mobile_rows: nextConfig.mobile.rows,
        mobile_gap: nextConfig.mobile.gap,
      };
    });
  };

  const updateModalConfig = (patch: Partial<ModalConfig>) => {
    setFormData(prev => {
      const modalConfig: ModalConfig = {
        ...prev.modal_config,
        ...patch,
      };

      return {
        ...prev,
        modal_config: modalConfig,
        show_title: modalConfig.show_title,
        show_play_button: modalConfig.show_play_button,
        show_product: modalConfig.show_product,
        show_like_button: modalConfig.show_like_button,
        show_comment_button: modalConfig.show_comment_button,
        show_share_button: modalConfig.show_share_button,
        show_whatsapp_button: modalConfig.show_whatsapp_button,
        show_product_button: modalConfig.show_product_button,
        hide_stories: modalConfig.hide_stories,
        shadow_enabled: modalConfig.shadow_enabled,
      };
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

      showSuccess('Estilo padrão atualizado!');
      await loadData();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      showError('Erro ao definir padrão.');
    }
  };

  const handleDeleteClick = (app: Appearance) => {
    setDeleteModal({
      isOpen: true,
      id: app.id,
      name: app.name,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

      await deleteAppearanceSafe(deleteModal.id, finalStoreId);

      showSuccess('Estilo excluído com sucesso.');

      setDeleteModal(prev => ({
        ...prev,
        isOpen: false,
      }));

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

      gridConfig.desktop = {
        ...gridConfig.desktop,
        columns: limitNumber(gridConfig.desktop.columns, 4, 1, 4),
      };

      gridConfig.mobile = {
        ...gridConfig.mobile,
        columns: limitNumber(gridConfig.mobile.columns, 2, 1, 4),
      };

      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
        carouselConfig.mobile = carouselConfig.desktop;
        gridConfig.mobile = gridConfig.desktop;
      }

      const normalizedPosition = normalizePosition(
        floatingConfig.desktop.position,
        floatingConfig.desktop.floating_position,
      );

      const normalizedFloatingPosition =
        positionToFloatingPosition(normalizedPosition);

      floatingConfig.desktop = {
        ...floatingConfig.desktop,
        border_style: normalizeBorderWidth(
          floatingConfig.desktop.border_style,
          '2',
        ),
        position: normalizedPosition,
        floating_position: normalizedFloatingPosition,
      };

      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
      } else {
        floatingConfig.mobile = {
          ...floatingConfig.mobile,
          border_style: normalizeBorderWidth(
            floatingConfig.mobile.border_style,
            '2',
          ),
        };
      }

      const floatingDesktop = floatingConfig.desktop;
      const carouselDesktop = carouselConfig.desktop;
      const gridDesktop = gridConfig.desktop;
      const gridMobile = gridConfig.mobile;
      const modalConfig = formData.modal_config;

      const stylePayload = {
        id,
        store_id: finalStoreId,
        name: formData.name.trim(),
        is_default: formData.is_default,

        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        text_color: formData.text_color,
        background_color: formData.background_color,
        button_color: formData.button_color,

        border_radius: floatingDesktop.border_radius,
        shadow_enabled: modalConfig.shadow_enabled,
        font_family: formData.font_family,
        widget_shape: floatingDesktop.shape,
        widget_size: formData.widget_size || 'medium',
        widget_animation: formData.widget_animation || 'none',

        carousel_card_shape: carouselDesktop.card_shape,
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

        use_global_appearance: formData.useGlobalAppearance,
        floating_config: floatingConfig,
        carousel_config: carouselConfig,
        grid_config: gridConfig,
        modal_config: modalConfig,

        width: floatingDesktop.width,
        height: floatingDesktop.height,
        unit: formData.unit || 'px',

        position: normalizedPosition,
        floating_position: normalizedFloatingPosition,

        bottom_spacing: floatingDesktop.bottom_spacing,
        top_spacing: floatingDesktop.top_spacing,
        left_spacing: floatingDesktop.left_spacing,
        right_spacing: floatingDesktop.right_spacing,

        color: floatingDesktop.border_color || formData.primary_color,
        border_style: floatingDesktop.border_style,
        show_play_icon: floatingDesktop.show_play_icon,
        draggable: floatingDesktop.draggable,
        allow_close: floatingDesktop.allow_close,
        object_fit: floatingDesktop.object_fit,
        z_index: floatingDesktop.z_index,

        carousel_view_mode: carouselDesktop.view_mode,
        margin_top: carouselDesktop.margin_top,
        margin_bottom: carouselDesktop.margin_bottom,
        auto_center: carouselDesktop.auto_center,

        desktop_columns: gridDesktop.columns,
        desktop_rows: gridDesktop.rows,
        desktop_gap: gridDesktop.gap,
        mobile_columns: gridMobile.columns,
        mobile_rows: gridMobile.rows,
        mobile_gap: gridMobile.gap,

        hide_stories: modalConfig.hide_stories,
        font_size: formData.font_size,

        updated_at: now,
        created_at: formData.created_at || editingStyle?.created_at || now,
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

      window.dispatchEvent(new Event('storage'));

      showSuccess(
        editingStyle
          ? 'Estilo atualizado com sucesso!'
          : 'Estilo criado com sucesso!',
      );

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
      getActiveResponsiveConfig(
        formData.floating_config,
        floatingDevice,
        formData.useGlobalAppearance,
      ),
    [formData.floating_config, floatingDevice, formData.useGlobalAppearance],
  );

  const activeCarouselConfig = useMemo(
    () =>
      getActiveResponsiveConfig(
        formData.carousel_config,
        carouselDevice,
        formData.useGlobalAppearance,
      ),
    [formData.carousel_config, carouselDevice, formData.useGlobalAppearance],
  );

  const activeGridConfig = useMemo(
    () =>
      getActiveResponsiveConfig(
        formData.grid_config,
        gridDevice,
        formData.useGlobalAppearance,
      ),
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Aparência
          </h1>

          <p className="mt-1 font-medium text-slate-500">
            Customize a identidade visual, widgets, carrosséis, grades e player
            da sua loja.
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

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <Brush className="h-5 w-5 text-[#0094EB]" />

          <h3 className="font-extrabold text-slate-800">
            Estilos Cadastrados
          </h3>
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
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Nenhum estilo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                appearances.map(app => (
                  <tr
                    key={app.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg border border-slate-200 shadow-sm"
                          style={{
                            backgroundColor: app.primary_color || '#0094EB',
                          }}
                        />

                        <span className="text-sm font-bold text-slate-800">
                          {app.name}
                        </span>
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

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Configure a identidade visual por área: global, flutuante,
                  carrossel, grade e player.
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

            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <ModalTabButton
                  active={activeTab === 'basic'}
                  icon={<Settings2 size={16} />}
                  label="Básico"
                  onClick={() => setActiveTab('basic')}
                />

                <ModalTabButton
                  active={activeTab === 'visual'}
                  icon={<Palette size={16} />}
                  label="Identidade Visual"
                  onClick={() => setActiveTab('visual')}
                />

                <ModalTabButton
                  active={activeTab === 'floating'}
                  icon={<PlaySquare size={16} />}
                  label="Flutuante"
                  onClick={() => setActiveTab('floating')}
                />

                <ModalTabButton
                  active={activeTab === 'carousel'}
                  icon={<Rows3 size={16} />}
                  label="Carrossel"
                  onClick={() => setActiveTab('carousel')}
                />

                <ModalTabButton
                  active={activeTab === 'grid'}
                  icon={<LayoutGrid size={16} />}
                  label="Grade"
                  onClick={() => setActiveTab('grid')}
                />

                <ModalTabButton
                  active={activeTab === 'modal'}
                  icon={<PlaySquare size={16} />}
                  label="Player / Modal"
                  onClick={() => setActiveTab('modal')}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  {activeTab === 'basic' && (
                    <SectionCard
                      title="Dados Básicos"
                      description="Defina o nome do estilo e o comportamento global entre Desktop e Mobile."
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Nome do Estilo">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ex: Estilo padrão"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Definir como padrão">
                          <ToggleSwitch
                            label="Definir como padrão da loja"
                            checked={formData.is_default}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                is_default: e.target.checked,
                              })
                            }
                          />
                        </FormField>
                      </div>

                      <FormField label="Usar aparência em todos os dispositivos">
                        <ToggleSwitch
                          label="Usar aparência em todos os dispositivos"
                          checked={formData.useGlobalAppearance}
                          onChange={e => {
                            const checked = e.target.checked;

                            setFormData(prev =>
                              syncGlobalConfig(checked, prev),
                            );

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

                  {activeTab === 'visual' && (
                    <SectionCard
                      title="Identidade Visual"
                      description="Configure as cores, fonte e elementos globais da experiência visual."
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Cor principal">
                          <ColorInput
                            label="Cor principal"
                            value={formData.primary_color}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                primary_color: e.target.value,
                                secondary_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Cor secundária">
                          <ColorInput
                            label="Cor secundária"
                            value={formData.secondary_color}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                secondary_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Cor do texto">
                          <ColorInput
                            label="Cor do texto"
                            value={formData.text_color}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                text_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Cor do fundo">
                          <ColorInput
                            label="Cor do fundo"
                            value={formData.background_color}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                background_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Cor do botão">
                          <ColorInput
                            label="Cor do botão"
                            value={formData.button_color}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                button_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Fonte de texto">
                          <select
                            value={formData.font_family}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                font_family: e.target.value,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Roboto, sans-serif">Roboto</option>
                            <option value="Open Sans, sans-serif">
                              Open Sans
                            </option>
                            <option value="Lato, sans-serif">Lato</option>
                            <option value="Montserrat, sans-serif">
                              Montserrat
                            </option>
                            <option value="Poppins, sans-serif">Poppins</option>
                          </select>
                        </FormField>

                        <FormField label="Tamanho do texto">
                          <input
                            type="number"
                            min="8"
                            step="1"
                            value={toNumberInputValue(formData.font_size)}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                font_size: e.target.value,
                              })
                            }
                            placeholder="Ex: 14"
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'floating' && (
                    <SectionCard
                      title="Widget Flutuante"
                      description="Controle tamanho, posição, borda, play, fechamento e comportamento do widget flutuante."
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">
                          Configuração ativa
                        </h4>

                        {formData.useGlobalAppearance ? (
                          <GlobalDeviceNotice />
                        ) : (
                          <DeviceTabs
                            activeDevice={floatingDevice}
                            onChange={setFloatingDevice}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeFloatingConfig.shape}
                            onChange={e => {
                              const shape = e.target.value as WidgetShape;

                              if (shape === 'portrait') {
                                const width = formatNumberLikeCurrent(
                                  activeFloatingConfig.width,
                                  '80',
                                );

                                updateFloatingConfig({
                                  shape,
                                  width,
                                  height: getPortraitHeightFromWidth(width),
                                });

                                return;
                              }

                              if (shape === 'square') {
                                const size = formatNumberLikeCurrent(
                                  activeFloatingConfig.width,
                                  '80',
                                );

                                updateFloatingConfig({
                                  shape,
                                  width: size,
                                  height: size,
                                });

                                return;
                              }

                              const size =
                                toNumberInputValue(
                                  activeFloatingConfig.border_radius,
                                ) ||
                                toNumberInputValue(
                                  activeFloatingConfig.width,
                                ) ||
                                '80';

                              updateFloatingConfig({
                                shape,
                                border_radius: size,
                              });
                            }}
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato</option>
                          </select>
                        </FormField>

                        {activeFloatingConfig.shape !== 'circle' && (
                          <>
                            <FormField label="Largura">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={toNumberInputValue(
                                  activeFloatingConfig.width,
                                )}
                                onChange={e => {
                                  const value = e.target.value;

                                  if (
                                    activeFloatingConfig.shape === 'portrait'
                                  ) {
                                    updateFloatingConfig({
                                      width: value,
                                      height:
                                        getPortraitHeightFromWidth(value),
                                    });

                                    return;
                                  }

                                  if (activeFloatingConfig.shape === 'square') {
                                    updateFloatingConfig({
                                      width: value,
                                      height: value,
                                    });

                                    return;
                                  }

                                  updateFloatingConfig({
                                    width: value,
                                  });
                                }}
                                placeholder="Ex: 80"
                                className={inputClass}
                              />
                            </FormField>

                            <FormField label="Altura">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={toNumberInputValue(
                                  activeFloatingConfig.height,
                                )}
                                onChange={e => {
                                  const value = e.target.value;

                                  if (
                                    activeFloatingConfig.shape === 'portrait'
                                  ) {
                                    updateFloatingConfig({
                                      height: value,
                                      width: getPortraitWidthFromHeight(value),
                                    });

                                    return;
                                  }

                                  if (activeFloatingConfig.shape === 'square') {
                                    updateFloatingConfig({
                                      height: value,
                                      width: value,
                                    });

                                    return;
                                  }

                                  updateFloatingConfig({
                                    height: value,
                                  });
                                }}
                                placeholder="Ex: 142"
                                className={inputClass}
                              />
                            </FormField>
                          </>
                        )}

                        <FormField
                          label={
                            activeFloatingConfig.shape === 'circle'
                              ? 'Raio/Tamanho do círculo'
                              : 'Raio da borda'
                          }
                        >
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.border_radius,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                border_radius: e.target.value,
                              })
                            }
                            placeholder={
                              activeFloatingConfig.shape === 'circle'
                                ? 'Ex: 80'
                                : 'Ex: 12'
                            }
                            className={inputClass}
                          />

                          {activeFloatingConfig.shape === 'portrait' && (
                            <p className="text-xs font-semibold text-slate-400">
                              No formato retrato, largura e altura ficam
                              travadas na proporção 9:16.
                            </p>
                          )}

                          {activeFloatingConfig.shape === 'circle' && (
                            <p className="text-xs font-semibold text-slate-400">
                              No formato circular, o tamanho é controlado apenas
                              por este campo.
                            </p>
                          )}
                        </FormField>

                        <FormField label="Posição do widget">
                          <select
                            value={activeFloatingConfig.position}
                            onChange={e =>
                              updateFloatingConfig({
                                position: e.target.value as PositionValue,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="fixed_bottom_right">
                              Inferior direita
                            </option>
                            <option value="fixed_bottom_left">
                              Inferior esquerda
                            </option>
                            <option value="fixed_top_right">
                              Superior direita
                            </option>
                            <option value="fixed_top_left">
                              Superior esquerda
                            </option>
                          </select>
                        </FormField>

                        <FormField label="Distância inferior">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.bottom_spacing,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                bottom_spacing: e.target.value,
                              })
                            }
                            placeholder="Ex: 20"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Distância superior">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.top_spacing,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                top_spacing: e.target.value,
                              })
                            }
                            placeholder="Ex: 20"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Distância lateral">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.left_spacing,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                left_spacing: e.target.value,
                                right_spacing: e.target.value,
                              })
                            }
                            placeholder="Ex: 20"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Cor da borda">
                          <ColorInput
                            label="Cor da borda"
                            value={activeFloatingConfig.border_color}
                            onChange={e =>
                              updateFloatingConfig({
                                border_color: e.target.value,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Largura da borda">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.border_style,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                border_style: e.target.value,
                              })
                            }
                            placeholder="Ex: 2"
                            className={inputClass}
                          />

                          <p className="text-xs font-semibold text-slate-400">
                            O estilo da borda será sempre sólido.
                          </p>
                        </FormField>

                        <FormField label="Object fit">
                          <select
                            value={activeFloatingConfig.object_fit}
                            onChange={e =>
                              updateFloatingConfig({
                                object_fit: e.target.value,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </select>
                        </FormField>

                        <FormField label="Z-index">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={toNumberInputValue(
                              activeFloatingConfig.z_index,
                            )}
                            onChange={e =>
                              updateFloatingConfig({
                                z_index: e.target.value,
                              })
                            }
                            placeholder="Ex: 2147483647"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Mostrar botão play">
                          <ToggleSwitch
                            label="Mostrar botão play no flutuante"
                            checked={activeFloatingConfig.show_play_icon}
                            onChange={e =>
                              updateFloatingConfig({
                                show_play_icon: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Permitir arrastar">
                          <ToggleSwitch
                            label="Permitir arrastar widget"
                            checked={activeFloatingConfig.draggable}
                            onChange={e =>
                              updateFloatingConfig({
                                draggable: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Permitir fechar">
                          <ToggleSwitch
                            label="Permitir fechar widget"
                            checked={activeFloatingConfig.allow_close}
                            onChange={e =>
                              updateFloatingConfig({
                                allow_close: e.target.checked,
                              })
                            }
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'carousel' && (
                    <SectionCard
                      title="Carrossel"
                      description="Configure a exibição dos vídeos em carrossel, quantidade de itens, formato, centralização e margens."
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">
                          Configuração ativa
                        </h4>

                        {formData.useGlobalAppearance ? (
                          <GlobalDeviceNotice />
                        ) : (
                          <DeviceTabs
                            activeDevice={carouselDevice}
                            onChange={setCarouselDevice}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeCarouselConfig.card_shape}
                            onChange={e =>
                              updateCarouselConfig({
                                card_shape: e.target.value as WidgetShape,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato 9:16</option>
                          </select>

                          {activeCarouselConfig.card_shape === 'portrait' && (
                            <p className="text-xs font-semibold text-slate-400">
                              No formato retrato, os cards ficam fixos na
                              proporção 9:16.
                            </p>
                          )}
                        </FormField>

                        <FormField label="Espaçamento">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={activeCarouselConfig.gap}
                            onChange={e =>
                              updateCarouselConfig({
                                gap: safeNumber(e.target.value, 0, 0),
                              })
                            }
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Itens visíveis">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={activeCarouselConfig.visible_items}
                            onChange={e =>
                              updateCarouselConfig({
                                visible_items: safeNumber(
                                  e.target.value,
                                  1,
                                  1,
                                ),
                              })
                            }
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Modo de visualização">
                          <select
                            value={activeCarouselConfig.view_mode}
                            onChange={e =>
                              updateCarouselConfig({
                                view_mode: e.target.value,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="preview">
                              Preview, vídeo no hover
                            </option>
                            <option value="poster">Poster/imagem apenas</option>
                            <option value="custom">Personalizado</option>
                          </select>
                        </FormField>

                        <FormField label="Margem superior">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeCarouselConfig.margin_top,
                            )}
                            onChange={e =>
                              updateCarouselConfig({
                                margin_top: e.target.value,
                              })
                            }
                            placeholder="Ex: 20"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Margem inferior">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={toNumberInputValue(
                              activeCarouselConfig.margin_bottom,
                            )}
                            onChange={e =>
                              updateCarouselConfig({
                                margin_bottom: e.target.value,
                              })
                            }
                            placeholder="Ex: 20"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Exibir produto">
                          <ToggleSwitch
                            label="Exibir produto no carrossel"
                            checked={activeCarouselConfig.show_product}
                            onChange={e =>
                              updateCarouselConfig({
                                show_product: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão play">
                          <ToggleSwitch
                            label="Mostrar botão play no carrossel"
                            checked={activeCarouselConfig.show_play_icon}
                            onChange={e =>
                              updateCarouselConfig({
                                show_play_icon: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Centralizar automático">
                          <ToggleSwitch
                            label="Centralizar carrossel automaticamente"
                            checked={activeCarouselConfig.auto_center}
                            onChange={e =>
                              updateCarouselConfig({
                                auto_center: e.target.checked,
                              })
                            }
                            description="Quando ativado, os cards ficam centralizados dentro da área disponível."
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'grid' && (
                    <SectionCard
                      title="Grade"
                      description="Configure quantidade de colunas, linhas, formato e espaçamento da grade de vídeos."
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="text-sm font-black text-slate-800">
                          Configuração ativa
                        </h4>

                        {formData.useGlobalAppearance ? (
                          <GlobalDeviceNotice />
                        ) : (
                          <DeviceTabs
                            activeDevice={gridDevice}
                            onChange={setGridDevice}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Forma">
                          <select
                            value={activeGridConfig.card_shape}
                            onChange={e =>
                              updateGridConfig({
                                card_shape: e.target.value as WidgetShape,
                              })
                            }
                            className={selectClass}
                          >
                            <option value="circle">Circular</option>
                            <option value="square">Quadrado</option>
                            <option value="portrait">Retrato 9:16</option>
                          </select>

                          {activeGridConfig.card_shape === 'portrait' && (
                            <p className="text-xs font-semibold text-slate-400">
                              No formato retrato, os itens da grade ficam fixos
                              na proporção 9:16.
                            </p>
                          )}
                        </FormField>

                        <FormField label="Colunas">
                          <input
                            type="number"
                            min="1"
                            max="4"
                            step="1"
                            value={Math.min(activeGridConfig.columns, 4)}
                            onChange={e =>
                              updateGridConfig({
                                columns: limitNumber(e.target.value, 1, 1, 4),
                              })
                            }
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Linhas">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={activeGridConfig.rows}
                            onChange={e =>
                              updateGridConfig({
                                rows: safeNumber(e.target.value, 1, 1),
                              })
                            }
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Espaçamento">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={activeGridConfig.gap}
                            onChange={e =>
                              updateGridConfig({
                                gap: safeNumber(e.target.value, 0, 0),
                              })
                            }
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'modal' && (
                    <SectionCard
                      title="Player Interativo e Modal"
                      description="Controle quais botões e elementos aparecem dentro do player/modal."
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label="Mostrar título">
                          <ToggleSwitch
                            label="Mostrar título"
                            checked={formData.modal_config.show_title}
                            onChange={e =>
                              updateModalConfig({
                                show_title: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão play">
                          <ToggleSwitch
                            label="Mostrar botão play"
                            checked={formData.modal_config.show_play_button}
                            onChange={e =>
                              updateModalConfig({
                                show_play_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão curtir">
                          <ToggleSwitch
                            label="Mostrar botão curtir"
                            checked={formData.modal_config.show_like_button}
                            onChange={e =>
                              updateModalConfig({
                                show_like_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão WhatsApp">
                          <ToggleSwitch
                            label="Mostrar botão WhatsApp"
                            checked={formData.modal_config.show_whatsapp_button}
                            onChange={e =>
                              updateModalConfig({
                                show_whatsapp_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar produto">
                          <ToggleSwitch
                            label="Mostrar produto"
                            checked={formData.modal_config.show_product}
                            onChange={e =>
                              updateModalConfig({
                                show_product: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão produto">
                          <ToggleSwitch
                            label="Mostrar botão produto"
                            checked={formData.modal_config.show_product_button}
                            onChange={e =>
                              updateModalConfig({
                                show_product_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão compartilhar">
                          <ToggleSwitch
                            label="Mostrar botão compartilhar"
                            checked={formData.modal_config.show_share_button}
                            onChange={e =>
                              updateModalConfig({
                                show_share_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Mostrar botão comentários">
                          <ToggleSwitch
                            label="Mostrar botão comentários"
                            checked={formData.modal_config.show_comment_button}
                            onChange={e =>
                              updateModalConfig({
                                show_comment_button: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Ocultar stories">
                          <ToggleSwitch
                            label="Ocultar stories"
                            checked={formData.modal_config.hide_stories}
                            onChange={e =>
                              updateModalConfig({
                                hide_stories: e.target.checked,
                              })
                            }
                          />
                        </FormField>

                        <FormField label="Sombra">
                          <ToggleSwitch
                            label="Ativar sombra"
                            checked={formData.modal_config.shadow_enabled}
                            onChange={e =>
                              updateModalConfig({
                                shadow_enabled: e.target.checked,
                              })
                            }
                          />
                        </FormField>
                      </div>
                    </SectionCard>
                  )}
                </div>

                <div className="xl:sticky xl:top-0 xl:self-start">
                  <PreviewCard
                    formData={formData}
                    floatingDevice={floatingDevice}
                    carouselDevice={carouselDevice}
                    gridDevice={gridDevice}
                    activeTab={activeTab}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveStyle}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#0E4787] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Estilo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Aparência"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal(prev => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
};

export default AppearancePage;
