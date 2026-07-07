import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Video, StoryVideo, Appearance, GeneralSettings, Comment, DisplayLocation, PageRule } from '@/lib/db';
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
} from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { cn } from '@/lib/utils';

// --- Funções Auxiliares para URL de Vídeo Segura ---
const FALLBACK_VIDEO_BY_TITLE: Record<string, string> = {
  cupom: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  provador: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  novaColecao: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  default: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
};

const getRawVideoUrl = (video: Video | null): string => {
  return String(
    video?.video_url ||
    ""
  );
};

const isInvalidVideoUrl = (url: string): boolean => {
  if (!url) return true;
  const normalized = url.toLowerCase().trim();
  if (!normalized.startsWith("http")) return true;
  if (normalized.includes("assets.mixkit.co")) return true;
  if (normalized.includes("mixkit-")) return true;
  if (normalized.includes("40358-large.mp4")) return true;
  if (
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".svg")
  ) {
    return true;
  }
  return !normalized.includes(".mp4");
};

const getFallbackVideoUrl = (storyTitle: string | null): string => {
  const title = String(storyTitle || "").toLowerCase();
  if (title.includes("cupom")) return FALLBACK_VIDEO_BY_TITLE.cupom;
  if (title.includes("provador")) return FALLBACK_VIDEO_BY_TITLE.provador;
  if (title.includes("nova coleção") || title.includes("nova colecao") || title.includes("coleção") || title.includes("colecao")) return FALLBACK_VIDEO_BY_TITLE.novaColecao;
  return FALLBACK_VIDEO_BY_TITLE.default;
};

