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
/** Botões de ação social (play, mute, like, comentários, share, medidas, whatsapp) */
const SocialActionButtons: FC<{
  modalConfig: ModalAppearanceConfig;
  primaryColor: string;
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
  modalConfig, primaryColor,
  playing, muted, liked, likeCount, commentCount, hasModel,
  onTogglePlay, onToggleMute, onLike, onComment, onShare, onMeasures, onWhatsApp,
}) => {
  const btnStyle: CSSProperties = {
    backgroundColor: primaryColor,
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
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-slate-900"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4.5 3.5h15A2.5 2.5 0 0 1 22 6v9a2.5 2.5 0 0 1-2.5 2.5h-4.2l-2.1 2.1a1.7 1.7 0 0 1-2.4 0l-2.1-2.1H4.5A2.5 2.5 0 0 1 2 15V6a2.5 2.5 0 0 1 2.5-2.5Z" />
              <circle cx="8" cy="10.5" r="1" fill="white" />
              <circle cx="12" cy="10.5" r="1" fill="white" />
              <circle cx="16" cy="10.5" r="1" fill="white" />
            </svg>
          </span>
          <span className="text-center text-xs font-bold leading-none text-white">
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
  showProductButton: boolean;
  showProductWhatsappButton: boolean;
  whatsappNumber?: string;
  settings?: any;
}> = ({
  product, productImageUrl, productUrl, productPrice,
  backgroundColor, textColor, accentColor, buttonColor,
  showProductButton, showProductWhatsappButton,
  whatsappNumber, settings,
}) => {
  const hasBothButtons = showProductButton && showProductWhatsappButton;

  const handleWhatsAppClick = () => {
    const phone = String(
      whatsappNumber ||
      settings?.whatsapp_number ||
      settings?.whatsappNumber ||
      settings?.whatsapp ||
      settings?.phone ||
      '',
    ).replace(/\D/g, '');
    const link = productUrl !== '#' ? productUrl : window.location.href;
    const message = `Quero mais informações sobre esse produto${product?.name ? `: ${product.name}` : ''}\n${link}`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/95 p-3 shadow-2xl" style={{ backgroundColor }}>
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
          {productImageUrl ? (
            <img src={productImageUrl} alt={product.name || 'Produto'} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-slate-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black" style={{ color: textColor }}>
            {product.name || 'Produto'}
          </p>
          <p className="mt-1 text-base font-black" style={{ color: accentColor }}>
            {productPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>

          {/* Botões do produto - agora independentes */}
          {(showProductButton || showProductWhatsappButton) && (
            <div className={cn('mt-2 flex gap-2', hasBothButtons ? 'flex-row' : 'flex-col')}>
              {showProductButton && (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-black text-white transition hover:opacity-90"
                  style={{ backgroundColor: buttonColor }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver produto
                </a>
              )}
              {showProductWhatsappButton && (
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-black text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden="true">
                    <path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z" />
                    <path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z" />
                  </svg>
                  WhatsApp
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
