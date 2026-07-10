"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel, Story } from '@/lib/db';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';
import { generateVideoThumbnail } from '@/lib/video';

const VideoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [models, setModels] = useState<SizingModel[]>([]);
  const [usedInStories, setUsedInStories] = useState<Story[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    instagram_link: '',
    tiktok_link: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
    active: true,
    origin: 'external_url' as 'external_url' | 'instagram' | 'tiktok' | 'upload',
    video_file: null as File | null,
  });

  const isCreate = !id;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allVideos, allModels, allProducts] = await Promise.all([
          db.videos.getAll(),
          db.sizingModels.getAll(),
          db.products.getAll()
        ]);
        setModels(allModels);
        setProducts(allProducts);
        setProductsLoading(false);
        setProductsError('');

        if (!isCreate && id) {
          const v = await db.videos.getById(id!);
          if (!v) {
            navigate('/gallery');
            return;
          }
          setVideo(v);
          setFormData({
            title: v.title,
            video_url: v.video_url || '',
            instagram_link: v.instagram_link || '',
            tiktok_link: v.tiktok_link || '',
            thumbnail_url: v.thumbnail_url || '',
            product_id: v.product_id || '',
            model_id: v.model_id || '',
            active: v.active ?? true,
            origin: (v.source_type as any) || 'external_url',
            video_file: null,
          });

          const storyVideos = await db.storyVideos.getAll();
          const storyIds = storyVideos
            .filter(sv => sv.video_id === id)
            .map(sv => sv.story_id);
          const stories = await db.stories.getAll();
          const usedStories = stories.filter(s => storyIds.includes(s.id));
          setUsedInStories(usedStories);
        }
      } catch (e) {
        setProductsError('Não foi possível carregar os produtos.');
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    };
    loadData();
  }, [id, navigate, isCreate]);

  const handleOriginChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => {
      const newData = { ...prev, origin: e.target.value as any };
      // Reset all source fields and thumbnail when origin changes
      newData.video_url = '';
      newData.instagram_link = '';
      newData.tiktok_link = '';
      newData.thumbnail_url = '';
      newData.video_file = null;
      return newData;
    });
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateInstagramLink = (link: string): boolean => {
    if (!link) return false;
    const lowerLink = link.toLowerCase();
    return lowerLink.includes('instagram.com') || lowerLink.includes('www.instagram.com');
  };

  const validateTikTokLink = (link: string): boolean => {
    if (!link) return false;
    const lowerLink = link.toLowerCase();
    return lowerLink.includes('tiktok.com') ||
      lowerLink.includes('www.tiktok.com') ||
      lowerLink.includes('vm.tiktok.com');
  };

  const validateFile = (file: File): boolean => {
    if (!file) return false;
    if (file.size > 30 * 1024 * 1024) {
      showError('O vídeo deve ter no máximo 30MB.');
      return false;
    }
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
    return allowedTypes.includes(file.type);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      showError('Formato de vídeo inválido. Envie um arquivo MP4, MOV ou WEBM.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData(prev => ({ ...prev, video_file: file, video_url: dataUrl }));
      // Auto-generate thumbnail from uploaded video
      generateVideoThumbnail(dataUrl).then(thumb => {
        if (thumb) setFormData(prev => ({ ...prev, thumbnail_url: thumb }));
      });
    };
    reader.readAsDataURL(file);
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Formato de imagem inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData({ ...formData, thumbnail_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const getVideoFileHelperText = () => {
    if (!formData.video_file) return 'Selecione um arquivo de vídeo';
    if (formData.video_file.size > 30 * 1024 * 1024) {
      return 'O vídeo deve ter no máximo 30MB.';
    }
    const sizeMB = (formData.video_file.size / (1024 * 1024)).toFixed(1);
    return 'Tamanho: ' + sizeMB + ' MB';
  };

  const getVideoFileHelperClass = () => {
    if (!formData.video_file) return 'mt-1 text-gray-500';
    if (formData.video_file.size > 30 * 1024 * 1024) {
      return 'mt-1 font-medium text-red-600';
    }
    return 'mt-1 text-gray-500';
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title?.trim()) {
      errors.title = 'O título do vídeo é obrigatório.';
      isValid = false;
    }

    if (!formData.origin) {
      errors.origin = 'Selecione a origem do vídeo.';
      isValid = false;
    }

    if (formData.origin === 'external_url') {
      if (!formData.video_url?.trim()) {
        errors.video_url = 'Informe a URL do vídeo.';
        isValid = false;
      } else if (!validateUrl(formData.video_url)) {
        errors.video_url = 'URL inválida.';
        isValid = false;
      }
    }

    if (formData.origin === 'instagram') {
      if (!formData.instagram_link?.trim()) {
        errors.instagram_link = 'Informe o link do Instagram.';
        isValid = false;
      } else if (!validateInstagramLink(formData.instagram_link)) {
        errors.instagram_link = 'Link do Instagram inválido (ex: instagram.com ou www.instagram.com).';
        isValid = false;
      }
    }

    if (formData.origin === 'tiktok') {
      if (!formData.tiktok_link?.trim()) {
        errors.tiktok_link = 'Informe o link do TikTok.';
        isValid = false;
      } else if (!validateTikTokLink(formData.tiktok_link)) {
        errors.tiktok_link = 'Link do TikTok inválido (ex: tiktok.com ou www.tiktok.com).';
        isValid = false;
      }
    }

    if (formData.origin === 'upload') {
      if (!formData.video_url) {
        errors.video_file = 'Envie um arquivo de vídeo.';
        isValid = false;
      }
    }

    return { isValid, errors };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const { isValid, errors } = validateForm();
    if (!isValid) {
      Object.entries(errors).forEach(([, message]) => {
        showError(message);
      });
      return;
    }

    try {
      setIsSaving(true);

      const videoData: Partial<Video> = {
        title: formData.title.trim(),
        source_type: formData.origin === 'external_url' ? 'external_url' : formData.origin,
        video_url: formData.video_url,
        instagram_link: formData.instagram_link,
        tiktok_link: formData.tiktok_link,
        thumbnail_url: formData.thumbnail_url,
        active: formData.active,
        status: formData.active ? 'active' : 'inactive',
        model_id: formData.model_id || null,
        product_id: formData.product_id || null,
        updated_at: new Date().toISOString()
      };

    if (isCreate) {
      const newVideo: Video = {
        ...videoData,
        id: Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString()
      } as Video;
      await db.videos.save(newVideo);
    } else {
      if (!video) return;
      const updatedVideo: Video = {
        ...video,
        ...videoData
      };
      await db.videos.save(updatedVideo);
    }

      setShowSuccessModal(true);
    } catch (e) {
      console.error('Save error:', e);
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
          <button onClick={() => navigate(isCreate ? '/gallery' : String(-1))} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft size={18} /></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isCreate ? 'Novo Vídeo' : 'Editar Vídeo'}
          </h1>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Vídeo</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem do Vídeo</label>
            <select
              value={formData.origin}
              onChange={handleOriginChange}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="external_url">URL do vídeo</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="upload">Upload de vídeo</option>
            </select>
          </div>

          {formData.origin === 'external_url' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do vídeo</label>
              <input
                type="url"
                value={formData.video_url}
                onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
          )}

          {formData.origin === 'instagram' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link do Instagram</label>
              <input
                type="text"
                value={formData.instagram_link}
                onChange={e => setFormData({ ...formData, instagram_link: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
          )}

          {formData.origin === 'tiktok' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link do TikTok</label>
              <input
                type="text"
                value={formData.tiktok_link}
                onChange={e => setFormData({ ...formData, tiktok_link: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
          )}

          {formData.origin === 'upload' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo de vídeo</label>
              <input
                type="file"
                accept="video/mp4,video/mov,video/webm"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
              />
              {formData.video_url && (
                <video src={formData.video_url} className="w-32 rounded-xl border border-slate-200" muted controls />
              )}
              {formData.video_file && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="font-medium text-gray-700">Arquivo selecionado:</div>
                  <div className="text-gray-600">{formData.video_file.name}</div>
                  <div className={getVideoFileHelperClass()}>
                    {getVideoFileHelperText()}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capa do Vídeo (Thumbnail)</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {formData.thumbnail_url ? (
                  <img src={formData.thumbnail_url} className="w-full h-full object-cover" alt="Capa" />
                ) : formData.video_url ? (
                  <video src={formData.video_url} className="w-full h-full object-cover" muted />
                ) : (
                  <span className="text-xs font-bold text-slate-400">Sem capa</span>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbnailUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                />
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="Ou cole a URL da capa (opcional - gerada do vídeo)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Se deixado em branco, um frame do vídeo será usado automaticamente.</p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto Vinculado (opcional)</label>
            <select
              value={formData.product_id}
              onChange={e => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="">Nenhum produto vinculado</option>
              {productsLoading ? (
                <option value="" disabled>Carregando produtos...</option>
              ) : productsError ? (
                <option value="" disabled>{productsError}</option>
              ) : products.length === 0 ? (
                <option value="" disabled>Nenhum produto cadastrado</option>
              ) : (
                products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {typeof p.price === 'number' ? ` - ${p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo/Medida Vinculado (opcional)</label>
            <select
              value={formData.model_id}
              onChange={e => setFormData({ ...formData, model_id: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="">Nenhum</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
            <select
              value={formData.active ? 'true' : 'false'}
              onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          {usedInStories.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usado em Stories</label>
              <span className="font-bold text-slate-800">Sim</span>
              <p className="text-sm font-bold text-slate-600">Stories vinculados:</p>
              <ul className="list-disc list-inside text-slate-500">
                {usedInStories.map(story => (
                  <li key={story.id}>{story.title}</li>
                ))}
              </ul>
            </div>
          )}

          {!isCreate && usedInStories.length === 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usado em Stories</label>
              <p className="text-sm font-bold text-slate-600">Não</p>
            </div>
          )}
        </form>
      </div>

      <SuccessDialog isOpen={showSuccessModal} description="Vídeo salvo com sucesso." onClose={() => navigate('/gallery')} />
    </div>
  );
};

export default VideoEditPage;