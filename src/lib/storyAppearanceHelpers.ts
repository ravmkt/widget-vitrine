/**
 * storyAppearanceHelpers.ts
 *
 * Funções de leitura de configuração de aparência PORTADAS do widget.js
 * (production widget). Usadas tanto pelo StoryPreviewPage quanto pelo
 * StoriesWidgetPage para garantir que o preview seja idêntico ao site final.
 */

// ═══════════════════════════════════════════════════════
// DEFAULTS (idênticos ao widget.js DEFAULT_APPEARANCE)
// ═══════════════════════════════════════════════════════

export const DEFAULT_APPEARANCE = {
  primary_color: '#0094EB',
  secondary_color: '#0094EB',
  text_color: '#0F172A',
  background_color: '#FFFFFF',
  button_color: '#0094EB',
  font_family: 'Inter, system-ui, sans-serif',
  font_size: '14',
  floating_shape: 'portrait',
  floating_size: '80',
  floating_border_radius: '12',
  floating_position: 'bottom-right',
  floating_margin_bottom: '20',
  floating_margin_top: '20',
  floating_margin_side: '20',
  floating_border_color: '#0094EB',
  floating_border_width: '2',
  floating_object_fit: 'cover',
  floating_z_index: '2147483647',
  floating_show_title: true,
  floating_show_play_button: true,
  floating_allow_drag: false,
  floating_allow_close: true,
  carousel_shape: 'portrait',
  carousel_size: '80',
  carousel_visible_items: '4',
  carousel_spacing: '16',
  carousel_border_color: '#0094EB',
  carousel_border_width: '2',
  carousel_border_radius: '12',
  carousel_object_fit: 'cover',
  carousel_margin_top: '0',
  carousel_margin_bottom: '0',
  carousel_show_title: false,
  carousel_show_product: true,
  carousel_show_play_button: true,
  carousel_auto_center: false,
  grid_shape: 'portrait',
  grid_size: '80',
  grid_columns: '4',
  grid_rows: '1',
  grid_spacing: '16',
  grid_border_color: '#0094EB',
  grid_border_width: '2',
  grid_border_radius: '12',
  grid_object_fit: 'cover',
  grid_show_title: false,
  modal_show_title: true,
  modal_show_play_button: true,
  modal_show_product: true,
  modal_show_product_button: true,
  modal_show_like_button: true,
  modal_show_comment_button: true,
  modal_show_share_button: true,
  modal_show_whatsapp_button: true,
  modal_show_sizing_button: true,
  modal_hide_stories: false,
  modal_shadow_enabled: true,
  modal_border_color: '',
  modal_border_width: '',
  modal_border_radius: '',
} as const;

// ═══════════════════════════════════════════════════════
// HELPERS BÁSICOS
// ═══════════════════════════════════════════════════════

export const getDevice = (): 'desktop' | 'mobile' =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';

export const parseJsonIfNeeded = <T,>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return null;
};

const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const toBoolean = (value: any, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return fallback;
};

