import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  db,
  Story,
  Video,
  Appearance,
  GeneralSettings,
  Product,
  SizingModel,
} from '@/lib/db';
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
  Facebook,
  Instagram,
  User,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { cn } from '@/lib/utils';

type ModelMeasure = {
  name: string;
  value: string | number;
  unit?: string;
};

type VideoWithFallbacks = Video & {
  poster_url?: string;
  image_url?: string;
  file_url?: string;
  upload_url?: string;
  media_url?: string;
  source_url?: string;
  url?: string;
  src?: string;
  story_id?: string;
  storyId?: string;
  story_ids?: string[];
  stories?: string[];
  like_count?: number;
  likes_count?: number;
  likes?: number;
  likeCount?: number;
};

type StoryWithFallbacks = Story & {
  video_id?: string;
  video_ids?: string[];
  videos?: string[];
  like_count?: number;
  likes_count?: number;
  likes?: number;
  likeCount?: number;
};

type StoryComment = {
  id: string;
  store_id?: string;
  story_id: string;
  story_title?: string;
  video_id?: string;
  video_title?: string;
  product_id?: string;
  product_name?: string;
  product_url?: string;
  product_image_url?: string;
  text: string;
  emoji?: string;
  author_name?: string;
  user_name?: string;
  read?: boolean;
  status?: string;
  created_at: string;
};

type ShareOption =
  | 'native'
  | 'whatsapp'
  | 'messenger'
  | 'instagram'
  | 'telegram'
  | 'email'
  | 'copy';

type LocalVideoLike = {
  liked: boolean;
  count: number;
};

const COMMENT_STORAGE_KEYS = [
  'vidlytics_story_comments',
  'stories_comments',
  'story_comments',
  'comments',
];

const VIDEO_LIKES_STORAGE_KEY = 'vidlytics_video_likes';

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
  '🛍️',
];

const normalizeUrl = (url?: string | null) => {
  if (!url) return '';

  const cleanUrl = String(url).trim();

  if (!cleanUrl) return '';

  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith('/')) {
    return `${window.location.origin}${cleanUrl}`;
  }

  return cleanUrl;
};

const isProbablySocialUrl = (url: string) => {
  return /instagram\.com|tiktok\.com/i.test(url);
};

const getVideoPosterUrl = (video?: Video | null) => {
  if (!video) return '';

  const item = video as VideoWithFallbacks;

  return (
    normalizeUrl(item.thumbnail_url) ||
    normalizeUrl(item.poster_url) ||
    normalizeUrl(item.image_url) ||
    ''
  );
};

const getVideoPlayableUrl = (video?: Video | null) => {
  if (!video) return '';

  const item = video as VideoWithFallbacks;

  const url =
    normalizeUrl(item.video_url) ||
    normalizeUrl(item.file_url) ||
    normalizeUrl(item.upload_url) ||
    normalizeUrl(item.media_url) ||
    normalizeUrl(item.source_url) ||
    normalizeUrl(item.url) ||
    normalizeUrl(item.src) ||
    '';

  if (!url) return '';

  if (isProbablySocialUrl(url)) return '';

  return url;
};

const getVideoPreviewUrl = (video?: Video | null) => {
  if (!video) return '';

  return getVideoPosterUrl(video) || getVideoPlayableUrl(video);
};

const isVideoFile = (url: string) => {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.startsWith('data:video/');
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const readLocalComments = (): StoryComment[] => {
  for (const key of COMMENT_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return [];
};

const writeLocalComments = (comments: StoryComment[]) => {
  COMMENT_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify(comments));
    } catch {
      //
    }
  });
};

