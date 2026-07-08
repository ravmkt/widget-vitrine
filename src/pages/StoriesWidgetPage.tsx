import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, Video } from '@/lib/db';

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
  Check,
  ExternalLink,
  Ruler,
  Send,
  Smile,
  Copy,
  Mail,
  User
} from 'lucide-react';

import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { cn } from '@/lib/utils';

const EMOJIS = [
  '😀',
  '😍',
  '🔥',
  '👏',
  '❤️',
  '😂',
  '😮',
  '😢',
  '👍',
  '🙏',
  '🎉',
  '💪',
  '🚀',
  '🤩',
  '😎',
  '✨',
  '💜',
  '🙌',
  '🥰',
  '💯',
  '🛍️'
];

const COMMENT_KEYS = [
  'vidlytics_story_comments',
  'stories_comments',
  'story_comments',
  'comments'
];

type ShareOption = 'native' | 'whatsapp' | 'telegram' | 'email' | 'copy';

const normalizeUrl = (url?: string | null) => {
  if (!url) return '';

  const cUrl = String(url).trim();

  if (!cUrl) return '';

  if (
    cUrl.startsWith('http') ||
    cUrl.startsWith('blob:') ||
    cUrl.startsWith('data:')
  ) {
    return cUrl;
  }

  if (cUrl.startsWith('/')) {
    if (typeof window === 'undefined') return cUrl;
    return `${window.location.origin}${cUrl}`;
  }

  return cUrl;
};

const isSocialUrl = (url: string) => /instagram\.com|tiktok\.com/i.test(url);

const getVideoPosterUrl = (video?: Video | null) => {
  if (!video) return '';

  const v = video as Video & {
    thumbnail_url?: string;
    poster_url?: string;
    image_url?: string;
  };

  return (
    normalizeUrl(v.thumbnail_url) ||
    normalizeUrl(v.poster_url) ||
    normalizeUrl(v.image_url) ||
    ''
  );
};

const getVideoUrl = (video?: Video | null) => {
  if (!video) return '';

  const v = video as Video & {
    video_url?: string;
    file_url?: string;
    upload_url?: string;
    media_url?: string;
    source_url?: string;
    url?: string;
    src?: string;
  };

  const url =
    normalizeUrl(v.video_url) ||
    normalizeUrl(v.file_url) ||
    normalizeUrl(v.upload_url) ||
    normalizeUrl(v.media_url) ||
    normalizeUrl(v.source_url) ||
    normalizeUrl(v.url) ||
    normalizeUrl(v.src);

  if (!url || isSocialUrl(url)) return '';

  return url;
};

const getVideoPreviewUrl = (video?: Video | null) => {
  return getVideoPosterUrl(video) || getVideoUrl(video);
};

const isVideoFile = (url: string) => {
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) ||
    url.startsWith('data:video/')
  );
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const readComments = (): any[] => {
  if (typeof localStorage === 'undefined') return [];

  for (const key of COMMENT_KEYS) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) return parsed;
    } catch {
      //
    }
  }

  return [];
};

const saveLocalComments = (comments: any[]) => {
  if (typeof localStorage === 'undefined') return;

  COMMENT_KEYS.forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify(comments));
    } catch {
      //
    }
  });
};

const readVideoLikes = (): Record<string, { liked: boolean; count: number }> => {
  if (typeof localStorage === 'undefined') return {};

  try {
    const raw = localStorage.getItem('vidlytics_video_likes');

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    //
  }

  return {};
};

const saveVideoLikes = (
  likes: Record<string, { liked: boolean; count: number }>
) => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem('vidlytics_video_likes', JSON.stringify(likes));
  } catch {
    //
  }
};

