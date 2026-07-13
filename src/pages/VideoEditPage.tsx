"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel, Story, resolveStoreId } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';
import { generateVideoThumbnail } from '@/lib/video';
import { useTenant } from '@/context/TenantContext';

const STORAGE_BUCKET = 'store-assets';

const createSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getFileExtension = (file: File, fallback: string) => {
  const extensionFromName = file.name.split('.').pop();

  if (extensionFromName) {
    return extensionFromName.toLowerCase();
  }

  if (file.type === 'video/mp4') return 'mp4';
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';

  return fallback;
};

const resolveSafeStoreId = async (candidate?: string | null) => {
  try {
    const resolved = await resolveStoreId(candidate || undefined);

    if (resolved) {
      return resolved;
    }
  } catch {
    // fallback abaixo
  }

  try {
    const localCurrentStoreId =
      localStorage.getItem('current_store_id') ||
      localStorage.getItem('store_id') ||
      localStorage.getItem('selected_store_id') ||
      '';

    if (localCurrentStoreId) {
      const resolved = await resolveStoreId(localCurrentStoreId);

      if (resolved) {
        return resolved;
      }
    }
  } catch {
    // fallback abaixo
  }

  try {
    const stores = await db.stores.getAll();

    if (stores?.[0]?.id) {
      return stores[0].id;
    }
  } catch {
    // sem loja
  }

  return '';
};

