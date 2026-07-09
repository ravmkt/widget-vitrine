import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Filter, 
  TrendingUp,
  TrendingDown,
  PlayCircle,
  MousePointer2,
  CheckCircle2,
  Eye,
  Edit3,
  Film
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db, Video, Story } from '@/lib/db';
import CustomDialog from '@/components/CustomDialog';

const StoriesReportPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  const [filters, setFilters] = useState({
    period: '30',
    search: '',
  });

  useEffect(() => {
    const load = async () => {
      const v = await db.videos.getAll();
      setVideos(v);
      setLoading(false);
    };
    load();
  }, []);

  const storyPerformance = useMemo(() => [
    { id: '1', name: "Coleção Outono 🍂", status: 'active', views: 1240, clicks: 96, sales: 8, videosCount: 3 },
    { id: '2', name: "Oferta Relâmpago ⚡", status: 'active', views: 980, clicks: 48, sales: 2, videosCount: 1 },
    { id: '3', name: "Unboxing Vestido Max", status: 'active', views: 820, clicks: 112, sales: 15, videosCount: 2 },
  ], []);

  const handleOpenVideoPlayer = (videoId: string) => {
    const video = videos.find(v => v.id === videoId) || videos[0];
    if (video) {
      setViewingVideo(video);
      setIsViewModalOpen(true);
    }
  };

  const handleEditStory = (storyId: string) => {
    navigate(`/stories/${storyId}`);
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance de Stories</h1>
            <p className="text-slate-500 font-medium">Análise de como seus blocos configurados estão performando.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {storyPerformance.map((story) => (
          <div key={story.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0094EB]"><PlayCircle size={24} /></div>
                <div>
                  <h4 className="text-xl font-black text-slate-800">{story.name}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{story.videosCount} vídeos configurados</p>
                </div>
              </div>
              
              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Visualizações</p>
                  <p className="text-lg font-black text-slate-800">{story.views}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleOpenVideoPlayer('v1')} // Exemplo: abre primeiro vídeo do story
                    className="flex items-center gap-2 bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg transition-all"
                  >
                    <Eye size={16} /> Ver Vídeo
                  </button>
                  <button 
                    onClick={() => handleEditStory(story.id)}
                    className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Player de Vídeo Reutilizado (Sempre usando Video Entity) */}
      <CustomDialog
        isOpen={isViewModalOpen}
        type="form"
        title="Assistir Vídeo"
        maxWidth="max-w-4xl"
        onCancel={() => setIsViewModalOpen(false)}
      >
        {viewingVideo && (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
            <div className="aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-slate-900">
               <video src={viewingVideo.video_url} className="w-full h-full object-cover" controls autoPlay />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{viewingVideo.title}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conteúdo Real</p>
                </div>
                <button 
                  onClick={() => navigate('/gallery')} // Leva para a galeria onde o vídeo é editado
                  className="p-3 bg-blue-50 text-[#0094EB] rounded-2xl hover:bg-blue-100 transition-all flex items-center gap-2 font-black text-xs uppercase"
                >
                  <Film size={16} /> Gerenciar Conteúdo
                </button>
              </div>
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex-1">
                 <p className="text-sm font-bold text-slate-500 italic">"Visualização direta do conteúdo. Para alterar este vídeo, acesse a Biblioteca de Vídeos."</p>
              </div>
            </div>
          </div>
        )}
      </CustomDialog>
    </div>
  );
};

export default StoriesReportPage;