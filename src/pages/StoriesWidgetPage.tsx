import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, Video, resolveStoreId, generateUuid } from '@/lib/db';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ExternalLink,
  Smile,
  Ruler,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { extractYouTubeId, isVideoPlayableNatively } from '@/lib/videoEmbeds';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const EMOJIS = [
  '😎', '👍', '👏', '😱', '🙏', '💪', '🔥', '❤️', '💙',
  '✨', '🎉', '✅', '⭐', '😢', '😡', '🤔', '👀', '😊', '🥰',
];

const DEFAULT_PRIMARY_COLOR = '#0094EB';
const DEFAULT_TEXT_COLOR = '#0F172A';
const DEFAULT_BG_COLOR = '#FFFFFF';
const DEFAULT_FONT_FAMILY = 'Inter, sans-serif';
const DEFAULT_FONT_SIZE = '14px';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

type CommentItem = {
  id?: string;
  store_id?: string;
  story_id?: string;
  video_id?: string;
  videoId?: string;
  name?: string;
  user_name?: string;
  text: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
};

type LikeRecord = Record<string, { liked: boolean; count: number }>;

type ModalAppearanceConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_comments_button: boolean;
  show_share_button: boolean;
  show_whatsapp_button: boolean;
  show_product_button: boolean;
  show_product_whatsapp_button: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
};

// ═══════════════════════════════════════════════════════════════
// HELPERS DE APARÊNCIA / CONFIG
// ═══════════════════════════════════════════════════════════════

const createDefaultModalAppearanceConfig = (): ModalAppearanceConfig => ({
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_like_button: true,
  show_comment_button: true,
  show_comments_button: true,
  show_share_button: true,
  show_whatsapp_button: true,
  show_product_button: true,
  show_product_whatsapp_button: true,
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
});

const parseJsonIfNeeded = <T,>(value: unknown): Partial<T> | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as Partial<T>;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Partial<T>; } catch { return null; }
  }
  return null;
};

const isValidHexColor = (value?: string) => /^#[0-9A-Fa-f]{6}$/.test(value || '');

const safeColor = (value: unknown, fallback: string) => {
  const text = String(value || '').trim();
  return isValidHexColor(text) ? text : fallback;
};

const normalizeModalAppearanceConfig = (
  appearance?: any | null,
): ModalAppearanceConfig => {
  const rawPlayerConfig =
    parseJsonIfNeeded<ModalAppearanceConfig>(
      appearance?.player_config || appearance?.playerConfig,
    ) || {};
  const rawModalConfig =
    parseJsonIfNeeded<ModalAppearanceConfig>(
      appearance?.modal_config || appearance?.modalConfig,
    ) || {};

  const merged: any = {
    ...createDefaultModalAppearanceConfig(),
    ...rawModalConfig,
    ...rawPlayerConfig,
  };

  const showCommentButton =
    appearance?.show_comment_button ??
    appearance?.show_comments_button ??
    appearance?.showCommentButton ??
    appearance?.showCommentsButton ??
    merged?.show_comment_button ??
    merged?.show_comments_button ??
    true;

  return {
    show_title: appearance?.show_title ?? appearance?.showTitle ?? merged?.show_title ?? true,
    show_play_button: appearance?.show_play_button ?? appearance?.showPlayButton ?? merged?.show_play_button ?? true,
    show_product: appearance?.show_product ?? appearance?.showProduct ?? merged?.show_product ?? true,
    show_like_button: appearance?.show_like_button ?? appearance?.showLikeButton ?? merged?.show_like_button ?? true,
    show_comment_button: showCommentButton,
    show_comments_button: showCommentButton,
    show_share_button: appearance?.show_share_button ?? appearance?.showShareButton ?? merged?.show_share_button ?? true,
    show_whatsapp_button: appearance?.show_whatsapp_button ?? appearance?.showWhatsappButton ?? merged?.show_whatsapp_button ?? true,
    show_product_button: appearance?.show_product_button ?? appearance?.showProductButton ?? merged?.show_product_button ?? true,
    show_product_whatsapp_button: appearance?.show_product_whatsapp_button ?? appearance?.showProductWhatsappButton ?? merged?.show_product_whatsapp_button ?? true,
    border_color: safeColor(
      appearance?.modal_config?.border_color ??
        appearance?.border_color ??
        merged?.border_color ??
        DEFAULT_PRIMARY_COLOR,
      DEFAULT_PRIMARY_COLOR,
    ),
    border_width: String(
      appearance?.modal_config?.border_width ??
        appearance?.border_width ??
        merged?.border_width ??
        '2',
    ),
    border_radius: String(
      appearance?.modal_config?.border_radius ??
        appearance?.border_radius ??
        merged?.border_radius ??
        '12',
    ),
  };
};

