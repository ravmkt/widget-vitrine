"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, Story, Video, resolveStoreId, generateUuid } from '@/lib/db';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

/* ═══════════════════ EMOJIS ═══════════════════ */

const EMOJIS = ['😍','🔥','👏','❤️','😂','😱','🙌','💯','✨','😢','🤔','👍','💪','🎉','😊','🥰','😎','🙏','💙','⭐','✅','😡','👀','🤩'];

type LikeMap = Record<string, { liked: boolean; count: number }>;

type StoryComment = {
  id?: string; store_id?: string; story_id?: string;
  video_id?: string; videoId?: string;
  user_name?: string; name?: string; text: string;
  status?: string; created_at?: string; createdAt?: string; updated_at?: string;
};

/* ═══════════════════ HELPERS GERAIS ═══════════════════ */

const readLikes = (): LikeMap => { try { return JSON.parse(localStorage.getItem('story_video_likes')||'{}'); } catch { return {}; } };
const saveLikes = (l: LikeMap) => localStorage.setItem('story_video_likes', JSON.stringify(l));
const readLocalComments = (): StoryComment[] => { try { return JSON.parse(localStorage.getItem('story_video_comments')||'[]'); } catch { return []; } };
const saveLocalComments = (c: StoryComment[]) => localStorage.setItem('story_video_comments', JSON.stringify(c));

const getVideoUrl = (v?: Video|null) => { const i=v as any; return i?.video_url||i?.videoUrl||i?.url||''; };
const getVideoPoster = (v?: Video|null) => { const i=v as any; return i?.thumbnail_url||i?.thumbnailUrl||i?.poster_url||i?.posterUrl||i?.image_url||i?.imageUrl||''; };
const getCommentVid = (c: StoryComment) => c.video_id||c.videoId||'';
const getCommentName = (c: StoryComment) => c.user_name||c.name||'Cliente';

const getAllSafe = async <T,>(col: any, sid?: string): Promise<T[]> => {
  if (!col?.getAll) return [];
  try { return sid ? await col.getAll(sid) : await col.getAll(); }
  catch { try { return await col.getAll(); } catch { return []; } }
};
const getByIdSafe = async <T,>(col: any, id?: string|null, sid?: string): Promise<T|null> => {
  if (!col?.getById||!id) return null;
  try { return sid ? await col.getById(id,sid) : await col.getById(id); }
  catch { try { return await col.getById(id); } catch { return null; } }
};

const parseMeasures = (m: any): any[] => {
  if (!m) return [];
  if (Array.isArray(m.measures)) return m.measures;
  if (Array.isArray(m.measurements)) return m.measurements;
  if (typeof m.measures==='string') { try { const p=JSON.parse(m.measures); if (Array.isArray(p)) return p; } catch {} }
  return [];
};

/* ═══════════════════ HELPERS DE CONFIG (idêntico ao widget.js) ═══════════════════ */

const getDevice = (): 'mobile' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
};

/** Réplica exata de readJsonbConfigValue do widget.js */
function readJsonbConfigValue(configObj: any, fieldName: string, fallback?: any): any {
  if (configObj === undefined || configObj === null) return fallback;
  if (typeof configObj === 'string') {
    try { configObj = JSON.parse(configObj); } catch { return fallback; }
  }
  if (typeof configObj !== 'object' || Array.isArray(configObj)) return fallback;

  if (configObj[fieldName] !== undefined && configObj[fieldName] !== null && configObj[fieldName] !== '') {
    return configObj[fieldName];
  }

  const device = getDevice();
  const sameAll = configObj.same_for_all;

  if (sameAll === true || sameAll === undefined || sameAll === null) {
    if (configObj.desktop && configObj.desktop[fieldName] !== undefined && configObj.desktop[fieldName] !== null && configObj.desktop[fieldName] !== '') {
      return configObj.desktop[fieldName];
    }
    if (configObj.mobile && configObj.mobile[fieldName] !== undefined && configObj.mobile[fieldName] !== null && configObj.mobile[fieldName] !== '') {
      return configObj.mobile[fieldName];
    }
    return fallback;
  }

  const deviceConfig = configObj[device];
  if (deviceConfig && deviceConfig[fieldName] !== undefined && deviceConfig[fieldName] !== null && deviceConfig[fieldName] !== '') {
    return deviceConfig[fieldName];
  }
  const otherDevice = device === 'mobile' ? 'desktop' : 'mobile';
  const otherConfig = configObj[otherDevice];
  if (otherConfig && otherConfig[fieldName] !== undefined && otherConfig[fieldName] !== null && otherConfig[fieldName] !== '') {
    return otherConfig[fieldName];
  }
  return fallback;
}

