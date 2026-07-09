import React, { useEffect, useState, useMemo } from 'react';
import { db, Video } from '@/lib/db';
import { Plus, Library, Search, Play, Trash2, Edit3, X, Upload, Link as LinkIcon, Instagram, Video as VideoIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const VideoGalleryPage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');

  // Estados para Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  // Formulário
  const [formData, setFormData] = useState({
    title: '',
    source_type: 'upload' as Video['source_type'],
    video_url: '',
    thumbnail_url: '',
  });

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

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'all' || v.source_type === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [videos, searchTerm, filterSource]);

  const resetForm = () => {
    setFormData({ title: '', source_type: 'upload', video_url: '', thumbnail_url: '' });
    setEditingVideo(null);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) {
      showError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const videoData: Video = {
        id: editingVideo?.id || Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        title: formData.title,
        source_type: formData.source_type,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250',
        status: 'active',
      };

      await db.videos.save(videoData);
      showSuccess(editingVideo ? 'Vídeo atualizado!' : 'Vídeo adicionado!');
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (e) {
      showError('Erro ao salvar vídeo.');
    }
  };

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

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      source_type: video.source_type,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
    });
    setIsAddModalOpen(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Biblioteca de Vídeos</h1>
          <p className="text-[#64748B] font-medium mt-1">Hospede e gerencie seus vídeos de vendas e unboxing.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
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
        <select 
          value={filterSource}
          onChange={e => setFilterSource(e.target.value as any)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-bold text-[#64748B] focus:outline-none"
        >
          <option value="all">Todas as Fontes</option>
          <option value="upload">Upload Direto</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="external_url">URL Externa</option>
        </select>
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
               <p className="text-[10px] font-black text-[#0094EB] uppercase tracking-widest mb-1">{video.source_type.replace('_', ' ')}</p>
               <h4 className="font-bold text-[#0F172A] truncate text-sm">{video.title}</h4>
               <div className="flex gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <button 
                    onClick={() => handleEdit(video)}
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

      {/* Modal Adicionar/Editar Vídeo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-50">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">{editingVideo ? 'Editar Vídeo' : 'Adicionar Novo Vídeo'}</h3>
            
            <form onSubmit={handleSaveVideo} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Título do Vídeo</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
                  placeholder="Ex: Unboxing Coleção Outono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Origem do Vídeo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'upload', label: 'Upload', icon: Upload },
                    { id: 'instagram', label: 'Instagram', icon: Instagram },
                    { id: 'tiktok', label: 'TikTok', icon: VideoIcon },
                    { id: 'external_url', label: 'URL', icon: LinkIcon },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({...formData, source_type: item.id as any})}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all",
                        formData.source_type === item.id ? "bg-blue-50 border-[#0094EB] text-[#0094EB]" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">
                  {formData.source_type === 'upload' ? 'URL do Arquivo MP4' : 'Link Social'}
                </label>
                <input 
                  type="url" 
                  required
                  value={formData.video_url}
                  onChange={e => setFormData({...formData, video_url: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">URL da Capa (Thumbnail)</label>
                <input 
                  type="url" 
                  value={formData.thumbnail_url}
                  onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
                  placeholder="https://imagem..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-[#0094EB] text-white font-bold text-sm hover:bg-[#0E4787] shadow-lg">Salvar Vídeo</button>
              </div>
            </form>
          </div>
        </div>
      )}

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