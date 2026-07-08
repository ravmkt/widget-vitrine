import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Video, Appearance, GeneralSettings, Comment, Product, SizingModel } from '@/lib/db';
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
  ShoppingBag,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { cn } from '@/lib/utils';

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
        const currentStore = storeId ? (stores.find((item) => item.id === storeId) || null) : (stores[0] || null);

        if (!currentStore) return;

        const fetchedSettings = (await db.generalSettings.getAll(currentStore.id))[0];
        setGeneralSettings(fetchedSettings);

        const fetchedAppearances = await db.appearances.getAll(currentStore.id);
        setCurrentAppearance(fetchedAppearances.find(app => app.id === fetchedSettings?.default_appearance_id) || fetchedAppearances[0] || null);

        const fetchedStories = await db.stories.getAll(currentStore.id);
        const activeStories = fetchedStories.filter(s => s.active).sort((a, b) => a.position - b.position);
        setStories(activeStories);

        const allStoryVideos = await db.storyVideos.getAll();
        const allVideos = await db.videos.getAll();
        const map = new Map<string, Video[]>();
        activeStories.forEach(s => {
          const svs = allStoryVideos.filter(sv => sv.story_id === s.id).map(sv => allVideos.find(v => v.id === sv.video_id)).filter((v): v is Video => !!v);
          map.set(s.id, svs);
        });
        setStoryVideosMap(map);
      } catch (e) {
        console.error("Erro no widget:", e);
      } finally {
        setLoading(false);
      }
    };
    loadWidgetData();
  }, [storeId]);

  useEffect(() => {
    if (selectedStory) {
      db.incrementViewCount(selectedStory.id);
      setIsLiked(false);
      setIsPlaying(true);
      
      const fetchRelations = async () => {
        if (selectedStory.cta_type === 'product') {
          const sps = await db.storyProducts.getAll();
          const sp = sps.find(s => s.story_id === selectedStory.id);
          if (sp) {
            const prod = await db.products.getById(sp.product_id);
            setCurrentProduct(prod);
          } else {
            setCurrentProduct(null);
          }
        } else {
          setCurrentProduct(null);
        }

        if (selectedStory.model_id) {
          const model = await db.sizingModels.getById(selectedStory.model_id);
          setCurrentModel(model);
        } else {
          setCurrentModel(null);
        }
      };
      fetchRelations();
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

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleShare = async () => {
    const url = selectedStory?.cta_url || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedStory?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        showSuccess("Link copiado!");
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {}
  };

  const handleWhatsApp = () => {
    if (!generalSettings?.whatsapp_number) return;
    const msg = encodeURIComponent(selectedStory?.whatsapp_message || "Olá! Tenho interesse no produto do story.");
    window.open(`https://wa.me/${generalSettings.whatsapp_number}?text=${msg}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[200px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div></div>;
  if (stories.length === 0) return null;

  const btnClass = "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95";
  const darkBtn = cn(btnClass, "bg-black/30 border border-white/20 text-white hover:bg-black/50");
  const whiteBtn = cn(btnClass, "bg-white text-slate-900 shadow-xl");

  return (
    <div className="w-full">
      {/* Grid de Stories (Trigger) */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {stories.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setSelectedIndex(idx)}
            className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-lg group"
          >
            <img src={storyVideosMap.get(s.id)?.[0]?.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-xs font-bold">{s.title}</div>
          </button>
        ))}
      </div>

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center px-4">
          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[40px] overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent">
              <div>
                <h3 className="text-white font-black text-sm">{selectedStory.title}</h3>
                <p className="text-white/60 text-[10px] uppercase font-bold">{generalSettings?.store_name}</p>
              </div>
              <button onClick={() => setSelectedIndex(null)} className={darkBtn}><X className="w-5 h-5" /></button>
            </div>

            {/* Video Player */}
            <video
              ref={videoRef}
              src={mainVideo?.video_url}
              autoPlay
              muted={isMuted}
              playsInline
              loop
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleTogglePlay}
            />

            {/* Action Buttons (Right Sidebar) */}
            <div className="absolute right-4 bottom-32 z-50 flex flex-col gap-4">
              <button onClick={handleTogglePlay} className={darkBtn}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}</button>
              <button onClick={handleToggleMute} className={darkBtn}>{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
              <button onClick={handleToggleLike} className={darkBtn}><Heart className={cn("w-5 h-5 transition-all", isLiked ? "fill-rose-500 text-rose-500" : "text-white")} /></button>
              <button onClick={() => setShowCommentsPanel(true)} className={darkBtn}><MessageCircle className="w-5 h-5" /></button>
              <button onClick={handleShare} className={whiteBtn}>{copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}</button>
              <button onClick={handleWhatsApp} className={whiteBtn} style={{ backgroundColor: '#25D366', color: '#fff' }}><WhatsAppIcon size={24} /></button>
              <button onClick={() => setShowMeasuresPanel(true)} className={cn(whiteBtn, "bg-violet-600 text-white")}><Ruler className="w-5 h-5" /></button>
            </div>

            {/* Product Card */}
            {currentProduct && (
              <div className="absolute left-4 right-20 bottom-8 z-50 bg-white/95 backdrop-blur-xl rounded-3xl p-3 flex gap-4 items-center shadow-2xl animate-fade-in">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <img src={currentProduct.image_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-900 font-black text-sm truncate">{currentProduct.name}</h4>
                  <p className="text-violet-600 font-black text-xs">R$ {currentProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <button 
                    onClick={() => window.open(currentProduct.product_url, '_blank')}
                    className="mt-1 w-full bg-slate-950 text-white text-[10px] font-black uppercase py-1.5 rounded-xl flex items-center justify-center gap-1"
                  >
                    Comprar <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <button onClick={(e) => { e.stopPropagation(); setSelectedIndex(p => (p! - 1 + stories.length) % stories.length) }} className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 text-white/50 hover:text-white transition-colors"><ChevronLeft className="w-8 h-8" /></button>
            <button onClick={(e) => { e.stopPropagation(); setSelectedIndex(p => (p! + 1) % stories.length) }} className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 text-white/50 hover:text-white transition-colors"><ChevronRight className="w-8 h-8" /></button>
          </div>

          {/* Modal Medidas */}
          {showMeasuresPanel && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-sm p-8 shadow-2xl relative">
                <button onClick={() => setShowMeasuresPanel(false)} className="absolute top-6 right-6 p-2 rounded-full bg-slate-950 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-3xl bg-violet-600/10 text-violet-400"><Ruler className="w-8 h-8" /></div>
                  <h3 className="text-2xl font-black text-white">Tabela de Medidas</h3>
                </div>
                {currentModel ? (
                  <div className="space-y-6">
                    <div className="bg-slate-950/60 p-4 rounded-3xl border border-slate-800">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Modelo</p>
                      <p className="text-lg font-black text-white mt-1">{currentModel.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {currentModel.measures.map((m, i) => (
                        <div key={i} className="bg-slate-950/60 p-4 rounded-3xl border border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{m.name}</p>
                          <p className="text-base font-black text-violet-400 mt-1">{m.value} {m.unit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center"><p className="text-slate-400 font-bold">Nenhuma modelo vinculada a este story.</p></div>
                )}
                <button onClick={() => setShowMeasuresPanel(false)} className="mt-8 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-3xl transition-all">Fechar</button>
              </div>
            </div>
          </div>
          )}

        </div>
      )}
    </div>
  );
};

export default StoriesWidgetPage;