const getAppearanceValue = (appearance: any, keys: string[], fallback: any) => {
  for (const key of keys) {
    if (appearance?.[key] !== undefined && appearance?.[key] !== null && appearance?.[key] !== '') {
      return appearance[key];
    }
  }
  return fallback;
};

const toCssSize = (value: unknown, fallback = '14px') => {
  if (value === undefined || value === null || value === '') return fallback;
  const text = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) return `${text}px`;
  return text;
};

const getPrimaryColor = (appearance: any) =>
  safeColor(getAppearanceValue(appearance, ['primary_color', 'primaryColor', 'button_color', 'buttonColor'], DEFAULT_PRIMARY_COLOR), DEFAULT_PRIMARY_COLOR);

const getSecondaryColor = (appearance: any) =>
  safeColor(getAppearanceValue(appearance, ['secondary_color', 'secondaryColor'], getPrimaryColor(appearance)), getPrimaryColor(appearance));

const getTextColor = (appearance: any) =>
  safeColor(getAppearanceValue(appearance, ['text_color', 'textColor'], DEFAULT_TEXT_COLOR), DEFAULT_TEXT_COLOR);

const getBackgroundColor = (appearance: any) =>
  safeColor(getAppearanceValue(appearance, ['background_color', 'backgroundColor'], DEFAULT_BG_COLOR), DEFAULT_BG_COLOR);

const getButtonColor = (appearance: any) =>
  safeColor(getAppearanceValue(appearance, ['button_color', 'buttonColor', 'primary_color', 'primaryColor'], DEFAULT_PRIMARY_COLOR), DEFAULT_PRIMARY_COLOR);

const getFontFamily = (appearance: any) =>
  getAppearanceValue(appearance, ['font_family', 'fontFamily'], DEFAULT_FONT_FAMILY);

const getFontSize = (appearance: any) =>
  toCssSize(getAppearanceValue(appearance, ['font_size', 'fontSize'], 14), DEFAULT_FONT_SIZE);

// ═══════════════════════════════════════════════════════════════
// HELPERS DE DB / STORAGE
// ═══════════════════════════════════════════════════════════════

const getAllSafe = async <T,>(collection: any, storeId?: string): Promise<T[]> => {
  if (!collection?.getAll) return [];
  try {
    if (storeId) return await collection.getAll(storeId);
    return await collection.getAll();
  } catch {
    try { return await collection.getAll(); } catch { return []; }
  }
};

const getByIdSafe = async <T,>(collection: any, id?: string | null, storeId?: string): Promise<T | null> => {
  if (!collection?.getById || !id) return null;
  try {
    if (storeId) return await collection.getById(id, storeId);
    return await collection.getById(id);
  } catch {
    try { return await collection.getById(id); } catch { return null; }
  }
};

const idsEqual = (a?: any, b?: any) => {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
};

// ═══════════════════════════════════════════════════════════════
// HELPERS DE LOCALSTORAGE (LIKES / COMENTÁRIOS)
// ═══════════════════════════════════════════════════════════════

const readLikes = (): LikeRecord => {
  try { return JSON.parse(localStorage.getItem('story_video_likes') || '{}'); } catch { return {}; }
};

const saveLikes = (likes: LikeRecord) => {
  localStorage.setItem('story_video_likes', JSON.stringify(likes));
};

const readLocalComments = (): CommentItem[] => {
  try { return JSON.parse(localStorage.getItem('story_video_comments') || '[]'); } catch { return []; }
};

const saveLocalComments = (comments: CommentItem[]) => {
  localStorage.setItem('story_video_comments', JSON.stringify(comments));
};