/** Réplica exata de readConfigValue do widget.js */
function readConfigValue(appearance: any, configKey: string, jsonbField: string, flatField: string | null, fallback?: any): any {
  const raw = appearance?.[configKey];
  const jsonbVal = readJsonbConfigValue(raw, jsonbField, undefined);
  if (jsonbVal !== undefined && jsonbVal !== null && jsonbVal !== '') return jsonbVal;
  if (flatField) {
    const flatVal = appearance?.[flatField];
    if (flatVal !== undefined && flatVal !== null && flatVal !== '') return flatVal;
  }
  return fallback;
}

const toBoolean = (value: any, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 1 || value === '1') return true;
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase();
    if (n === 'true') return true;
    if (n === 'false') return false;
  }
  if (value === false || value === 0 || value === '0') return false;
  return fallback;
};

const toNumber = (value: any, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value).trim().replace('px', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeInt = (value: any, fallback: number): number => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

/** Converte shape em aspect-ratio CSS — mesma lógica do widget.js */
const shapeToAspectRatioWidget = (shape: string): string => {
  const s = (shape || 'portrait').toLowerCase();
  if (s.indexOf('landscape') !== -1 || s.indexOf('16_9') !== -1 || s.indexOf('16-9') !== -1) return '16 / 9';
  if (s.indexOf('square') !== -1 || s.indexOf('1_1') !== -1 || s.indexOf('1-1') !== -1 || s === 'circle') return '1 / 1';
  return '9 / 16';
};

const normalizeFloatingPosition = (value: any): string => {
  const key = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (key === 'fixed-top-left' || key === 'top-left') return 'top-left';
  if (key === 'fixed-top-right' || key === 'top-right') return 'top-right';
  if (key === 'fixed-bottom-left' || key === 'bottom-left') return 'bottom-left';
  if (key === 'fixed-bottom-right' || key === 'bottom-right') return 'bottom-right';
  return 'bottom-right';
};

const normalizeFloatingShape = (value: any): string => {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'square' || key === 'quadrado') return 'square';
  if (key === 'circle' || key === 'circulo' || key === 'redondo') return 'circle';
  return 'portrait';
};

const FLOATING_POS_CLASS: Record<string, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

/* ═══════════════════ ÍCONES SVG ═══════════════════ */

const SvgClose = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const SvgCloseSmall = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const SvgPlay = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>);
const SvgPause = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>);
const SvgVolume = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03z"/></svg>);
const SvgVolumeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z"/><line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" strokeWidth="2"/></svg>);
const SvgHeart = ({filled}:{filled:boolean}) => (<svg width="18" height="18" viewBox="0 0 24 24" fill={filled?'#ff3040':'none'} stroke={filled?'#ff3040':'currentColor'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>);
const SvgComment = ({filled}:{filled:boolean}) => (<svg width="18" height="18" viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>);
const SvgShare = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>);
const SvgRuler = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4Z"/><line x1="7.5" y1="10.5" x2="9.5" y2="12.5"/><line x1="10.5" y1="7.5" x2="12.5" y2="9.5"/><line x1="13.5" y1="4.5" x2="15.5" y2="6.5"/></svg>);
const SvgWhatsApp = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>);
const SvgChevronLeft = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>);
const SvgChevronRight = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>);
/* ═══════════════════ COMPONENTE PRINCIPAL ═══════════════════ */

const StoryPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeStoreId = searchParams.get('storeId') || undefined;
  const queryVideoId = searchParams.get('videoId') || undefined;

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [storeName, setStoreName] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [appearance, setAppearance] = useState<any>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [model, setModel] = useState<any>(null);
  const [modelOpen, setModelOpen] = useState(false);

  const [floatingDismissed, setFloatingDismissed] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sharePanelRef = useRef<HTMLDivElement | null>(null);

  const video = videos[activeIdx] || null;
  const currentUrl = getVideoUrl(video);
  const posterUrl = getVideoPoster(video);
  const modelData = useMemo(() => parseMeasures(model), [model]);

  /* ════════════════ COLORS ═══════════════════ */
  const colors = useMemo(() => {
    const a = appearance || {};
    const primary = readConfigValue(a, 'colors_config', 'primary_color', 'primary_color', '#0094EB') || '#0094EB';
    const secondary = readConfigValue(a, 'colors_config', 'secondary_color', 'secondary_color', '#111827') || '#111827';
    const btn = readConfigValue(a, 'colors_config', 'button_color', 'button_color', primary) || primary;
    const bg = readConfigValue(a, 'colors_config', 'background_color', 'background_color', '#ffffff') || '#ffffff';
    const text = readConfigValue(a, 'colors_config', 'text_color', 'text_color', '#0f172a') || '#0f172a';
    const modalBg = readConfigValue(a, 'colors_config', 'modal_background_color', 'modal_background_color', '#000000') || '#000000';
    const modalText = readConfigValue(a, 'colors_config', 'modal_text_color', 'modal_text_color', '#ffffff') || '#ffffff';
    const modalBorder = readConfigValue(a, 'colors_config', 'modal_border_color', 'modal_border_color', 'rgba(255,255,255,.15)') || 'rgba(255,255,255,.15)';
    return { primary, secondary, btn, bg, text, modalBg, modalText, modalBorder };
  }, [appearance]);

  /* ════════════════ DISPLAY MODE ═══════════════════ */
  const displayMode = useMemo(() => {
    const a = appearance || {};
    const mode = String(readConfigValue(a, 'display_config', 'display_mode', 'display_mode', 'floating') || 'floating').toLowerCase();
    return mode;
  }, [appearance]);

  const isFloating = displayMode === 'floating' || displayMode === 'flutuante';
  const isCarousel = displayMode === 'carousel' || displayMode === 'carrossel';
  const isGrid = displayMode === 'grid' || displayMode === 'grade';

  /* ════════════════ modalCfg ═══════════════════ */
  const modalCfg = useMemo(() => {
    const a = appearance || {};
    return {
      show_title: toBoolean(readConfigValue(a, 'modal_config', 'show_title', 'modal_show_title', true), true),
      show_play: toBoolean(readConfigValue(a, 'modal_config', 'show_play_button', 'modal_show_play_button', true), true),
      show_product: toBoolean(readConfigValue(a, 'modal_config', 'show_product', 'modal_show_product', true), true),
      show_product_btn: toBoolean(readConfigValue(a, 'modal_config', 'show_product_button', 'modal_show_product_button', true), true),
      show_like: toBoolean(readConfigValue(a, 'modal_config', 'show_like_button', 'modal_show_like_button', true), true),
      show_comment: toBoolean(readConfigValue(a, 'modal_config', 'show_comment_button', 'modal_show_comment_button', true), true),
      show_share: toBoolean(readConfigValue(a, 'modal_config', 'show_share_button', 'modal_show_share_button', true), true),
      show_whatsapp: toBoolean(readConfigValue(a, 'modal_config', 'show_whatsapp_button', 'modal_show_whatsapp_button', true), true),
      show_sizing: toBoolean(readConfigValue(a, 'modal_config', 'show_sizing_button', 'modal_show_sizing_button', true), true),
      hide_stories: toBoolean(readConfigValue(a, 'modal_config', 'hide_stories', 'modal_hide_stories', false), false),
      shadow: toBoolean(readConfigValue(a, 'modal_config', 'shadow_enabled', 'modal_shadow_enabled', true), true),
      border_color: readConfigValue(a, 'modal_config', 'border_color', 'modal_border_color', '') || '',
      border_width: String(readConfigValue(a, 'modal_config', 'border_width', 'modal_border_width', '') || ''),
      border_radius: String(readConfigValue(a, 'modal_config', 'border_radius', 'modal_border_radius', '') || ''),
    };
  }, [appearance]);

  /* ════════════════ floatingCfg ═══════════════════ */
  const floatingCfg = useMemo(() => {
    const a = appearance || {};
    const raw = a.floating_config;
    const pos = normalizeFloatingPosition(readJsonbConfigValue(raw, 'floating_position', 'bottom-right'));
    const shape = normalizeFloatingShape(readJsonbConfigValue(raw, 'shape', 'portrait'));
    const width = toNumber(readJsonbConfigValue(raw, 'width', '80'), 80);
    const height = (shape === 'square' || shape === 'circle') ? width : Math.round(width * 16 / 9);

    let radius = toNumber(readJsonbConfigValue(raw, 'border_radius', '12'), 12);
    if (shape === 'circle') radius = 999;

    const borderW = safeInt(readJsonbConfigValue(raw, 'border_style', '2'), 2);
    const marginTop = toNumber(readJsonbConfigValue(raw, 'top_spacing', '20'), 20);
    const marginBottom = toNumber(readJsonbConfigValue(raw, 'bottom_spacing', '20'), 20);
    const marginSide = toNumber(readJsonbConfigValue(raw, 'left_spacing', '20'), 20);
    const borderColor = readJsonbConfigValue(raw, 'border_color', colors.primary) || colors.primary;

    return {
      shape,
      position: pos,
      width,
      height,
      border_width: borderW,
      border_radius: radius,
      border_color: borderColor,
      margin_top: marginTop,
      margin_bottom: marginBottom,
      margin_side: marginSide,
      show_play: toBoolean(readJsonbConfigValue(raw, 'show_play_icon', 'true'), true),
      show_close: toBoolean(readJsonbConfigValue(raw, 'allow_close', 'true'), true),
      show_title: toBoolean(readJsonbConfigValue(raw, 'show_title', 'true'), true),
    };
  }, [appearance, colors.primary]);

  const floatingPos = FLOATING_POS_CLASS[floatingCfg.position] || FLOATING_POS_CLASS['bottom-right'];

  /* ════════════════ carouselCfg ═══════════════════ */
  const carouselCfg = useMemo(() => {
    const a = appearance || {};
    const raw = a.carousel_config;
    const shape = String(readJsonbConfigValue(raw, 'shape', 'portrait') || 'portrait').toLowerCase().trim();
    const isCircle = shape === 'circle';

    const visible = safeInt(readJsonbConfigValue(raw, 'visible_items', '4'), 4);
    const gap = safeInt(readJsonbConfigValue(raw, 'spacing', '16'), 16);
    const borderColor = readJsonbConfigValue(raw, 'border_color', colors.primary) || colors.primary;
    const borderW = safeInt(readJsonbConfigValue(raw, 'border_style', '2'), 2);
    const borderRadius = safeInt(readJsonbConfigValue(raw, 'border_radius', '12'), 12);
    const objectFit = String(readJsonbConfigValue(raw, 'object_fit', 'cover') || 'cover').toLowerCase();
    const showTitle = toBoolean(readJsonbConfigValue(raw, 'show_title', false), false);
    const showProduct = toBoolean(readJsonbConfigValue(raw, 'show_product', true), true);
    const showPlayButton = toBoolean(readJsonbConfigValue(raw, 'show_play_icon', true), true);
    const autoCenter = toBoolean(readJsonbConfigValue(raw, 'auto_center', false), false);

    return {
      shape, isCircle,
      visible, gap,
      border: borderColor,
      borderW,
      radius: isCircle ? 999 : borderRadius,
      objectFit,
      showTitle, showProduct, showPlayButton, autoCenter,
      aspectRatio: shapeToAspectRatioWidget(shape),
    };
  }, [appearance, colors.primary]);

  /* ════════════════ gridCfg ═══════════════════ */
  const gridCfg = useMemo(() => {
    const a = appearance || {};
    const raw = a.grid_config;
    const shape = String(readJsonbConfigValue(raw, 'shape', 'portrait') || 'portrait').toLowerCase().trim();
    const isCircle = shape === 'circle';

    const cols = safeInt(readJsonbConfigValue(raw, 'columns', readJsonbConfigValue(raw, 'visible_items', '4')), 4);
    const rows = safeInt(readJsonbConfigValue(raw, 'rows', '1'), 1);
    const gap = safeInt(readJsonbConfigValue(raw, 'spacing', readJsonbConfigValue(raw, 'gap', '16')), 16);
    const borderColor = readJsonbConfigValue(raw, 'border_color', colors.primary) || colors.primary;
    const borderW = safeInt(readJsonbConfigValue(raw, 'border_style', '2'), 2);
    const borderRadius = safeInt(readJsonbConfigValue(raw, 'border_radius', '12'), 12);
    const objectFit = String(readJsonbConfigValue(raw, 'object_fit', 'cover') || 'cover').toLowerCase();
    const showTitle = toBoolean(readJsonbConfigValue(raw, 'show_title', false), false);

    return {
      shape, isCircle,
      cols, rows, gap,
      border: borderColor,
      borderW,
      radius: isCircle ? 999 : borderRadius,
      objectFit,
      showTitle,
      aspectRatio: shapeToAspectRatioWidget(shape),
    };
  }, [appearance, colors.primary]);
