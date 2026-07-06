import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Store } from '@/lib/db';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Check,
  Mail,
  Facebook,
  Link as LinkIcon,
} from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon'; // Importar o novo componente
import { cn } from '@/lib/utils'; // Importar cn para combinar classes Tailwind

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
  const [showShareMenu, setShowShareMenu] = useState(false); // Estado para o menu de compartilhamento
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedStory =
    selectedIndex !== null ? stories[selectedIndex] : null;

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
    } catch (error) {
      console.error('Erro ao carregar widget de stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgetData();
  }, [storeId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch((e) => console.error("Error playing video:", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isMuted, isPlaying, selectedStory]); // Re-apply mute/play state when story changes

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setIsLiked(false); // Reset like state
    setShowCommentsPanel(false); // Close comments panel
    setShowShareMenu(false); // Close share menu
    setIsPlaying(true); // Ensure video plays on next/prev
    setSelectedIndex((prevIndex) =>
      prevIndex === 0 ? stories.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setIsLiked(false); // Reset like state
    setShowCommentsPanel(false); // Close comments panel
    setShowShareMenu(false); // Close share menu
    setIsPlaying(true); // Ensure video plays on next/prev
    setSelectedIndex((prevIndex) =>
      prevIndex === stories.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
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

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  const handleToggleComments = () => {
    setShowCommentsPanel((prev) => !prev);
    setShowShareMenu(false); // Close share menu if comments open
  };

  // Helper para determinar o link do produto/story
  const getProductOrStoryLink = () => {
    if (selectedStory?.cta_link) {
      return selectedStory.cta_link;
    }
    // Adicionar outras verificações se a interface Story for expandida
    // Ex: if (selectedStory?.product_url) return selectedStory.product_url;
    return window.location.href;
  };

  const handleWhatsAppShare = () => {
    const productLink = getProductOrStoryLink();
    const message = `Quero mais informações desse produto\n\nProduto: ${productLink}`;
    const whatsappUrl = `https://wa.me/5545999629702?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false); // Close share menu after action
  };

  const handleShareEmail = () => {
    const productLink = getProductOrStoryLink();
    const title = selectedStory?.title || "Confira este produto";
    const shareText = `Confira este produto: ${productLink}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`;
    window.open(emailUrl, '_blank');
    setShowShareMenu(false); // Close share menu after action
  };

  const handleShareFacebook = () => {
    const productLink = getProductOrStoryLink();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}`;
    window.open(facebookUrl, '_blank');
    setShowShareMenu(false); // Close share menu after action
  };

  const handleCopyLink = () => {
    const productLink = getProductOrStoryLink();
    navigator.clipboard.writeText(productLink);
    setCopiedLink(true);
    showSuccess('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2000);
    setShowShareMenu(false); // Close share menu after action
  };

  const handleShare = async () => {
    const productLink = getProductOrStoryLink();
    const shareData = {
      title: selectedStory?.title || "Confira este produto",
      text: "Confira esse produto",
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
      // Fallback para desktop ou navegadores sem Web Share API
      setShowShareMenu((prev) => !prev);
      setShowCommentsPanel(false); // Close comments panel if share menu opens
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

  const storyActionButtonClasses = "w-[42px] h-[42px] rounded-full border border-white/[0.75] bg-black/[0.35] text-white flex items-center justify-center backdrop-blur-[6px] cursor-pointer transition-all hover:bg-white/[0.18] hover:scale-[1.04]";
  const whatsappButtonClasses = "bg-[#25D366] border-white/[0.65] hover:bg-[#20bd5a]";

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
                setIsMuted(true); // Start muted
                setIsLiked(false); // Reset like state
                setShowCommentsPanel(false); // Close comments panel
                setShowShareMenu(false); // Close share menu
                setIsPlaying(true); // Ensure video plays
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
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className={cn(storyActionButtonClasses, "absolute top-4 right-4")}
            aria-label="Fechar story"
          >
            <X className="w-5 h-5" />
          </button>

          {stories.length > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className={cn(storyActionButtonClasses, "absolute left-3 sm:left-8 top-1/2 -translate-y-1/2")}
              aria-label="Story anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl">
            <video
              key={selectedStory.id} // Key change forces re-render and autoplay
              ref={videoRef}
              src={selectedStory.video_url}
              poster={selectedStory.thumbnail_url}
              autoPlay
              muted={isMuted}
              playsInline
              loop
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleVideoClick}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Play/Pause Overlay */}
            {showPlayPauseOverlay && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/30 backdrop-blur-sm rounded-full p-3 transition-opacity duration-300">
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <p className="text-white font-bold text-sm">
                {selectedStory.title}
              </p>
              <p className="text-white/60 text-xs">
                {store.name}
              </p>
            </div>

            {/* Vertical Action Buttons */}
            <div className="absolute right-[14px] bottom-[74px] z-20 flex flex-col gap-2">
              {/* Comments Button */}
              <button
                onClick={handleToggleComments}
                className={cn(storyActionButtonClasses, "relative")}
                aria-label="Comentários"
              >
                <MessageCircle className="w-5 h-5" />
                {/* Placeholder for comments counter */}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                  3
                </span>
              </button>

              {/* Like Button */}
              <button
                onClick={handleToggleLike}
                className={storyActionButtonClasses}
                aria-label="Curtir story"
              >
                <Heart className={cn("w-5 h-5", isLiked ? 'fill-red-500 text-red-500' : '')} />
              </button>

              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className={storyActionButtonClasses}
                  aria-label="Compartilhar"
                >
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                </button>
                {showShareMenu && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg py-2 w-40 z-20">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <WhatsAppIcon className="w-4 h-4 text-green-500" /> WhatsApp
                    </button>
                    <button
                      onClick={handleShareEmail}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Mail className="w-4 h-4 text-blue-500" /> E-mail
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Facebook className="w-4 h-4 text-blue-700" /> Facebook
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <LinkIcon className="w-4 h-4 text-slate-500" /> Copiar link
                    </button>
                  </div>
                )}
              </div>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppShare}
                className={cn(storyActionButtonClasses, whatsappButtonClasses)}
                aria-label="Compartilhar no WhatsApp"
              >
                <WhatsAppIcon className="w-5 h-5" />
              </button>

              {/* Mute/Unmute Button */}
              <button
                onClick={handleToggleMute}
                className={storyActionButtonClasses}
                aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {selectedStory.cta_link && (
              <div
                className="absolute left-[12px] right-[74px] bottom-[28px] min-h-[60px] p-2.5 rounded-[10px] bg-black/[0.45] text-white flex items-center gap-2.5 backdrop-blur-[8px] z-18 cursor-pointer hover:bg-black/[0.58]"
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
                    className="w-[42px] h-[42px] rounded-[6px] object-cover flex-shrink-0"
                  />
                )}

                <div className="flex flex-col min-w-0">
                  <div className="text-white text-sm font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedStory.title || "Produto"}
                  </div>

                  <div className="mt-[3px] text-white/[0.9] text-xs font-semibold">
                    Comprar Agora
                  </div>
                </div>
              </div>
            )}

            {/* Comments Panel */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 transition-transform duration-300 ease-out ${
                showCommentsPanel ? 'translate-y-0' : 'translate-y-full'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white text-sm font-bold">Comentários</h4>
                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar comentário..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <button className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                  Enviar
                </button>
              </div>
            </div>
          </div>

          {stories.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className={cn(storyActionButtonClasses, "absolute right-3 sm:right-8 top-1/2 -translate-y-1/2")}
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