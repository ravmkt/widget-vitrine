import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { ArrowLeft, Save, Film, ShoppingBag, Ruler, Trash2, Globe, Video as VideoIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import Navbar from '@/components/Navbar';

const VideoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<Video | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [models, setModels] = useState<SizingModel[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const v = await db.videos.getById(id!);
        if (!v) {
          showError('Vídeo não encontrado');
          navigate('/gallery');
          return;
        }
        setVideo(v);
        setFormData({
          title: v.title,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url,
          product_id: (v as any).product_id || '',
          model_id: (v as any).model_id || '',
        });

        const p = await db.products.getAll();
        const m = await db.sizingModels.getAll();
        setProducts(p);
        setModels(m);
      } catch (e) {
        showError('Erro ao carregar dados do vídeo');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    try {
      await db.videos.save({
        ...video,
        ...formData,
        updated_at: new Date().toISOString()
      });
      showSuccess('Vídeo atualizado com sucesso!');
      navigate(-1);
    } catch (e) {
      showError('Erro ao salvar vídeo');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Editar Vídeo</h1>
              <p className="text-slate-500 font-medium">Configure as propriedades e vínculos deste conteúdo.</p>
            </div>
          </div>
          <button onClick={handleSave} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
            <Save size={18} /> Salvar Alterações
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
           <div className="space-y-6">
              <div className="aspect-[9/16] bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[8px] border-white">
                <video src={formData.video_url} className="w-full h-full object-cover" controls />
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-[2rem] text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status do Conteúdo</p>
                <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase border border-emerald-100">Ativo</span>
              </div>
           </div>

           <form onSubmit={handleSave} className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                 <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <Film className="text-[#0094EB]" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Informações do Conteúdo</h3>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Interno</label>
                       <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Arquivo MP4</label>
                       <div className="relative">
                          <VideoIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Thumbnail (Capa)</label>
                       <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="url" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                 <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <ShoppingBag className="text-[#0094EB]" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Vínculos de Venda</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Produto</label>
                       <select value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]">
                          <option value="">Selecione um produto</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela de Medidas</label>
                       <select value={formData.model_id} onChange={e => setFormData({...formData, model_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]">
                          <option value="">Sem tabela de medidas</option>
                          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                 <button type="button" className="text-rose-500 font-black text-xs uppercase flex items-center gap-2 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
                    <Trash2 size={16} /> Excluir Vídeo Permanentemente
                 </button>
                 <div className="flex gap-3">
                    <button type="button" onClick={() => navigate(-1)} className="px-8 py-4 text-slate-500 font-black text-sm">Cancelar</button>
                    <button type="submit" className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl transition-all">Salvar</button>
                 </div>
              </div>
           </form>
        </div>
      </main>
    </div>
  );
};

export default VideoEditPage;