const getSafeVideoUrl = (video: Video | null, storyTitle: string | null): string => {
  const rawUrl = getRawVideoUrl(video);
  if (isInvalidVideoUrl(rawUrl)) {
    return getFallbackVideoUrl(storyTitle);
  }
  return rawUrl;
};
// --- Fim das Funções Auxiliares ---


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
  const [showPlayPauseOverlay, setShowPlayPauseOverlay] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Estados para comentários
  const [currentStoryComments, setCurrentStoryComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(0);

  // Estados para curtidas
  const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 100) + 50);

  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const mainVideoForSelectedStory = videosForSelectedStory.find(v => v.id === (selectedStory?.id)) || videosForSelectedStory[0] || null; // Simplificado para pegar o primeiro vídeo

  const safeVideoUrl = getSafeVideoUrl(mainVideoForSelectedStory, selectedStory?.title || null);

  // Resetar videoError quando safeVideoUrl mudar
  useEffect(() => {
    setVideoError(false);
  }, [safeVideoUrl]);

  // Efeito para carregar e reproduzir vídeo quando safeVideoUrl mudar
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load(); // Força o recarregamento do vídeo
      const playPromise = videoRef.current.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay bloqueado ou falhou:", error);
        });
      }
    }
  }, [safeVideoUrl]);

  // Limpeza de cache do localStorage/sessionStorage
  useEffect(() => {
    Object.keys(localStorage).forEach((key) => {
      const value = localStorage.getItem(key);
      if (value?.includes("assets.mixkit.co")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value?.includes("assets.mixkit.co")) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const loadWidgetData = async () => {
    try {
      const stores = await db.stores.getAll();
      const currentStore = storeId ? (stores.find((item) => item.id === storeId) || null) : (stores[0] || null);

      if (!currentStore) {
        setStories([]);
        setGeneralSettings(null);
        setCurrentAppearance(null);
        return;
      }

      const fetchedGeneralSettings = (await db.generalSettings.getAll(currentStore.id))[0];
      setGeneralSettings(fetchedGeneralSettings);

      const allAppearances = await db.appearances.getAll(currentStore.id);
      const storyAppearance = allAppearances.find(app => app.id === fetchedGeneralSettings?.default_appearance_id);
      setCurrentAppearance(storyAppearance || null);

      const fetchedStories = await db.stories.getAll(currentStore.id);
      const activeStories = fetchedStories
        .filter((story) => story.active)
        .sort((a, b) => a.position - b.position);
      setStories(activeStories);

      const allStoryVideos = await db.storyVideos.getAll(currentStore.id);
      const allVideos = await db.videos.getAll(currentStore.id);

      const map = new Map<string, Video[]>();
      activeStories.forEach(story => {
        const videosForStory = allStoryVideos
          .filter(sv => sv.story_id === story.id)
          .map(sv => allVideos.find(v => v.id === sv.video_id))
          .filter((v): v is Video => v !== undefined)
          .sort((a, b) => (allStoryVideos.find(sv => sv.video_id === a.id)?.position || 0) - (allStoryVideos.find(sv => sv.video_id === b.id)?.position || 0));
        map.set(story.id, videosForStory);
      });
      setStoryVideosMap(map);

    } catch (error) {
      console.error('Erro ao carregar widget de stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentsForStory = async (storyId: string) => {
    try {
      const comments = await db.comments.getAll(storyId); // Usar getAll com storyId
      setCurrentStoryComments(comments.filter(c => c.status === 'approved')); // Apenas comentários aprovados
      setCommentsCount(comments.filter(c => c.status === 'approved').length);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      setCurrentStoryComments([]);
      setCommentsCount(0);
    }
  };

  useEffect(() => {
    loadWidgetData();
  }, [storeId]);

  useEffect(() => {
    if (selectedStory) {
      loadCommentsForStory(selectedStory.id);
      db.incrementViewCount(selectedStory.id);
    }
  }, [selectedStory]);

  const handleTogglePlay = async (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    const video = videoRef.current;
    if (!video || (!video.currentSrc && !video.src)) {
      console.error("Elemento de vídeo não encontrado ou sem src.");
      return;
    }
    try {
      if (video.paused) {
        video.muted = isMuted;
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
      setShowPlayPauseOverlay(true);
      setTimeout(() => setShowPlayPauseOverlay(false), 700);
    } catch (error) {
      console.error("Falha ao executar play/pause:", error);
      setVideoError(true);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    setIsLiked(false);
    setShowCommentsPanel(false);
    setIsPlaying(true);
    setSelectedIndex((prevIndex) =>
      prevIndex === 0 ? stories.length - 1 : prevIndex - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    setIsLiked(false);
    setShowCommentsPanel(false);
    setIsPlaying(true);
    setSelectedIndex((prevIndex) =>
      prevIndex === stories.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => {
      if (prev) {
        setLikesCount((count) => count - 1);
      } else {
        setLikesCount((count) => count + 1);
      }
      return !prev;
    });
    // TODO: Log metric 'like'
  };

  const handleToggleComments = () => {
    setShowCommentsPanel((prev) => !prev);
  };

  const handleAddComment = async () => {
    if (newCommentText.trim() === '' || !selectedStory || !generalSettings) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      story_id: selectedStory.id,
      user_name: 'Você', // Em um app real, viria do usuário logado
      user_email: generalSettings.contact_email || 'anonymous@example.com', // Exemplo
      text: newCommentText,
      status: 'pending', // Comentários precisam ser aprovados
      created_at: new Date().toISOString(),
    };

    try {
      const savedComment = await db.comments.save(newComment);
      // Não adiciona diretamente à lista de aprovados, pois o status é 'pending'
      showSuccess('Comentário enviado para aprovação!');
      setNewCommentText('');
      // setCommentsCount((prevCount) => prevCount + 1); // Não incrementa até ser aprovado
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      // show error toast
    }
  };

  const getStoryShareData = () => {
    const title = String(selectedStory?.title || "Story");
    const text = `Confira este story: ${title}`;
    const url = selectedStory?.cta_url || window.location.href;
    return { title, text, url };
  };

  const handleShareStory = async () => {
    const shareData = getStoryShareData();
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showSuccess('Story compartilhado!');
        setCopiedLink(false);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        showSuccess('Link copiado!');
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        window.prompt("Copie o link:", shareData.url);
        setCopiedLink(false);
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error("Erro ao compartilhar story:", error);
      }
    }
    // TODO: Log metric 'share'
  };

  const normalizeWhatsAppNumber = (value?: string | null) => {
    if (!value) return "";
    return String(value).replace(/\D/g, "");
  };

  const getConfiguredWhatsAppNumber = () => {
    const rawNumber = generalSettings?.whatsapp_number || "";
    let number = normalizeWhatsAppNumber(rawNumber);
    if (number.length >= 10 && number.length <= 11 && !number.startsWith("55")) {
      number = `55${number}`;
    }
    return number;
  };

  const handleWhatsAppShare = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    const number = getConfiguredWhatsAppNumber();
    const storyTitle = selectedStory?.title || "Story";
    const storyUrl = selectedStory?.cta_url || window.location.href;
    const message = selectedStory?.whatsapp_message || generalSettings?.whatsapp_default_message || `Olá! Tenho interesse neste produto/story: ${storyTitle}\n${storyUrl}`;

    if (!number) {
      console.error("WhatsApp não configurado em Configurações.");
      alert("WhatsApp não configurado. Cadastre o número na tela de Configurações.");
      return;
    }

    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    // TODO: Log metric 'whatsapp_click'
  };

  const handleCtaClick = (link?: string) => {
    if (link && selectedStory) {
      db.incrementClickCount(selectedStory.id);
      window.open(link, '_blank');
      // TODO: Log metric 'cta_click'
    } else {
      alert('Este story não possui um link de compra configurado.');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[120px] flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!generalSettings?.app_enabled || stories.length === 0) {
    return null;
  }

  const darkActionButtonClasses = "w-[42px] h-[42px] rounded-full border border-white/[0.75] bg-black/[0.35] text-white flex items-center justify-center backdrop-blur-[6px] cursor-pointer transition-all hover:bg-white/[0.18] hover:scale-[1.04]";
  const whiteActionButtonClasses = "w-[42px] h-[42px] rounded-full border-none bg-white text-slate-900 flex items-center justify-center shadow-md shadow-black/20 cursor-pointer transition-all hover:scale-[1.06]";

  const renderStoriesDisplay = () => {
    const displayMode = selectedStory?.format || currentAppearance?.widget_shape || 'carousel'; // Prioriza o formato do story, depois da aparência, fallback para carousel

    switch (displayMode) {
      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-4 p-4">
            {stories.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => {
                  setSelectedIndex(stories.indexOf(story));
                  setIsMuted(true);
                  setIsLiked(false);
                  setShowCommentsPanel(false);
                  setIsPlaying(true);
                }}
                className="relative aspect-[9/16] rounded-xl overflow-hidden shadow-md group focus:outline-none"
              >
                <img
                  src={storyVideosMap.get(story.id)?.[0]?.thumbnail_url || 'https://via.placeholder.com/150'}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs font-semibold">
                  {story.title}
                </div>
              </button>
            ))}
          </div>
        );
      case 'floating_widget': // Renderiza como bolhas flutuantes
      case 'carousel':
      default:
        return (
          <div className="w-full overflow-x-auto">
            <div className="flex items-start gap-4 px-4 py-3">
              {stories.map((story, index) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(index);
                    setIsMuted(true);
                    setIsLiked(false);
                    setShowCommentsPanel(false);
                    setIsPlaying(true);
                  }}
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-orange-400 shadow-sm">
                    <div className="w-full h-full rounded-full bg-white p-[3px]">
                      <img
                        src={storyVideosMap.get(story.id)?.[0]?.thumbnail_url || 'https://via.placeholder.com/150'}
                        alt={story.title}
                        className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>

                  <span className="max-w-[88px] text-xs font-semibold text-slate-700 truncate">
                    {story.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full bg-transparent">
      {renderStoriesDisplay()}

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center px-4 py-6">
          {stories.length > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className={cn(darkActionButtonClasses, "absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-50")}
              aria-label="Story anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl">
            {/* Close Button (inside story card) */}
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className={cn(darkActionButtonClasses, "absolute top-4 right-4 z-30")}
              aria-label="Fechar story"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mute/Unmute Button (inside story card) */}
            {currentAppearance?.show_video_controls && (
              <button
                type="button"
                onClick={handleToggleMute}
                className={cn(darkActionButtonClasses, "absolute top-4 right-[66px] z-30")}
                aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            {/* Play/Pause Button (inside story card) */}
            {currentAppearance?.show_video_controls && (
              <button
                type="button"
                onClick={handleTogglePlay}
                className={cn(darkActionButtonClasses, "absolute top-4 right-[128px] z-30")}
                aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            )}

            {/* Renderização Condicional do Vídeo ou Mensagem de Erro */}
            {videoError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-center p-4">
                <p className="text-lg font-semibold">Não foi possível carregar este vídeo.</p>
                <p className="text-sm text-white/70 mt-2">Verifique a URL do vídeo ou sua conexão.</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                key={safeVideoUrl}
                src={safeVideoUrl}
                poster={mainVideoForSelectedStory?.thumbnail_url || selectedStory?.thumbnail_url}
                autoPlay={generalSettings?.autoplay}
                muted={generalSettings?.muted_by_default}
                playsInline
                loop
                preload="auto"
                controls={generalSettings?.show_video_controls}
                className="w-full h-full object-cover cursor-pointer"
                onClick={handleTogglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleNext}
                onError={(event) => {
                  console.error("Erro ao carregar vídeo:", {
                    story: selectedStory,
                    video: mainVideoForSelectedStory,
                    safeVideoUrl,
                    videoError: event.currentTarget.error,
                  });
                  setVideoError(true);
                }}
              >
                <source src={safeVideoUrl} type="video/mp4" />
                Seu navegador não suporta a tag de vídeo.
              </video>
            )}

            {/* Play/Pause Overlay */}
            {showPlayPauseOverlay && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="bg-white/30 backdrop-blur-sm rounded-full p-3 transition-opacity duration-300">
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10">
              {currentAppearance?.show_title && (
                <p className="text-white font-bold text-sm">
                  {selectedStory?.title}
                </p>
              )}
              <p className="text-white/60 text-xs">
                {generalSettings?.store_name}
              </p>
            </div>

            {/* Vertical Action Buttons */}
            <div className="absolute right-[14px] bottom-[74px] z-40 flex flex-col gap-2">
              {currentAppearance?.show_comment_button && (
                <button
                  type="button"
                  onClick={handleToggleComments}
                  className={cn(darkActionButtonClasses, "relative")}
                  aria-label="Comentários"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                    {commentsCount}
                  </span>
                </button>
              )}

              {currentAppearance?.show_like_button && (
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={cn(darkActionButtonClasses, "relative group")}
                  aria-label="Curtir story"
                >
                  <Heart className={cn("w-5 h-5 transition-all duration-200", isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white')} />
                  {likesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                      {likesCount}
                    </span>
                  )}
                </button>
              )}

              {currentAppearance?.show_share_button && (
                <button
                  type="button"
                  onClick={handleShareStory}
                  className={whiteActionButtonClasses}
                  aria-label="Compartilhar produto"
                >
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                </button>
              )}

              {currentAppearance?.show_whatsapp_button && (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className={cn(whiteActionButtonClasses, "cursor-pointer pointer-events-auto opacity-100")}
                  aria-label="Abrir WhatsApp"
                >
                  <WhatsAppIcon size={22} />
                </button>
              )}
            </div>

            {selectedStory?.cta_enabled && selectedStory.cta_type !== 'none' && (
              <button
                type="button"
                className="absolute left-[12px] right-[74px] bottom-[28px] h-[64px] px-3 py-2 rounded-xl bg-white shadow-lg flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] z-30"
                onClick={() => handleCtaClick(selectedStory.cta_url)}
              >
                {mainVideoForSelectedStory?.thumbnail_url && (
                  <img
                    src={mainVideoForSelectedStory.thumbnail_url}
                    alt={selectedStory.title || "Produto"}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <div className="text-slate-900 font-bold text-sm line-clamp-1">
                    {selectedStory.cta_text || selectedStory.title || "Produto"}
                  </div>
                </div>
                <span className="text-emerald-600 font-bold text-xs px-3 py-1 rounded-full bg-emerald-50 flex-shrink-0">
                  {selectedStory.cta_text || "Comprar Agora"}
                </span>
              </button>
            )}

            {/* Comments Panel */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 transition-transform duration-300 ease-out z-40 ${
                showCommentsPanel ? 'translate-y-0' : 'translate-y-full'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900 text-lg font-bold">Comentários</h4>
                <button
                  type="button"
                  onClick={() => setShowCommentsPanel(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-4 mb-4 pr-2">
                {currentStoryComments.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  currentStoryComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
                        {comment.user_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{comment.user_name}</span>
                          <span className="text-slate-400 text-xs">{comment.created_at ? new Date(comment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'agora'}</span>
                        </div>
                        <p className="text-slate-700 text-sm mt-0.5">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Adicionar comentário..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-800 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-violet-100 transition-all"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>

          {stories.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className={cn(darkActionButtonClasses, "absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-50")}
              aria-label="Próximo story"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StoriesWidgetPage;