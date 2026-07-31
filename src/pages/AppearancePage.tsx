// ════════════════════════════════════════════════════════════════
// StoryPreviewPage.tsx — VERSÃO CORRIGIDA
// Todas as correções sinalizadas com 🔧 CORREÇÃO #N
// ════════════════════════════════════════════════════════════════

'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { db, Appearance, Story, Product, resolveStoreId } from '@/lib/db';
import { useTenant } from '@/context/TenantContext';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Ruler,
  ShoppingBag,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ──────────────────── tipos ────────────────────

type DeviceType = 'desktop' | 'mobile';

type WidgetShape = 'circle' | 'square' | 'portrait';

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
  position: string; // fixed_bottom_right etc.
  floating_position: string; // bottom-right etc.
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
  // 🔧 CORREÇÃO #3: adicionado toggle de medidas
  show_sizing_button: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
};

// ──────────────────── utilitários ────────────────────

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

const safeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const cssSize = (value: unknown, fallback = '0px') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (/^-?\d+(\.\d+)?$/.test(text)) return `${text}px`;
  return text;
};

const cssBorder = (borderWidth: string, color: string) => {
  const width = cssSize(borderWidth, '0px');
  return `${width} solid ${color}`;
};

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

// 🔧 CORREÇÃO #1: Função que normaliza posição legacy (fixed_bottom_right → bottom-right)
const normalizePositionForPreview = (raw: string): string => {
  // Remove prefixo "fixed_" e troca underscores por hífens
  return raw
    .replace(/^fixed_/, '')
    .replace(/_/g, '-')
    .toLowerCase();
};

const getResponsiveValue = <T,>(
  config: ResponsiveConfig<T> | null,
  device: DeviceType,
  fallback: T,
): T => {
  if (!config) return fallback;
  if (config.same_for_all) return config.desktop ?? fallback;
  return config[device] ?? config.desktop ?? fallback;
};

const normalizeFloatingConfig = (
  raw: unknown,
  defaults: Partial<FloatingConfig> = {},
): FloatingConfig => {
  const d = (raw as Record<string, any>) || {};
  return {
    shape: (d.shape as WidgetShape) || 'portrait',
    width: d.width || '80',
    height: d.height || '142',
    border_radius: d.border_radius || '12',
    position: d.position || 'fixed_bottom_right',
    floating_position: d.floating_position || 'bottom-right',
    bottom_spacing: d.bottom_spacing || '20',
    top_spacing: d.top_spacing || '20',
    left_spacing: d.left_spacing || '20',
    right_spacing: d.right_spacing || '20',
    border_color: d.border_color || defaults.border_color || '#0094EB',
    border_style: d.border_style || '2',
    show_play_icon: d.show_play_icon ?? true,
    object_fit: d.object_fit || 'cover',
    draggable: d.draggable ?? false,
    allow_close: d.allow_close ?? false,
    z_index: d.z_index || '2147483647',
    show_title: d.show_title ?? true,
  };
};

const normalizeCarouselConfig = (raw: unknown): CarouselConfig => {
  const d = (raw as Record<string, any>) || {};
  return {
    spacing: safeNumber(d.spacing, 16),
    shape: (d.shape as WidgetShape) || 'portrait',
    view_mode: d.view_mode || 'preview',
    margin_top: d.margin_top || '0',
    margin_bottom: d.margin_bottom || '0',
    visible_items: safeNumber(d.visible_items, 4),
    show_product: d.show_product ?? true,
    show_play_icon: d.show_play_icon ?? true,
    auto_center: d.auto_center ?? true,
    width: d.width || '80',
    border_color: d.border_color || '#0094EB',
    border_style: d.border_style || '2',
    border_radius: d.border_radius || '12',
    object_fit: d.object_fit || 'cover',
    show_title: d.show_title ?? false,
  };
};

const normalizeGridConfig = (raw: unknown): GridConfig => {
  const d = (raw as Record<string, any>) || {};
  return {
    visible_items: safeNumber(d.visible_items, 4),
    rows: safeNumber(d.rows, 1),
    spacing: safeNumber(d.spacing, 16),
    shape: (d.shape as WidgetShape) || 'portrait',
    width: d.width || '80',
    border_color: d.border_color || '#0094EB',
    border_style: d.border_style || '2',
    border_radius: d.border_radius || '12',
    object_fit: d.object_fit || 'cover',
    show_title: d.show_title ?? false,
  };
};

