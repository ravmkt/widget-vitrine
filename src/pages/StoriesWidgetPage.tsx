import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, Video, resolveStoreId, generateUuid } from '@/lib/db';
import {d
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
  hide_stories: boolean;
  shadow_enabled: boolean;
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
  hide_stories: false,
  shadow_enabled: true,
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
    hide_stories: appearance?.hide_stories ?? appearance?.hideStories ?? merged?.hide_stories ?? false,
    shadow_enabled: appearance?.shadow_enabled ?? appearance?.shadowEnabled ?? appearance?.shadow ?? merged?.shadow_enabled ?? merged?.shadow ?? true,
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

/** Botões de ação social (play, mute, like, comentários, share, medidas, whatsapp) */
const SocialActionButtons: FC<{
  modalConfig: ModalAppearanceConfig;
  primaryColor: string;
  shadowEnabled: boolean;
  playing: boolean;
  muted: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  hasModel: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMeasures: () => void;
  onWhatsApp: () => void;
}> = ({
  modalConfig, primaryColor, shadowEnabled,
  playing, muted, liked, likeCount, commentCount, hasModel,
  onTogglePlay, onToggleMute, onLike, onComment, onShare, onMeasures, onWhatsApp,
}) => {
  const btnStyle: CSSProperties = {
    backgroundColor: primaryColor,
    boxShadow: shadowEnabled ? '0 10px 24px rgba(0,0,0,0.28)' : 'none',
  };

  return (
    <div className="absolute top-24 z-[60] flex flex-col gap-3" style={{ right: 'max(0.75rem, env(safe-area-inset-right))' }}>
      {/* Play / Pause */}
      {modalConfig.show_play_button && (
        <button type="button" onClick={onTogglePlay} className="rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110" style={btnStyle} aria-label={playing ? 'Pausar' : 'Reproduzir'}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      )}

      {/* Mute */}
      <button type="button" onClick={onToggleMute} className="rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110" style={btnStyle} aria-label={muted ? 'Ativar som' : 'Desativar som'}>
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Like */}
      {modalConfig.show_like_button && (
        <button type="button" onClick={onLike} className="relative rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110" style={btnStyle} aria-label="Curtir">
          <Heart className={cn('h-5 w-5', liked ? 'fill-rose-500 text-rose-500' : '')} />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{likeCount}</span>
        </button>
      )}

{/* Comentários */}
{(modalConfig.show_comment_button || modalConfig.show_comments_button) && (
  <button
    type="button"
    onClick={onComment}
    className="flex flex-col items-center gap-1"
    aria-label="Comentários"
  >
    <div
      className="flex items-center justify-center rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110"
      style={btnStyle}
    >
      {commentCount > 0 ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ) : (
        <MessageCircle size={20} color="white" />
      )}
    </div>
    <span className="text-[10px] font-black text-white leading-none">
      {commentCount}
    </span>
  </button>
)}

      {/* Share */}
      {modalConfig.show_share_button && (
        <button type="button" onClick={onShare} className="rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110" style={btnStyle} aria-label="Compartilhar">
          <Share2 className="h-5 w-5" />
        </button>
      )}

      {/* Medidas */}
      {hasModel && (
        <button type="button" onClick={onMeasures} className="rounded-full p-3 text-white backdrop-blur-md transition hover:brightness-110" style={btnStyle} title="Medidas" aria-label="Medidas">
          <Ruler className="h-5 w-5" />
        </button>
      )}

      {/* WhatsApp */}
      {modalConfig.show_whatsapp_button && (
        <button type="button" onClick={onWhatsApp} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white backdrop-blur-md transition hover:brightness-110" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
            <path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z" />
            <path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z" />
          </svg>
        </button>
      )}
    </div>
  );
};

