import React, { useEffect, useState, useMemo } from 'react';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { Plus, Library, Search, Play, Trash2, Edit3, X, Upload, Link as LinkIcon, Instagram, Video as VideoIcon, ShoppingBag, Ruler, MousePointer2 } from 'lucide-react';
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
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    title: '',
    source_type: 'upload' as Video['source_type'],
    video_url: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
    cta_enabled: true,
    cta_text: 'Comprar Agora',
    cta_type: 'product' as any,
    cta_link: '',
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
      const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'all' || v.source_type === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [videos, searchTerm, filterSource]);

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      source_type: video.source_type,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      product_id: (video as any).product_id || '',
      model_id: (video as any).model_id || '',
      cta_enabled: (video as any).cta_enabled ?? true,
      cta_text: (video as any).cta_text || 'Comprar Agora',
      cta_type: (video as any).cta_type || 'product',
      cta_link: (video as any).cta_link || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoData: Video = {
      ...editingVideo,
      id: editingVideo?.id || Math.random().toString(36).substr(2, 9),
      store_id: '11111111-1111-1111-1111-111111111111',
      title: formData.title,
      source_type: formData.source_type,
      video_url: formData.video_url,
      thumbnail_url: formData.thumbnail_url,
      status: 'active',
      ...({
        product_id: formData.product_id,
        model_id: formData.model_id,
        cta_enabled: formData.cta_enabled,
        cta_text: formData.cta_text,
        cta_type: formData.cta_type,
        cta_link: formData.cta_link
      } as any)
    };

    await db.videos.save(videoData);
    showSuccess('Vídeo salvo com sucesso!');
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Biblioteca de Vídeos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie vídeos e suas informações comerciais.</p>
        </div>
        <button 
          onClick={() => { setEditingVideo(null); setFormData({...formData, title: ''}); setIsModalOpen(true); }}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Adicionar Vídeo
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
          <option value="external_url">URL Externa</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="aspect-[9/16] bg-slate-900 relative">
               <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={video.title} />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                  <Play size={40} className="text-white fill-white" />
               </div>
            </div>
            <div className="p-6">
               <span className="text-[10px] font-black text-[#0094EB] uppercase tracking-widest mb-1 block">{video.source_type}</span>
               <h4 className="font-bold text-slate-800 truncate text-sm mb-4">{video.title}</h4>
               <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleEdit(video)} className="flex-1 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-[#0094EB] transition-colors flex justify-center"><Edit3 size={16} /></button>
                  <button className="flex-1 p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-red-500 transition-colors flex justify-center"><Trash2 size={16} /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingVideo ? 'Editar Vídeo' : 'Adicionar Vídeo'}
        maxWidth="max-w-2xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
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
              <select 
                disabled={!!editingVideo} value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value as any})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none disabled:opacity-50"
              >
                <option value="upload">Upload</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="external_url">URL</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Vídeo</label>
              <input 
                type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><ShoppingBag size={18} className="text-[#0094EB]" /> Informações Comerciais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="pt-8 border-t border-slate-100">
            <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><MousePointer2 size={18} className="text-[#0094EB]" /> Chamada de Ação (CTA)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto do Botão</label>
                  <input type="text" value={formData.cta_text} onChange={e => setFormData({...formData, cta_text: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Link</label>
                  <select value={formData.cta_type} onChange={e => setFormData({...formData, cta_type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                     <option value="product">Produto Vinculado</option>
                     <option value="external">Link Externo</option>
                     <option value="whatsapp">WhatsApp</option>
                  </select>
               </div>
            </div>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default VideoGalleryPage;