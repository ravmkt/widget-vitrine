import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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

const StoriesWidgetPage = () => {
  const { storeId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [currentAppearance, setCurrentAppearance] = useState<Appearance | null>(null);
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

  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const mainVideo = videosForSelectedStory[0] || null;

  useEffect(() => {
    const loadWidgetData = async () => {
      try {
        const stores = await db.stores.getAll();
        const currentStore = storeId
          ? stores.find((item) => item.id === storeId) || null
          : stores[0] || null;

        if (!currentStore) return;

        const fetchedSettings = (await db.generalSettings.getAll(currentStore.id))[0];
        setGeneralSettings(fetchedSettings || null);

        const fetchedAppearances = await db.appearances.getAll(currentStore.id);
        setCurrentAppearance(
          fetchedAppearances.find((app) => app.id === fetchedSettings?.default_appearance_id) ||
            fetchedAppearances[0] ||
            null
        );

        const fetchedStories = await db.stories.getAll(currentStore.id);
        const activeStories = fetchedStories
          .filter((story) => story.active)
          .sort((a, b) => a.position - b.position);

        setStories(activeStories);

        const allStoryVideos = await db.storyVideos.getAll();
        const allVideos = await db.videos.getAll();

        const map = new Map<string, Video[]>();

        activeStories.forEach((story) => {
          const videos = allStoryVideos
            .filter((storyVideo) => storyVideo.story_id === story.id)
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
  }, [storeId]);

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
        if (selectedStory.cta_type === 'product') {
          const storyProducts = await db.storyProducts.getAll();
          const storyProduct = storyProducts.find((item) => item.story_id === selectedStory.id);

          if (storyProduct) {
            const product = await db.products.getById(storyProduct.product_id);
            setCurrentProduct(product || null);
          } else {
            setCurrentProduct(null);
          }
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
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const handleWhatsApp = () => {
    if (!generalSettings?.whatsapp_number) {
      showError('WhatsApp não configurado.');
      return;
    }

    const message = encodeURIComponent(
      selectedStory?.whatsapp_message || 'Olá! Tenho interesse no produto do story.'
    );

    window.open(`https://wa.me/${generalSettings.whatsapp_number}?text=${message}`, '_blank');
  };

  const handleBuyProduct = () => {
    if (!currentProduct) return;

    const productUrl =
      currentProduct.product_url ||
      selectedStory?.cta_url ||
      '';

    if (!productUrl) {
      showError('Link do produto não configurado.');
      return;
    }

    window.open(productUrl, '_blank');
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
      {/* Grid de Stories */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {stories.map((story, index) => {
          const thumbnailUrl = storyVideosMap.get(story.id)?.[0]?.thumbnail_url;

          return (
            <button
              key={story.id}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-[9/16] overflow-hidden rounded-2xl shadow-lg"
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={story.title}
                  className="h-full w-full object-cover transition-all group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900">
                  <Play className="h-10 w-10 fill-white text-white" />
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-10 w-10 fill-white text-white" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-xs font-bold text-white">
                {story.title}
              </div>
            </button>
          );
        })}
      </div>

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-4">
          <div className="relative aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-[40px] bg-black shadow-2xl">
            {/* Header */}
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

            {/* Video Player */}
            {mainVideo?.video_url ? (
              <video
                ref={videoRef}
                src={mainVideo.video_url}
                autoPlay
                muted={isMuted}
                playsInline
                loop
                className="h-full w-full cursor-pointer object-cover"
                onClick={handleTogglePlay}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-950 text-center text-sm font-bold text-white/70">
                Nenhum vídeo vinculado a este story.
              </div>
            )}

            {/* Action Buttons */}
            <div className="absolute bottom-32 right-4 z-50 flex flex-col gap-4">
              <button onClick={handleTogglePlay} className={darkBtn}>
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 fill-white" />
                )}
              </button>

              <button onClick={handleToggleMute} className={darkBtn}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              <button onClick={handleToggleLike} className={darkBtn}>
                <Heart
                  className={cn(
                    'h-5 w-5 transition-all',
                    isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'
                  )}
                />
              </button>

              <button onClick={() => setShowCommentsPanel(true)} className={darkBtn}>
                <MessageCircle className="h-5 w-5" />
              </button>

              <button onClick={handleShare} className={whiteBtn}>
                {copiedLink ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Share2 className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={handleWhatsApp}
                className={whiteBtn}
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                <WhatsAppIcon size={24} />
              </button>

              <button
                onClick={() => setShowMeasuresPanel(true)}
                className={cn(whiteBtn, 'bg-violet-600 text-white')}
              >
                <Ruler className="h-5 w-5" />
              </button>
            </div>

            {/* Product Card */}
            {currentProduct && (
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

                  <button
                    onClick={handleBuyProduct}
                    className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-950 py-1.5 text-[10px] font-black uppercase text-white"
                  >
                    Comprar <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
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
          </div>

          {/* Modal Comentários */}
          {showCommentsPanel && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
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

          {/* Modal Medidas */}
          {showMeasuresPanel && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
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