const readLocalVideoLikes = (): Record<string, LocalVideoLike> => {
  try {
    const raw = localStorage.getItem(VIDEO_LIKES_STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    //
  }

  return {};
};

const writeLocalVideoLikes = (likes: Record<string, LocalVideoLike>) => {
  try {
    localStorage.setItem(VIDEO_LIKES_STORAGE_KEY, JSON.stringify(likes));
  } catch {
    //
  }
};

const mergeComments = (items: StoryComment[]) => {
  const map = new Map<string, StoryComment>();

  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

const mergeVideos = (items: Video[]) => {
  const map = new Map<string, Video>();

  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values());
};

const getVideoLikeCount = (video?: Video | null) => {
  if (!video) return 0;

  const item = video as VideoWithFallbacks;

  const value =
    item.like_count ??
    item.likes_count ??
    item.likes ??
    item.likeCount ??
    0;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
};

const StoriesWidgetPage = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const previewStoryId = searchParams.get('storyId') || searchParams.get('storyid');

  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentStoreId, setCurrentStoreId] = useState<string>('');
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [currentAppearance, setCurrentAppearance] = useState<Appearance | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(new Map());

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showMeasuresPanel, setShowMeasuresPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [videoError, setVideoError] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentModel, setCurrentModel] = useState<SizingModel | null>(null);

  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const totalVideosInStory = videosForSelectedStory.length;
  const mainVideo = videosForSelectedStory[currentVideoIndex] || videosForSelectedStory[0] || null;

  const currentVideoId = mainVideo?.id || '';
  const currentVideoKey = currentVideoId || selectedStory?.id || '';

  const selectedAppearance =
    selectedStory?.appearance_id
      ? appearances.find((item) => item.id === selectedStory.appearance_id) || currentAppearance
      : currentAppearance;

  const selectedStoryTitle = selectedStory?.title || 'Story';
  const selectedVideoTitle = mainVideo?.title || selectedStoryTitle;
  const storeName = generalSettings?.store_name || 'Loja';

  const videoPlayableUrl = getVideoPlayableUrl(mainVideo);
  const videoPosterUrl = getVideoPosterUrl(mainVideo);

  const productPrice = currentProduct
    ? Number(currentProduct.price || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : '';

  const modelMeasures = currentModel
    ? (((currentModel as unknown as { measures?: ModelMeasure[] }).measures || []) as ModelMeasure[])
    : [];

  const showLikeButton = selectedAppearance?.show_like_button ?? true;
  const showCommentButton = selectedAppearance?.show_comment_button ?? true;
  const showShareButton = selectedAppearance?.show_share_button ?? true;
  const showWhatsappButton = selectedAppearance?.show_whatsapp_button ?? true;
  const showProduct = selectedAppearance?.show_product ?? true;
  const showProductButton = selectedAppearance?.show_product_button ?? true;
  const showPlayButton = selectedAppearance?.show_play_button ?? true;
  const showTitle = selectedAppearance?.show_title ?? true;

  const hasNavigation = stories.length > 1 || totalVideosInStory > 1;

  const getStoryPublicUrl = () => {
    if (!selectedStory) return window.location.href;

    const url = new URL(window.location.href);
    url.searchParams.set('storyId', selectedStory.id);

    if (currentVideoId) {
      url.searchParams.set('videoId', currentVideoId);
    }

    return url.toString();
  };

  const getCurrentProductUrl = () => {
    return normalizeUrl(currentProduct?.product_url || selectedStory?.cta_url || window.location.href);
  };

  const getCurrentProductImageUrl = () => {
    return normalizeUrl(currentProduct?.image_url || getVideoPosterUrl(mainVideo));
  };

  const getCurrentProductName = () => {
    return currentProduct?.name || selectedStory?.title || 'produto';
  };

  const getSharePayload = () => {
    const storyUrl = getStoryPublicUrl();
    const productUrl = getCurrentProductUrl();
    const productName = getCurrentProductName();

    const text = [
      'Olha esse vídeo que achei interessante:',
      selectedVideoTitle || productName,
      '',
      `Vídeo: ${storyUrl}`,
      currentProduct ? `Produto: ${currentProduct.name}` : '',
      productUrl ? `Link do produto: ${productUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      title: selectedVideoTitle || productName,
      text,
      url: storyUrl,
    };
  };

  const buildProductMessage = () => {
    const productName = getCurrentProductName();
    const productUrl = getCurrentProductUrl();
    const productImageUrl = getCurrentProductImageUrl();

    return [
      'Olá! Quero mais informações sobre esse produto:',
      productName,
      productUrl ? `Link: ${productUrl}` : '',
      productImageUrl ? `Imagem: ${productImageUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const loadComments = async (storyId: string, videoId: string) => {
    const localComments = readLocalComments().filter((comment) => {
      if (videoId) {
        return comment.story_id === storyId && comment.video_id === videoId;
      }

      return comment.story_id === storyId && !comment.video_id;
    });

    let remoteComments: StoryComment[] = [];

    try {
      const commentsApi = (db as unknown as { comments?: any }).comments;

      if (commentsApi?.getAll) {
        const response = currentStoreId
          ? await commentsApi.getAll(currentStoreId)
          : await commentsApi.getAll();

        if (Array.isArray(response)) {
          remoteComments = response.filter((comment: StoryComment) => {
            if (videoId) {
              return comment.story_id === storyId && comment.video_id === videoId;
            }

            return comment.story_id === storyId && !comment.video_id;
          });
        }
      }
    } catch {
      remoteComments = [];
    }

    setComments(mergeComments([...localComments, ...remoteComments]));
  };

  const saveComment = async (comment: StoryComment) => {
    const localComments = readLocalComments();
    const nextComments = mergeComments([comment, ...localComments]);

    writeLocalComments(nextComments);

    try {
      const commentsApi = (db as unknown as { comments?: any }).comments;

      if (commentsApi?.save) {
        await commentsApi.save(comment);
      } else if (commentsApi?.create) {
        await commentsApi.create(comment);
      } else if (commentsApi?.add) {
        await commentsApi.add(comment);
      } else if (commentsApi?.insert) {
        await commentsApi.insert(comment);
      }
    } catch {
      //
    }

    setComments((prev) => mergeComments([comment, ...prev]));
  };

  const loadVideoLikeState = (video?: Video | null) => {
    const key = video?.id || selectedStory?.id || '';

    if (!key) {
      setIsLiked(false);
      setLikeCount(0);
      return;
    }

    const localLikes = readLocalVideoLikes();
    const localState = localLikes[key];

    if (localState) {
      setIsLiked(Boolean(localState.liked));
      setLikeCount(Math.max(0, Number(localState.count || 0)));
      return;
    }

    setIsLiked(false);
    setLikeCount(getVideoLikeCount(video));
  };

  const openStory = (index: number) => {
    setSelectedIndex(index);
    setCurrentVideoIndex(0);
  };

  const closeStory = () => {
    setSelectedIndex(null);
    setCurrentVideoIndex(0);
    setShowCommentsPanel(false);
    setShowMeasuresPanel(false);
    setShowEmojiPicker(false);
    setShowSharePanel(false);
  };

  const goToNextVideoOrStory = () => {
    if (totalVideosInStory > 0 && currentVideoIndex < totalVideosInStory - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
      return;
    }

    if (selectedIndex !== null && stories.length > 1) {
      setSelectedIndex((selectedIndex + 1) % stories.length);
      setCurrentVideoIndex(0);
      return;
    }

    setIsPlaying(false);
  };

  const goToPreviousVideoOrStory = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
      return;
    }

    if (selectedIndex !== null && stories.length > 1) {
      const previousStoryIndex = (selectedIndex - 1 + stories.length) % stories.length;
      const previousStory = stories[previousStoryIndex];
      const previousStoryVideos = previousStory
        ? storyVideosMap.get(previousStory.id) || []
        : [];

      setSelectedIndex(previousStoryIndex);
      setCurrentVideoIndex(Math.max(previousStoryVideos.length - 1, 0));
    }
  };

  const handleShare = () => {
    if (!selectedStory) return;

    setShowSharePanel(true);
  };

  const copyShareText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleShareOption = async (type: ShareOption) => {
    if (!selectedStory) return;

    const payload = getSharePayload();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      await db.incrementClickCount(selectedStory.id);
    } catch {
      //
    }

    try {
      switch (type) {
        case 'native': {
          if (navigator.share) {
            await navigator.share(payload);
          } else {
            await copyShareText(payload.text);
            showSuccess('Mensagem copiada!');
          }

          break;
        }

        case 'whatsapp': {
          window.open(`https://wa.me/?text=${encodeURIComponent(payload.text)}`, '_blank');
          break;
        }

        case 'messenger': {
          await copyShareText(payload.text);

          if (isMobile) {
            window.location.href = `fb-messenger://share?link=${encodeURIComponent(payload.url)}`;

            setTimeout(() => {
              window.open('https://www.messenger.com/', '_blank');
            }, 700);
          } else {
            window.open('https://www.messenger.com/', '_blank');
          }

          showSuccess('Texto copiado! Cole no Messenger.');
          break;
        }

        case 'instagram': {
          await copyShareText(payload.text);

          if (isMobile) {
            window.location.href = 'instagram://direct-inbox';

            setTimeout(() => {
              window.open('https://www.instagram.com/direct/inbox/', '_blank');
            }, 700);
          } else {
            window.open('https://www.instagram.com/direct/inbox/', '_blank');
          }

          showSuccess('Texto copiado! Cole no Instagram Direct.');
          break;
        }

        case 'telegram': {
          window.open(
            `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(
              payload.text
            )}`,
            '_blank'
          );

          break;
        }

        case 'email': {
          window.open(
            `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(
              payload.text
            )}`
          );

          break;
        }

        case 'copy':
        default: {
          await copyShareText(payload.text);
          setCopiedLink(true);
          showSuccess('Link copiado!');

          setTimeout(() => {
            setCopiedLink(false);
          }, 2000);

          break;
        }
      }

      setShowSharePanel(false);
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      showError('Não foi possível compartilhar.');
    }
  };

  const renderStoryThumb = (video?: Video | null) => {
    const previewUrl = getVideoPreviewUrl(video);

    if (!previewUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-900">
          <Play className="h-10 w-10 fill-white text-white" />
        </div>
      );
    }

    if (isVideoFile(previewUrl)) {
      return (
        <video
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-all group-hover:scale-105"
        />
      );
    }

    return (
      <img
        src={previewUrl}
        alt={video?.title || 'Story'}
        className="h-full w-full object-cover transition-all group-hover:scale-105"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  };

  useEffect(() => {
    const loadWidgetData = async () => {
      try {
        setLoading(true);

        const stores = await db.stores.getAll();
        const currentStore = storeId
          ? stores.find((item) => item.id === storeId) || null
          : stores[0] || null;

        if (!currentStore) return;

        setCurrentStoreId(currentStore.id);

        const fetchedSettings = (await db.generalSettings.getAll(currentStore.id))[0] || null;
        setGeneralSettings(fetchedSettings);
        setIsMuted(fetchedSettings?.muted_by_default ?? true);

        const fetchedAppearances = await db.appearances.getAll(currentStore.id);
        setAppearances(fetchedAppearances);

        setCurrentAppearance(
          fetchedAppearances.find((app) => app.id === fetchedSettings?.default_appearance_id) ||
            fetchedAppearances[0] ||
            null
        );

        const fetchedStories = await db.stories.getAll(currentStore.id);

        const activeStories = fetchedStories
          .filter((story) => story.active)
          .sort((a, b) => a.position - b.position);

        const visibleStories = previewStoryId
          ? activeStories.filter((story) => story.id === previewStoryId)
          : activeStories;

        setStories(visibleStories);

        if (previewStoryId && visibleStories.length > 0) {
          setSelectedIndex(0);
          setCurrentVideoIndex(0);
        }

        const allStoryVideos = await db.storyVideos.getAll();
        const allVideos = await db.videos.getAll();

        const map = new Map<string, Video[]>();

        visibleStories.forEach((story) => {
          const storyItem = story as StoryWithFallbacks;

          const relationVideos = allStoryVideos
            .filter((storyVideo) => storyVideo.story_id === story.id)
            .sort((a, b) => a.position - b.position)
            .map((storyVideo) => allVideos.find((video) => video.id === storyVideo.video_id))
            .filter((video): video is Video => Boolean(video));

          const storyFieldVideoIds = [
            storyItem.video_id,
            ...(Array.isArray(storyItem.video_ids) ? storyItem.video_ids : []),
            ...(Array.isArray(storyItem.videos) ? storyItem.videos : []),
          ].filter(Boolean) as string[];

          const storyFieldVideos = storyFieldVideoIds
            .map((videoId) => allVideos.find((video) => video.id === videoId))
            .filter((video): video is Video => Boolean(video));

          const directVideos = allVideos.filter((video) => {
            const videoItem = video as VideoWithFallbacks;

            return (
              videoItem.story_id === story.id ||
              videoItem.storyId === story.id ||
              videoItem.story_ids?.includes(story.id) ||
              videoItem.stories?.includes(story.id)
            );
          });

          const videos = mergeVideos([...relationVideos, ...storyFieldVideos, ...directVideos]);

          map.set(story.id, videos);
        });

        setStoryVideosMap(map);
      } catch (error) {
        console.error('Erro no widget:', error);
        showError('Erro ao carregar stories.');
      } finally {
        setLoading(false);
      }
    };

    loadWidgetData();
  }, [storeId, previewStoryId]);

  useEffect(() => {
    if (!selectedStory) {
      setCurrentProduct(null);
      setCurrentModel(null);
      setShowCommentsPanel(false);
      setShowMeasuresPanel(false);
      setShowEmojiPicker(false);
      setShowSharePanel(false);
      setComments([]);
      setLikeCount(0);
      return;
    }

    db.incrementViewCount(selectedStory.id);

    setIsPlaying(true);
    setVideoError(false);
    setShowCommentsPanel(false);
    setShowMeasuresPanel(false);
    setShowEmojiPicker(false);
    setShowSharePanel(false);
    setCommentText('');
    setSelectedEmoji('');
    setIsMuted(generalSettings?.muted_by_default ?? true);

    const fetchRelations = async () => {
      try {
        const storyProducts = await db.storyProducts.getAll();
        const storyProduct = storyProducts.find((item) => item.story_id === selectedStory.id);

        if (storyProduct) {
          const product = await db.products.getById(storyProduct.product_id);
          setCurrentProduct(product || null);
        } else {
          setCurrentProduct(null);
        }

        if (selectedStory.model_id) {
          const model = await db.sizingModels.getById(selectedStory.model_id);
          setCurrentModel(model || null);
        } else {
          setCurrentModel(null);
        }
      } catch (error) {
        console.error('Erro ao carregar relações do story:', error);
        setCurrentProduct(null);
        setCurrentModel(null);
      }
    };

    fetchRelations();
  }, [selectedStory?.id, generalSettings?.muted_by_default]);

  useEffect(() => {
    if (!selectedStory) return;

    if (totalVideosInStory > 0 && currentVideoIndex > totalVideosInStory - 1) {
      setCurrentVideoIndex(0);
    }
  }, [selectedStory?.id, totalVideosInStory, currentVideoIndex]);

  useEffect(() => {
    if (!selectedStory) return;

    loadComments(selectedStory.id, currentVideoId);
    loadVideoLikeState(mainVideo);
    setShowCommentsPanel(false);
    setShowEmojiPicker(false);
    setCommentText('');
    setSelectedEmoji('');
  }, [selectedStory?.id, currentVideoId]);

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(true);

    const timer = setTimeout(() => {
      if (videoRef.current && videoPlayableUrl) {
        videoRef.current.muted = isMuted;
        videoRef.current.load();

        if (generalSettings?.autoplay ?? true) {
          videoRef.current.play().catch(() => {
            setIsPlaying(false);
          });
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [mainVideo?.id, videoPlayableUrl, isMuted, generalSettings?.autoplay]);

  const handleRetryVideo = () => {
    if (!videoPlayableUrl) {
      showError('Este vídeo não possui uma URL reproduzível. Reenvie o vídeo pela galeria.');
      return;
    }

    setVideoError(false);
    setIsPlaying(true);

    setTimeout(() => {
      if (!videoRef.current) return;

      videoRef.current.muted = isMuted;
      videoRef.current.load();

      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setVideoError(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setVideoError(true);
        });
    }, 150);
  };

  const handleTogglePlay = () => {
    if (videoError) {
      handleRetryVideo();
      return;
    }

    if (!videoRef.current) {
      handleRetryVideo();
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setVideoError(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setVideoError(true);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) {
      setIsMuted((prev) => !prev);
      return;
    }

    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleToggleLike = async () => {
    if (!currentVideoKey) return;

    const nextLiked = !isLiked;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));

    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    const localLikes = readLocalVideoLikes();

    localLikes[currentVideoKey] = {
      liked: nextLiked,
      count: nextCount,
    };

    writeLocalVideoLikes(localLikes);

    try {
      const api = db as unknown as {
        incrementVideoLikeCount?: (videoId: string) => Promise<void>;
        decrementVideoLikeCount?: (videoId: string) => Promise<void>;
        incrementLikeCount?: (id: string) => Promise<void>;
        decrementLikeCount?: (id: string) => Promise<void>;
      };

      if (currentVideoId) {
        if (nextLiked && api.incrementVideoLikeCount) {
          await api.incrementVideoLikeCount(currentVideoId);
        }

        if (!nextLiked && api.decrementVideoLikeCount) {
          await api.decrementVideoLikeCount(currentVideoId);
        }
      }
    } catch {
      //
    }
  };

  const handleWhatsApp = async () => {
    const whatsappNumber = generalSettings?.whatsapp_number;

    if (!whatsappNumber) {
      showError('WhatsApp não configurado.');
      return;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, '');

    if (!cleanNumber) {
      showError('Número do WhatsApp inválido.');
      return;
    }

    const message = buildProductMessage();

    if (selectedStory) {
      await db.incrementClickCount(selectedStory.id);
    }

    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendComment = async () => {
    if (!selectedStory) return;

    const text = commentText.trim();
    const authorName = commentAuthorName.trim();

    if (!authorName) {
      showError('Digite seu nome.');
      return;
    }

    if (!text) {
      showError('Digite um comentário antes de publicar.');
      return;
    }

    const comment: StoryComment = {
      id: generateId(),
      store_id: currentStoreId || storeId || '',
      story_id: selectedStory.id,
      story_title: selectedStory.title,
      video_id: currentVideoId,
      video_title: selectedVideoTitle,
      product_id: currentProduct?.id,
      product_name: currentProduct?.name || selectedStory.title,
      product_url: getCurrentProductUrl(),
      product_image_url: getCurrentProductImageUrl(),
      text,
      emoji: selectedEmoji || '',
      author_name: authorName,
      user_name: authorName,
      read: false,
      status: 'published',
      created_at: new Date().toISOString(),
    };

    await saveComment(comment);

    setCommentText('');
    setSelectedEmoji('');
    setShowEmojiPicker(false);
    showSuccess('Comentário publicado!');
  };

  const handleBuyProduct = async () => {
    const productUrl = getCurrentProductUrl();

    if (!productUrl) {
      showError('Link do produto não configurado.');
      return;
    }

    if (selectedStory) {
      await db.incrementClickCount(selectedStory.id);
    }

    window.open(productUrl, '_blank');
  };

  const handleCustomCTA = async () => {
    if (!selectedStory?.cta_url) {
      showError('URL do CTA não configurada.');
      return;
    }

    await db.incrementClickCount(selectedStory.id);
    window.open(normalizeUrl(selectedStory.cta_url), '_blank');
  };

  const formatCommentDate = (date: string) => {
    try {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  if (stories.length === 0) return null;

  const btnClass =
    'w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95';
  const darkBtn = cn(btnClass, 'bg-black/35 border border-white/20 text-white hover:bg-black/55');
  const whiteBtn = cn(btnClass, 'bg-white text-slate-900 shadow-xl');
  const purpleBtn = cn(
    btnClass,
    'bg-violet-600/95 border border-violet-300/30 text-white shadow-xl hover:bg-violet-500'
  );

  return (
    <div className="w-full">
      {!previewStoryId && (
        <div className="flex gap-4 overflow-x-auto p-4">
          {stories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => openStory(index)}
              className="group relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-3xl border-2 border-violet-500 bg-slate-900 shadow-lg sm:h-32 sm:w-24"
            >
              {renderStoryThumb(storyVideosMap.get(story.id)?.[0] || null)}

              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-8 w-8 fill-white text-white" />
              </div>

              {showTitle && (
                <div className="absolute bottom-0 left-0 right-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] font-black text-white">
                  {story.title}
                </div>
              )}

              {(storyVideosMap.get(story.id)?.length || 0) > 1 && (
                <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black text-white">
                  {storyVideosMap.get(story.id)?.length} vídeos
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-4">
          <div className="relative aspect-[9/16] max-h-[calc(100vh-24px)] w-full max-w-[420px] overflow-hidden rounded-[40px] bg-black shadow-2xl">
            {totalVideosInStory > 1 && (
              <div className="absolute left-4 right-4 top-3 z-[70] flex gap-1.5">
                {videosForSelectedStory.map((video, index) => (
                  <button
                    key={`${video.id}-${index}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCurrentVideoIndex(index);
                    }}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full transition-all',
                        index < currentVideoIndex && 'w-full bg-white',
                        index === currentVideoIndex && 'w-full bg-violet-400',
                        index > currentVideoIndex && 'w-0 bg-white'
                      )}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-6 pt-8">
              <div>
                <h3 className="text-sm font-black text-white">{selectedStoryTitle}</h3>
                <p className="text-[10px] font-bold uppercase text-white/60">
                  {storeName}
                  {totalVideosInStory > 1
                    ? ` • ${currentVideoIndex + 1}/${totalVideosInStory}`
                    : ''}
                </p>
              </div>

              <button onClick={closeStory} className={darkBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {mainVideo && videoPlayableUrl && !videoError ? (
              <video
                key={`${mainVideo.id}-${videoPlayableUrl.slice(0, 40)}-${currentVideoIndex}`}
                ref={videoRef}
                src={videoPlayableUrl}
                poster={videoPosterUrl || undefined}
                autoPlay={generalSettings?.autoplay ?? true}
                muted={isMuted}
                playsInline
                loop={false}
                controls={generalSettings?.show_video_controls ?? false}
                preload="auto"
                className="h-full w-full cursor-pointer object-cover"
                onClick={handleTogglePlay}
                onEnded={goToNextVideoOrStory}
                onLoadedData={() => {
                  setVideoError(false);

                  if (videoRef.current && (generalSettings?.autoplay ?? true)) {
                    videoRef.current.muted = isMuted;
                    videoRef.current.play().catch(() => {
                      setIsPlaying(false);
                    });
                  }
                }}
                onCanPlay={() => {
                  setVideoError(false);
                }}
                onError={() => {
                  setVideoError(true);
                  setIsPlaying(false);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : mainVideo && videoPosterUrl ? (
              <button
                type="button"
                onClick={handleRetryVideo}
                className="relative h-full w-full bg-slate-950 text-left"
              >
                <img
                  src={videoPosterUrl}
                  alt={selectedVideoTitle}
                  className="h-full w-full object-cover opacity-80"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-8 text-center">
                  <Play className="mb-4 h-14 w-14 fill-white text-white" />

                  <p className="text-sm font-black text-white">
                    Não foi possível reproduzir o vídeo.
                  </p>

                  <p className="mt-2 text-xs font-semibold text-white/70">
                    Toque para tentar novamente. Se continuar, reenvie o vídeo pela biblioteca.
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-950 px-8 text-center text-sm font-bold text-white/70">
                Nenhum vídeo reproduzível vinculado a este story.
              </div>
            )}

            {mainVideo && videoPlayableUrl && !videoError && !isPlaying && (
              <button
                type="button"
                onClick={handleTogglePlay}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/10"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-2xl">
                  <Play className="ml-1 h-10 w-10 fill-slate-950" />
                </div>
              </button>
            )}

            <div className="absolute bottom-28 right-4 z-50 flex flex-col gap-5">
              {showPlayButton && (
                <button onClick={handleTogglePlay} className={darkBtn}>
                  {isPlaying && !videoError ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 fill-white" />
                  )}
                </button>
              )}

              <button onClick={handleToggleMute} className={darkBtn}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              {showLikeButton && (
                <button onClick={handleToggleLike} className={cn(darkBtn, 'relative')}>
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-all',
                      isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'
                    )}
                  />

                  {likeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-black">
                      {likeCount > 99 ? '99+' : likeCount}
                    </span>
                  )}
                </button>
              )}

              {hasNavigation && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      goToPreviousVideoOrStory();
                    }}
                    className={purpleBtn}
                    aria-label="Voltar vídeo"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      goToNextVideoOrStory();
                    }}
                    className={purpleBtn}
                    aria-label="Avançar vídeo"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              )}

              {showCommentButton && (
                <button
                  onClick={() => setShowCommentsPanel(true)}
                  className={cn(darkBtn, 'relative')}
                >
                  <MessageCircle className="h-5 w-5" />

                  {comments.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white ring-2 ring-black">
                      {comments.length > 99 ? '99+' : comments.length}
                    </span>
                  )}
                </button>
              )}

              {showShareButton && (
                <button onClick={handleShare} className={whiteBtn}>
                  {copiedLink ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
                </button>
              )}

              {showWhatsappButton && (
                <button
                  onClick={handleWhatsApp}
                  className={whiteBtn}
                  style={{ backgroundColor: '#25D366', color: '#fff' }}
                >
                  <WhatsAppIcon size={24} />
                </button>
              )}

              <button
                onClick={() => setShowMeasuresPanel(true)}
                className={cn(whiteBtn, 'bg-violet-600 text-white')}
              >
                <Ruler className="h-5 w-5" />
              </button>
            </div>

            {showProduct && currentProduct && (
              <div className="absolute bottom-8 left-4 right-20 z-50 flex animate-fade-in items-center gap-4 rounded-3xl bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {currentProduct.image_url ? (
                    <img
                      src={normalizeUrl(currentProduct.image_url)}
                      alt={currentProduct.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                      Sem foto
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black text-slate-900">
                    {currentProduct.name}
                  </h4>

                  <p className="text-xs font-black text-violet-600">{productPrice}</p>

                  {showProductButton && (
                    <button
                      onClick={handleBuyProduct}
                      className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-950 py-1.5 text-[10px] font-black uppercase text-white"
                    >
                      {selectedStory.cta_text || 'Comprar'} <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!currentProduct &&
              selectedStory.cta_enabled &&
              selectedStory.cta_type === 'custom_link' &&
              selectedStory.cta_url && (
                <div className="absolute bottom-8 left-4 right-20 z-50">
                  <button
                    onClick={handleCustomCTA}
                    className="flex w-full items-center justify-center gap-2 rounded-3xl bg-white px-4 py-4 text-sm font-black text-slate-950 shadow-2xl"
                  >
                    {selectedStory.cta_text || 'Saiba mais'}
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              )}
          </div>

          {showSharePanel && (
            <div className="fixed inset-0 z-[10000] flex animate-fade-in items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-sm rounded-[32px] border border-slate-800 bg-slate-900 p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">Compartilhar</h3>
                    <p className="text-xs font-bold text-slate-500">
                      Escolha onde deseja enviar
                    </p>
                  </div>

                  <button
                    onClick={() => setShowSharePanel(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {navigator.share && (
                    <button
                      onClick={() => handleShareOption('native')}
                      className="col-span-2 flex items-center justify-center gap-3 rounded-2xl bg-violet-600 px-4 py-4 font-black text-white hover:bg-violet-500"
                    >
                      <Share2 className="h-5 w-5" />
                      Opções do dispositivo
                    </button>
                  )}

                  <button
                    onClick={() => handleShareOption('whatsapp')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-4 font-black text-white hover:bg-green-500"
                  >
                    <WhatsAppIcon size={20} />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => handleShareOption('messenger')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-black text-white hover:bg-blue-500"
                  >
                    <Facebook className="h-5 w-5" />
                    Messenger
                  </button>

                  <button
                    onClick={() => handleShareOption('instagram')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-pink-600 px-4 py-4 font-black text-white hover:bg-pink-500"
                  >
                    <Instagram className="h-5 w-5" />
                    Direct
                  </button>

                  <button
                    onClick={() => handleShareOption('telegram')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-4 font-black text-white hover:bg-sky-500"
                  >
                    <Send className="h-5 w-5" />
                    Telegram
                  </button>

                  <button
                    onClick={() => handleShareOption('email')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 font-black text-white hover:bg-slate-700"
                  >
                    <Mail className="h-5 w-5" />
                    E-mail
                  </button>

                  <button
                    onClick={() => handleShareOption('copy')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 font-black text-white hover:bg-slate-700"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-5 w-5 text-green-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCommentsPanel && (
            <div className="fixed inset-0 z-[10000] flex animate-fade-in items-center justify-center bg-black/80 p-4">
              <div className="relative flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-[36px] border border-slate-800 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/15 text-violet-400">
                      <MessageCircle className="h-7 w-7" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">Comentários</h3>
                      <p className="text-xs font-bold text-slate-500">
                        {comments.length} comentário{comments.length === 1 ? '' : 's'} neste vídeo
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCommentsPanel(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-slate-200 px-6 py-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Comentários antigos
                  </p>
                </div>

                <div className="min-h-[170px] max-h-[46vh] flex-1 overflow-y-auto bg-slate-200 p-4">
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <User className="mt-0.5 h-4 w-4 text-violet-600" />

                              <div>
                                <p className="text-sm font-black text-slate-950">
                                  {comment.author_name || comment.user_name || 'Visitante'}
                                </p>

                                <p className="text-[11px] font-bold text-slate-500">
                                  {formatCommentDate(comment.created_at)}
                                </p>
                              </div>
                            </div>

                            {comment.emoji && <span className="text-xl">{comment.emoji}</span>}
                          </div>

                          <p className="text-sm font-semibold leading-relaxed text-slate-700">
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-400 bg-slate-100 p-6 text-center">
                      <p className="text-sm font-bold text-slate-500">
                        Nenhum comentário neste vídeo. Seja a primeira pessoa a comentar.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 bg-slate-900 px-5 py-5">
                  <div className="mb-3">
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                      Seu nome
                    </label>

                    <input
                      value={commentAuthorName}
                      onChange={(event) => setCommentAuthorName(event.target.value)}
                      placeholder="Digite seu nome"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                      Novo comentário
                    </label>

                    <div className="relative">
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        rows={3}
                        placeholder="Digite seu comentário..."
                        className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 pr-14 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                      />

                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {showEmojiPicker && (
                    <div className="mb-3 grid grid-cols-8 gap-2 rounded-3xl border border-slate-800 bg-slate-950 p-3">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            setCommentText((prev) =>
                              prev.trim()
                                ? `${prev}${prev.endsWith(' ') ? '' : ' '}${emoji}`
                                : emoji
                            );
                            setShowEmojiPicker(false);
                          }}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-all hover:bg-violet-600/30',
                            selectedEmoji === emoji && 'bg-violet-600/40 ring-1 ring-violet-400'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <button
                      onClick={handleSendComment}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 font-black text-white transition-all hover:bg-violet-500"
                    >
                      Publicar
                      <Send className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => setShowCommentsPanel(false)}
                      className="rounded-2xl bg-slate-800 px-5 py-4 font-black text-white transition-all hover:bg-slate-700"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showMeasuresPanel && (
            <div className="fixed inset-0 z-[10000] flex animate-fade-in items-center justify-center bg-black/80 p-4">
              <div className="relative w-full max-w-sm rounded-[40px] border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                <button
                  onClick={() => setShowMeasuresPanel(false)}
                  className="absolute right-6 top-6 rounded-full bg-slate-950 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-8 flex items-center gap-4">
                  <div className="rounded-3xl bg-violet-600/10 p-4 text-violet-400">
                    <Ruler className="h-8 w-8" />
                  </div>

                  <h3 className="text-2xl font-black text-white">Tabela de Medidas</h3>
                </div>

                {currentModel ? (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Modelo
                      </p>
                      <p className="mt-1 text-lg font-black text-white">{currentModel.name}</p>
                    </div>

                    {modelMeasures.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {modelMeasures.map((measure, index) => (
                          <div
                            key={`${measure.name}-${index}`}
                            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"
                          >
                            <p className="text-[10px] font-bold uppercase text-slate-500">
                              {measure.name}
                            </p>
                            <p className="mt-1 text-base font-black text-violet-400">
                              {measure.value} {measure.unit || ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="font-bold text-slate-400">
                          Nenhuma medida cadastrada para esta modelo.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="font-bold text-slate-400">
                      Nenhuma modelo vinculada a este story.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowMeasuresPanel(false)}
                  className="mt-8 w-full rounded-3xl bg-slate-800 py-4 font-black text-white transition-all hover:bg-slate-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoriesWidgetPage;