const mergeComments = (items: any[]) => {
  const map = new Map<string, any>();

  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });

  return Array.from(map.values()).sort((a, b) => {
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
};

const mergeVideos = (videos: Video[]) => {
  const map = new Map<string, Video>();

  videos.forEach((video) => {
    if (video?.id) map.set(video.id, video);
  });

  return Array.from(map.values());
};

const getVideoLikeCount = (video?: Video | null) => {
  if (!video) return 0;

  const v = video as any;

  const val =
    v.like_count ??
    v.likes_count ??
    v.likes ??
    v.likeCount ??
    0;

  return Number(val) || 0;
};

export default function StoriesWidgetPage() {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();

  const storyIdParam =
    searchParams.get('storyId') || searchParams.get('storyid');

  const videoIdParam =
    searchParams.get('videoId') || searchParams.get('videoid');

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');

  const [stories, setStories] = useState<any[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(
    new Map()
  );

  const [currentStoryIdx, setStoryIdx] = useState<number | null>(null);
  const [videoIdx, setVideoIdx] = useState(0);

  const [settings, setSettings] = useState<any | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [emoji, setEmoji] = useState('');

  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentProduct, setProduct] = useState<any | null>(null);
  const [currentModel, setModel] = useState<any | null>(null);
  const [showMeasures, setShowMeasures] = useState(false);

  const story = stories[currentStoryIdx ?? -1] ?? null;
  const currentVideos = story ? storyVideosMap.get(story.id) || [] : [];
  const currentVideo = currentVideos[videoIdx] ?? null;

  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);

  const showTitle = settings?.show_title ?? true;

  const btnClass =
    'w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95';

  const darkBtn = cn(
    btnClass,
    'bg-black/35 border border-white/20 text-white hover:bg-black/55'
  );

  const whiteBtn = cn(
    btnClass,
    'bg-white/95 border border-white/40 text-slate-900 shadow-xl hover:bg-white'
  );

  const purpleBtn = cn(
    btnClass,
    'bg-violet-600/95 border border-violet-300/30 text-white shadow-xl hover:bg-violet-700'
  );

  const isEnabled = (key: string, fallback = true) => {
    return settings?.[key] ?? fallback;
  };

  const loadComments = async (storyId: string, videoId: string) => {
    const localComments = readComments().filter((comment) => {
      return comment.story_id === storyId && comment.video_id === videoId;
    });

    let remoteComments: any[] = [];

    try {
      const api = (await (db as any).comments?.getAll?.()) ?? [];

      remoteComments = Array.isArray(api)
        ? api.filter((comment) => {
            return comment.story_id === storyId && comment.video_id === videoId;
          })
        : [];
    } catch {
      //
    }

    setComments(mergeComments([...localComments, ...remoteComments]));
  };

  const saveComment = async (comment: any) => {
    const local = readComments();
    const newComments = mergeComments([comment, ...local]);

    saveLocalComments(newComments);

    try {
      await (db as any).comments?.save?.(comment);
    } catch {
      //
    }

    setComments((prev) => mergeComments([comment, ...prev]));
  };

  const loadVideoLikeState = (video?: Video | null) => {
    if (!video?.id) {
      setLiked(false);
      setLikeCount(0);
      return;
    }

    const likes = readVideoLikes();
    const saved = likes[video.id];

    if (saved) {
      setLiked(Boolean(saved.liked));
      setLikeCount(Number(saved.count) || 0);
      return;
    }

    setLiked(false);
    setLikeCount(getVideoLikeCount(video));
  };

  const getStoryUrl = () => {
    if (typeof window === 'undefined') return '';

    const url = new URL(window.location.href);

    if (story?.id) {
      url.searchParams.set('storyId', story.id);
    }

    if (currentVideo?.id) {
      url.searchParams.set('videoId', currentVideo.id);
    }

    return url.toString();
  };

  const getProductUrl = () => {
    return normalizeUrl(
      currentProduct?.product_url ||
        currentProduct?.url ||
        story?.cta_url ||
        story?.link_url ||
        ''
    );
  };

  const getProductImageUrl = () => {
    return normalizeUrl(
      currentProduct?.image_url ||
        currentProduct?.thumbnail_url ||
        currentProduct?.photo_url ||
        currentProduct?.foto ||
        currentProduct?.image ||
        currentProduct?.images?.[0] ||
        getVideoPosterUrl(currentVideo)
    );
  };

  const getProductName = () => {
    return currentProduct?.name || story?.title || 'produto';
  };

  const getProductPrice = () => {
    const value =
      currentProduct?.sale_price ??
      currentProduct?.price ??
      currentProduct?.promotional_price ??
      currentProduct?.regular_price ??
      currentProduct?.valor ??
      currentProduct?.preco ??
      '';

    if (value === null || value === undefined || value === '') return '';

    const numericValue =
      typeof value === 'number'
        ? value
        : Number(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));

    if (!Number.isNaN(numericValue) && numericValue > 0) {
      return numericValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    }

    return String(value);
  };

  const getShareTargetUrl = () => {
    return getProductUrl() || getStoryUrl();
  };

  const buildShareText = () => {
    const productName = getProductName();
    const shareUrl = getShareTargetUrl();

    const textLines = [productName, shareUrl].filter(Boolean);

    return {
      title: productName,
      text: textLines.join('\n'),
      url: shareUrl
    };
  };

  const insertEmojiAtCursor = (item: string) => {
    const el = textareaRef.current;

    if (!el) {
      setCommentText((prev) => `${prev}${item}`);
      setEmoji('');
      setShowEmoji(false);
      return;
    }

    const start = el.selectionStart ?? commentText.length;
    const end = el.selectionEnd ?? commentText.length;

    const nextText =
      commentText.slice(0, start) + item + commentText.slice(end);

    const nextCursorPosition = start + item.length;

    setCommentText(nextText);
    setEmoji('');
    setShowEmoji(false);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const close = () => {
    setStoryIdx(null);
    setVideoIdx(0);
    setShowComments(false);
    setShowShare(false);
    setShowEmoji(false);
    setShowMeasures(false);
    setPlaying(false);
  };

  const handleTogglePlay = async () => {
    const el = videoRef.current;

    if (!el) return;

    try {
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  };

  const handleToggleMute = () => {
    setMuted((prev) => !prev);
  };

  const handleLike = () => {
    if (!currentVideo?.id) return;

    const key = currentVideo.id;
    const newLike = !liked;
    const newCount = Math.max(0, likeCount + (newLike ? 1 : -1));

    setLiked(newLike);
    setLikeCount(newCount);

    const likes = readVideoLikes();

    likes[key] = {
      liked: newLike,
      count: newCount
    };

    saveVideoLikes(likes);
  };

  const goNext = () => {
    if (!story) return;

    if (currentVideos.length > 0 && videoIdx < currentVideos.length - 1) {
      setVideoIdx((prev) => prev + 1);
      return;
    }

    if (stories.length > 1 && currentStoryIdx !== null) {
      const nextStoryIdx = (currentStoryIdx + 1) % stories.length;

      setStoryIdx(nextStoryIdx);
      setVideoIdx(0);
      return;
    }

    setPlaying(false);
  };

  const goPrev = () => {
    if (!story) return;

    if (videoIdx > 0) {
      setVideoIdx((prev) => prev - 1);
      return;
    }

    if (stories.length > 1 && currentStoryIdx !== null) {
      const prevStoryIdx =
        (currentStoryIdx - 1 + stories.length) % stories.length;

      const prevStory = stories[prevStoryIdx];
      const prevVideos = storyVideosMap.get(prevStory.id) || [];

      setStoryIdx(prevStoryIdx);
      setVideoIdx(Math.max(0, prevVideos.length - 1));
    }
  };

  const handleComment = async () => {
    if (!story) return;

    const text = commentText.trim();
    const author = commentAuthor.trim();

    if (!author) {
      showError('Digite seu nome');
      return;
    }

    if (!text) {
      showError('Digite um comentário');
      return;
    }

    const newComment = {
      id: generateId(),
      story_id: story.id,
      story_title: story.title,
      video_id: currentVideo?.id || '',
      video_title: (currentVideo as any)?.title || story.title,
      product_id: currentProduct?.id || '',
      product_name: currentProduct?.name || story.title,
      product_url: getProductUrl(),
      product_image_url: getProductImageUrl(),
      text,
      emoji: '',
      author_name: author,
      user_name: author,
      read: false,
      status: 'published',
      created_at: new Date().toISOString()
    };

    await saveComment(newComment);

    setCommentText('');
    setEmoji('');
    setShowEmoji(false);

    showSuccess('Comentário enviado');
  };

  const handleShare = async (type: ShareOption) => {
    const payload = buildShareText();

    try {
      await (db as any).incrementClickCount?.(story?.id);
    } catch {
      //
    }

    try {
      switch (type) {
        case 'native': {
          if (navigator.share) {
            await navigator.share({
              title: payload.title,
              text: payload.title,
              url: payload.url
            });
          } else {
            await navigator.clipboard.writeText(payload.text);
            showSuccess('Mensagem copiada!');
          }

          break;
        }

        case 'whatsapp': {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(payload.text)}`,
            '_blank'
          );

          break;
        }

        case 'telegram': {
          window.open(
            `https://t.me/share/url?url=${encodeURIComponent(
              payload.url
            )}&text=${encodeURIComponent(payload.title)}`,
            '_blank'
          );

          break;
        }

        case 'email': {
          window.open(
            `mailto:?subject=${encodeURIComponent(
              payload.title
            )}&body=${encodeURIComponent(payload.text)}`
          );

          break;
        }

        case 'copy':
        default: {
          await navigator.clipboard.writeText(payload.text);

          setCopied(true);

          setTimeout(() => {
            setCopied(false);
          }, 2000);

          showSuccess('Mensagem copiada!');

          break;
        }
      }
    } catch {
      showError('Erro ao compartilhar');
    }

    setShowShare(false);
  };

  const handleWhatsApp = async () => {
    const payload = buildShareText();

    try {
      await (db as any).incrementClickCount?.(story?.id);
    } catch {
      //
    }

    const phone = String(
      settings?.whatsapp_number || settings?.whatsapp || ''
    ).replace(/\D/g, '');

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(payload.text)}`
      : `https://wa.me/?text=${encodeURIComponent(payload.text)}`;

    window.open(url, '_blank');
  };

  const renderThumb = (video?: Video | null) => {
    const urlImg = getVideoPreviewUrl(video);

    if (!urlImg) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-900">
          <Play className="h-10 w-10 fill-white text-white" />
        </div>
      );
    }

    if (isVideoFile(urlImg)) {
      return (
        <video
          src={urlImg}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-all group-hover:scale-105"
        />
      );
    }

    return (
      <img
        src={urlImg}
        alt="Story"
        className="h-full w-full object-cover transition-all group-hover:scale-105"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const storeList = await db.stores.getAll();
        const currentStore = storeId
          ? storeList.find((store: any) => store.id === storeId)
          : storeList[0];

        if (!currentStore) {
          if (mounted) setStories([]);
          return;
        }

        if (!mounted) return;

        setStoreName(currentStore.name || currentStore.title || '');

        const genSettings = (
          await db.generalSettings.getAll(currentStore.id)
        )[0];

        if (!mounted) return;

        setSettings(genSettings || null);
        setMuted(genSettings?.muted_by_default ?? true);

        const allStories = await db.stories.getAll(currentStore.id);

        const activeStories = allStories
          .filter((item: any) => item.active)
          .sort((a: any, b: any) => {
            return Number(a.position || 0) - Number(b.position || 0);
          });

        const filteredStories = storyIdParam
          ? activeStories.filter((item: any) => item.id === storyIdParam)
          : activeStories;

        const storyVids = await db.storyVideos.getAll();
        const allVids = await db.videos.getAll();

        const map = new Map<string, Video[]>();

        filteredStories.forEach((st: any) => {
          const relationVideos = storyVids
            .filter((sv: any) => sv.story_id === st.id)
            .sort((a: any, b: any) => {
              return Number(a.position || 0) - Number(b.position || 0);
            })
            .map((sv: any) => {
              return allVids.find((video: any) => video.id === sv.video_id);
            })
            .filter(Boolean) as Video[];

          const storyVidIds = [
            st.video_id,
            ...(Array.isArray(st.video_ids) ? st.video_ids : []),
            ...(Array.isArray(st.videos) ? st.videos : [])
          ].filter(Boolean);

          const storyVidObjs = storyVidIds
            .map((id: string) => {
              return allVids.find((video: any) => video.id === id);
            })
            .filter(Boolean) as Video[];

          const directVids = allVids.filter((video: any) => {
            return (
              video.story_id === st.id ||
              video.storyId === st.id ||
              video.story_ids?.includes?.(st.id) ||
              video.stories?.includes?.(st.id)
            );
          });

          const totalVideos = mergeVideos([
            ...relationVideos,
            ...storyVidObjs,
            ...directVids
          ]);

          map.set(st.id, totalVideos);
        });

        if (!mounted) return;

        setStories(filteredStories);
        setStoryVideosMap(map);

        if (storyIdParam && filteredStories.length > 0) {
          const firstStory = filteredStories[0];
          const videos = map.get(firstStory.id) || [];

          const initialVideoIdx = videoIdParam
            ? videos.findIndex((video) => video.id === videoIdParam)
            : 0;

          setStoryIdx(0);
          setVideoIdx(initialVideoIdx >= 0 ? initialVideoIdx : 0);
        } else {
          setStoryIdx(null);
          setVideoIdx(0);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [storeId, storyIdParam, videoIdParam]);

  useEffect(() => {
    if (!story) return;

    let mounted = true;

    const loadRelations = async () => {
      try {
        const rels = await (db as any).storyProducts?.getAll?.();
        const relation = Array.isArray(rels)
          ? rels.find((item: any) => item.story_id === story.id)
          : null;

        if (relation?.product_id) {
          const product = await db.products.getById(relation.product_id);

          if (mounted) setProduct(product || null);
        } else {
          if (mounted) setProduct(null);
        }
      } catch {
        if (mounted) setProduct(null);
      }

      try {
        if (story.model_id) {
          const model = await db.sizingModels.getById(story.model_id);

          if (mounted) setModel(model || null);
        } else {
          if (mounted) setModel(null);
        }
      } catch {
        if (mounted) setModel(null);
      }
    };

    setVideoError(false);
    setShowComments(false);
    setShowEmoji(false);
    setShowShare(false);
    setShowMeasures(false);
    setCommentText('');
    setEmoji('');

    loadRelations();

    return () => {
      mounted = false;
    };
  }, [story?.id]);

  useEffect(() => {
    if (!story) return;

    if (currentVideos.length > 0 && videoIdx >= currentVideos.length) {
      setVideoIdx(0);
      return;
    }

    setVideoError(false);

    loadComments(story.id, currentVideo?.id || '');
    loadVideoLikeState(currentVideo);
  }, [story?.id, currentVideo?.id, videoIdx, currentVideos.length]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!stories.length) return null;

  return (
    <div className="w-full">
      {!story && (
        <div className="flex gap-4 overflow-x-auto p-4">
          {stories.map((st, idx) => {
            const videos = storyVideosMap.get(st.id) || [];

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setStoryIdx(idx);
                  setVideoIdx(0);
                }}
                className="group relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-3xl border-2 border-violet-500 bg-slate-900 shadow-lg sm:h-32 sm:w-24"
              >
                {renderThumb(videos[0])}

                {showTitle && (
                  <div className="absolute bottom-0 left-0 right-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] font-black text-white">
                    {st.title}
                  </div>
                )}

                {videos.length > 1 && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black text-white">
                    {videos.length} vídeos
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {story && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-4">
          <div className="relative aspect-[9/16] max-h-[calc(100vh-24px)] w-full max-w-[420px] overflow-hidden rounded-[40px] bg-black shadow-2xl">
            {currentVideos.length > 1 && (
              <div className="absolute left-4 right-4 top-3 z-[70] flex gap-1.5">
                {currentVideos.map((video, idx) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setVideoIdx(idx)}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full transition-all',
                        idx < videoIdx && 'w-full bg-white',
                        idx === videoIdx && 'w-full bg-violet-400',
                        idx > videoIdx && 'w-0 bg-white'
                      )}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-6 pt-8">
              <div>
                <h3 className="text-sm font-black text-white">
                  {story.title}
                </h3>

                <p className="text-[10px] font-bold uppercase text-white/60">
                  {storeName}
                  {currentVideos.length > 1
                    ? ` • ${videoIdx + 1}/${currentVideos.length}`
                    : ''}
                </p>
              </div>

              <button type="button" onClick={close} className={darkBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute right-6 top-24 z-[85] flex flex-col gap-3">
              {isEnabled('show_play_button', true) && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={darkBtn}
                  aria-label={
                    playing && !videoError ? 'Pausar vídeo' : 'Reproduzir vídeo'
                  }
                >
                  {playing && !videoError ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleMute}
                className={darkBtn}
                aria-label={muted ? 'Ativar som' : 'Desativar som'}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>

            {currentUrl && !videoError ? (
              <video
                key={`${story.id}_${currentVideo?.id}_${videoIdx}`}
                ref={videoRef}
                src={currentUrl}
                poster={posterUrl || undefined}
                autoPlay={settings?.autoplay ?? true}
                muted={muted}
                playsInline
                controls={settings?.show_video_controls ?? false}
                className="h-full w-full cursor-pointer object-cover"
                onClick={handleTogglePlay}
                onEnded={goNext}
                onLoadedData={() => {
                  setVideoError(false);

                  if (settings?.autoplay ?? true) {
                    videoRef.current?.play().catch(() => {
                      setPlaying(false);
                    });
                  }
                }}
                onError={() => {
                  setVideoError(true);
                  setPlaying(false);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-950 px-8 text-center text-sm font-bold text-white/70">
                Nenhum vídeo linkado
              </div>
            )}

            {(currentVideos.length > 1 || stories.length > 1) && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 z-[65] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-purple-600/85 text-white shadow-xl backdrop-blur-md transition-all hover:bg-purple-700 active:scale-95"
                  aria-label="Voltar vídeo"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 z-[65] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-purple-600/85 text-white shadow-xl backdrop-blur-md transition-all hover:bg-purple-700 active:scale-95"
                  aria-label="Avançar vídeo"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}

            {(currentProduct || getProductUrl()) && (
              <div className="absolute bottom-0 left-0 right-0 z-[70] bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">
                <div className="flex w-full items-center gap-3 rounded-3xl border border-white/25 bg-white/95 p-3 text-slate-950 shadow-2xl backdrop-blur-md">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                    {getProductImageUrl() ? (
                      <img
                        src={getProductImageUrl()}
                        alt={getProductName()}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-black text-slate-500">
                        Produto
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black leading-tight text-slate-950">
                      {getProductName()}
                    </p>

                    {getProductPrice() && (
                      <p className="mt-1 text-base font-black text-violet-700">
                        {getProductPrice()}
                      </p>
                    )}

                    {getProductUrl() && (
                      <a
                        href={getProductUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-4 py-2 text-[11px] font-black text-white hover:bg-violet-700"
                      >
                        Ver produto
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-36 right-4 z-[80] flex flex-col gap-4">
              <button
                type="button"
                onClick={handleLike}
                className={cn(darkBtn, 'relative')}
                aria-label={liked ? 'Remover curtida' : 'Curtir vídeo'}
              >
                <Heart
                  className={cn(
                    'h-5 w-5 transition-all',
                    liked ? 'fill-rose-500 text-rose-500' : 'text-white'
                  )}
                />

                {likeCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-black">
                    {likeCount > 99 ? '99+' : likeCount}
                  </span>
                )}
              </button>

              {isEnabled('show_comment_button', true) && (
                <button
                  type="button"
                  onClick={() => setShowComments(true)}
                  className={cn(darkBtn, 'relative')}
                  aria-label="Abrir comentários"
                >
                  <MessageCircle className="h-5 w-5" />

                  {comments.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white ring-2 ring-black">
                      {comments.length > 99 ? '99+' : comments.length}
                    </span>
                  )}
                </button>
              )}

              {isEnabled('show_share_button', true) && (
                <button
                  type="button"
                  onClick={() => setShowShare(true)}
                  className={whiteBtn}
                  aria-label="Compartilhar"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
                </button>
              )}

              {isEnabled('show_whatsapp_button', true) && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className={whiteBtn}
                  style={{
                    backgroundColor: '#25D366',
                    color: '#fff'
                  }}
                  aria-label="Enviar pelo WhatsApp"
                >
                  <WhatsAppIcon size={24} />
                </button>
              )}

              {isEnabled('show_measure_button', false) && (
                <button
                  type="button"
                  onClick={() => setShowMeasures(true)}
                  className={purpleBtn}
                  aria-label="Ver medidas"
                >
                  <Ruler className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {showShare && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">
                    Compartilhar
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowShare(false)}
                    className="rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {navigator.share && (
                    <button
                      type="button"
                      onClick={() => handleShare('native')}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-4 font-bold text-white hover:bg-violet-700"
                    >
                      <Share2 className="h-5 w-5" />
                      Dispositivo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleShare('whatsapp')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-4 font-bold text-white hover:bg-green-700"
                  >
                    <WhatsAppIcon size={20} />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('telegram')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-4 font-bold text-white hover:bg-sky-700"
                  >
                    <Send className="h-5 w-5" />
                    Telegram
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('email')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 font-bold text-white hover:bg-slate-700"
                  >
                    <Mail className="h-5 w-5" />
                    E-mail
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('copy')}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 font-bold text-white hover:bg-slate-700"
                  >
                    {copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}

                    {copied ? 'Copiado' : 'Copiar link'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showComments && (
            <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
              <div className="max-h-[86vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-black shadow-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-white/10 bg-black p-4">
                  <h3 className="text-lg font-black text-white">
                    Comentários
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowComments(false)}
                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[42vh] overflow-y-auto bg-slate-900 p-4">
                  {comments.length === 0 ? (
                    <div className="rounded-2xl bg-slate-800 p-5 text-center text-sm font-bold text-slate-300">
                      Seja o primeiro a comentar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl bg-slate-800 p-3"
                        >
                          <div className="mb-1 flex items-center gap-2 text-white">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600">
                              <User className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="text-sm font-black">
                                {comment.author_name ||
                                  comment.user_name ||
                                  'Cliente'}
                              </p>

                              <p className="text-[10px] font-bold text-slate-400">
                                {comment.created_at
                                  ? new Date(
                                      comment.created_at
                                    ).toLocaleString('pt-BR')
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm font-medium text-slate-100">
                            {comment.emoji ? `${comment.emoji} ` : ''}
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 bg-black p-4">
                  <div className="mb-3">
                    <input
                      value={commentAuthor}
                      onChange={(event) =>
                        setCommentAuthor(event.target.value)
                      }
                      placeholder="Seu nome"
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/40 focus:border-violet-500"
                    />
                  </div>

                  <div className="relative mb-3">
                    <textarea
                      ref={textareaRef}
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Escreva seu comentário..."
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 pr-12 text-sm font-bold text-white outline-none placeholder:text-white/40 focus:border-violet-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmoji((prev) => !prev)}
                      className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    >
                      <Smile className="h-4 w-4" />
                    </button>

                    {showEmoji && (
                      <div className="absolute bottom-full right-0 mb-2 grid w-64 grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-black p-3 shadow-2xl">
                        {EMOJIS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => insertEmojiAtCursor(item)}
                            className={cn(
                              'rounded-xl p-2 text-lg hover:bg-white/10',
                              emoji === item && 'bg-violet-600'
                            )}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleComment}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-black text-white hover:bg-violet-700"
                  >
                    <Send className="h-4 w-4" />
                    Enviar comentário
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMeasures && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">
                    Medidas
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowMeasures(false)}
                    className="rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {currentModel ? (
                  <div className="space-y-3 text-sm font-bold text-slate-200">
                    {Object.entries(currentModel)
                      .filter(([key, value]) => {
                        return (
                          ![
                            'id',
                            'store_id',
                            'created_at',
                            'updated_at'
                          ].includes(key) &&
                          value !== null &&
                          value !== undefined &&
                          value !== ''
                        );
                      })
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3"
                        >
                          <span className="capitalize text-slate-400">
                            {key.replace(/_/g, ' ')}
                          </span>

                          <span className="text-white">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-900 p-5 text-center text-sm font-bold text-slate-400">
                    Nenhuma medida cadastrada para este story.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
