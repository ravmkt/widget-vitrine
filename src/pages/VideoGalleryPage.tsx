import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { 
  Plus, 
  Search, 
  Play, 
  Trash2, 
  Edit3, 
  X, 
  Upload, 
  Eye,
  Film
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const VideoGalleryPage = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; videoId: string; videoTitle: string }>({
    isOpen: false,
    videoId: '',
    videoTitle: ''
  });

  const loadData = async () => {
    try {
      const allV = await db.videos.getAll();
      setVideos(allV);
    } catch (e) {
      showError('Erro ao carregar vídeos.');
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

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    setDeleteModal({
      isOpen: true,
      videoId: video.id,
      videoTitle: video.title
    });
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
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vídeos (Conteúdo)</h1>
          <p className="text-xs text-slate-500 font-bold">Gerencie os vídeos reais dos seus stories.</p>
        </div>
        <button 
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Vídeo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Pesquisar por título..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-3 py-2 text-xs font-bold outline-none"
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
                  <button onClick={() => navigate(`/videos/${video.id}/edit`)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-[#0094EB]"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteClick(video)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-rose-500"><Trash2 size={14} /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal View Compacto */}
      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[180px] mx-auto shrink-0">
               <video src={viewingVideo.video_url} className="w-full rounded-2xl border-4 border-slate-900 shadow-xl" controls autoPlay />
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
      />
    </div>
  );
};

export default VideoGalleryPage;