const getCommentVideoId = (comment: CommentItem) =>
  comment.video_id || comment.videoId || '';

const mergeLocalCommentsByVideo = (videoId: string, comments: CommentItem[]) => {
  const previous = readLocalComments().filter(item => getCommentVideoId(item) !== videoId);
  saveLocalComments([...previous, ...comments]);
};

// ═══════════════════════════════════════════════════════════════
// HELPERS DE VÍDEO / PRODUTO / MODELO
// ═══════════════════════════════════════════════════════════════

const getVideoUrl = (video?: Video | null): string => {
  const item = video as any;
  return item?.video_url || item?.videoUrl || item?.url || '';
};

const getVideoPosterUrl = (video?: Video | null): string => {
  const item = video as any;
  return item?.thumbnail_url || item?.thumbnailUrl || item?.poster_url || item?.posterUrl || item?.image_url || item?.imageUrl || '';
};

const getProductImageUrl = (product?: any): string => {
  if (!product) return '';
  return product.image_url || product.imageUrl || product.thumbnail_url || product.thumbnailUrl || product.poster_url || product.posterUrl || product.cover_url || product.coverUrl || '';
};

const getProductUrl = (product?: any): string => {
  if (!product) return '#';
  return product.product_url || product.productUrl || product.url || '#';
};

const getProductPrice = (product?: any): number => {
  if (!product) return 0;
  const price = Number(product.price || product.sale_price || product.salePrice || 0);
  return Number.isFinite(price) ? price : 0;
};

const getVideoLikeCount = (videoId?: string): number => {
  if (!videoId) return 0;
  return readLikes()[videoId]?.count ?? 0;
};

const getCommentName = (comment: CommentItem): string =>
  comment.user_name || comment.name || 'Visitante';

const getVideoCommentCount = (videoId?: string, comments: CommentItem[] = []): number => {
  if (!videoId) return 0;
  return comments.filter(item => getCommentVideoId(item) === videoId).length;
};

const parseMeasures = (model: any): any[] => {
  if (!model) return [];
  if (Array.isArray(model.measures)) return model.measures;
  if (Array.isArray(model.measurements)) return model.measurements;
  if (Array.isArray(model.items)) return model.items;
  try { if (typeof model.measures === 'string') { const p = JSON.parse(model.measures); if (Array.isArray(p)) return p; } } catch { /* vazio */ }
  try { if (typeof model.measurements === 'string') { const p = JSON.parse(model.measurements); if (Array.isArray(p)) return p; } } catch { /* vazio */ }
  return [];
};

// ═══════════════════════════════════════════════════════════════
// RESOLUÇÃO DE APARÊNCIA
// ═══════════════════════════════════════════════════════════════

const getStoryAppearanceId = (story?: any | null) => {
  if (!story) return null;
  return story.appearance_id || story.appearanceId || story.appearance?.id || story.style_id || story.styleId || null;
};

const getSettingsDefaultAppearanceId = (settings?: any | null) => {
  if (!settings) return null;
  return settings.default_appearance_id || settings.defaultAppearanceId || settings.appearance_id || settings.appearanceId || null;
};

const findAppearanceForStory = ({
  appearances,
  story,
  settings,
  appearanceIdParam,
  currentUrl,
}: {
  appearances: any[];
  story?: any | null;
  settings?: any | null;
  appearanceIdParam?: string | null;
  currentUrl?: string | null;
}) => {
  if (!Array.isArray(appearances) || appearances.length === 0) return null;

  const byId = (id?: string | null) => {
    if (!id) return null;
    return appearances.find((item: any) => item.id === id) || null;
  };

  const shouldShowAppearance = (appearance: any, url: string | null): boolean => {
    if (!appearance?.url) return true;
    if (!url) return true;
    return url.toLowerCase().includes(String(appearance.url).toLowerCase());
  };

  const byIdResult =
    byId(appearanceIdParam) ||
    byId(story?.appearance_id || story?.appearanceId) ||
    byId(settings?.default_appearance_id || settings?.defaultAppearanceId);

  if (byIdResult) {
    return shouldShowAppearance(byIdResult, currentUrl) ? byIdResult : null;
  }

  const defaultAppearance = appearances.find(
    (item: any) =>
      (item.is_default === true || item.isDefault === true || item.default === true ||
       item.is_active === true || item.isActive === true || item.active === true) &&
      shouldShowAppearance(item, currentUrl),
  );
  if (defaultAppearance) return defaultAppearance;

  const firstAppearance = appearances[0];
  if (firstAppearance && shouldShowAppearance(firstAppearance, currentUrl)) return firstAppearance;

  return null;
};

