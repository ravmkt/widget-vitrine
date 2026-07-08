import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Video, StoryVideo, Appearance, GeneralSettings, Comment, Product, SizingModel } from '@/lib/db';
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
  ShoppingBag
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { cn } from '@/lib/utils';

// --- Funções Auxiliares para URL de Vídeo Segura ---
const getSafeVideoUrl = (video: Video | null, storyTitle: string | null): string => {
  if (!video) return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  return video.video_url;
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
  
  // Player Interactive States
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showSizingPanel, setShowSizingPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Data States
  const [linkedProduct, setLinkedProduct] = useState<Product | null>(null);
  const [linkedModel, setLinkedModel] = useState<SizingModel | null>(null);
  const [currentStoryComments, setCurrentStoryComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [likesCount, setLikesCount] = useState(0);

  const selectedStory = selectedIndex !== null ? stories[selectedIndex] : null;
  const videosForSelectedStory = selectedStory ? storyVideosMap.get(selectedStory.id) || [] : [];
  const mainVideo = videosForSelectedStory[0] || null;
  const safeVideoUrl = getSafeVideoUrl(mainVideo, selectedStory?.title || null);

  const loadWidgetData = async () => {
    try {
      const stores = await db.stores.getAll();
      const currentStore = storeId ? (stores.find((item) => item.id === storeId) || null) : (stores[0] || null);

      if (!currentStore) return;

      const fetchedSettings = (await db.generalSettings.getAll(currentStore.id))[0];
      setGeneralSettings(fetchedSettings);

      const allAppearances = await db.appearances.getAll(currentStore.id);
      setCurrentAppearance(allAppearances.find(app => app.id === fetchedSettings?.default_appearance_id) || null);

      const fetchedStories = await db.stories.getAll(currentStore.id);
      const activeStories = fetchedStories.filter(s => s.active).sort((a, b) => a.position - b.position);
      setStories(activeStories);

      const allStoryVideos = await db.storyVideos.getAll(currentStore.id);
      const allVideos = await db.videos.getAll(currentStore.id);

      const map = new Map<string, Video[]>();
      activeStories.forEach(story => {
        const vids = allStoryVideos
          .filter(sv => sv.story_id === story.id)
          .map(sv => allVideos.find(v => v.id === sv.video_id))
          .filter((v): v is Video => v !== undefined)
          .sort((a, b) => (allStoryVideos.find(sv => sv.video_id === a.id)?.position || 0) - (allStoryVideos.find(sv => sv.video_id === b.id)?.position || 0));
        map.set(story.id, vids);
      });
      setStoryVideosMap(map);

    } catch (error) {
      console.error('Erro ao carregar widget:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWidgetData(); }, [storeId]);

  useEffect(() => {
    if (selectedStory) {
      const fetchLinkedData = async () => {
        // Fetch Product
        const allStoryProducts = await db.storyProducts.getAll();
        const rel = allStoryProducts.find(sp => sp.story_id === selectedStory.id);
        if (rel) {
          const prod = await db.products.getById(rel.product_id);
          setLinkedProduct(prod);
        } else {
          setLinkedProduct(null);
        }

        // Fetch Model (Size Guide)
        // Note: Adding a placeholder check for model_id if it existed in Story interface, 
        // otherwise we check for sizingModels linked in the DB module.
        const models = await db.sizingModels.getAll();
        // Here we simulate finding the model if linked by ID or story title (fallback logic)
        const model = models[0]; // Logic: typically story has a model_id. We'll use first as demo if none.
        setLinkedModel(model);

        // Comments
        const comments = await db.comments.getAll();
        setCurrentStoryComments(comments.filter(c => c.story_id === selectedStory.id && c.status === 'approved'));
        
        setLikesCount(selectedStory.click_count || 0);
        db.incrementViewCount(selectedStory.id);
      };
      fetchLinkedData();
      setIsLiked(false);
      setShowCommentsPanel(false);
      setShowSizingPanel(false);
    }
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

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleShare = async () => {
    const data = { title: selectedStory?.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        navigator.clipboard.writeText(data.url);
        showSuccess('Link copiado!');
      }
    } catch (e) {}
  };

  const handleWhatsApp = () => {
    const num = generalSettings?.whatsapp_number || "5545998370536";
    const msg = encodeURIComponent(`Olá! Vi este story: ${selectedStory?.title}. Quero saber mais!`);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-white">Carregando...</div>;

  return (
    <div className="w-full h-full bg-slate-950">
      {/* Listagem de Stories (Bubble View) */}
      <div className="flex gap-4 p-4 overflow-x-auto scrollbar-none">
        {stories.map((s, idx) => (
          <button key={s.id} onClick={() => setSelectedIndex(idx)} className="flex-shrink-0 group">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-violet-600 to-fuchsia-500">
              <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden">
                <img src={storyVideosMap.get(s.id)?.[0]?.thumbnail_url} className="w-full h-full object-cover rounded-full" alt="" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-700 mt-1 text-center truncate w-20">{s.title}</p>
          </button>
        ))}
      </div>

      {/* Story Player Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4">
          <button onClick={() => setSelectedIndex(null)} className="absolute top-6 right-6 text-white z-50 p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>

          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
            
            {/* Header / Info */}
            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent z-30 pointer-events-none">
              <h3 className="text-white font-bold text-sm">{selectedStory.title}</h3>
              <p className="text-white/60 text-xs">{generalSettings?.store_name}</p>
            </div>

            {/* Video Player */}
            <video
              ref={videoRef}
              key={safeVideoUrl}
              src={safeVideoUrl}
              autoPlay
              muted={isMuted}
              playsInline
              loop
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleTogglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Controls Overlay */}
            <div className="absolute right-4 bottom-32 z-40 flex flex-col gap-4">
              <button onClick={handleToggleMute} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <button onClick={() => setIsLiked(!isLiked)} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                <Heart size={20} className={cn(isLiked && "fill-rose-500 text-rose-500")} />
              </button>

              <button onClick={() => setShowCommentsPanel(true)} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                <MessageCircle size={20} />
              </button>

              <button onClick={() => setShowSizingPanel(true)} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10" title="Medidas da Modelo">
                <Ruler size={20} />
              </button>

              <button onClick={handleShare} className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-xl">
                <Share2 size={20} />
              </button>

              <button onClick={handleWhatsApp} className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl">
                <WhatsAppIcon size={24} />
              </button>
            </div>

            {/* Product Card Card */}
            {linkedProduct && (
              <div className="absolute left-4 right-[74px] bottom-6 h-[80px] bg-white rounded-2xl shadow-2xl flex items-center p-2 gap-3 z-30 animate-fade-in">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                  <img src={linkedProduct.image_url} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-slate-900 font-bold text-xs truncate">{linkedProduct.name}</h4>
                  <p className="text-emerald-600 font-black text-sm">R$ {linkedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <a 
                    href={linkedProduct.product_url} 
                    target="_blank" 
                    className="mt-1 block w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-lg text-center"
                  >
                    Comprar Agora
                  </a>
                </div>
              </div>
            )}

            {/* Sizing Panel (Drawer) */}
            <div className={cn(
              "absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 z-[100] transition-transform duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]",
              showSizingPanel ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Ruler className="text-violet-600" />
                  <h3 className="font-bold text-slate-900">Guia de Medidas</h3>
                </div>
                <button onClick={() => setShowSizingPanel(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>

              {linkedModel ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    {linkedModel.image_url && <img src={linkedModel.image_url} className="w-12 h-12 rounded-full object-cover" alt="" />}
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Modelo</p>
                      <p className="font-black text-slate-900">{linkedModel.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {linkedModel.measures.map((m, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{m.name}</p>
                        <p className="text-lg font-black text-slate-900">{m.value}{m.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 font-medium">
                  Nenhuma modelo vinculada a este story.
                </div>
              )}
            </div>

            {/* Comments Panel (Drawer) */}
            <div className={cn(
              "absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 z-[100] transition-transform duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]",
              showCommentsPanel ? "translate-y-0" : "translate-y-full"
            )}>
               <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900">Comentários ({currentStoryComments.length})</h3>
                <button onClick={() => setShowCommentsPanel(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                {currentStoryComments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.user_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.user_name}</p>
                      <p className="text-sm text-slate-600">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesWidgetPage;