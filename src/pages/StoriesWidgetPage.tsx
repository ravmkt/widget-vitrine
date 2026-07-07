import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Store } from '@/lib/db';
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

// Interface para um comentário
interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

// --- Funções Auxiliares para URL de Vídeo Segura ---
const FALLBACK_VIDEO_BY_TITLE: Record<string, string> = {
  cupom: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  provador: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  novaColecao: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  default: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
};

const getRawStoryVideoUrl = (story: Story | null): string => {
  return String(
    story?.video_url ||
    (story as any)?.videoUrl || // Para compatibilidade com possíveis nomes de campo antigos
    (story as any)?.mediaUrl ||
    (story as any)?.media_url ||
    (story as any)?.fileUrl ||
    (story as any)?.file_url ||
    (story as any)?.url ||
    (story as any)?.src ||
    (story as any)?.video ||
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

const getFallbackVideoUrl = (story: Story | null): string => {
  const title = String(story?.title || (story as any)?.name || "").toLowerCase();

  if (title.includes("cupom")) {
    return FALLBACK_VIDEO_BY_TITLE.cupom;
  }

  if (title.includes("provador")) {
    return FALLBACK_VIDEO_BY_TITLE.provador;
  }

  if (
    title.includes("nova coleção") ||
    title.includes("nova colecao") ||
    title.includes("coleção") ||
    title.includes("colecao")
  ) {
    return FALLBACK_VIDEO_BY_TITLE.novaColecao;
  }

  return FALLBACK_VIDEO_BY_TITLE.default;
};

const getSafeVideoUrl = (story: Story | null): string => {
  const rawUrl = getRawStoryVideoUrl(story);

  if (isInvalidVideoUrl(rawUrl)) {
    return getFallbackVideoUrl(story);
  }

  return rawUrl;
};
// --- Fim das Funções Auxiliares ---


const StoriesWidgetPage = () => {
  const { storeId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayPauseOverlay, setShowPlayPauseOverlay] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoError, setVideoError] = useState(false); // Estado para erro de carregamento do vídeo

  // Estados para comentários
  const [comments, setComments] = useState<Comment[]>([
    { id: 'c1', username: 'Cliente Feliz', text: 'Adorei esse story! O produto é incrível!', timestamp: '5 min atrás' },
    { id: 'c2', username: 'Comprador VIP', text: 'Já comprei e recomendo muito!', timestamp: '10 min atrás' },
    { id: 'c3', username: 'Curioso', text: 'Qual o preço desse item?', timestamp: '15 min atrás' },
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(comments.length);

  // Estados para curtidas
  const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 100) + 50);

  const selectedStory =
    selectedIndex !== null ? stories[selectedIndex] : null;

  // Variável safeVideoUrl centralizada
  const safeVideoUrl = getSafeVideoUrl(selectedStory);

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
          // Não definimos videoError aqui, pois autoplay bloqueado não é um erro de URL.
        });
      }
    }
  }, [safeVideoUrl]); // Dispara quando safeVideoUrl muda

  // Limpeza de cache do localStorage/sessionStorage
  useEffect(() => {
    console.log("localStorage (antes da limpeza):", { ...localStorage });
    console.log("sessionStorage (antes da limpeza):", { ...sessionStorage });

    Object.keys(localStorage).forEach((key) => {
      const value = localStorage.getItem(key);
      if (value?.includes("assets.mixkit.co")) {
        console.warn("Removendo cache antigo com Mixkit do localStorage:", key);
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value?.includes("assets.mixkit.co")) {
        console.warn("Removendo sessionStorage antigo com Mixkit:", key);
        sessionStorage.removeItem(key);
      }
    });
    console.log("localStorage (depois da limpeza):", { ...localStorage });
    console.log("sessionStorage (depois da limpeza):", { ...sessionStorage });
  }, []);

  const loadWidgetData = async () => {
    try {
      const stores = await db.getStores();

      const currentStore = storeId
        ? (stores.find((item) => item.id === storeId) || null)
        : (stores[0] || null);

      setStore(currentStore);

      if (!currentStore) {
        setStories([]);
        return;
      }

      const fetchedStories = await db.getStories(currentStore.id);
      
      const activeStories = fetchedStories
        .filter((story) => story.active)
        .sort((a, b) => a.position - b.position);

      setStories(activeStories);
      console.log("Stories carregados/finais:", activeStories);
    } catch (error) {
      console.error('Erro ao carregar widget de stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgetData();
  }, [storeId]);

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

  const handleVideoClick = () => {
    if (videoRef.current && !videoError) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setShowPlayPauseOverlay(true);
      setTimeout(() => setShowPlayPauseOverlay(false), 700);
    }
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
  };

  const handleToggleComments = () => {
    setShowCommentsPanel((prev) => !prev);
  };

  const handleAddComment = () => {
    if (newCommentText.trim() === '') return;

    const newComment: Comment = {
      id: `c${comments.length + 1}`,
      username: 'Você',
      text: newCommentText,
      timestamp: 'agora',
    };

    setComments((prevComments) => [newComment, ...prevComments]);
    setNewCommentText('');
    setCommentsCount((prevCount) => prevCount + 1);
    showSuccess('Comentário enviado!');
  };

  const getProductOrStoryLink = () => {
    if (selectedStory?.cta_link) {
      return selectedStory.cta_link;
    }
    return window.location.href;
  };

  const handleWhatsAppShare = () => {
    const productLink = getProductOrStoryLink();
    const productName = selectedStory?.title || "este produto";
    const message = `Olá! Tenho interesse em ${productName}. Link: ${productLink}`;
    
    let whatsappUrl = '';
    const rawPhoneNumber = store?.whatsapp_number;

    if (rawPhoneNumber) {
      const cleanedPhoneNumber = rawPhoneNumber.replace(/\D/g, "");
      const finalPhoneNumber = cleanedPhoneNumber.length >= 9 && !cleanedPhoneNumber.startsWith('55') ? `55${cleanedPhoneNumber}` : cleanedPhoneNumber;
      whatsappUrl = `https://wa.me/${finalPhoneNumber}?text=${encodeURIComponent(message)}`;
    } else {
      whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    const productLink = getProductOrStoryLink();
    const shareData = {
      title: selectedStory?.title || "Produto",
      text: "Confira este produto",
      url: productLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showSuccess('Story compartilhado!');
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      navigator.clipboard.writeText(productLink);
      showSuccess('Link copiado!');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[120px] flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!store || stories.length === 0) {
    return null;
  }

  const darkActionButtonClasses = "w-[42px] h-[42px] rounded-full border border-white/[0.75] bg-black/[0.35] text-white flex items-center justify-center backdrop-blur-[6px] cursor-pointer transition-all hover:bg-white/[0.18] hover:scale-[1.04]";
  const whiteActionButtonClasses = "w-[42px] h-[42px] rounded-full border-none bg-white text-slate-900 flex items-center justify-center shadow-md shadow-black/20 cursor-pointer transition-all hover:scale-[1.06]";

  const isWhatsAppButtonDisabled = !store?.whatsapp_number;

  // Logs de depuração antes do return
  console.log("Story atual completo:", selectedStory);
  console.log("Título do story atual:", selectedStory?.title || (selectedStory as any)?.name);
  console.log("URL bruta encontrada:", getRawStoryVideoUrl(selectedStory));
  console.log("URL fallback:", getFallbackVideoUrl(selectedStory));
  console.log("URL segura usada no vídeo:", safeVideoUrl);
  console.log("videoError atual:", videoError);

  // Condição para mostrar a mensagem de erro do vídeo
  const shouldShowVideoError = videoError && isInvalidVideoUrl(safeVideoUrl);

  return (
    <div className="w-full bg-transparent">
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
                    src={story.thumbnail_url}
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
            <button
              onClick={handleToggleMute}
              className={cn(darkActionButtonClasses, "absolute top-4 right-[66px] z-30")}
              aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Play/Pause Button (inside story card) */}
            <button
              onClick={handleVideoClick}
              className={cn(darkActionButtonClasses, "absolute top-4 right-[128px] z-30")}
              aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Renderização Condicional do Vídeo ou Mensagem de Erro */}
            {shouldShowVideoError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-center p-4">
                <p className="text-lg font-semibold">Não foi possível carregar este vídeo.</p>
                <p className="text-sm text-white/70 mt-2">Verifique a URL do vídeo ou sua conexão.</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                key={safeVideoUrl} // Força a remontagem quando a URL muda
                src={safeVideoUrl}
                poster={selectedStory.thumbnail_url}
                autoPlay
                muted={isMuted}
                playsInline
                loop
                preload="metadata"
                className="w-full h-full object-cover cursor-pointer"
                onClick={handleVideoClick}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleNext} // Avança automaticamente para o próximo story
                onLoadedMetadata={() => {
                  console.log("Vídeo carregou metadata:", safeVideoUrl);
                }}
                onCanPlay={() => {
                  console.log("Vídeo pronto para reproduzir:", safeVideoUrl);
                  setVideoError(false); // Garante que o erro seja falso se puder reproduzir
                }}
                onLoadedData={() => {
                  console.log("Vídeo carregado com sucesso:", safeVideoUrl);
                  setVideoError(false); // Garante que o erro seja falso no carregamento bem-sucedido
                }}
                onError={(event) => {
                  console.error("Erro ao carregar vídeo:", {
                    story: selectedStory,
                    rawUrl: getRawStoryVideoUrl(selectedStory),
                    safeVideoUrl,
                    videoError: event.currentTarget.error,
                  });
                  setVideoError(true); // Define o erro como true se o vídeo falhar no carregamento
                }}
              >
                <source src={safeVideoUrl} type="video/mp4" />
                Seu navegador não suporta a tag de vídeo.
              </video>
            )}

            {/* Play/Pause Overlay */}
            {showPlayPauseOverlay && !shouldShowVideoError && ( // Mostra overlay apenas se não houver erro de vídeo
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
              <p className="text-white font-bold text-sm">
                {selectedStory.title}
              </p>
              <p className="text-white/60 text-xs">
                {store.name}
              </p>
            </div>

            {/* Vertical Action Buttons */}
            <div className="absolute right-[14px] bottom-[74px] z-40 flex flex-col gap-2">
              {/* Comments Button */}
              <button
                onClick={handleToggleComments}
                className={cn(darkActionButtonClasses, "relative")}
                aria-label="Comentários"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                  {commentsCount}
                </span>
              </button>

              {/* Like Button */}
              <button
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

              {/* Share Button */}
              <button
                onClick={handleShare}
                className={whiteActionButtonClasses}
                aria-label="Compartilhar produto"
              >
                {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
              </button>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppShare}
                className={cn(whiteActionButtonClasses, isWhatsAppButtonDisabled && "opacity-50 cursor-not-allowed")}
                aria-label="Abrir WhatsApp"
                disabled={isWhatsAppButtonDisabled}
              >
                <WhatsAppIcon size={22} />
              </button>
            </div>

            {selectedStory.cta_link && (
              <button
                className="absolute left-[12px] right-[74px] bottom-[28px] h-[64px] px-3 py-2 rounded-xl bg-white shadow-lg flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] z-30"
                onClick={() => {
                  if (selectedStory.cta_link) {
                    window.open(selectedStory.cta_link, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                {selectedStory.thumbnail_url && (
                  <img
                    src={selectedStory.thumbnail_url}
                    alt={selectedStory.title || "Produto"}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <div className="text-slate-900 font-bold text-sm line-clamp-1">
                    {selectedStory.title || "Produto"}
                  </div>
                </div>
                <span className="text-emerald-600 font-bold text-xs px-3 py-1 rounded-full bg-emerald-50 flex-shrink-0">
                  Comprar Agora
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
                  onClick={() => setShowCommentsPanel(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-4 mb-4 pr-2">
                {comments.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
                        {comment.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{comment.username}</span>
                          <span className="text-slate-400 text-xs">{comment.timestamp}</span>
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