// ═══════════════════════════════════════════════════════════════
// NORMALIZAÇÃO DE FORMATO DE STORY
// ═══════════════════════════════════════════════════════════════

type StoryFormat = 'carousel' | 'grid' | 'floating_widget';

const normalizeStoryFormat = (raw: string): StoryFormat => {
  const normalized = raw.toLowerCase().trim();
  if (normalized === 'carrossel') return 'carousel';
  if (normalized === 'floating' || normalized === 'widget') return 'floating_widget';
  if (normalized === 'carousel' || normalized === 'grid' || normalized === 'floating_widget') return normalized;
  return 'carousel';
};
// ═══════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ═══════════════════════════════════════════════════════════════

/** Barra de progresso dos stories */
const ProgressBars: FC<{
  videos: Video[];
  videoIdx: number;
  progress: number;
  primaryColor: string;
}> = ({ videos, videoIdx, progress, primaryColor }) => {
  if (videos.length === 0) {
    return (
      <div className="absolute top-3 z-50 flex gap-1.5 left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))]">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25" />
      </div>
    );
  }

  return (
    <div className="absolute top-3 z-50 flex gap-1.5 left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))]">
      {videos.map((video, idx) => (
        <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
          <div
            className={cn('h-full rounded-full transition-all', idx < videoIdx ? 'w-full' : idx === videoIdx ? '' : 'w-0')}
            style={
              idx === videoIdx
                ? { width: `${progress}%`, backgroundColor: primaryColor }
                : idx < videoIdx
                  ? { backgroundColor: primaryColor }
                  : undefined
            }
          />
        </div>
      ))}
    </div>
  );
};

/** Cabeçalho com título e botão fechar */
const StoryHeader: FC<{
  title: string;
  storeName: string;
  videoCount: number;
  videoIdx: number;
  onClose: () => void;
  showTitle: boolean;
}> = ({ title, storeName, videoCount, videoIdx, onClose, showTitle }) => (
  <div
    className="absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-5"
    style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
  >
    {showTitle ? (
      <div className="min-w-0 pr-16">
        <h3 className="truncate text-sm font-black text-white">{title || 'Story'}</h3>
        <p className="text-[10px] font-bold uppercase text-white/65">
          {storeName}
          {videoCount > 1 ? ` • ${videoIdx + 1}/${videoCount}` : ''}
        </p>
      </div>
    ) : (
      <div />
    )}
    <button
      type="button"
      onClick={onClose}
      className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition hover:bg-black/60"
      aria-label="Fechar"
    >
      <X className="h-5 w-5" />
    </button>
  </div>
);

/** Player de vídeo (nativo ou YouTube iframe) */
const VideoPlayer: FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentVideo: Video | null;
  currentUrl: string;
  posterUrl: string;
  muted: boolean;
  storyTitle: string;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  onError: () => void;
}> = ({ videoRef, currentVideo, currentUrl, posterUrl, muted, storyTitle, onEnded, onPlay, onPause, onError }) => {
  const ytId = !isVideoPlayableNatively(currentVideo as any) ? extractYouTubeId(currentUrl) : '';
  const sharedProps = { key: currentVideo?.id, className: 'h-full w-full object-cover' };

  if (ytId) {
    return (
      <iframe
        {...sharedProps}
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={storyTitle || 'Story'}
      />
    );
  }

  return (
    <video
      {...sharedProps}
      ref={videoRef}
      src={currentUrl}
      poster={posterUrl || undefined}
      autoPlay
      muted={muted}
      playsInline
      onEnded={onEnded}
      onPlay={onPlay}
      onPause={onPause}
      onError={onError}
    />
  );
};