/** Card de produto na parte inferior */
const ProductInfoCard: FC<{
  product: any;
  productImageUrl: string;
  productUrl: string;
  productPrice: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  buttonColor: string;
  shadowEnabled: boolean;
  showProductButton: boolean;
}> = ({ product, productImageUrl, productUrl, productPrice, backgroundColor, textColor, accentColor, buttonColor, shadowEnabled, showProductButton }) => (
  <div
    className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10"
    style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
  >
    <div className={cn('flex items-center gap-3 rounded-3xl border border-white/20 p-3', shadowEnabled && 'shadow-2xl')} style={{ backgroundColor }}>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
        {productImageUrl ? (
          <img src={productImageUrl} alt={product.name || 'Produto'} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-slate-200" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black" style={{ color: textColor }}>{product.name || 'Produto'}</p>
        <p className="mt-1 text-base font-black" style={{ color: accentColor }}>
          {productPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        {showProductButton && (
          <a
            href={productUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-full px-4 py-2 text-[11px] font-black text-white transition hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
          >
            Ver produto <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  </div>
);

/** Grid de thumbnails (visual de grade) */
const GridThumbnails: FC<{
  videos: any[];
  onVideoClick: (video: any) => void;
}> = ({ videos, onVideoClick }) => (
  <div className="grid h-full w-full grid-cols-1 gap-3 overflow-auto p-4 pt-20 sm:grid-cols-2">
    {videos.map((video: any) => {
      const thumb = video.thumbnail_url || video.thumbnailUrl || video.poster_url || video.posterUrl || video.image_url || video.imageUrl || '';
      return (
        <button
          key={video.id}
          type="button"
          className="relative aspect-[9/16] overflow-hidden rounded-3xl bg-slate-900"
          onClick={() => onVideoClick(video)}
        >
          {thumb ? (
            <img src={thumb} alt={video.title || 'Vídeo'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white/60">Vídeo</div>
          )}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="truncate text-[10px] font-black text-white">{video.title || 'Sem título'}</p>
          </div>
        </button>
      );
    })}
  </div>
);

/** Painel de comentários */
const CommentsPanel: FC<{
  comments: CommentItem[];
  commentName: string;
  commentText: string;
  showEmoji: boolean;
  buttonColor: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onNameChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onToggleEmoji: () => void;
  onInsertEmoji: (emoji: string) => void;
  onSubmit: () => void;
}> = ({ comments, commentName, commentText, showEmoji, buttonColor, textareaRef, onClose, onNameChange, onTextChange, onToggleEmoji, onInsertEmoji, onSubmit }) => (
  <div className="absolute inset-0 z-[90] bg-black/85 p-4">
    <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-black">Comentários</h4>
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20" aria-label="Fechar comentários">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {comments.length === 0 && <p className="text-sm text-white/50">Nenhum comentário ainda.</p>}
        {comments.map((item, index) => (
          <div key={item.id || `${item.created_at || item.createdAt}-${index}`} className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs font-black text-white/70">{getCommentName(item)}</p>
            <p className="whitespace-pre-wrap text-sm text-white">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <input
          value={commentName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Seu nome"
          className="w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/40"
        />
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Escreva seu comentário..."
            className="min-h-24 w-full resize-none rounded-2xl bg-white/10 p-3 pr-12 text-sm text-white outline-none placeholder:text-white/40"
          />
          <button type="button" onClick={onToggleEmoji} className="absolute right-3 top-3 text-white" aria-label="Emoji">
            <Smile className="h-5 w-5" />
          </button>
        </div>

        {showEmoji && (
          <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-xl">
            {EMOJIS.map(emoji => (
              <button key={emoji} type="button" onClick={() => onInsertEmoji(emoji)} className="rounded-lg p-1 transition hover:bg-white/10">
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          className="w-full rounded-2xl p-3 text-sm font-black text-white transition hover:opacity-90"
          style={{ backgroundColor: buttonColor }}
        >
          Enviar comentário
        </button>
      </div>
    </div>
  </div>
);

/** Modal de medidas da modelo */
const MeasuresModal: FC<{
  model: any;
  modelData: any[];
  onClose: () => void;
}> = ({ model, modelData, onClose }) => (
  <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/85 p-4">
    <div className="mx-auto flex max-h-[75vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medidas da modelo</p>
          <h4 className="text-lg font-black">{model.name || 'Modelo'}</h4>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 transition hover:bg-slate-200" aria-label="Fechar medidas">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {modelData.length > 0 ? (
          modelData.map((measure: any, idx: number) => (
            <div key={`${measure.name || measure.label || idx}-${idx}`} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-3">
              <span className="font-bold text-slate-700">{measure.name || measure.label || `Medida ${idx + 1}`}</span>
              <span className="text-right font-black text-slate-950">{measure.value || measure.size || '-'}{measure.unit || ''}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Sem medidas cadastradas.</p>
        )}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function StoriesWidgetPage() {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();

  const storyIdParam = searchParams.get('storyId') || searchParams.get('storyid');
  const videoIdParam = searchParams.get('videoId') || searchParams.get('videoid');
  const appearanceIdParam = searchParams.get('appearanceId') || searchParams.get('appearanceid');

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Estados de carregamento ──
  const [loading, setLoading] = useState(true);
  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [storeName, setStoreName] = useState('');

  // ── Stories e vídeos ──
  const [stories, setStories] = useState<any[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(new Map());
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [videoIdx, setVideoIdx] = useState(0);

  // ── Player ──
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── Interações ──
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  // ── Produto / modelo ──
  const [product, setProduct] = useState<any | null>(null);
  const [model, setModel] = useState<any | null>(null);
  const [showMeasures, setShowMeasures] = useState(false);

  // ── Configurações ──
  const [settings, setSettings] = useState<any | null>(null);
  const [appearances, setAppearances] = useState<any[]>([]);

  // ── 🆕 Controle de layout forçado (grid → player) ──
  const [forcePlayerView, setForcePlayerView] = useState(false);

  // ── Derivados ──
  const story = stories[storyIdx ?? -1] ?? null;
  const rawActiveStoryFormat = String(
    story?.format || story?.display_format || story?.displayFormat ||
    story?.visual_style || story?.visualStyle || 'carousel',
  );
  const activeStoryFormat = normalizeStoryFormat(rawActiveStoryFormat);

  // Layout efetivo: grid pode ser sobrescrito para carousel quando o player é forçado
  const effectiveLayout: StoryFormat = forcePlayerView ? 'carousel' : activeStoryFormat;
  const isGridLayout = effectiveLayout === 'grid';
  const isCarouselLayout = effectiveLayout === 'carousel';
  const isFloatingLayout = effectiveLayout === 'floating_widget';

  const currentVideos = story ? storyVideosMap.get(story.id) || [] : [];
  const currentVideo = currentVideos[videoIdx] ?? null;

  const appearance = useMemo(
    () => findAppearanceForStory({ appearances, story, settings, appearanceIdParam, currentUrl: typeof window !== 'undefined' ? window.location.href : null }),
    [appearances, story, settings, appearanceIdParam],
  );

  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);
  const productImageUrl = getProductImageUrl(product);
  const productUrl = getProductUrl(product);
  const productPrice = getProductPrice(product);

  const modalConfig = useMemo(() => normalizeModalAppearanceConfig(appearance), [appearance]);

  const primaryColor = getPrimaryColor(appearance);
  const secondaryColor = getSecondaryColor(appearance);
  const textColor = getTextColor(appearance);
  const backgroundColor = getBackgroundColor(appearance);
  const buttonColor = getButtonColor(appearance);
  const fontFamily = getFontFamily(appearance);
  const fontSize = getFontSize(appearance);
  const accentColor = secondaryColor || primaryColor;

  const activeCommentCount = useMemo(() => getVideoCommentCount(currentVideo?.id, comments), [currentVideo?.id, comments]);
  const modelData = useMemo(() => parseMeasures(model), [model]);

  const displayStoreName = storeName || settings?.store_name || settings?.storeName || settings?.name || 'Loja';

  // ── Handlers ──

  const close = () => {
    setForcePlayerView(false);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLOSE_STORY_WIDGET' }, '*');
      window.parent.postMessage('CLOSE_STORY_WIDGET', '*');
    } else {
      if (window.history.length > 1) window.history.back();
      else window.location.href = '/';
    }
  };

  const goNext = () => {
    if (storyIdx === null || stories.length === 0) return;
    const videos = storyVideosMap.get(stories[storyIdx]?.id) || [];
    if (videos.length > 0 && videoIdx < videos.length - 1) {
      setVideoIdx(v => v + 1);
      return;
    }
    const nextStoryIdx = storyIdx < stories.length - 1 ? storyIdx + 1 : 0;
    setStoryIdx(nextStoryIdx);
    setVideoIdx(0);
  };

  const goPrev = () => {
    if (storyIdx === null || stories.length === 0) return;
    if (videoIdx > 0) {
      setVideoIdx(v => v - 1);
      return;
    }
    const prevStoryIdx = storyIdx > 0 ? storyIdx - 1 : stories.length - 1;
    const prevVideos = storyVideosMap.get(stories[prevStoryIdx]?.id) || [];
    setStoryIdx(prevStoryIdx);
    setVideoIdx(Math.max(0, prevVideos.length - 1));
  };

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (playing) { videoRef.current.pause(); setPlaying(false); }
      else { await videoRef.current.play(); setPlaying(true); }
    } catch { setPlaying(false); }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleLike = () => {
    if (!currentVideo?.id) return;
    const likes = readLikes();
    const current = likes[currentVideo.id] || { liked: false, count: 0 };
    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));
    likes[currentVideo.id] = { liked: nextLiked, count: nextCount };
    saveLikes(likes);
    setLiked(nextLiked);
    setLikeCount(nextCount);
  };

  /** 🆕 Clique em vídeo do grid: seta o índice e ativa o player */
  const handleGridVideoClick = (video: any) => {
    const idx = currentVideos.findIndex((item: any) => item.id === video.id);
    if (idx >= 0) {
      setVideoIdx(idx);
      setForcePlayerView(true);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?storyId=${story?.id || ''}&videoId=${currentVideo?.id || ''}`;
    const shareText = `Olha esse produto que lindo${product?.name ? `: ${product.name}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name || story?.title || 'Story', text: shareText, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Link copiado para compartilhar.');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank', 'noopener,noreferrer');
      }
    } catch { showError('Erro ao compartilhar.'); }
  };

  const handleWhatsApp = () => {
    const phone = String(settings?.whatsapp_number || settings?.whatsappNumber || settings?.whatsapp || settings?.phone || '').replace(/\D/g, '');
    const link = productUrl !== '#' ? productUrl : `${window.location.origin}${window.location.pathname}?storyId=${story?.id || ''}&videoId=${currentVideo?.id || ''}`;
    const message = `Quero mais informações sobre esse produto${product?.name ? `: ${product.name}` : ''}\n${link}`;
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCommentSubmit = async () => {
    const name = commentName.trim();
    const text = commentText.trim();
    if (!name) { showError('Informe seu nome.'); return; }
    if (!text) { showError('Escreva um comentário.'); return; }
    if (!currentVideo?.id || !story || !resolvedStoreId) { showError('Não foi possível identificar o vídeo.'); return; }

    const now = new Date().toISOString();
    const newComment: CommentItem = {
      id: generateUuid(), store_id: resolvedStoreId, video_id: currentVideo.id,
      story_id: story.id, user_name: name, name, text, status: 'pending',
      created_at: now, updated_at: now,
    };

    try {
      await (db as any).comments.save(newComment);
      const next = await getAllSafe<CommentItem>((db as any).comments, resolvedStoreId);
      const filtered = (next || []).filter((item: any) => {
        const sameVideo = getCommentVideoId(item) === currentVideo.id;
        const sameStore = !item.store_id || item.store_id === resolvedStoreId;
        return sameVideo && sameStore;
      });
      setComments(filtered);
      mergeLocalCommentsByVideo(currentVideo.id, filtered);
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado com sucesso.');
    } catch {
      const previousComments = readLocalComments();
      const nextComments = [...previousComments, newComment];
      saveLocalComments(nextComments);
      setComments(nextComments.filter(item => getCommentVideoId(item) === currentVideo.id));
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado com sucesso.');
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setCommentText(prev => `${prev}${emoji}`); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = commentText.slice(0, start) + emoji + commentText.slice(end);
    setCommentText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); });
  };

  // ── Load helpers ──

  const loadComments = async (videoId: string, currentStoreId: string) => {
    try {
      const dbComments = await getAllSafe<CommentItem>((db as any).comments, currentStoreId);
      const filtered = (dbComments || []).filter((item: any) => {
        const sameVideo = getCommentVideoId(item) === videoId;
        const sameStore = !item.store_id || item.store_id === currentStoreId;
        return sameVideo && sameStore;
      });
      setComments(filtered);
      mergeLocalCommentsByVideo(videoId, filtered);
    } catch {
      const localComments = readLocalComments().filter(item => getCommentVideoId(item) === videoId);
      setComments(localComments);
    }
  };

  const loadLinkedData = async (currentStory: any, currentVideoItem: Video | null, currentStoreId: string) => {
    try {
      if (!currentStory || !currentVideoItem) { setProduct(null); setModel(null); return; }
      const relations = await getAllSafe<any>((db as any).storyProducts, currentStoreId);
      const relation = Array.isArray(relations)
        ? relations.find((item: any) => {
            const sameStory = item.story_id === currentStory.id;
            const sameVideo = item.video_id === currentVideoItem.id;
            const sameStore = !item.store_id || item.store_id === currentStoreId;
            return sameStory && sameVideo && sameStore;
          })
        : null;
      const videoAny = currentVideoItem as any;
      const productId = videoAny.product_id || videoAny.productId || relation?.product_id || relation?.productId || null;
      const modelId = videoAny.model_id || videoAny.modelId || videoAny.measurement_id || videoAny.measurementId || relation?.model_id || relation?.modelId || relation?.measurement_id || relation?.measurementId || null;
      const [resolvedProduct, resolvedModel] = await Promise.all([
        getByIdSafe<any>((db as any).products, productId, currentStoreId),
        getByIdSafe<any>((db as any).sizingModels, modelId, currentStoreId),
      ]);
      setProduct(resolvedProduct || null);
      setModel(resolvedModel || null);
    } catch { setProduct(null); setModel(null); }
  };

  // ── Effects ──

  // Carregamento inicial
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const currentStoreId = await resolveStoreId(storeId);
        const storeList = await getAllSafe<any>((db as any).stores);
        const currentStore = storeList.find((s: any) => s.id === currentStoreId) || storeList.find((s: any) => s.id === storeId) || storeList[0];
        if (!mounted) return;
        if (!currentStore) {
          setStories([]); setStoryVideosMap(new Map()); setStoryIdx(null);
          setResolvedStoreId(''); setStoreName(''); setSettings(null); setAppearances([]);
          return;
        }
        setResolvedStoreId(currentStoreId);
        setStoreName(currentStore.name || currentStore.store_name || '');

        const [settingsList, appearancesList, allStories, storyRelations, allVideos] = await Promise.all([
          getAllSafe<any>((db as any).generalSettings, currentStoreId),
          getAllSafe<any>((db as any).appearances, currentStoreId),
          getAllSafe<any>((db as any).stories, currentStoreId),
          getAllSafe<any>((db as any).storyVideos, currentStoreId),
          getAllSafe<Video>((db as any).videos, currentStoreId),
        ]);
        if (!mounted) return;

        const genSettings = settingsList[0] || null;
        setSettings(genSettings);
        setAppearances(appearancesList || []);
        setMuted(genSettings?.muted_by_default ?? genSettings?.mutedByDefault ?? true);

        const activeStories = (allStories || [])
          .filter((item: any) => !(item.is_active === false || item.active === false || item.status === 'inactive' || item.status === 'inativo'))
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));

        const normalizedStories = activeStories.map((item: any) => {
          const fmt = normalizeStoryFormat(String(item.format || item.display_format || item.displayFormat || item.visual_style || item.visualStyle || 'carousel'));
          return { ...item, format: fmt, display_format: fmt, visual_style: fmt };
        });

        const filteredStories = storyIdParam
          ? normalizedStories.filter((item: any) => item.id === storyIdParam)
          : normalizedStories;

        const map = new Map<string, Video[]>();
        filteredStories.forEach((currentStory: any) => {
          const relationVideos = (storyRelations || [])
            .filter((rel: any) => rel.story_id === currentStory.id && (!rel.store_id || rel.store_id === currentStoreId))
            .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
            .map((rel: any) => (allVideos || []).find((v: any) => v.id === rel.video_id))
            .filter(Boolean) as Video[];
          map.set(currentStory.id, relationVideos);
        });

        let startStoryIdx: number | null = filteredStories.length > 0 ? 0 : null;
        let startVideoIdx = 0;
        if (videoIdParam && filteredStories.length > 0) {
          for (let i = 0; i < filteredStories.length; i++) {
            const videos = map.get(filteredStories[i].id) || [];
            const foundIdx = videos.findIndex(v => v.id === videoIdParam);
            if (foundIdx >= 0) { startStoryIdx = i; startVideoIdx = foundIdx; break; }
          }
        }

        setStories(normalizedStories);
        setStoryVideosMap(map);
        setStoryIdx(startStoryIdx);
        setVideoIdx(startVideoIdx);
      } catch (err) {
        console.error('Erro ao carregar widget de Stories:', err);
        showError('Erro ao carregar Stories.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [storeId, storyIdParam, videoIdParam]);

  // Reset ao trocar de vídeo/story
  useEffect(() => {
    if (!story || !currentVideo?.id || !resolvedStoreId) return;
    setVideoError(false);
    setShowComments(false);
    setShowEmoji(false);
    setShowMeasures(false);
    setCommentText('');
    setCommentName('');
    setProgress(0);
    setPlaying(true);
    setForcePlayerView(false); // 🆕 reseta ao trocar de vídeo

    const likes = readLikes();
    setLikeCount(getVideoLikeCount(currentVideo.id));
    setLiked(Boolean(likes[currentVideo.id]?.liked));

    loadComments(currentVideo.id, resolvedStoreId);
    loadLinkedData(story, currentVideo, resolvedStoreId);
  }, [story?.id, currentVideo?.id, resolvedStoreId]);

  // Progresso do vídeo nativo
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => { if (el.duration) setProgress((el.currentTime / el.duration) * 100); };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [currentVideo?.id]);

  // Progresso simulado para YouTube
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isYt = !isVideoPlayableNatively(currentVideo as any) && extractYouTubeId(currentUrl);
    if (isYt && playing) {
      let ms = 0;
      interval = setInterval(() => {
        ms += 100;
        setProgress((ms / 15000) * 100);
        if (ms >= 15000) { clearInterval(interval); goNext(); }
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [currentVideo?.id, playing, currentUrl]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white">
        Carregando...
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black px-6 text-center text-white">
        Story não encontrado
      </div>
    );
  }

  return (
    <div
      className={cn('fixed inset-0 z-[9999] flex overflow-hidden bg-black', isFloatingLayout ? 'items-center justify-center' : 'items-start justify-center')}
      style={{ fontFamily, fontSize }}
    >
      <div
        className={cn(
          'relative h-full w-full overflow-hidden bg-black',
          isGridLayout ? 'max-w-[1080px] sm:max-h-screen' : isCarouselLayout ? 'max-w-[420px] sm:aspect-[9/16] sm:max-h-screen' : 'max-w-[380px] sm:aspect-[9/16] sm:max-h-screen',
        )}
        style={{ boxShadow: modalConfig.shadow_enabled ? '0 24px 80px rgba(0,0,0,0.45)' : 'none' }}
      >
        {/* Barras de progresso */}
        {!modalConfig.hide_stories && (
          <ProgressBars videos={currentVideos} videoIdx={videoIdx} progress={progress} primaryColor={primaryColor} />
        )}

        {/* Cabeçalho */}
        <StoryHeader
          title={story.title || 'Story'}
          storeName={displayStoreName}
          videoCount={currentVideos.length}
          videoIdx={videoIdx}
          onClose={close}
          showTitle={modalConfig.show_title}
        />

        {/* ── Corpo: Grid / Player / Flutuante ── */}

        {isGridLayout ? (
          <GridThumbnails videos={currentVideos} onVideoClick={handleGridVideoClick} />
        ) : isCarouselLayout && currentUrl && !videoError ? (
          <VideoPlayer
            videoRef={videoRef}
            currentVideo={currentVideo}
            currentUrl={currentUrl}
            posterUrl={posterUrl}
            muted={muted}
            storyTitle={story.title || 'Story'}
            onEnded={goNext}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setVideoError(true)}
          />
        ) : isFloatingLayout ? (
          <div className="flex h-full items-center justify-center px-6 pt-20 text-center text-white/70">
            <div className="max-w-[280px] rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Visual flutuante</p>
              <p className="mt-2 text-xs text-white/65">{story.title || 'Story'}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-white/70">
            Nenhum vídeo vinculado
          </div>
        )}

        {/* Navegação (anterior / próximo) */}
        {isCarouselLayout && (stories.length > 1 || currentVideos.length > 1) && (
          <>
            <button type="button" className="absolute left-3 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60" onClick={goPrev} aria-label="Anterior">
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button type="button" className="absolute right-3 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60" onClick={goNext} aria-label="Próximo">
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}

        {/* Botões sociais */}
        <SocialActionButtons
          modalConfig={modalConfig}
          primaryColor={primaryColor}
          shadowEnabled={modalConfig.shadow_enabled}
          playing={playing}
          muted={muted}
          liked={liked}
          likeCount={likeCount}
          commentCount={activeCommentCount}
          hasModel={!!model}
          onTogglePlay={handleTogglePlay}
          onToggleMute={handleToggleMute}
          onLike={handleLike}
          onComment={() => setShowComments(true)}
          onShare={handleShare}
          onMeasures={() => setShowMeasures(true)}
          onWhatsApp={handleWhatsApp}
        />

        {/* Card do produto */}
        {product && modalConfig.show_product && (
          <ProductInfoCard
            product={product}
            productImageUrl={productImageUrl}
            productUrl={productUrl}
            productPrice={productPrice}
            backgroundColor={backgroundColor}
            textColor={textColor}
            accentColor={accentColor}
            buttonColor={buttonColor}
            shadowEnabled={modalConfig.shadow_enabled}
            showProductButton={modalConfig.show_product_button}
          />
        )}

        {/* Painel de comentários */}
        {showComments && (
          <CommentsPanel
            comments={comments}
            commentName={commentName}
            commentText={commentText}
            showEmoji={showEmoji}
            buttonColor={buttonColor}
            textareaRef={textareaRef}
            onClose={() => setShowComments(false)}
            onNameChange={setCommentName}
            onTextChange={setCommentText}
            onToggleEmoji={() => setShowEmoji(v => !v)}
            onInsertEmoji={insertEmoji}
            onSubmit={handleCommentSubmit}
          />
        )}

        {/* Modal de medidas */}
        {model && showMeasures && (
          <MeasuresModal model={model} modelData={modelData} onClose={() => setShowMeasures(false)} />
        )}
      </div>
    </div>
  );
}