export const toNumber = (value: any, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value).trim().replace('px', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const safeInt = (value: any, fallback: number): number => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

export const px = (n: number | string): string => `${n}px`;

// ═══════════════════════════════════════════════════════
// LEITURA DE CONFIG (idêntica ao widget.js)
// ═══════════════════════════════════════════════════════

const JSONB_KEYS = ['floating_config', 'carousel_config', 'grid_config', 'modal_config'];

/** Flatten nested appearance objects, preserving JSONB keys intact */
export function flattenAppearance(item: any): Record<string, any> {
  const target: Record<string, any> = {};
  flattenInto(target, item, 0);
  return target;
}

function flattenInto(target: Record<string, any>, source: any, depth: number): Record<string, any> {
  if (depth > 12 || !source) return target;
  if (typeof source === 'string') source = parseJsonIfNeeded(source);
  if (!isPlainObject(source)) return target;
  Object.keys(source).forEach(key => {
    const value = source[key];
    if (value === undefined || value === null || value === '') return;
    if (JSONB_KEYS.includes(key)) { target[key] = value; return; }
    if (isPlainObject(value)) { flattenInto(target, value, depth + 1); return; }
    if (typeof value === 'string') {
      const parsed = parseJsonIfNeeded(value);
      if (isPlainObject(parsed) && Object.keys(parsed).length) {
        flattenInto(target, parsed, depth + 1);
        return;
      }
    }
    target[key] = value;
  });
  return target;
}

export function readDeviceValue(
  appearance: Record<string, any>,
  baseName: string,
  fallback?: any,
): any {
  const sameAll = appearance.same_appearance_all_devices;
  if (sameAll === undefined || sameAll === null || sameAll === true || sameAll === 'true') {
    const v = appearance[baseName];
    return v !== undefined && v !== null && v !== '' ? v : fallback;
  }
  const device = getDevice();
  const deviceKey = `${baseName}_${device}`;
  const deviceVal = appearance[deviceKey];
  if (deviceVal !== undefined && deviceVal !== null && deviceVal !== '') return deviceVal;
  const baseVal = appearance[baseName];
  return baseVal !== undefined && baseVal !== null && baseVal !== '' ? baseVal : fallback;
}

export function readJsonbConfigValue(
  appearance: Record<string, any>,
  configKey: string,
  fieldName: string,
  fallback?: any,
): any {
  let configObj = appearance[configKey];
  if (configObj === undefined || configObj === null) return fallback;
  if (typeof configObj === 'string') {
    configObj = parseJsonIfNeeded(configObj);
    if (!configObj) return fallback;
  }
  if (!isPlainObject(configObj)) return fallback;

  if (configObj[fieldName] !== undefined && configObj[fieldName] !== null && configObj[fieldName] !== '') {
    return configObj[fieldName];
  }

  const device = getDevice();
  const sameAll = configObj.same_for_all;

  if (sameAll === true || sameAll === undefined || sameAll === null) {
    if (configObj.desktop?.[fieldName] !== undefined && configObj.desktop?.[fieldName] !== null && configObj.desktop?.[fieldName] !== '') {
      return configObj.desktop[fieldName];
    }
    if (configObj.mobile?.[fieldName] !== undefined && configObj.mobile?.[fieldName] !== null && configObj.mobile?.[fieldName] !== '') {
      return configObj.mobile[fieldName];
    }
    return fallback;
  }

  const deviceConfig = configObj[device];
  if (deviceConfig?.[fieldName] !== undefined && deviceConfig?.[fieldName] !== null && deviceConfig?.[fieldName] !== '') {
    return deviceConfig[fieldName];
  }
  const otherDevice = device === 'mobile' ? 'desktop' : 'mobile';
  const otherConfig = configObj[otherDevice];
  if (otherConfig?.[fieldName] !== undefined && otherConfig?.[fieldName] !== null && otherConfig?.[fieldName] !== '') {
    return otherConfig[fieldName];
  }
  return fallback;
}

export function readConfigValue(
  appearance: Record<string, any>,
  configKey: string,
  jsonbField: string,
  flatField: string | null,
  fallback?: any,
): any {
  const jsonbVal = readJsonbConfigValue(appearance, configKey, jsonbField);
  if (jsonbVal !== undefined && jsonbVal !== null && jsonbVal !== '') return jsonbVal;
  if (flatField) {
    const flatVal = readDeviceValue(appearance, flatField);
    if (flatVal !== undefined && flatVal !== null && flatVal !== '') return flatVal;
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════
// NORMALIZAÇÕES
// ═══════════════════════════════════════════════════════

export function normalizeFloatingPosition(value: any): string {
  const key = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (['fixed-top-left', 'top-left', 'superior-esquerda'].includes(key)) return 'top-left';
  if (['fixed-top-right', 'top-right', 'superior-direita'].includes(key)) return 'top-right';
  if (['fixed-bottom-left', 'bottom-left', 'inferior-esquerda'].includes(key)) return 'bottom-left';
  return 'bottom-right';
}

export function normalizeFloatingShape(value: any): string {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'square' || key === 'quadrado') return 'square';
  if (key === 'circle' || key === 'circulo' || key === 'redondo') return 'circle';
  return 'portrait';
}

function shapeToAspectRatio(shape: string): string {
  const s = (shape || 'portrait').toLowerCase();
  if (s.includes('landscape') || s.includes('16_9') || s.includes('16-9')) return '16 / 9';
  if (s.includes('square') || s.includes('1_1') || s.includes('1-1') || s === 'circle') return '1 / 1';
  return '9 / 16';
}

// ═══════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════

export function readAppearanceValue(appearance: Record<string, any>, names: string[]): any {
  const flat = flattenAppearance(appearance);
  for (const name of names) {
    if (flat[name] !== undefined && flat[name] !== null && flat[name] !== '') return flat[name];
  }
  return undefined;
}

export const getPrimaryColor = (a: Record<string, any>) =>
  readAppearanceValue(a, ['primary_color', 'primaryColor', 'cor_primaria']) || DEFAULT_APPEARANCE.primary_color;

export const getSecondaryColor = (a: Record<string, any>) =>
  readAppearanceValue(a, ['secondary_color', 'secondaryColor', 'cor_secundaria']) || getPrimaryColor(a);

export const getTextColor = (a: Record<string, any>) =>
  readAppearanceValue(a, ['text_color', 'textColor', 'cor_texto']) || DEFAULT_APPEARANCE.text_color;

export const getBackgroundColor = (a: Record<string, any>) =>
  readAppearanceValue(a, ['background_color', 'backgroundColor', 'cor_fundo']) || DEFAULT_APPEARANCE.background_color;

export const getButtonColor = (a: Record<string, any>) =>
  readAppearanceValue(a, ['button_color', 'buttonColor', 'btn_color', 'cor_botao']) || getPrimaryColor(a);

export const getFontFamily = (a: Record<string, any>) =>
  readAppearanceValue(a, ['font_family', 'fontFamily']) || DEFAULT_APPEARANCE.font_family;

export const getFontSize = (a: Record<string, any>) =>
  toNumber(readAppearanceValue(a, ['font_size', 'fontSize']), 14);

export const getFloatingBorderColor = (a: Record<string, any>) => {
  const jsonbVal = readJsonbConfigValue(a, 'floating_config', 'border_color');
  if (jsonbVal && String(jsonbVal).trim() !== '') return jsonbVal;
  const flatVal = readDeviceValue(a, 'floating_border_color');
  if (flatVal && String(flatVal).trim() !== '') return flatVal;
  return getPrimaryColor(a);
};

// ═══════════════════════════════════════════════════════
// CONFIG OBJETOS (idêntico ao widget.js)
// ═══════════════════════════════════════════════════════

export function getFloatingConfig(appearance: Record<string, any>) {
  const a = flattenAppearance(appearance);
  const rcv = (jsonbField: string, flatField: string, fallback?: any) =>
    readConfigValue(a, 'floating_config', jsonbField, flatField, fallback);

  const position = normalizeFloatingPosition(rcv('floating_position', 'floating_position', DEFAULT_APPEARANCE.floating_position));
  const shape = normalizeFloatingShape(rcv('shape', 'floating_shape', DEFAULT_APPEARANCE.floating_shape));
  const widthNumber = toNumber(rcv('width', 'floating_size', '80'), 80);
  const heightNumber = shape === 'square' || shape === 'circle' ? widthNumber : Math.round(widthNumber * 16 / 9);
  const borderWidthNumber = toNumber(rcv('border_style', 'floating_border_width', '2'), 2);
  const radiusNumber = toNumber(rcv('border_radius', 'floating_border_radius', '12'), 12);
  const marginTopNumber = toNumber(rcv('top_spacing', 'floating_margin_top', '20'), 20);
  const marginBottomNumber = toNumber(rcv('bottom_spacing', 'floating_margin_bottom', '20'), 20);
  const marginSideNumber = toNumber(rcv('left_spacing', 'floating_margin_side', '20'), 20);
  const zIndexNumber = toNumber(rcv('z_index', 'floating_z_index', '2147483647'), 2147483647);
  const objectFit = String(rcv('object_fit', 'floating_object_fit', 'cover') || 'cover').trim().toLowerCase();

  let top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignItems = 'flex-end';
  if (position === 'top-left') { top = px(marginTopNumber); left = px(marginSideNumber); alignItems = 'flex-start'; }
  if (position === 'top-right') { top = px(marginTopNumber); right = px(marginSideNumber); alignItems = 'flex-end'; }
  if (position === 'bottom-left') { bottom = px(marginBottomNumber); left = px(marginSideNumber); alignItems = 'flex-start'; }
  if (position === 'bottom-right') { bottom = px(marginBottomNumber); right = px(marginSideNumber); alignItems = 'flex-end'; }

  return {
    position, shape,
    top, right, bottom, left,
    width: px(widthNumber), height: px(heightNumber),
    borderWidth: px(borderWidthNumber),
    radius: shape === 'circle' ? '999px' : px(radiusNumber),
    innerRadius: shape === 'circle' ? '999px' : px(Math.max(0, radiusNumber - borderWidthNumber)),
    zIndex: zIndexNumber, alignItems, objectFit,
    borderColor: getFloatingBorderColor(a),
    showPlayButton: toBoolean(rcv('show_play_icon', 'floating_show_play_button', true), true),
    allowDrag: toBoolean(rcv('draggable', 'floating_allow_drag', false), false),
    allowClose: toBoolean(rcv('allow_close', 'floating_allow_close', true), true),
    showTitle: toBoolean(rcv('show_title', 'floating_show_title', true), true),
  };
}

export function getCarouselConfig(appearance: Record<string, any>) {
  const a = flattenAppearance(appearance);
  const rcv = (jsonbField: string, flatField: string, fallback?: any) =>
    readConfigValue(a, 'carousel_config', jsonbField, flatField, fallback);

  const shape = String(rcv('shape', 'carousel_shape', 'portrait') || 'portrait').trim().toLowerCase();
  return {
    shape,
    size: toNumber(rcv('width', 'carousel_size', '30'), 30),
    visibleItems: safeInt(rcv('visible_items', 'carousel_visible_items', '4'), 4),
    spacing: safeInt(rcv('spacing', 'carousel_spacing', '16'), 16),
    borderColor: rcv('border_color', 'carousel_border_color', '#0094EB') || '#0094EB',
    borderWidth: safeInt(rcv('border_style', 'carousel_border_width', '2'), 2),
    borderRadius: safeInt(rcv('border_radius', 'carousel_border_radius', '12'), 12),
    objectFit: String(rcv('object_fit', 'carousel_object_fit', 'cover') || 'cover').trim().toLowerCase(),
    marginTop: safeInt(rcv('margin_top', 'carousel_margin_top', '0'), 0),
    marginBottom: safeInt(rcv('margin_bottom', 'carousel_margin_bottom', '0'), 0),
    showTitle: toBoolean(rcv('show_title', 'carousel_show_title', false), false),
    showProduct: toBoolean(rcv('show_product', 'carousel_show_product', true), true),
    showPlayButton: toBoolean(rcv('show_play_icon', 'carousel_show_play_button', true), true),
    autoCenter: toBoolean(rcv('auto_center', 'carousel_auto_center', false), false),
    aspectRatio: shapeToAspectRatio(shape),
  };
}

export function getGridConfig(appearance: Record<string, any>) {
  const a = flattenAppearance(appearance);
  const rcv = (jsonbField: string, flatField: string, fallback?: any) =>
    readConfigValue(a, 'grid_config', jsonbField, flatField, fallback);

  const shape = String(rcv('shape', 'grid_shape', 'portrait') || 'portrait').trim().toLowerCase();
  return {
    shape,
    size: toNumber(rcv('width', 'grid_size', '30'), 30),
    columns: safeInt(rcv('visible_items', 'grid_columns', '4'), 4),
    rows: safeInt(rcv('rows', 'grid_rows', '1'), 1),
    spacing: safeInt(rcv('spacing', 'grid_spacing', '16'), 16),
    borderColor: rcv('border_color', 'grid_border_color', '#0094EB') || '#0094EB',
    borderWidth: safeInt(rcv('border_style', 'grid_border_width', '2'), 2),
    borderRadius: safeInt(rcv('border_radius', 'grid_border_radius', '12'), 12),
    objectFit: String(rcv('object_fit', 'grid_object_fit', 'cover') || 'cover').trim().toLowerCase(),
    showTitle: toBoolean(rcv('show_title', 'grid_show_title', false), false),
    aspectRatio: shapeToAspectRatio(shape),
  };
}

// ═══════════════════════════════════════════════════════
// MODAL CONFIG
// ═══════════════════════════════════════════════════════

export type ModalAppearanceConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_product_button: boolean;
  show_product_whatsapp_button: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  show_whatsapp_button: boolean;
  show_sizing_button: boolean;
  hide_stories: boolean;
  shadow_enabled: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
};

export function normalizeModalAppearanceConfig(appearanceRaw: Record<string, any>): ModalAppearanceConfig {
  const appearance = flattenAppearance(appearanceRaw);
  const rawModalConfig = parseJsonIfNeeded<any>(appearance.modal_config || appearance.modalConfig) || {};

  const rcv = (jsonbField: string, flatField: string | null, fallback?: any) => {
    // Tenta ler direto do JSONB (desktop/mobile ou raiz)
    const jsonbVal = readJsonbConfigValue(appearance, 'modal_config', jsonbField);
    if (jsonbVal !== undefined && jsonbVal !== null && jsonbVal !== '') return jsonbVal;
    // Também tenta do rawModalConfig parseado
    if (rawModalConfig[jsonbField] !== undefined && rawModalConfig[jsonbField] !== null && rawModalConfig[jsonbField] !== '') {
      return rawModalConfig[jsonbField];
    }
    if (flatField) {
      const flatVal = readDeviceValue(appearance, flatField);
      if (flatVal !== undefined && flatVal !== null && flatVal !== '') return flatVal;
    }
    return fallback;
  };

  return {
    show_title: toBoolean(rcv('show_title', 'modal_show_title', true), true),
    show_play_button: toBoolean(rcv('show_play_button', 'modal_show_play_button', true), true),
    show_product: toBoolean(rcv('show_product', 'modal_show_product', true), true),
    show_product_button: toBoolean(rcv('show_product_button', 'modal_show_product_button', true), true),
    show_product_whatsapp_button: toBoolean(rcv('show_product_whatsapp_button', null, true), true),
    show_like_button: toBoolean(rcv('show_like_button', 'modal_show_like_button', true), true),
    show_comment_button: toBoolean(rcv('show_comment_button', 'modal_show_comment_button', true), true),
    show_share_button: toBoolean(rcv('show_share_button', 'modal_show_share_button', true), true),
    show_whatsapp_button: toBoolean(rcv('show_whatsapp_button', 'modal_show_whatsapp_button', true), true),
    show_sizing_button: toBoolean(rcv('show_sizing_button', 'modal_show_sizing_button', true), true),
    hide_stories: toBoolean(rcv('hide_stories', 'modal_hide_stories', false), false),
    shadow_enabled: toBoolean(rcv('shadow_enabled', 'modal_shadow_enabled', true), true),
    border_color: rcv('border_color', 'modal_border_color', '') || '',
    border_width: String(rcv('border_width', 'modal_border_width', '') || ''),
    border_radius: String(rcv('border_radius', 'modal_border_radius', '') || ''),
  };
}

// ═══════════════════════════════════════════════════════
// FORMATO DO STORY
// ═══════════════════════════════════════════════════════

export type StoryFormat = 'floating_widget' | 'carousel' | 'grid';

export function normalizeStoryFormat(raw: string): StoryFormat {
  const n = (raw || 'floating_widget').toLowerCase().trim();
  if (n === 'carrossel' || n === 'carousel') return 'carousel';
  if (n === 'grid' || n === 'grade') return 'grid';
  return 'floating_widget';
}