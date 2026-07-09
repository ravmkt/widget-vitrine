import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel } from '@/lib/db';
import { ArrowLeft, Save, Film, ShoppingBag, Ruler, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';

const VideoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);

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
        if (!v) { navigate('/gallery'); return; }
        setVideo(v);
        setFormData({
          title: v.title,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url || '',
          product_id: (v as any).product_id || '',
          model_id: (v as any).model_id || '',
        });
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
    if (!video || isSaving) return;

    try {
      setIsSaving(true);
      const updatedVideo: Video = {
        ...video,
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url,
        updated_at: new Date().toISOString()
      };
      (updatedVideo as any).product_id = formData.product_id;
      (updatedVideo as any).model_id = formData.model_id;

      await db.videos.save(updatedVideo);
      setShowSuccessModal(true);
    } catch (e) {
      showError('Erro ao salvar vídeo');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft size={18}/></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Editar Vídeo</h1>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
         <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Vídeo</label>
                 <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capa do Vídeo (Thumbnail URL)</label>
                 <input type="url" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
              </div>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo do Vídeo (URL)</label>
               <div className="flex gap-4">
                 <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
                 <div className="h-14 w-14 rounded-2xl bg-slate-900 overflow-hidden shrink-0 shadow-lg">
                    <video src={formData.video_url} className="w-full h-full object-cover" />
                 </div>
               </div>
            </div>
         </form>
      </div>
      <SuccessDialog isOpen={showSuccessModal} description="Vídeo salvo com sucesso." onClose={() => navigate('/gallery')} />
    </div>
  );
};

export default VideoEditPage;