const normalizeModalConfig = (
  raw: unknown,
  appearance: Record<string, any>,
): ModalConfig => {
  const d = (raw as Record<string, any>) || {};
  return {
    show_title: d.show_title ?? appearance.show_title ?? true,
    show_play_button: d.show_play_button ?? appearance.show_play_button ?? true,
    show_product: d.show_product ?? appearance.show_product ?? true,
    show_product_button:
      d.show_product_button ?? appearance.show_product_button ?? true,
    show_product_whatsapp_button:
      d.show_product_whatsapp_button ??
      appearance.show_product_whatsapp_button ??
      true, // 🔧 CORREÇÃO #2: agora lê o toggle corretamente
    show_like_button: d.show_like_button ?? appearance.show_like_button ?? true,
    show_comment_button:
      d.show_comment_button ?? appearance.show_comment_button ?? true,
    show_share_button:
      d.show_share_button ?? appearance.show_share_button ?? true,
    // 🔧 CORREÇÃO #3: toggle de medidas
    show_sizing_button: d.show_sizing_button ?? true,
    border_color: d.border_color || appearance.primary_color || '#0094EB',
    border_width: d.border_width || '2',
    border_radius: d.border_radius || '12',
  };
};

// ──────────────────── StoryPreviewPage ────────────────────

