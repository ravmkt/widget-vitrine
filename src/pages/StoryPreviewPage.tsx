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
