import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { ArrowLeft, Save, Film, ShoppingBag, Ruler, Trash2, Globe, Video as VideoIcon, Upload, ImageIcon } from 'lucide-react';
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

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, thumbnail_url: reader.result as string }));
        showSuccess('Capa carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Editar Vídeo</h1>
              <p className="text-slate-500 font-medium">Conteúdo: <span className="text-[#0094EB]">{formData.title}</span></p>
            </div>
          </div>
          <button onClick={handleSave} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2">
            <Save size={18} /> Salvar Alterações
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10">
           <div className="space-y-6">
              <div className="aspect-[9/16] bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[8px] border-white">
                <video src={formData.video_url} className="w-full h-full object-cover" poster={formData.thumbnail_url} controls />
              </div>
              
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Capa do Vídeo</p>
                <div className="relative group aspect-video rounded-xl bg-slate-100 overflow-hidden mb-4 border border-slate-100">
                  {formData.thumbnail_url ? (
                    <img src={formData.thumbnail_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="text-white text-xs font-black flex items-center gap-2"><Upload size={16}/> Mudar Capa</div>
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 text-center font-bold">Resolução sugerida: 1080x1920 (9:16)</p>
              </div>
           </div>

           <form onSubmit={handleSave} className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                 <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <Film className="text-[#0094EB]" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Metadados do Conteúdo</h3>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Vídeo</label>
                       <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Vídeo (MP4/WebM)</label>
                       <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                 <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <ShoppingBag className="text-[#0094EB]" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Canais de Venda</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto Vinculado</label>
                       <select value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                          <option value="">Selecione um produto</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela de Medidas</label>
                       <select value={formData.model_id} onChange={e => setFormData({...formData, model_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                          <option value="">Sem tabela de medidas</option>
                          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>
           </form>
        </div>
      </main>
    </div>
  );
};

export default VideoEditPage;