const StoryPreviewPage = () => {
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

  const [device, setDevice] = useState<DeviceType>('desktop');
  const [appearance, setAppearance] = useState<Record<string, any> | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  // Estados do player
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSizing, setShowSizing] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ──── Carregar dados ────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const finalStoreId =
        storeId || (await resolveStoreId(storeId || ''));
      if (!finalStoreId) {
        setLoading(false);
        return;
      }

      const [appearances, allStories, allProducts] = await Promise.all([
        db.appearances.getAll(finalStoreId),
        db.stories.getAll(finalStoreId),
        db.products.getAll(finalStoreId),
      ]);

      const defaultAppearance =
        appearances.find(a => a.is_default) || appearances[0] || null;
      setAppearance(defaultAppearance as any);
      setStories(allStories as Story[]);

      const productMap: Record<string, Product> = {};
      allProducts.forEach((p: Product) => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch (error) {
      console.error('Erro ao carregar dados do preview:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!tenantLoading) {
      loadData();
    }
  }, [tenantLoading, loadData]);

  // ──── Configs derivadas ────

  const floatingCfg = useMemo(() => {
    if (!appearance) return null;
    const raw = parseJsonIfNeeded<ResponsiveConfig<FloatingConfig>>(
      appearance.floating_config,
    );

    if (raw) {
      const cfg = getResponsiveValue(raw, device, raw.desktop);
      return normalizeFloatingConfig(cfg, {
        border_color: appearance.primary_color,
      });
    }

    // Fallback: campos legacy direto no appearance
    // 🔧 CORREÇÃO #1: normaliza posição (fixed_bottom_right → bottom-right)
    const legacyPosition = normalizePositionForPreview(
      String(
        appearance.floating_position ||
          appearance.position ||
          'bottom-right',
      ),
    );
    return normalizeFloatingConfig(
      {
        shape: appearance.widget_shape || 'portrait',
        width: appearance.width || '80',
        height: appearance.height || '142',
        border_radius: appearance.border_radius || '12',
        position: legacyPosition,
        floating_position: legacyPosition,
        bottom_spacing:
          appearance.bottom_spacing || appearance.spacing_bottom || '20',
        top_spacing: appearance.top_spacing || appearance.spacing_top || '20',
        left_spacing:
          appearance.left_spacing || appearance.spacing_left || '20',
        right_spacing:
          appearance.right_spacing || appearance.spacing_right || '20',
        border_color: appearance.color || appearance.primary_color || '#0094EB',
        border_style: appearance.border_style || '2',
        show_play_icon: appearance.show_play_icon ?? true,
        object_fit: appearance.object_fit || 'cover',
        draggable: appearance.draggable ?? false,
        allow_close: appearance.allow_close ?? false,
        z_index: appearance.z_index || '2147483647',
        show_title: appearance.show_title ?? true,
      },
      { border_color: appearance.primary_color },
    );
  }, [appearance, device]);

  const carouselCfg = useMemo(() => {
    if (!appearance) return null;
    const raw = parseJsonIfNeeded<ResponsiveConfig<CarouselConfig>>(
      appearance.carousel_config,
    );
    if (raw) {
      const cfg = getResponsiveValue(raw, device, raw.desktop);
      return normalizeCarouselConfig(cfg);
    }
    return normalizeCarouselConfig({
      spacing: appearance.carousel_spacing ?? 16,
      shape: appearance.carousel_shape || appearance.widget_shape || 'portrait',
      visible_items: appearance.carousel_visible_items ?? 4,
      show_product: appearance.carousel_show_product ?? true,
      show_play_icon: appearance.carousel_show_play_button ?? true,
      auto_center: appearance.carousel_auto_center ?? true, // 🔧 CORREÇÃO #5
      width: appearance.carousel_size || appearance.width || '80',
      border_color:
        appearance.carousel_border_color || appearance.primary_color || '#0094EB',
      border_style: appearance.carousel_border_width || '2',
      border_radius: appearance.carousel_border_radius || '12',
      object_fit: appearance.carousel_object_fit || 'cover',
      margin_top: appearance.carousel_margin_top || '0', // 🔧 CORREÇÃO #5
      margin_bottom: appearance.carousel_margin_bottom || '0', // 🔧 CORREÇÃO #5
      show_title: appearance.carousel_show_title ?? false, // 🔧 CORREÇÃO #5
    });
  }, [appearance, device]);

  const gridCfg = useMemo(() => {
    if (!appearance) return null;
    const raw = parseJsonIfNeeded<ResponsiveConfig<GridConfig>>(
      appearance.grid_config,
    );
    if (raw) {
      const cfg = getResponsiveValue(raw, device, raw.desktop);
      return normalizeGridConfig(cfg);
    }
    return normalizeGridConfig({
      visible_items: safeNumber(appearance.grid_columns ?? appearance.desktop_columns, 4),
      rows: safeNumber(appearance.grid_rows ?? appearance.desktop_rows, 1),
      spacing: safeNumber(appearance.grid_spacing ?? appearance.desktop_gap, 16),
      shape: appearance.grid_shape || 'portrait',
      width: appearance.grid_size || '80',
      border_color:
        appearance.grid_border_color || appearance.primary_color || '#0094EB',
      border_style: appearance.grid_border_width || '2',
      border_radius: appearance.grid_border_radius || '12',
      object_fit: appearance.grid_object_fit || 'cover',
      show_title: appearance.grid_show_title ?? false,
    });
  }, [appearance, device]);

  const modalCfg = useMemo(() => {
    if (!appearance) return null;
    const raw = parseJsonIfNeeded<ModalConfig>(appearance.modal_config);
    return normalizeModalConfig(raw, appearance);
  }, [appearance]);

  const primaryColor = appearance?.primary_color || '#0094EB';
  const secondaryColor = appearance?.secondary_color || '#0094EB';
  const textColor = appearance?.text_color || '#FFFFFF';
  const buttonColor = appearance?.button_color || '#0094EB';
  const fontFamily = appearance?.font_family || 'Inter, sans-serif'; // 🔧 CORREÇÃO #6
  const fontSize = cssSize(appearance?.font_size, '14px'); // 🔧 CORREÇÃO #6

  const activeStory = stories[activeStoryIndex] || null;
  const activeProduct = activeStory
    ? products[activeStory.product_id]
    : null;

  // ──── Handlers ────

  const openPlayer = (index: number) => {
    setActiveStoryIndex(index);
    setShowPlayer(true);
    setIsPlaying(true);
    setLiked(false);
  };

  const closePlayer = () => {
    setShowPlayer(false);
    setIsPlaying(false);
    setShowComments(false);
    setShowShare(false);
    setShowSizing(false);
    setShowProductDetail(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const prevStory = () => {
    setActiveStoryIndex(prev => (prev > 0 ? prev - 1 : stories.length - 1));
    setIsPlaying(true);
  };

  const nextStory = () => {
    setActiveStoryIndex(prev => (prev < stories.length - 1 ? prev + 1 : 0));
    setIsPlaying(true);
  };

  const toggleLike = () => setLiked(prev => !prev);
  const toggleComments = () => {
    setShowComments(prev => !prev);
    setShowShare(false);
    setShowSizing(false);
    setShowProductDetail(false);
  };
  const toggleShare = () => {
    setShowShare(prev => !prev);
    setShowComments(false);
    setShowSizing(false);
    setShowProductDetail(false);
  };
  const toggleSizing = () => {
    setShowSizing(prev => !prev);
    setShowComments(false);
    setShowShare(false);
    setShowProductDetail(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ──── Render: Floating Widget ────

  const renderFloatingWidget = () => {
    if (!floatingCfg) return null;
    const f = floatingCfg;
    const isCircle = f.shape === 'circle';
    const width = cssSize(f.width, '80px');
    const height = cssSize(f.height, '142px');
    const circleSize = cssSize(f.border_radius || f.width, '80px');
    const finalWidth = isCircle ? circleSize : width;
    const finalHeight = isCircle ? circleSize : height;

    // 🔧 CORREÇÃO #1: posição já normalizada
    const pos = normalizePositionForPreview(
      f.floating_position || f.position || 'bottom-right',
    );

    let positionClasses = 'bottom-4 right-4';
    if (pos.includes('top-left')) positionClasses = 'top-4 left-4';
    else if (pos.includes('top-right')) positionClasses = 'top-4 right-4';
    else if (pos.includes('bottom-left')) positionClasses = 'bottom-4 left-4';
    // else: bottom-right (default)

    const bottomPx = cssSize(f.bottom_spacing, '20px');
    const topPx = cssSize(f.top_spacing, '20px');
    const sidePx = cssSize(f.left_spacing, '20px');

    return (
      <div
        className={cn('absolute', positionClasses)}
        style={{
          bottom: pos.includes('bottom') ? bottomPx : undefined,
          top: pos.includes('top') ? topPx : undefined,
          left: pos.includes('left') ? sidePx : undefined,
          right: pos.includes('right') ? sidePx : undefined,
          zIndex: safeNumber(f.z_index, 9999),
          width: finalWidth,
          height: finalHeight,
          borderRadius: isCircle ? '999px' : cssSize(f.border_radius, '12px'),
          border: cssBorder(f.border_style, f.border_color),
          overflow: 'hidden',
          cursor: 'pointer',
          background: `linear-gradient(160deg, ${primaryColor}, ${secondaryColor})`,
          // 🔧 CORREÇÃO #5: draggable (visual apenas, sem lógica de arrasto completa)
          userSelect: f.draggable ? 'none' : undefined,
          touchAction: f.draggable ? 'none' : undefined,
        }}
        onClick={() => openPlayer(0)}
      >
        {/* 🔧 CORREÇÃO #5: botão fechar */}
        {f.allow_close && (
          <div className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-600" onClick={(e) => { e.stopPropagation(); }}>
            <X size={12} />
          </div>
        )}
        {f.show_play_icon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
              <Play size={14} />
            </div>
          </div>
        )}
        {/* 🔧 CORREÇÃO #5: título no flutuante */}
        {f.show_title && (
          <div className="absolute bottom-1.5 left-2 right-2 z-10">
            <p className="truncate text-[10px] font-bold text-white drop-shadow" style={{ fontFamily }}>
              {activeStory?.title || 'Story'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ──── Render: Carousel ────

  const renderCarousel = () => {
    if (!carouselCfg || stories.length === 0) return null;
    const c = carouselCfg;
    const isCircle = c.shape === 'circle';
    const isPortrait = c.shape === 'portrait';
    const cardWidthPx = safeNumber(parseFloat(c.width || '80'), 80);
    const cardWidth = `${cardWidthPx}px`;
    const cardHeightPx = isPortrait ? Math.round((cardWidthPx * 16) / 9) : cardWidthPx;
    const cardHeight = `${cardHeightPx}px`;
    const borderRadius = isCircle ? '50%' : cssSize(c.border_radius, '12px');

    return (
      <div
        className="w-full overflow-x-auto py-3"
        style={{
          marginTop: cssSize(c.margin_top, '0px'), // 🔧 CORREÇÃO #5
          marginBottom: cssSize(c.margin_bottom, '0px'), // 🔧 CORREÇÃO #5
        }}
      >
        <div
          className={cn(
            'flex',
            c.auto_center ? 'justify-center' : 'justify-start', // 🔧 CORREÇÃO #5
          )}
          style={{ gap: `${c.spacing}px`, padding: '0 16px' }}
        >
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="relative shrink-0 cursor-pointer overflow-hidden shadow-sm transition-transform hover:scale-105"
              style={{
                width: cardWidth,
                height: cardHeight,
                minWidth: cardWidth,
                flexShrink: 0,
                borderRadius,
                border: `${safeNumber(c.border_style, 2)}px solid ${c.border_color}`,
                background:
                  index % 2 === 0
                    ? `linear-gradient(160deg, ${primaryColor}, ${secondaryColor})`
                    : `linear-gradient(160deg, ${secondaryColor}, ${primaryColor})`,
              }}
              onClick={() => openPlayer(index)}
            >
              {/* 🔧 CORREÇÃO #5: object_fit aplicado via background + img */}
              {story.thumbnail_url && (
                <img
                  src={story.thumbnail_url}
                  alt={story.title || ''}
                  className="absolute inset-0 h-full w-full"
                  style={{ objectFit: c.object_fit as any }}
                />
              )}
              {c.show_play_icon && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                    <Play size={16} />
                  </div>
                </div>
              )}
              {/* 🔧 CORREÇÃO #5: produto + título no carrossel */}
              {c.show_product && !isCircle && (
                <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-center text-[10px] font-bold text-slate-700" style={{ fontFamily }}>
                  {story.title || 'Produto'}
                </div>
              )}
              {c.show_title && !isCircle && (
                <div className="absolute top-2 left-2 right-2 z-10">
                  <p className="truncate text-[10px] font-bold text-white drop-shadow" style={{ fontFamily }}>
                    {story.title || ''}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ──── Render: Grid ────

  const renderGrid = () => {
    if (!gridCfg || stories.length === 0) return null;
    const g = gridCfg;
    const cols = Math.min(g.visible_items, 10);
    const isCircle = g.shape === 'circle';
    const isPortrait = g.shape === 'portrait';
    const borderRadius = isCircle ? '999px' : cssSize(g.border_radius, '12px');

    return (
      <div
        className="grid w-full px-4 py-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: `${g.spacing}px`,
        }}
      >
        {stories.slice(0, 20).map((story, index) => (
          <div
            key={story.id}
            className="relative cursor-pointer overflow-hidden shadow-sm transition-transform hover:scale-105"
            style={{
              aspectRatio: isPortrait ? '9/16' : '1/1',
              borderRadius,
              border: `${safeNumber(g.border_style, 2)}px solid ${g.border_color}`,
              background:
                index % 2 === 0
                  ? `linear-gradient(160deg, ${primaryColor}, ${secondaryColor})`
                  : `linear-gradient(160deg, ${secondaryColor}, ${primaryColor})`,
            }}
            onClick={() => openPlayer(index)}
          >
            {story.thumbnail_url && (
              <img
                src={story.thumbnail_url}
                alt={story.title || ''}
                className="absolute inset-0 h-full w-full"
                style={{ objectFit: g.object_fit as any }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0094EB] shadow-sm">
                <Play size={14} />
              </div>
            </div>
            {g.show_title && !isCircle && (
              <div className="absolute bottom-1.5 left-2 right-2 z-10">
                <p className="truncate text-[10px] font-bold text-white drop-shadow" style={{ fontFamily }}>
                  {story.title || ''}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ──── Render: Player / Modal ────

  const renderPlayer = () => {
    if (!showPlayer || !activeStory || !modalCfg) return null;
    const m = modalCfg;
    const borderW = safeNumber(m.border_width, 0);

    // 🔧 CORREÇÃO #3: verifica se tem modelData para mostrar botão de medidas
    const hasSizing = activeStory.model_data || activeStory.modelData;

    return (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
        style={{ fontFamily }} // 🔧 CORREÇÃO #6
      >
        {/* Container do player */}
        <div
          className="relative mx-auto flex h-full max-h-[90vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[1.5rem] bg-black"
          style={{
            borderColor: m.border_color || primaryColor,
            borderWidth: borderW > 0 ? `${borderW}px` : '0px',
            borderStyle: borderW > 0 ? 'solid' : 'none',
            borderRadius: cssSize(m.border_radius, '1.5rem'),
          }}
        >
          {/* Área do vídeo */}
          <div className="relative flex-1 bg-black">
            {activeStory.video_url ? (
              <video
                ref={videoRef}
                src={activeStory.video_url}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={nextStory}
              />
            ) : activeStory.thumbnail_url ? (
              <img
                src={activeStory.thumbnail_url}
                alt={activeStory.title || ''}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(160deg, ${primaryColor}, ${secondaryColor})`,
                }}
              />
            )}

            {/* Overlay gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

            {/* Título + fechar */}
            <div className="absolute left-4 right-4 top-4 z-30 flex items-start justify-between">
              {m.show_title && activeStory.title && (
                <h2
                  className="line-clamp-1 text-base font-bold text-white drop-shadow"
                  style={{ fontSize }} // 🔧 CORREÇÃO #6
                >
                  {activeStory.title}
                </h2>
              )}
              <button
                onClick={closePlayer}
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navegação */}
            {stories.length > 1 && (
              <>
                <button
                  onClick={prevStory}
                  className="absolute left-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-2xl text-white backdrop-blur"
                >
                  ‹
                </button>
                <button
                  onClick={nextStory}
                  className="absolute right-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-2xl text-white backdrop-blur"
                >
                  ›
                </button>
              </>
            )}

            {/* Play/Pause central */}
            {m.show_play_button && activeStory.video_url && (
              <button
                onClick={togglePlay}
                className="absolute left-1/2 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            )}

            {/* Botões sociais */}
            <div className="absolute bottom-28 right-3 z-30 flex flex-col gap-3">
              {m.show_like_button && (
                <button
                  onClick={toggleLike}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur"
                >
                  <Heart
                    size={18}
                    className={cn(
                      liked && 'fill-red-500 text-red-500',
                    )}
                  />
                </button>
              )}
              {m.show_comment_button && (
                <button
                  onClick={toggleComments}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur"
                >
                  <MessageCircle size={18} />
                </button>
              )}
              {m.show_share_button && (
                <button
                  onClick={toggleShare}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur"
                >
                  <Share2 size={18} />
                </button>
              )}
              {/* 🔧 CORREÇÃO #3: botão de medidas condicional */}
              {m.show_sizing_button && hasSizing && (
                <button
                  onClick={toggleSizing}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur"
                >
                  <Ruler size={18} />
                </button>
              )}
            </div>

            {/* Card do produto */}
            {m.show_product && activeProduct && (
              <div className="absolute bottom-2 left-3 right-3 z-40 rounded-xl border border-white/10 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 shrink-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-bold"
                      style={{ fontFamily }}
                    >
                      {activeProduct.name || activeStory.title}
                    </p>
                    {activeProduct.price && (
                      <p className="text-sm font-bold" style={{ color: primaryColor }}>
                        {activeProduct.price}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {m.show_product_button && (
                        <button
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white"
                          style={{ backgroundColor: buttonColor }}
                          onClick={() => setShowProductDetail(true)}
                        >
                          <ShoppingBag size={12} className="mr-1 inline" />
                          Ver produto
                        </button>
                      )}
                      {/* 🔧 CORREÇÃO #2: botão WhatsApp condicional */}
                      {m.show_product_whatsapp_button && (
                        <button
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white"
                          style={{ backgroundColor: '#25D366' }}
                          onClick={() => {
                            if (activeProduct?.whatsapp_number) {
                              const message = encodeURIComponent(
                                `Olá! Tenho interesse no produto: ${activeProduct.name || activeStory.title}`,
                              );
                              window.open(
                                `https://wa.me/${activeProduct.whatsapp_number}?text=${message}`,
                                '_blank',
                              );
                            }
                          }}
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Painel de comentários */}
            {showComments && (
              <div className="absolute inset-0 z-50 flex flex-col bg-white">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="text-base font-bold text-slate-900">Comentários</h3>
                  <button onClick={toggleComments} className="text-slate-500">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-sm text-slate-500">Nenhum comentário ainda.</p>
                </div>
              </div>
            )}

            {/* Painel de compartilhar */}
            {showShare && (
              <div className="absolute inset-0 z-50 flex flex-col bg-white">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="text-base font-bold text-slate-900">Compartilhar</h3>
                  <button onClick={toggleShare} className="text-slate-500">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 p-4">
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="mb-2 text-xs text-slate-500">Link do story:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-white p-2 text-xs">
                        {window.location.href}
                      </code>
                      <button
                        onClick={copyLink}
                        className="rounded-lg bg-[#0094EB] p-2 text-white"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Painel de medidas */}
            {showSizing && hasSizing && (
              <div className="absolute inset-0 z-50 flex flex-col bg-white">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="text-base font-bold text-slate-900">Tabela de Medidas</h3>
                  <button onClick={toggleSizing} className="text-slate-500">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {activeStory.model_data ? (
                    <pre className="whitespace-pre-wrap text-sm text-slate-700">
                      {typeof activeStory.model_data === 'string'
                        ? activeStory.model_data
                        : JSON.stringify(activeStory.model_data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhuma medida cadastrada para este produto.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Indicador de progresso */}
            {stories.length > 1 && (
              <div className="absolute left-3 right-3 top-2 z-30 flex gap-1">
                {stories.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-0.5 flex-1 rounded-full bg-white/30"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full bg-white transition-all',
                        idx === activeStoryIndex ? 'w-full' : 'w-0',
                        idx < activeStoryIndex ? 'w-full' : '',
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ──── Loading ────

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // ──── Render principal ────

  return (
    <div
      className="relative min-h-screen bg-black text-white"
      style={{ fontFamily }} // 🔧 CORREÇÃO #6
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <h1 className="text-lg font-bold text-white">Preview da Loja</h1>
          <p className="text-xs text-slate-400">
            {appearance?.name || 'Estilo padrão'}
          </p>
        </div>

        {/* Toggle device */}
        <div className="flex rounded-lg border border-white/20 bg-white/5 p-0.5">
          <button
            onClick={() => setDevice('desktop')}
            className={cn(
              'rounded-md px-4 py-2 text-xs font-bold transition',
              device === 'desktop'
                ? 'bg-[#0094EB] text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Desktop
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={cn(
              'rounded-md px-4 py-2 text-xs font-bold transition',
              device === 'mobile'
                ? 'bg-[#0094EB] text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Área de preview com max-width simulando dispositivo */}
      <div
        className={cn(
          'relative mx-auto min-h-[80vh] bg-black',
          device === 'mobile' ? 'max-w-[390px]' : 'max-w-[1200px]',
        )}
      >
        {/* Conteúdo simulado da loja */}
        <div className="p-5">
          <div className="mb-6 h-3 w-32 rounded-full bg-white/10" />
          <div className="mb-8 h-3 w-48 rounded-full bg-white/5" />

          {/* Grid de placeholders */}
          <div className="mb-10 grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>

        {/* Carrossel */}
        {renderCarousel()}

        {/* Grade */}
        {renderGrid()}

        {/* Widget Flutuante */}
        {renderFloatingWidget()}

        {/* Player/Modal */}
        {renderPlayer()}
      </div>

      {/* Footer info */}
      <div className="border-t border-white/10 p-4 text-center text-xs text-slate-500">
        Preview — {device === 'desktop' ? 'Desktop' : 'Mobile'} •{' '}
        {stories.length} stories •{' '}
        <span style={{ color: primaryColor }}>
          {appearance?.name || 'Sem estilo'}
        </span>
      </div>
    </div>
  );
};

export default StoryPreviewPage;