const uploadFileToSupabase = async (
  file: File,
  storeId: string,
  folder: 'videos' | 'thumbnails',
) => {
  const fallbackExtension = folder === 'videos' ? 'mp4' : 'jpg';
  const fileExt = getFileExtension(file, fallbackExtension);
  const filePath = `${storeId}/${folder}/${Date.now()}-${createSafeId()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    console.error(`Erro ao enviar arquivo para ${folder}:`, error);
    throw error;
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

const uploadDataUrlToSupabase = async (
  dataUrl: string,
  storeId: string,
  folder: 'thumbnails',
) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const extension =
    blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : 'jpg';

  const file = new File([blob], `thumbnail-${Date.now()}.${extension}`, {
    type: blob.type || 'image/jpeg',
  });

  return uploadFileToSupabase(file, storeId, folder);
};

const isTemporaryUrl = (url: string) => {
  return url.startsWith('blob:') || url.startsWith('data:');
};

const VideoEditPage = () => {
  const { storeId: tenantStoreId, loading: tenantLoading } = useTenant();
  const { id, storeId: paramStoreId } = useParams<{ id?: string; storeId?: string }>();
  const navigate = useNavigate();

  const [resolvedStoreId, setResolvedStoreId] = useState('');
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
    thumbnail_url: '',
    product_id: '',
    model_id: '',
    active: true,
    origin: 'external_url' as 'external_url' | 'upload',
    video_file: null as File | null,
    thumbnail_file: null as File | null,
  });

  const isCreate = !id;

  const getCurrentStoreId = async () => {
    const candidate = tenantStoreId || paramStoreId || resolvedStoreId || '';
    return resolveSafeStoreId(candidate);
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setProductsLoading(true);

        const safeStoreId = await getCurrentStoreId();

        if (!mounted) return;

        if (!safeStoreId) {
          setResolvedStoreId('');
          setProducts([]);
          setModels([]);
          setProductsLoading(false);
          setLoading(false);
          return;
        }

        setResolvedStoreId(safeStoreId);

        const [allModels, allProducts] = await Promise.all([
          db.sizingModels.getAll(safeStoreId),
          db.products.getAll(safeStoreId),
        ]);

        if (!mounted) return;

        setModels(allModels || []);
        setProducts(allProducts || []);
        setProductsError('');

        if (!isCreate && id) {
          const v = await db.videos.getById(id, safeStoreId);

          if (!mounted) return;

          if (!v) {
            navigate('/gallery');
            return;
          }

          setVideo(v);

          const mappedOrigin = v.source_type === 'upload' ? 'upload' : 'external_url';

          setFormData({
            title: v.title || '',
            video_url: v.video_url || '',
            thumbnail_url: v.thumbnail_url || '',
            product_id: v.product_id || '',
            model_id: v.model_id || '',
            active: v.active ?? true,
            origin: mappedOrigin,
            video_file: null,
            thumbnail_file: null,
          });

          const storyVideos = await db.storyVideos.getAll(safeStoreId);
          const storyIds = storyVideos
            .filter(sv => sv.video_id === id)
            .map(sv => sv.story_id);

          const stories = await db.stories.getAll(safeStoreId);
          const usedStories = stories.filter(s => storyIds.includes(s.id));

          if (mounted) {
            setUsedInStories(usedStories);
          }
        }
      } catch (e) {
        console.error('Load error:', e);
        setProductsError('Não foi possível carregar os produtos.');
      } finally {
        if (mounted) {
          setLoading(false);
          setProductsLoading(false);
        }
      }
    };

    if (!tenantLoading) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [id, navigate, isCreate, tenantStoreId, paramStoreId, tenantLoading]);

  const handleOriginChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      origin: e.target.value as 'external_url' | 'upload',
      video_url: '',
      thumbnail_url: '',
      video_file: null,
      thumbnail_file: null,
    }));
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeVideoUrl = (value: string) => {
    try {
      const url = new URL(value.trim());

      if (url.protocol === 'blob:' || url.protocol === 'data:') {
        return value.trim();
      }

      url.hash = '';
      url.search = '';

      if (url.hostname.startsWith('www.')) {
        url.hostname = url.hostname.replace(/^www\./, '');
      }

      if (url.hostname === 'youtu.be' && !url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
      }

      return url.toString().replace(/\/$/, '');
    } catch {
      return value.trim();
    }
  };

  const validateFile = (file: File): boolean => {
    if (!file) return false;

    if (file.size > 30 * 1024 * 1024) {
      showError('O vídeo deve ter no máximo 30MB.');
      return false;
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/mov',
    ];

    if (!allowedTypes.includes(file.type)) {
      showError('Formato de vídeo inválido. Envie um arquivo MP4, MOV ou WEBM.');
      return false;
    }

    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData(prev => ({
      ...prev,
      video_file: file,
      video_url: previewUrl,
    }));

    try {
      const generatedThumbnail = await generateVideoThumbnail(previewUrl);

      if (generatedThumbnail) {
        setFormData(prev => ({
          ...prev,
          thumbnail_url: generatedThumbnail,
          thumbnail_file: null,
        }));
      }
    } catch (error) {
      console.warn('Não foi possível gerar thumbnail automática:', error);
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showError('Formato de imagem inválido. Use JPG, PNG ou WEBP.');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData(prev => ({
      ...prev,
      thumbnail_file: file,
      thumbnail_url: previewUrl,
    }));
  };

  const getVideoFileHelperText = () => {
    if (!formData.video_file) return 'Selecione um arquivo de vídeo';

    if (formData.video_file.size > 30 * 1024 * 1024) {
      return 'O vídeo deve ter no máximo 30MB.';
    }

    const sizeMB = (formData.video_file.size / (1024 * 1024)).toFixed(1);

    return `Tamanho: ${sizeMB} MB`;
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

    if (formData.origin === 'upload') {
      if (!formData.video_file && !formData.video_url) {
        errors.video_file = 'Envie um arquivo de vídeo.';
        isValid = false;
      }

      if (isCreate && !formData.video_file) {
        errors.video_file = 'Envie um arquivo de vídeo.';
        isValid = false;
      }
    }

    return { isValid, errors };
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    if (isSaving) return;

    const { isValid, errors } = validateForm();

    if (!isValid) {
      Object.entries(errors).forEach(([, message]) => {
        showError(message);
      });
      return;
    }

    const safeStoreId = resolvedStoreId || await getCurrentStoreId();

    if (!safeStoreId) {
      showError('Não foi possível identificar a loja atual.');
      return;
    }

    setResolvedStoreId(safeStoreId);

    try {
      setIsSaving(true);

      let finalVideoUrl = '';
      let finalThumbnailUrl = formData.thumbnail_url || '';

      if (formData.origin === 'upload') {
        if (formData.video_file) {
          finalVideoUrl = await uploadFileToSupabase(
            formData.video_file,
            safeStoreId,
            'videos',
          );
        } else if (!isCreate && video?.video_url) {
          finalVideoUrl = video.video_url;
        }

        if (formData.thumbnail_file) {
          finalThumbnailUrl = await uploadFileToSupabase(
            formData.thumbnail_file,
            safeStoreId,
            'thumbnails',
          );
        } else if (finalThumbnailUrl.startsWith('data:image/')) {
          finalThumbnailUrl = await uploadDataUrlToSupabase(
            finalThumbnailUrl,
            safeStoreId,
            'thumbnails',
          );
        } else if (finalThumbnailUrl.startsWith('blob:')) {
          finalThumbnailUrl = '';
        }
      } else if (formData.origin === 'external_url') {
        finalVideoUrl = normalizeVideoUrl(formData.video_url);

        if (formData.thumbnail_file) {
          finalThumbnailUrl = await uploadFileToSupabase(
            formData.thumbnail_file,
            safeStoreId,
            'thumbnails',
          );
        } else if (finalThumbnailUrl.startsWith('data:image/')) {
          finalThumbnailUrl = await uploadDataUrlToSupabase(
            finalThumbnailUrl,
            safeStoreId,
            'thumbnails',
          );
        } else if (finalThumbnailUrl.startsWith('blob:')) {
          finalThumbnailUrl = '';
        }
      }

      const sourceType: Video['source_type'] =
        formData.origin === 'upload' ? 'upload' : 'external_url';

      const now = new Date().toISOString();

      const videoData: Partial<Video> = {
        title: formData.title.trim(),
        source_type: sourceType,
        video_url: finalVideoUrl,
        instagram_link: '',
        tiktok_link: '',
        thumbnail_url: finalThumbnailUrl,
        active: formData.active,
        status: formData.active ? 'active' : 'inactive',
        model_id: formData.model_id || null,
        product_id: formData.product_id || null,
        store_id: safeStoreId,
        updated_at: now,
      };

      if (isCreate) {
        const newVideo: Video = {
          ...videoData,
          id: createSafeId(),
          store_id: safeStoreId,
          created_at: now,
        } as Video;

        await db.videos.save(newVideo);
      } else {
        if (!video) return;

        const updatedVideo: Video = {
          ...video,
          ...videoData,
          store_id: video.store_id || safeStoreId,
          updated_at: now,
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

  if (loading || tenantLoading) return null;

  const thumbnailInputValue = formData.thumbnail_url && !isTemporaryUrl(formData.thumbnail_url)
    ? formData.thumbnail_url
    : '';

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/gallery')}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isCreate ? 'Novo Vídeo' : 'Editar Vídeo'}
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || tenantLoading}
          className="bg-[#0094EB] hover:bg-[#0E4787] disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Título do Vídeo
            </label>

            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Origem do Vídeo
            </label>

            <select
              value={formData.origin}
              onChange={handleOriginChange}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="external_url">URL do vídeo</option>
              <option value="upload">Upload de vídeo</option>
            </select>
          </div>

          {formData.origin === 'external_url' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                URL do vídeo
              </label>

              <input
                type="url"
                value={formData.video_url}
                onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="Cole o link do YouTube, Vimeo ou arquivo .mp4"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              />
            </div>
          )}

          {formData.origin === 'upload' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Arquivo de vídeo
              </label>

              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
              />

              {formData.video_url && (
                <video
                  src={formData.video_url}
                  className="w-32 rounded-xl border border-slate-200"
                  muted
                  controls
                />
              )}

              {formData.video_file && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="font-medium text-gray-700">
                    Arquivo selecionado:
                  </div>

                  <div className="text-gray-600">
                    {formData.video_file.name}
                  </div>

                  <div className={getVideoFileHelperClass()}>
                    {getVideoFileHelperText()}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Capa do Vídeo (Thumbnail)
            </label>

            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {formData.thumbnail_url ? (
                  <img
                    src={formData.thumbnail_url}
                    className="w-full h-full object-cover"
                    alt="Capa"
                  />
                ) : formData.video_url ? (
                  <video
                    src={formData.video_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    Sem capa
                  </span>
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
                  value={thumbnailInputValue}
                  onChange={e => setFormData({
                    ...formData,
                    thumbnail_url: e.target.value,
                    thumbnail_file: null,
                  })}
                  placeholder="Ou cole a URL da capa"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Se deixado em branco, um frame do vídeo será usado automaticamente.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Produto Vinculado (opcional)
            </label>

            <select
              value={formData.product_id}
              onChange={e => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="">Nenhum produto vinculado</option>

              {productsLoading ? (
                <option value="" disabled>
                  Carregando produtos...
                </option>
              ) : productsError ? (
                <option value="" disabled>
                  {productsError}
                </option>
              ) : products.length === 0 ? (
                <option value="" disabled>
                  Nenhum produto cadastrado
                </option>
              ) : (
                products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {typeof p.price === 'number'
                      ? ` - ${p.price.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}`
                      : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Modelo/Medida Vinculado (opcional)
            </label>

            <select
              value={formData.model_id}
              onChange={e => setFormData({ ...formData, model_id: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="">Nenhum</option>

              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Status
            </label>

            <select
              value={formData.active ? 'true' : 'false'}
              onChange={e => setFormData({
                ...formData,
                active: e.target.value === 'true',
              })}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          {usedInStories.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Usado em Stories
              </label>

              <span className="font-bold text-slate-800">Sim</span>

              <p className="text-sm font-bold text-slate-600">
                Stories vinculados:
              </p>

              <ul className="list-disc list-inside text-slate-500">
                {usedInStories.map(story => (
                  <li key={story.id}>
                    {story.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isCreate && usedInStories.length === 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Usado em Stories
              </label>

              <p className="text-sm font-bold text-slate-600">
                Não
              </p>
            </div>
          )}
        </form>
      </div>

      <SuccessDialog
        isOpen={showSuccessModal}
        description="Vídeo salvo com sucesso."
        onClose={() => navigate('/gallery')}
      />
    </div>
  );
};

export default VideoEditPage;
