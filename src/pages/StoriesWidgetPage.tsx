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
};

type StoryComment = {
  id: string;
  store_id?: string;
  story_id: string;
  story_title?: string;
  product_id?: string;
  product_name?: string;
  product_url?: string;
  product_image_url?: string;
  text: string;
  emoji?: string;
  author_name?: string;
  read?: boolean;
  status?: string;
  created_at: string;
};

const COMMENT_STORAGE_KEYS = [
  'vidlytics_story_comments',
  'stories_comments',
  'story_comments',
  'comments',
];

const EMOJIS = [
  '😍',
  '🔥',
  '👏',
  '❤️',
  '😮',
  '😊',
  '😂',
  '🤩',
  '😎',
  '👍',
  '💜',
  '✨',
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

  return (
    normalizeUrl(item.video_url) ||
    normalizeUrl(item.file_url) ||
    normalizeUrl(item.upload_url) ||
    normalizeUrl(item.media_url) ||
    normalizeUrl(item.source_url) ||
    normalizeUrl(item.url) ||
    normalizeUrl(item.src) ||
    ''
  );
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
  const [loading, setLoading] = useState(true);

  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showMeasuresPanel, setShowMeasuresPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😍');
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [videoError, setVideoError] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentModel, setCurrentModel] = useState<SizingModel | null>(null);

  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const mainVideo = videosForSelectedStory[0] || null;

  const selectedAppearance =
    selectedStory?.appearance_id
      ? appearances.find((item) => item.id === selectedStory.appearance_id) || currentAppearance
      : currentAppearance;

  const selectedStoryTitle = selectedStory?.title || 'Story';
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

  const getCurrentProductUrl = () => {
    return normalizeUrl(currentProduct?.product_url || selectedStory?.cta_url || window.location.href);
  };

  const getCurrentProductImageUrl = () => {
    return normalizeUrl(currentProduct?.image_url || getVideoPosterUrl(mainVideo));
  };

  const getCurrentProductName = () => {
    return currentProduct?.name || selectedStory?.title || 'produto';
  };

  const buildProductMessage = () => {
    const productName = getCurrentProductName();
    const productUrl = getCurrentProductUrl();
    const productImageUrl = getCurrentProductImageUrl();

    return [
      'Quero mais informações sobre esse produto:',
      productName,
      productUrl ? `Link: ${productUrl}` : '',
      productImageUrl ? `Imagem: ${productImageUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const loadComments = async (storyId: string) => {
    const localComments = readLocalComments().filter((comment) => comment.story_id === storyId);
    let remoteComments: StoryComment[] = [];

    try {
      const commentsApi = (db as unknown as { comments?: any }).comments;

      if (commentsApi?.getAll) {
        const response = currentStoreId
          ? await commentsApi.getAll(currentStoreId)
          : await commentsApi.getAll();

        if (Array.isArray(response)) {
          remoteComments = response.filter((comment: StoryComment) => comment.story_id === storyId);
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

      if (commentsApi?.create) {
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
        }

        const allStoryVideos = await db.storyVideos.getAll();
        const allVideos = await db.videos.getAll();

        const map = new Map<string, Video[]>();

        visibleStories.forEach((story) => {
          const videos = allStoryVideos
            .filter((storyVideo) => storyVideo.story_id === story.id)
            .sort((a, b) => a.position - b.position)
            .map((storyVideo) => allVideos.find((video) => video.id === storyVideo.video_id))
            .filter((video): video is Video => Boolean(video));

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
      setComments([]);
      return;
    }

    db.incrementViewCount(selectedStory.id);

    setIsLiked(false);
    setIsPlaying(true);
    setVideoError(false);
    setShowCommentsPanel(false);
    setShowMeasuresPanel(false);
    setShowEmojiPicker(false);
    setCommentText('');
    setSelectedEmoji('😍');

    loadComments(selectedStory.id);

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
  }, [selectedStory?.id]);

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(true);

    const timer = setTimeout(() => {
      if (videoRef.current && videoPlayableUrl) {
        videoRef.current.load();

        if (generalSettings?.autoplay ?? true) {
          videoRef.current.play().catch(() => {
            setIsPlaying(false);
          });
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [mainVideo?.id, videoPlayableUrl]);

  const handleRetryVideo = () => {
    if (!videoPlayableUrl) {
      showError('Este vídeo não possui uma URL reproduzível.');
      return;
    }

    setVideoError(false);
    setIsPlaying(true);

    setTimeout(() => {
      if (!videoRef.current) return;

      videoRef.current.load();

      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
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
    if (!videoRef.current) return;

    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  const handleShare = async () => {
    const productName = getCurrentProductName();
    const productUrl = getCurrentProductUrl();
    const shareText = buildProductMessage();

    try {
      if (navigator.share) {
        await navigator.share({
          title: productName,
          text: shareText,
          url: productUrl || window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopiedLink(true);
        showSuccess('Informações copiadas!');
        setTimeout(() => setCopiedLink(false), 2000);
      }

      if (selectedStory) {
        await db.incrementClickCount(selectedStory.id);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
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

    if (!text) {
      showError('Digite um comentário antes de publicar.');
      return;
    }

    const comment: StoryComment = {
      id: generateId(),
      store_id: currentStoreId || storeId || '',
      story_id: selectedStory.id,
      story_title: selectedStory.title,
      product_id: currentProduct?.id,
      product_name: currentProduct?.name || selectedStory.title,
      product_url: getCurrentProductUrl(),
      product_image_url: getCurrentProductImageUrl(),
      text,
      emoji: selectedEmoji,
      author_name: 'Visitante',
      read: false,
      status: 'published',
      created_at: new Date().toISOString(),
    };

    await saveComment(comment);

    setCommentText('');
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
  const darkBtn = cn(btnClass, 'bg-black/30 border border-white/20 text-white hover:bg-black/50');
  const whiteBtn = cn(btnClass, 'bg-white text-slate-900 shadow-xl');

  return (
    <div className="w-full">
      {!previewStoryId && (
        <div className="flex gap-4 overflow-x-auto p-4">
          {stories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => setSelectedIndex(index)}
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
            </button>
          ))}
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-4">
          <div className="relative aspect-[9/16] max-h-[calc(100vh-24px)] w-full max-w-[420px] overflow-hidden rounded-[40px] bg-black shadow-2xl">
            <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-6">
              <div>
                <h3 className="text-sm font-black text-white">{selectedStoryTitle}</h3>
                <p className="text-[10px] font-bold uppercase text-white/60">{storeName}</p>
              </div>

              <button onClick={() => setSelectedIndex(null)} className={darkBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {mainVideo && videoPlayableUrl && !videoError ? (
              <video
                key={mainVideo.id}
                ref={videoRef}
                src={videoPlayableUrl}
                poster={videoPosterUrl || undefined}
                autoPlay={generalSettings?.autoplay ?? true}
                muted={isMuted}
                playsInline
                loop
                controls={generalSettings?.show_video_controls ?? false}
                preload="auto"
                className="h-full w-full cursor-pointer object-cover"
                onClick={handleTogglePlay}
                onLoadedData={() => {
                  setVideoError(false);

                  if (videoRef.current && (generalSettings?.autoplay ?? true)) {
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
                  alt={mainVideo.title || selectedStoryTitle}
                  className="h-full w-full object-cover opacity-80"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-8 text-center">
                  <Play className="mb-4 h-14 w-14 fill-white text-white" />

                  <p className="text-sm font-black text-white">
                    Não foi possível reproduzir o vídeo.
                  </p>

                  <p className="mt-2 text-xs font-semibold text-white/70">
                    Toque para tentar novamente. Se continuar, o upload salvou apenas a capa ou um
                    link inválido do MP4.
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

            <div className="absolute bottom-32 right-4 z-50 flex flex-col gap-4">
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
                <button onClick={handleToggleLike} className={darkBtn}>
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-all',
                      isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'
                    )}
                  />
                </button>
              )}

              {showCommentButton && (
                <button onClick={() => setShowCommentsPanel(true)} className={darkBtn}>
                  <MessageCircle className="h-5 w-5" />
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

            {stories.length > 1 && (
              <>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedIndex((prev) => ((prev ?? 0) - 1 + stories.length) % stories.length);
                  }}
                  className="absolute left-2 top-1/2 z-40 -translate-y-1/2 p-2 text-white/50 transition-colors hover:text-white"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedIndex((prev) => ((prev ?? 0) + 1) % stories.length);
                  }}
                  className="absolute right-2 top-1/2 z-40 -translate-y-1/2 p-2 text-white/50 transition-colors hover:text-white"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
          </div>

          {showCommentsPanel && (
            <div className="fixed inset-0 z-[10000] flex animate-fade-in items-center justify-center bg-black/80 p-4">
              <div className="relative flex max-h-[90vh] w-full max-w-sm flex-col rounded-[40px] border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="absolute right-6 top-6 rounded-full bg-slate-950 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-3xl bg-violet-600/10 p-4 text-violet-400">
                    <MessageCircle className="h-8 w-8" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white">Comentários</h3>
                    <p className="text-xs font-bold text-slate-500">
                      {comments.length} comentário{comments.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="mb-5 max-h-52 space-y-3 overflow-y-auto pr-1">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{comment.emoji || '💬'}</span>
                            <span className="text-xs font-black uppercase text-white">
                              {comment.author_name || 'Visitante'}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold text-slate-500">
                            {formatCommentDate(comment.created_at)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold leading-relaxed text-slate-300">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
                      <p className="text-sm font-bold text-slate-400">
                        Seja a primeira pessoa a comentar neste story.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      rows={4}
                      placeholder="Digite seu comentário..."
                      className="w-full resize-none rounded-3xl border border-slate-800 bg-slate-950 px-5 py-4 pr-14 text-sm font-semibold text-white placeholder-slate-600 outline-none focus:border-violet-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>

                  {showEmojiPicker && (
                    <div className="grid grid-cols-8 gap-2 rounded-3xl border border-slate-800 bg-slate-950 p-3">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setSelectedEmoji(emoji);
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

                  <button
                    onClick={handleSendComment}
                    className="flex w-full items-center justify-center gap-2 rounded-3xl bg-violet-600 py-4 font-black text-white transition-all hover:bg-violet-500"
                  >
                    Publicar comentário
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="mt-4 w-full rounded-3xl bg-slate-800 py-4 font-black text-white transition-all hover:bg-slate-700"
                >
                  Fechar
                </button>
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
