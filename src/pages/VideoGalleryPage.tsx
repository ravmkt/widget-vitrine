import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product } from '@/lib/db';
import { 
  Plus, 
  Search, 
  Play, 
  Trash2, 
  Edit3, 
  ArrowLeft,
  Eye,
  Film,
  CheckCircle2,
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

const VideoGalleryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [orderBy, setOrderBy] = useState<string>('recent');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    videoId: string; 
    videoTitle: string; 
    usedInStories: boolean 
  }>({
    isOpen: false,
    videoId: '',
    videoTitle: '',
    usedInStories: false
  });

  const calculateVideoMetrics = (videoId: string) => {
    const end = new Date();
    const start = subDays(end, 30);
    const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const daysInterval = eachDayOfInterval({ start, end });
    
    let views = 0;
    let likes = 0;
    let comments = 0;

    daysInterval.forEach(date => {
      const dateSeed = date.getDate() + date.getMonth() * 31 + (date.getFullYear() % 100) * 400;
      const combinedSeed = (seed + dateSeed) % 1000;
      
      const dailyViews = 15 + (combinedSeed % 40);
      const dailyLikes = Math.floor(dailyViews * (0.10 + (combinedSeed % 15) / 100));
      const dailyComments = Math.floor(dailyLikes * (0.05 + (combinedSeed % 5) / 100));
      
      views += dailyViews;
      likes += dailyLikes;
      comments += dailyComments;
    });

    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return { views, likes, comments, engagement };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allVideos, allProducts] = await Promise.all([
          db.videos.getAll(),
          db.products.getAll()
        ]);
        setVideos(allVideos);
        setProducts(allProducts);
        setLoading(false);
      } catch (e) {
        showError('Erro ao carregar vídeos.');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const processedVideos = useMemo(() => {
    return videos
      .filter(v => {
        const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = filterSource === 'all' || v.source_type === filterSource;
        const matchesProduct = productFilter === 'all' || (v as any).product_id === productFilter;
        return matchesSearch && matchesSource && matchesProduct;
      })
      .map(v => {
        const metrics = calculateVideoMetrics(v.id);
        return { ...v, metrics };
      })
      .sort((a, b) => {
        switch (orderBy) {
          case 'recent': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          case 'oldest': return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          case 'views_asc': return a.metrics.views - b.metrics.views;
          case 'views_desc': return b.metrics.views - a.metrics.views;
          case 'likes_asc': return a.metrics.likes - b.metrics.likes;
          case 'likes_desc': return b.metrics.likes - a.metrics.likes;
          case 'comments_asc': return a.metrics.comments - b.metrics.comments;
          case 'comments_desc': return b.metrics.comments - a.metrics.comments;
          case 'engagement_asc': return a.metrics.engagement - b.metrics.engagement;
          case 'engagement_desc': return b.metrics.engagement - a.metrics.engagement;
          default: return 0;
        }
      });
  }, [videos, products, searchTerm, filterSource, productFilter, orderBy]);

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    const checkUsedInStories = async () => {
      try {
        const storyVideos = await db.storyVideos.getAll();
        const isUsed = storyVideos.some(sv => sv.video_id === video.id);
        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: isUsed
        });
      } catch (e) {
        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: false
        });
      }
    };
    checkUsedInStories();
  };

  const handleConfirmDelete = async () => {
    try {
      await db.videos.delete(deleteModal.videoId);
      setVideos(prev => prev.filter(v => v.id !== deleteModal.videoId));
      showSuccess('Vídeo removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao excluir o vídeo.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={18}/></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vídeos (Conteúdo)</h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/videos/new')}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo Vídeo
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar por título..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-3 py-2 text-xs font-bold outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterSource} 
            onChange={e => setFilterSource(e.target.value as any)}
            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="all">Todas Fontes</option>
            <option value="upload">Upload</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="external_url">URL Externa</option>
          </select>
          
          <select 
            value={productFilter} 
            onChange={e => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="all">Todos os Produtos</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <select 
            value={orderBy} 
            onChange={e => setOrderBy(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="recent">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="views_desc">Mais Visualizações</option>
            <option value="views_asc">Menos Visualizações</option>
            <option value="likes_desc">Mais Curtidas</option>
            <option value="likes_asc">Menos Curtidas</option>
            <option value="comments_desc">Mais Comentários</option>
            <option value="comments_asc">Menos Comentários</option>
            <option value="engagement_desc">Maior Engajamento</option>
            <option value="engagement_asc">Menor Engajamento</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {processedVideos.map(video => {
          const { views, likes, comments, engagement } = video.metrics;
          const productName = products.find(p => p.id === (video as any).product_id)?.name || 'Produto não vinculado';
          
          return (
            <div key={video.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
              <div className="aspect-[9/16] bg-slate-900 relative cursor-pointer" onClick={() => handleViewVideo(video)}>
                 {video.thumbnail_url ? (
                   <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={video.title} />
                 ) : (
                   <video src={video.video_url} className="w-full h-full object-cover opacity-80" muted preload="metadata" />
                 )}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                    <Play size={32} className="text-white fill-white" />
                 </div>
              </div>
              <div className="p-4">
                 <h4 className="font-bold text-slate-800 truncate text-sm mb-3">{video.title}</h4>
                 
                 <div className="flex items-center gap-2 mb-4 text-slate-600">
                   <Film className="text-[#0094EB]" size={18} />
                   <span className="text-sm font-semibold truncate">{productName}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
                   <div className="flex items-center gap-2">
                     <Eye className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{views.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{likes.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <MessageCircle className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{comments.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <TrendingUp className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{engagement.toFixed(1)}%</span>
                   </div>
                 </div>

                 <div className="flex gap-2">
                    <button onClick={() => handleViewVideo(video)} className="flex-1 bg-[#EAF6FF] text-[#0094EB] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1">Ver</button>
                    <button onClick={() => navigate(`/videos/${video.id}/edit`)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#0094EB] flex items-center justify-center"><Edit3 size={18} /></button>
                    <button onClick={() => handleDeleteClick(video)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-rose-500 flex items-center justify-center"><Trash2 size={18} /></button>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
               {viewingVideo.video_url ? (
                 <video 
                   src={viewingVideo.video_url} 
                   className="w-full max-w-full h-auto max-h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl" 
                   controls 
                   autoPlay 
                   poster={viewingVideo.thumbnail_url}
                 />
               ) : (
                 <div className="w-full h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl bg-slate-900 flex flex-col items-center justify-center gap-4 p-4">
                   <p className="text-white text-sm font-bold text-center">
                     {viewingVideo.source_type === 'instagram' ? 'Vídeo do Instagram' : viewingVideo.source_type === 'tiktok' ? 'Vídeo do TikTok' : 'Sem vídeo'}
                   </p>
                   {viewingVideo.instagram_link && (
                     <a href={viewingVideo.instagram_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no Instagram</a>
                   )}
                   {viewingVideo.tiktok_link && (
                     <a href={viewingVideo.tiktok_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no TikTok</a>
                   )}
                 </div>
               )}
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingVideo.source_type}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                    <p className="text-xs font-black text-emerald-600">Ativo</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Vídeo ID</p>
                    <p className="text-[10px] font-bold text-slate-500">#{viewingVideo.id.substr(0,8)}</p>
                 </div>
              </div>
              <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl text-xs font-black shadow-lg">Editar Vídeo</button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Vídeo"
        itemName={deleteModal.videoTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        usedInStories={deleteModal.usedInStories}
      />
    </div>
  );
};

export default VideoGalleryPage;