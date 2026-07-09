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
          thumbnail_url: v.thumbnail_url || '',
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
      // Cria o objeto limpo para salvar
      const updatedVideo: Video = {
        ...video,
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url,
        updated_at: new Date().toISOString()
      };
      
      // Adiciona campos extras se existirem
      (updatedVideo as any).product_id = formData.product_id;
      (updatedVideo as any).model_id = formData.model_id;

      await db.videos.save(updatedVideo);
      showSuccess('Vídeo atualizado com sucesso!');
      navigate(-1);
    } catch (e) {
      console.error('Erro ao salvar:', e);
      showError('Erro ao salvar vídeo');
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Arquivo muito grande. Máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, thumbnail_url: reader.result as string }));
        showSuccess('Capa carregada!');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm"><ArrowLeft size={18}/></button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Editar Vídeo</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{formData.title}</p>
            </div>
          </div>
          <button onClick={handleSave} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg transition-all flex items-center gap-2">
            <Save size={16} /> Salvar Alterações
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
           <div className="space-y-4">
              <div className="aspect-[9/16] bg-slate-950 rounded-[2rem] overflow-hidden shadow-xl relative border-[6px] border-white">
                <video src={formData.video_url} className="w-full h-full object-cover" poster={formData.thumbnail_url} controls />
              </div>
           </div>

           <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
                 <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <Film className="text-[#0094EB]" size={18} />
                    <h3 className="text-sm font-black text-slate-800 uppercase">Configurações Gerais</h3>
                 </div>

                 <div className="space-y-5">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Vídeo</label>
                       <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Vídeo</label>
                         <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" placeholder="https://exemplo.com/video.mp4" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capa / Thumbnail</label>
                         <div className="flex gap-2">
                            <div className="h-11 w-11 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                               {formData.thumbnail_url ? <img src={formData.thumbnail_url} className="w-full h-full object-cover" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon size={16} className="text-slate-300" /></div>}
                            </div>
                            <label className="flex-1 flex items-center justify-center gap-2 px-3 h-11 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-black cursor-pointer transition-colors">
                               <Upload size={14}/> {formData.thumbnail_url ? 'Alterar' : 'Upload'}
                               <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                            </label>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
                 <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <ShoppingBag className="text-[#0094EB]" size={18} />
                    <h3 className="text-sm font-black text-slate-800 uppercase">Vínculos Comerciais</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto Relacionado</label>
                       <select value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                          <option value="">Nenhum produto</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela de Medidas</label>
                       <select value={formData.model_id} onChange={e => setFormData({...formData, model_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                          <option value="">Sem medidas</option>
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