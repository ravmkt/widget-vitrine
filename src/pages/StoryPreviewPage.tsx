"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, Story, Video, resolveStoreId, generateUuid } from '@/lib/db';
import { supabase } from '@/lib/supabase'; // ajuste o caminho conforme seu projeto
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

  /* ════════════════ CARREGAMENTO DE DADOS ═══════════════════ */
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data: st, error } = await supabase
          .from('stories')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!active) return;
        setStory(st);
        setStoreId(st.store_id || routeStoreId);

        const { data: sto } = await supabase
          .from('stores')
          .select('name')
          .eq('id', st.store_id)
          .single();
        if (sto?.name) setStoreName(sto.name);

        const { data: vids } = await supabase
          .from('story_videos')
          .select('*')
          .eq('story_id', id)
          .order('order_index', { ascending: true });
        setVideos(vids || []);

        const { data: settingsRow } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_id', st.store_id)
          .single();
        setSettings(settingsRow);

        const { data: appearanceRow } = await supabase
          .from('story_appearance_config')
          .select('*')
          .eq('store_id', st.store_id)
          .single();
        setAppearance(appearanceRow);

        if (queryVideoId) {
          const idx = (vids || []).findIndex(v => v.id === queryVideoId);
          if (idx >= 0) {
            setActiveIdx(idx);
            setPlayerOpen(true);
          }
        }

        const { data: likeRow } = await supabase
          .from('story_likes')
          .select('count')
          .eq('story_id', id)
          .maybeSingle();
        setLikeCount(likeRow?.count || 0);

      } catch (e) {
        console.error('Erro ao carregar preview:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!video?.id) return;
    (async () => {
      const { data } = await supabase
        .from('story_comments')
        .select('*')
        .eq('video_id', video.id)
        .order('created_at', { ascending: false });
      setComments(data || []);

      if (video.product_id) {
        const { data: prod } = await supabase
          .from('products')
          .select('*')
          .eq('id', video.product_id)
          .single();
        setProduct(prod);
      } else {
        setProduct(null);
      }
    })();
  }, [video?.id]);

  /* ════════════════ HANDLERS ═══════════════════ */
  const close = () => {
    if (playerOpen) {
      setPlayerOpen(false);
      setPlaying(false);
    } else {
      navigate(-1);
    }
  };

  const openPlayer = (idx: number) => {
    setActiveIdx(idx);
    setPlayerOpen(true);
    setPlaying(true);
    setVideoError(false);
  };

  const nextVideo = () => {
    if (activeIdx < videos.length - 1) {
      setActiveIdx(activeIdx + 1);
      setPlaying(true);
      setVideoError(false);
    } else {
      setPlayerOpen(false);
    }
  };

  const prevVideo = () => {
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
      setPlaying(true);
      setVideoError(false);
    }
  };

  const togglePlay = () => setPlaying(p => !p);
  const toggleMute = () => setMuted(m => !m);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikeCount(c => c + 1);
    await supabase.rpc('increment_story_like', { p_story_id: id });
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const payload = {
      video_id: video?.id,
      story_id: id,
      name: commentName.trim() || 'Anônimo',
      text: commentText.trim(),
    };
    const { data } = await supabase.from('story_comments').insert(payload).select().single();
    if (data) setComments(c => [data, ...c]);
    setCommentText('');
    setCommentSent(true);
    setTimeout(() => setCommentSent(false), 2000);
  };

  const shareUrl = `${window.location.origin}/story/${id}?videoId=${video?.id || ''}`;

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;

  const openModel = () => setModelOpen(true);

  const thumb0 = getVideoPoster(videos[0]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  /* ════════════════ SUBCOMPONENTES ═══════════════════ */
  const FloatingWidget = () => (
    <div
      className={`fixed z-40 cursor-pointer group transition-transform hover:scale-105 active:scale-95 ${floatingPos}`}
      style={{
        width: floatingCfg.width,
        height: floatingCfg.height,
        marginTop: floatingCfg.margin_top,
        marginBottom: floatingCfg.margin_bottom,
        marginLeft: floatingCfg.margin_side,
        marginRight: floatingCfg.margin_side,
      }}
      onClick={() => openPlayer(0)}
    >
      <div
        className="relative h-full w-full overflow-hidden shadow-xl"
        style={{
          borderRadius: `${floatingCfg.border_radius}px`,
          border: `${floatingCfg.border_width}px solid ${floatingCfg.border_color}`,
        }}
      >
        {thumb0 ? (
          <img src={thumb0} alt="Story" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black text-white"><SvgPlay/></div>
        )}
        {floatingCfg.show_play && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <SvgPlay />
          </div>
        )}
      </div>
      {floatingCfg.show_title && (
        <p className="mt-1.5 text-center text-[11px] font-semibold text-white line-clamp-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>
          {videos[0]?.title || story?.title || storeName || 'Story'}
        </p>
      )}
    </div>
  );

  const Carousel = () => (
    <div className="w-full max-w-5xl px-4 relative">
      <button onClick={close} className="absolute -top-2 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><SvgClose/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title || 'Stories'}</h2>
      {videos.length === 0 ? (
        <p className="text-center text-white/50">Nenhum vídeo.</p>
      ) : (
        <div className="flex overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ gap: `${carouselCfg.gap}px` }}>
          {videos.map((v, i) => {
            const thumb = getVideoPoster(v);
            const w = Math.round(100 / carouselCfg.visible);
            return (
              <button
                key={v.id || i}
                onClick={() => openPlayer(i)}
                className="relative flex-shrink-0 snap-center overflow-hidden transition-all hover:scale-[1.02]"
                style={{
                  width: `${w}%`,
                  minWidth: '140px',
                  aspectRatio: carouselCfg.aspectRatio,
                  borderRadius: carouselCfg.isCircle ? '50%' : `${carouselCfg.radius}px`,
                  border: `${carouselCfg.borderW}px solid ${carouselCfg.border}`,
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={v.title || ''} className="h-full w-full" style={{ objectFit: carouselCfg.objectFit as any }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><SvgPlay/></div>
                )}
                {carouselCfg.showPlayButton && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition">
                    <div className="text-white opacity-0 hover:opacity-100 transition"><SvgPlay/></div>
                  </div>
                )}
                {carouselCfg.showTitle && v.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4">
                    <p className="text-xs font-medium text-white line-clamp-2">{v.title}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const Grid = () => (
    <div className="w-full max-w-4xl px-4 relative">
      <button onClick={close} className="absolute -top-2 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><SvgClose/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title || 'Stories'}</h2>
      {videos.length === 0 ? (
        <p className="text-center text-white/50">Nenhum vídeo.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${gridCfg.cols}, 1fr)`, gap: `${gridCfg.gap}px` }}>
          {videos.map((v, i) => {
            const thumb = getVideoPoster(v);
            return (
              <button
                key={v.id || i}
                onClick={() => openPlayer(i)}
                className="group relative overflow-hidden transition-all hover:scale-[1.02]"
                style={{
                  aspectRatio: gridCfg.aspectRatio,
                  borderRadius: gridCfg.isCircle ? '50%' : `${gridCfg.radius}px`,
                  border: `${gridCfg.borderW}px solid ${gridCfg.border}`,
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={v.title || ''} className="h-full w-full" style={{ objectFit: gridCfg.objectFit as any }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><SvgPlay/></div>
                )}
                {gridCfg.showTitle && v.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4">
                    <p className="text-xs font-medium text-white line-clamp-2">{v.title}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const Player = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{ background: colors.modalBg }}
    >
      <div
        className="relative h-full w-full max-w-md overflow-hidden sm:h-[92vh] sm:rounded-2xl"
        style={{
          border: modalCfg.border_width ? `${modalCfg.border_width}px solid ${modalCfg.border_color}` : undefined,
          borderRadius: modalCfg.border_radius ? `${modalCfg.border_radius}px` : undefined,
          boxShadow: modalCfg.shadow ? '0 20px 60px rgba(0,0,0,.5)' : undefined,
        }}
      >
        {/* progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {videos.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < activeIdx ? '100%' : i === activeIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <button onClick={close} className="absolute top-6 right-3 z-20 text-white"><SvgClose/></button>

        {modalCfg.show_title && (
          <div className="absolute top-6 left-3 z-20 text-sm font-semibold text-white" style={{ color: colors.modalText }}>
            {storeName}
          </div>
        )}

        <div className="absolute inset-0" onClick={togglePlay}>
          {currentUrl && !videoError ? (
            <video
              ref={videoRef}
              src={currentUrl}
              poster={posterUrl}
              className="h-full w-full object-contain bg-black"
              autoPlay
              muted={muted}
              playsInline
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setProgress((el.currentTime / (el.duration || 1)) * 100);
              }}
              onEnded={nextVideo}
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white/50">
              Erro ao carregar vídeo
            </div>
          )}
        </div>

        {/* nav areas */}
        <div className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={prevVideo} />
        <div className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={nextVideo} />

        <button onClick={toggleMute} className="absolute bottom-24 right-3 z-20 text-white">
          {muted ? <SvgVolumeOff/> : <SvgVolume/>}
        </button>

        {/* right action bar */}
        <div className="absolute bottom-4 right-3 z-20 flex flex-col items-center gap-4">
          {modalCfg.show_like && (
            <button onClick={handleLike} className="flex flex-col items-center text-white">
              <SvgHeart filled={liked} />
              <span className="text-xs">{likeCount}</span>
            </button>
          )}
          {modalCfg.show_comment && (
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center text-white">
              <SvgComment filled={showComments} />
              <span className="text-xs">{comments.length}</span>
            </button>
          )}
          {modalCfg.show_share && (
            <button onClick={() => setShowSharePanel(true)} className="flex flex-col items-center text-white">
              <SvgShare />
            </button>
          )}
          {modalCfg.show_whatsapp && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center text-white">
              <SvgWhatsApp />
            </a>
          )}
          {modalCfg.show_sizing && modelData && modelData.length > 0 && (
            <button onClick={openModel} className="flex flex-col items-center text-white">
              <SvgRuler />
            </button>
          )}
        </div>

        {/* product card */}
        {modalCfg.show_product && product && (
          <div className="absolute bottom-4 left-3 right-16 z-20 flex items-center gap-3 rounded-xl bg-white/95 p-2 shadow-lg">
            {product.image_url && (
              <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{product.name}</p>
              {product.price && <p className="text-xs text-slate-500">R$ {Number(product.price).toFixed(2)}</p>}
            </div>
            {modalCfg.show_product_btn && (
              <a
                href={product.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: colors.btn }}
              >
                Ver
              </a>
            )}
          </div>
        )}

        {/* comments drawer */}
        {showComments && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={() => setShowComments(false)}>
            <div
              className="max-h-[70vh] rounded-t-2xl bg-white p-4"
              style={{ animation: 'vlSlideUp .25s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Comentários</h3>
                <button onClick={() => setShowComments(false)}><SvgCloseSmall/></button>
              </div>
              <div className="mb-3 max-h-64 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400">Seja o primeiro a comentar.</p>
                ) : comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-semibold text-slate-700">{getCommentName(c)}: </span>
                    <span className="text-slate-600">{c.text}</span>
                  </div>
                ))}
              </div>
              <input
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Seu nome"
                className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={1}
                />
                <button
                  onClick={submitComment}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: colors.btn }}
                >
                  Enviar
                </button>
              </div>
              {commentSent && <p className="mt-1 text-xs text-green-600">Comentário enviado!</p>}
            </div>
          </div>
        )}

        {/* share panel */}
        {showSharePanel && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={() => setShowSharePanel(false)}>
            <div ref={sharePanelRef} className="rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Compartilhar</h3>
              <button
                onClick={copyShareLink}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                {shareCopied ? 'Link copiado!' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {/* model sizing modal */}
        {modelOpen && modelData && modelData.length > 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={() => setModelOpen(false)}>
            <div className="max-w-xs rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Medidas da modelo</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                {modelData.map((item: any, idx: number) => (
                  <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ════════════════ RETURN FINAL ═══════════════════ */
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#111]">
      {!playerOpen && isFloating && !floatingDismissed && <FloatingWidget />}
      {!playerOpen && isCarousel && <Carousel />}
      {!playerOpen && isGrid && <Grid />}
      {playerOpen && <Player />}
      <style>{`
        @keyframes vlSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default StoryPreviewPage;
