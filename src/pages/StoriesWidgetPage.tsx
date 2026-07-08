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
};

const getVideoPreviewUrl = (video?: Video | null) => {
  if (!video) return '';

  const item = video as VideoWithFallbacks;

  return (
    item.thumbnail_url?.trim() ||
    item.poster_url?.trim() ||
    item.image_url?.trim() ||
    item.video_url?.trim() ||
    ''
  );
};

const isVideoFile = (url: string) => {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
};

const StoriesWidgetPage = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const previewStoryId = searchParams.get('storyId') || searchParams.get('storyid');

  const videoRef = useRef<HTMLVideoElement>(null);

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentModel, setCurrentModel] = useState<SizingModel | null>(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
const [showMeasuresPanel, setShowMeasuresPanel] = useState(false);


  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const mainVideo = videosForSelectedStory[0] || null;

  const selectedAppearance =
    selectedStory?.appearance_id
      ? appearances.find((item) => item.id === selectedStory.appearance_id) || currentAppearance
      : currentAppearance;

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
      return;
    }

    db.incrementViewCount(selectedStory.id);

    setIsLiked(false);
    setIsPlaying(true);
    setShowCommentsPanel(false);
    setShowMeasuresPanel(false);

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
  }, [selectedStory]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
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
    const url = selectedStory?.cta_url || window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedStory?.title || generalSettings?.store_name || 'Story',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        showSuccess('Link copiado!');
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
    if (!generalSettings?.whatsapp_number) {
      showError('WhatsApp não configurado.');
      return;
    }

    const message = encodeURIComponent(
      selectedStory?.whatsapp_message ||
        generalSettings.whatsapp_default_message?.replace('{{story_title}}', selectedStory?.title || '') ||
        'Olá! Tenho interesse no produto do story.'
    );

    if (selectedStory) {
      await db.incrementClickCount(selectedStory.id);
    }

    window.open(`https://wa.me/${generalSettings.whatsapp_number}?text=${message}`, '_blank');
  };

  const handleBuyProduct = async () => {
    const productUrl = currentProduct?.product_url || selectedStory?.cta_url || '';

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
    window.open(selectedStory.cta_url, '_blank');
  };

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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] font-black text-white line-clamp-2">
                  {story.title}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-4">
          <div className="relative aspect-[9/16] w-full max-w-[420px] max-h-[calc(100vh-24px)] overflow-hidden rounded-[40px] bg-black shadow-2xl">
            <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-6">
              <div>
                <h3 className="text-sm font-black text-white">{selectedStory.title}</h3>
                <p className="text-[10px] font-bold uppercase text-white/60">
                  {generalSettings?.store_name}
                </p>
              </div>

              <button onClick={() => setSelectedIndex(null)} className={darkBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {mainVideo?.video_url ? (
              <video
                key={mainVideo.id}
                ref={videoRef}
                src={mainVideo.video_url}
                autoPlay={generalSettings?.autoplay ?? true}
                muted={isMuted}
                playsInline
                loop
                controls={generalSettings?.show_video_controls ?? false}
                className="h-full w-full cursor-pointer object-cover"
                onClick={handleTogglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-950 text-center text-sm font-bold text-white/70">
                Nenhum vídeo vinculado a este story.
              </div>
            )}

            <div className="absolute bottom-32 right-4 z-50 flex flex-col gap-4">
              {showPlayButton && (
                <button onClick={handleTogglePlay} className={darkBtn}>
                  {isPlaying ? (
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
                      src={currentProduct.image_url}
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
              <div className="relative w-full max-w-sm rounded-[40px] border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="absolute right-6 top-6 rounded-full bg-slate-950 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-8 flex items-center gap-4">
                  <div className="rounded-3xl bg-violet-600/10 p-4 text-violet-400">
                    <MessageCircle className="h-8 w-8" />
                  </div>

                  <h3 className="text-2xl font-black text-white">Comentários</h3>
                </div>

                <div className="py-8 text-center">
                  <p className="font-bold text-slate-400">
                    Comentários ainda não disponíveis para este story.
                  </p>
                </div>

                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="mt-8 w-full rounded-3xl bg-slate-800 py-4 font-black text-white transition-all hover:bg-slate-700"
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
