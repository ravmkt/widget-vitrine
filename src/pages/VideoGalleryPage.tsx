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
  Filter
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      thumbnail_url: video.thumbnail_url,
      product_id: (video as any).product_id || '',
      model_id: (video as any).model_id || '',
    });
    setIsViewModalOpen(false); // Fecha player se estiver aberto
    setIsModalOpen(true);
  };

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) {
      showError('Preencha título e URL do vídeo.');
      return;
    }

    const videoData: Video = {
      ...editingVideo,
      id: editingVideo?.id || Math.random().toString(36).substr(2, 9),
      store_id: '11111111-1111-1111-1111-111111111111',
      title: formData.title,
      source_type: formData.source_type,
      video_url: formData.video_url,
      thumbnail_url: formData.thumbnail_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250',
      status: 'active',
      ...({
        product_id: formData.product_id,
        model_id: formData.model_id,
      } as any)
    };

    try {
      await db.videos.save(videoData);
      showSuccess('Vídeo atualizado com sucesso!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showError('Erro ao salvar vídeo.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Conteúdo (Vídeos)</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os vídeos reais que serão exibidos nos seus Stories.</p>
        </div>
        <button 
          onClick={() => { setEditingVideo(null); setFormData({title: '', source_type: 'upload', video_url: '', thumbnail_url: '', product_id: '', model_id: ''}); setIsModalOpen(true); }}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Vídeo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Pesquisar vídeos..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
          />
        </div>
        <select 
          value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 outline-none"
        >
          <option value="all">Todas as Fontes</option>
          <option value="upload">Upload Direto</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
          <Filter size={20} className="text-[#0094EB]" />
          Biblioteca de Conteúdo
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredVideos.map(video => (
            <div key={video.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
              <div className="aspect-[9/16] bg-slate-900 relative cursor-pointer" onClick={() => handleViewVideo(video)}>
                 <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={video.title} />
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                    <Play size={40} className="text-white fill-white scale-110" />
                 </div>
                 <div className="absolute top-4 left-4">
                    <span className="bg-white/10 backdrop-blur-md text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-white/20">
                      {video.source_type}
                    </span>
                 </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                 <h4 className="font-bold text-slate-800 truncate text-sm mb-4">{video.title}</h4>
                 <div className="mt-auto space-y-2">
                   <button 
                     onClick={() => handleViewVideo(video)}
                     className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0094EB] hover:bg-[#0E4787] text-white text-xs font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
                   >
                     <Eye size={14} /> Ver vídeo
                   </button>
                   <div className="flex gap-2">
                      <button onClick={() => handleEditVideo(video)} className="flex-1 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors flex justify-center"><Edit3 size={16} /></button>
                      <button className="flex-1 p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-red-500 transition-colors flex justify-center"><Trash2 size={16} /></button>
                   </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal do Player (Apenas Video ID) */}
      <CustomDialog
        isOpen={isViewModalOpen}
        type="form"
        title="Visualizar Vídeo"
        maxWidth="max-w-4xl"
        onCancel={() => setIsViewModalOpen(false)}
      >
        {viewingVideo && (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
            <div className="aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-slate-900">
               <video src={viewingVideo.video_url} className="w-full h-full object-cover" controls autoPlay />
            </div>
            
            <div className="flex flex-col">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black text-slate-900">{viewingVideo.title}</h3>
                  <button 
                    onClick={() => handleEditVideo(viewingVideo)}
                    className="p-3 bg-blue-50 text-[#0094EB] rounded-2xl hover:bg-blue-100 transition-all flex items-center gap-2 font-black text-xs uppercase"
                  >
                    <Edit3 size={16} /> Editar vídeo
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-400">Origem: {viewingVideo.source_type}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-[#0094EB] mb-2">
                    <Eye size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Visualizações</span>
                  </div>
                  <p className="text-xl font-black text-slate-900">1.248</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-500 mb-2">
                    <ShoppingBag size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Vendas</span>
                  </div>
                  <p className="text-xl font-black text-slate-900">42</p>
                </div>
              </div>

              <div className="mt-auto p-6 bg-slate-900 rounded-3xl text-white">
                <h4 className="text-xs font-black text-slate-400 uppercase mb-4">Metadados do Conteúdo</h4>
                <div className="space-y-2">
                   <p className="text-xs font-medium">Produto: <span className="text-[#0094EB]">{products.find(p => p.id === (viewingVideo as any).product_id)?.name || "Nenhum"}</span></p>
                   <p className="text-xs font-medium">Modelo: <span className="text-[#0094EB]">{sizingModels.find(m => m.id === (viewingVideo as any).model_id)?.name || "Nenhum"}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CustomDialog>

      {/* Modal de Edição (Apenas Video ID) */}
      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingVideo ? 'Editar Vídeo' : 'Adicionar Vídeo'}
        maxWidth="max-w-2xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSaveVideo}
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Vídeo</label>
              <input 
                type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</label>
              <select value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                <option value="upload">Upload</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Arquivo</label>
              <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Capa (Thumbnail)</label>
              <input type="url" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Produto</label>
                <select value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                   <option value="">Nenhum produto</option>
                   {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela de Medidas</label>
                <select value={formData.model_id} onChange={e => setFormData({...formData, model_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                   <option value="">Sem medidas</option>
                   {sizingModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
             </div>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default VideoGalleryPage;