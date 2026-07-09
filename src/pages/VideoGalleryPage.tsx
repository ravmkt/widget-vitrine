import React, { useEffect, useState } from 'react';
import { db, Video } from '@/lib/db';
import { Plus, Library, Search, Play, Trash2, Edit3, ExternalLink, Film, CheckCircle2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const VideoGalleryPage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadData = async () => {
    try {
      const all = await db.videos.getAll();
      setVideos(all);
    } catch (e) {
      showError('Erro ao carregar galeria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredVideos = videos.filter(v => (v.title || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDelete = (id: string, title: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Vídeo?',
      description: `Deseja remover "${title}" da galeria?`,
      onConfirm: async () => {
        await db.videos.delete(id);
        showSuccess('Vídeo removido com sucesso.');
        setDialog(p => ({ ...p, isOpen: false }));
        loadData();
      },
      onCancel: () => setDialog(p => ({ ...p, isOpen: false }))
    });
  };

  const handleAddVideo = () => {
    showSuccess('Abrindo seletor de upload...');
    // Aqui viria a lógica real de upload ou modal de link
  };

  const handleEditVideo = (video: Video) => {
    showSuccess(`Editando vídeo: ${video.title}`);
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Biblioteca de Vídeos</h1>
          <p className="text-[#64748B] font-medium mt-1">Hospede e gerencie seus vídeos de vendas e unboxing.</p>
        </div>
        <button 
          onClick={handleAddVideo}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Adicionar Vídeo
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar vídeos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0094EB]/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white border border-[#E2E8F0] rounded-[2rem] overflow-hidden shadow-sm group">
            <div className="aspect-[9/16] bg-slate-900 relative overflow-hidden">
               <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={video.title} />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play size={40} className="text-white fill-white" />
               </div>
            </div>
            <div className="p-5">
               <p className="text-xs font-bold text-[#0094EB] uppercase tracking-widest mb-1">{video.source_type}</p>
               <h4 className="font-bold text-[#0F172A] truncate text-sm">{video.title}</h4>
               <div className="flex gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <button 
                    onClick={() => handleEditVideo(video)}
                    className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-[#EAF6FF] text-[#0094EB] transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(video.id, video.title)} className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-red-50 text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  );
};

export default VideoGalleryPage;