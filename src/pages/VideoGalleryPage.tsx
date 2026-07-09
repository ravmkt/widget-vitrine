import React, { useEffect, useState, useMemo } from 'react';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { 
  Plus, 
  Library, 
  Search, 
  Play, 
  Trash2, 
  Edit3, 
  X, 
  Upload, 
  ShoppingBag, 
  MousePointer2, 
  Eye, 
  Calendar,
  BarChart3,
  TrendingUp,
  ExternalLink,
  Filter,
  ImageIcon
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const VideoGalleryPage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizingModels, setSizingModels] = useState<SizingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    source_type: 'upload' as Video['source_type'],
    video_url: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
  });

  const loadData = async () => {
    try {
      const allV = await db.videos.getAll();
      const allP = await db.products.getAll();
      const allM = await db.sizingModels.getAll();
      setVideos(allV);
      setProducts(allP);
      setSizingModels(allM);
    } catch (e) {
      showError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'all' || v.source_type === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [videos, searchTerm, filterSource]);

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      source_type: video.source_type,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      product_id: (video as any).product_id || '',
      model_id: (video as any).model_id || '',
    });
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) {
      showError('Preencha título e URL.');
      return;
    }

    try {
      const videoData: Video = {
        ...editingVideo,
        id: editingVideo?.id || Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        title: formData.title,
        source_type: formData.source_type,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250',
        status: 'active',
      };
      
      (videoData as any).product_id = formData.product_id;
      (videoData as any).model_id = formData.model_id;

      await db.videos.save(videoData);
      showSuccess('Vídeo salvo!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showError('Erro ao salvar.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vídeos (Conteúdo)</h1>
          <p className="text-xs text-slate-500 font-bold">Gerencie os vídeos reais dos seus stories.</p>
        </div>
        <button 
          onClick={() => { setEditingVideo(null); setFormData({title: '', source_type: 'upload', video_url: '', thumbnail_url: '', product_id: '', model_id: ''}); setIsModalOpen(true); }}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-md"
        >
          <Plus size={16} /> Novo Vídeo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Pesquisar..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-3 py-2 text-xs font-bold outline-none focus:border-[#0094EB]"
          />
        </div>
        <select 
          value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
          className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
        >
          <option value="all">Todas Fontes</option>
          <option value="upload">Upload</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
            <div className="aspect-[9/16] bg-slate-900 relative cursor-pointer" onClick={() => handleViewVideo(video)}>
               <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={video.title} />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                  <Play size={32} className="text-white fill-white" />
               </div>
            </div>
            <div className="p-3">
               <h4 className="font-bold text-slate-800 truncate text-[11px] mb-2">{video.title}</h4>
               <div className="flex gap-1.5">
                  <button onClick={() => handleViewVideo(video)} className="flex-1 bg-[#EAF6FF] text-[#0094EB] py-1.5 rounded-lg text-[10px] font-black">Ver</button>
                  <button onClick={() => handleEditVideo(video)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-[#0094EB]"><Edit3 size={14} /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal View Compacto */}
      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[180px] mx-auto shrink-0">
               <video src={viewingVideo.video_url} className="w-full rounded-2xl border-4 border-slate-900 shadow-xl" controls autoPlay />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingVideo.source_type}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                    <p className="text-xs font-black text-emerald-600">Ativo</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Data</p>
                    <p className="text-xs font-black text-slate-700">Recente</p>
                 </div>
              </div>
              <button onClick={() => handleEditVideo(viewingVideo)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl text-xs font-black">Editar Vídeo</button>
            </div>
          </div>
        )}
      </CustomDialog>

      {/* Modal Edit Compacto */}
      <CustomDialog isOpen={isModalOpen} type="form" title={editingVideo ? 'Editar' : 'Novo'} maxWidth="max-w-lg" onCancel={() => setIsModalOpen(false)} onConfirm={handleSaveVideo}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Título</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fonte</label>
              <select value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value as any})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                <option value="upload">Upload</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capa</label>
               <input type="text" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} placeholder="URL da imagem" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL do Vídeo</label>
            <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default VideoGalleryPage;