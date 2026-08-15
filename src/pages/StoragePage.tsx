import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import {
  connectInstagramAccount,
  connectTikTokAccount,
  connectYouTubeAccount,
  connectPinterestAccount,
  getConnectedIntegrations,
} from '@/services/integrations';
import { fetchTikTokMedia } from '@/services/tiktok';
import { fetchInstagramMedia, InstagramMedia } from '@/services/instagram';
import {
  HardDrive,
  Search,
  Trash2,
  Eye,
  Download,
  Pencil,
  FileVideo,
  FileImage,
  UploadCloud,
  Link,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Instagram,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

// Utilitário robusto para extrair e gerar a capa de links externos (YouTube Shorts, Vídeos e Instagram Reels)
const getExternalVideoThumbnail = (url: string): string => {
  if (!url) return '';
  const cleanUrl = url.trim();

  // 1. YouTube Shorts e Vídeos Tradicionais (youtube.com/shorts/, watch?v=, youtu.be/)
  const youtubeMatch = cleanUrl.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (youtubeMatch && youtubeMatch[1]) {
    const videoId = youtubeMatch[1];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // 2. Instagram Reels (instagram.com/reel/ ou instagram.com/p/)
  const instaMatch = cleanUrl.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  if (instaMatch) {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f09433"/>
          <stop offset="25%" stop-color="#e6683c"/>
          <stop offset="50%" stop-color="#dc2743"/>
          <stop offset="75%" stop-color="#cc2366"/>
          <stop offset="100%" stop-color="#bc1888"/>
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#igGrad)"/>
      <rect x="80" y="80" width="160" height="160" rx="40" fill="none" stroke="#ffffff" stroke-width="12"/>
      <circle cx="160" cy="160" r="40" fill="none" stroke="#ffffff" stroke-width="12"/>
      <circle cx="205" cy="115" r="10" fill="#ffffff"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }

  // 3. Imagens ou Mídias diretas com extensões válidas
  if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) {
    return cleanUrl;
  }

  return cleanUrl;
};

// Utilitário global para converter Blob para Base64 Data URL
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Utilitário global para extrair o primeiro frame de um vídeo via Canvas
const generateVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(video.src);
              if (blob) resolve(blob);
              else reject(new Error('Falha ao gerar blob do canvas'));
            },
            'image/jpeg',
            0.85
          );
        } else {
          URL.revokeObjectURL(video.src);
          reject(new Error('Não foi possível obter contexto do canvas'));
        }
      } catch (err) {
        URL.revokeObjectURL(video.src);
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(video.src);
      reject(err);
    };
  });
};

interface StorageItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  sizeInBytes: number;
  createdAt: string;
  thumbnailUrl: string;
  fileUrl: string;
  productName?: string;
  storyTitle?: string;
  canDelete: boolean;
}

const PLAN_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB em bytes (Padrão Plano Iniciante)

// Componentes de Ícones Vetorizados Oficiais das Plataformas
const SocialIcons = {
  Instagram: () => (
    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  TikTok: () => (
    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.31 2.56.02.83.42 1.63 1.05 2.15.82.68 1.97.87 2.97.58.98-.28 1.83-1.07 2.13-2.05.17-.63.19-1.29.18-1.94V.02z" />
    </svg>
  ),
  YouTube: () => (
    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  Pinterest: () => (
    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.02 0 1.513.769 1.513 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" />
    </svg>
  ),
};

export default function StoragePage() {
  const [files, setFiles] = useState<StorageItem[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [instagramVideos, setInstagramVideos] = useState<InstagramMedia[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [tiktokVideos, setTikTokVideos] = useState<any[]>([]); // Estado para vídeos do TikTok
  const [loadingTikTok, setLoadingTikTok] = useState(false); // Carregamento do TikTok
  const [storeId, setStoreId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('Plano Iniciante');
  const [serverStorageUsedBytes, setServerStorageUsedBytes] = useState<number | null>(null);
  const [serverStorageLimitBytes, setServerStorageLimitBytes] = useState<number>(PLAN_LIMIT_BYTES);
  const [activePlatformTab, setActivePlatformTab] = useState<'none' | 'instagram' | 'tiktok' | 'youtube' | 'pinterest'>('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'image'>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [sizingModelsList, setSizingModelsList] = useState<any[]>([]);
  const [savingUrl, setSavingUrl] = useState(false);

  // Carrega as plataformas sociais conectadas à loja no Supabase e trata o retorno do OAuth
  useEffect(() => {
    const checkIntegrations = async () => {
      try {
        // Verifica se a URL retornou com sucesso do OAuth (ex: TikTok ou Instagram)
        const params = new URLSearchParams(window.location.search);
        if (params.get('tiktok') === 'connected' || params.get('success') === 'true') {
          showSuccess('Conta conectada com sucesso!');
          // Limpa os parâmetros da URL mantendo a limpa
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const settings = await db.getSettings();
        if (settings?.store_id) {
          setStoreId(settings.store_id);
          const data = await getConnectedIntegrations(settings.store_id);
          setConnectedPlatforms(data.map((item: any) => item.platform));
        }
      } catch (err) {
        console.warn('Erro ao carregar integrações sociais:', err);
      }
    };
    checkIntegrations();
  }, []);

  // Busca os vídeos do Instagram assim que a loja for identificada e o Instagram estiver conectado
  useEffect(() => {
    const loadInstagramContent = async () => {
      if (!storeId || !connectedPlatforms.includes('instagram')) return;

      try {
        setLoadingVideos(true);
        const videos = await fetchInstagramMedia(storeId);
        setInstagramVideos(videos);
      } catch (err) {
        console.error('Erro ao carregar vídeos do Instagram:', err);
      } finally {
        setLoadingVideos(false);
      }
    };

    loadInstagramContent();
  }, [storeId, connectedPlatforms]);

  // Busca os vídeos do TikTok assim que a loja for identificada e a plataforma conectada
  useEffect(() => {
    const loadTikTokContent = async () => {
      if (!storeId || !connectedPlatforms.includes('tiktok')) return;

      try {
        setLoadingTikTok(true);
        const videos = await fetchTikTokMedia(storeId);
        setTikTokVideos(Array.isArray(videos) ? videos : []);
      } catch (err) {
        console.error('Erro ao carregar vídeos do TikTok:', err);
      } finally {
        setLoadingTikTok(false);
      }
    };

    loadTikTokContent();
  }, [storeId, connectedPlatforms]);

  // Função para salvar o Vídeo do TikTok no banco de dados
  const handleImportAndEditTikTokVideo = async (video: any) => {
    try {
      if (!storeId) {
        showError('ID da loja não identificado.');
        return;
      }
      if (!supabase) {
        showError('Conexão com o banco de dados indisponível.');
        return;
      }

      showSuccess('Importando vídeo do TikTok para a sua biblioteca... Isso pode levar alguns segundos.');

      const { data, error } = await supabase.functions.invoke('import-tiktok-video', {
        body: { storeId, videoData: video },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Erro na importação.');
      }

      showSuccess('Mídia do TikTok importada com sucesso!');
      await loadAccountStorageData();

      if (data.videoId) {
        window.location.href = `/videos/${data.videoId}/edit`;
      }
    } catch (err) {
      console.error('Erro ao importar vídeo do TikTok:', err);
      showError('Falha ao processar a importação do vídeo do TikTok.');
    }
  };

  // Função para salvar o Reels do Instagram no banco de dados e abrir a edição para vincular produtos/stories

  const handleImportAndEditInstagramVideo = async (video: InstagramMedia) => {
    try {
      if (!storeId) {
        showError('ID da loja não identificado.');
        return;
      }

      if (!supabase) {
        showError('Conexão com o banco de dados indisponível.');
        return;
      }

      showSuccess('Importando vídeo para a sua biblioteca... Isso pode levar alguns segundos.');

      // Chama a Edge Function para lidar com o download, bypass de CORS e upload para o Storage
      const { data, error } = await supabase.functions.invoke('import-instagram-video', {
        body: { storeId, videoData: video },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Erro na importação.');
      }

      showSuccess('Mídia importada e hospedada com sucesso!');
      await loadAccountStorageData();

      if (data.videoId) {
        window.location.href = `/videos/${data.videoId}/edit`;
      }
    } catch (err) {
      console.error('Erro ao importar vídeo do Instagram via Edge Function:', err);
      showError('Falha ao processar a importação do vídeo do Instagram.');
    }
  };

  // Carrega produtos e modelos de medidas da loja para os seletores do modal
  useEffect(() => {
    const fetchSelectData = async () => {
      try {
        if (typeof db.products?.getAll === 'function') {
          const prods = await db.products.getAll();
          setProductsList(Array.isArray(prods) ? prods : []);
        }
      } catch (err) {
        console.warn('Não foi possível carregar produtos:', err);
      }

      try {
        if (supabase) {
          const settings = await db.getSettings();
          if (settings?.store_id) {
            const { data: modelsData } = await supabase
              .from('sizing_models')
              .select('*')
              .eq('store_id', settings.store_id);
            setSizingModelsList(Array.isArray(modelsData) ? modelsData : []);
          }
        } else if (typeof (db as any).sizingModels?.getAll === 'function') {
          const modelsData = await (db as any).sizingModels.getAll();
          setSizingModelsList(Array.isArray(modelsData) ? modelsData : []);
        }
      } catch (err) {
        console.warn('Não foi possível carregar modelos de medidas:', err);
      }
    };
    fetchSelectData();
  }, []);

// Processa a gravação da Mídia por URL Externa com suporte a Produto e Modelo de Medidas
  const handleSaveExternalUrl = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!externalUrl.trim()) {
      showError('Por favor, informe a URL do vídeo.');
      return;
    }

    const formattedUrl = externalUrl.trim();
    const isPinterestUrl = formattedUrl.includes('pinterest.') || formattedUrl.includes('pin.it');

    try {
      setSavingUrl(true);
      const settings = await db.getSettings();
      if (!settings?.store_id) {
        throw new Error('ID da loja não encontrado.');
      }

      // 🔴 Fluxo Pinterest: Baixa e hospeda o arquivo via Edge Function
      if (isPinterestUrl) {
        if (!supabase) {
          throw new Error('Conexão com o banco de dados indisponível.');
        }

        showSuccess('Importando vídeo do Pinterest... Isso pode levar alguns segundos.');

        const { data, error } = await supabase.functions.invoke('import-pinterest-video', {
          body: {
            storeId: settings.store_id,
            videoData: {
              video_url: formattedUrl,
              title: externalTitle.trim() || undefined,
            },
          },
        });

        if (error || !data?.success) {
          throw new Error(error?.message || data?.error || 'Erro ao importar o Pin.');
        }

        // Atualiza os vínculos opcionais caso tenham sido selecionados no modal
        if (data.videoId && (selectedProductId || selectedModelId)) {
          const updatePayload: Record<string, any> = {};
          if (selectedProductId) updatePayload.product_id = selectedProductId;
          if (selectedModelId) updatePayload.model_id = selectedModelId;

          await supabase.from('videos').update(updatePayload).eq('id', data.videoId);
        }

        showSuccess('Vídeo do Pinterest importado e hospedado com sucesso!');
        setShowUrlModal(false);
        setExternalUrl('');
        setExternalTitle('');
        setSelectedProductId('');
        setSelectedModelId('');
        await loadAccountStorageData();
        return;
      }

      // Fluxo padrão para outras URLs externas (YouTube, links diretos, etc.)
      const extractedThumb = getExternalVideoThumbnail(formattedUrl);
      const title = externalTitle.trim() || `VÍDEO_EXTERNO_${Date.now().toString().slice(-4)}`;

      const payload = {
        store_id: settings.store_id,
        title: title,
        video_source_type: 'url',
        source_type: 'url',
        video_url: formattedUrl,
        thumbnail_url: extractedThumb,
        thumbnail_source_type: 'auto',
        product_id: selectedProductId || null,
        model_id: selectedModelId || null,
        file_size: 0,
        thumbnail_file_size: 0,
        status: 'active',
        active: true,
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        const { error } = await supabase.from('videos').insert([payload]);
        if (error) throw error;
      } else if (typeof db.videos?.create === 'function') {
        await db.videos.create(payload);
      }

      showSuccess('Mídia externa cadastrada com sucesso!');
      setShowUrlModal(false);
      setExternalUrl('');
      setExternalTitle('');
      setSelectedProductId('');
      setSelectedModelId('');
      await loadAccountStorageData();
    } catch (err: any) {
      console.error('Erro ao salvar URL externa:', err);
      showError(err.message || 'Falha ao cadastrar vídeo por URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  // Gatilho para abrir a janela do sistema operacional ao clicar em "Fazer Upload"
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Processa o arquivo selecionado na janela
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      showSuccess(`Enviando "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

      const settings = await db.getSettings();
      if (!settings?.store_id) {
        throw new Error('ID da loja não encontrado nas configurações.');
      }

      const isVideo = file.type.startsWith('video');
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const safeStoragePath = `${settings.store_id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}`;

      let finalVideoUrl = '';
      let finalThumbUrl = '';
      let thumbnailSize = 0;

      if (supabase) {
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('videos')
            .upload(safeStoragePath, file, { cacheControl: '3600', upsert: true });

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('videos')
              .getPublicUrl(uploadData.path);

            finalVideoUrl = publicUrlData.publicUrl;
          } else if (uploadErr) {
            console.warn('Erro de upload no Storage principal:', uploadErr);
          }
        } catch (storageErr) {
          console.warn('Supabase Storage indisponível, aplicando fallback:', storageErr);
        }
      }

      if (!finalVideoUrl) {
        finalVideoUrl = URL.createObjectURL(file);
      }

      if (isVideo) {
        try {
          const thumbBlob = await generateVideoThumbnail(file);
          thumbnailSize = thumbBlob.size;

          if (supabase) {
            const thumbStoragePath = `${settings.store_id}/thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
            const { data: thumbUploadData, error: thumbErr } = await supabase.storage
              .from('videos')
              .upload(thumbStoragePath, thumbBlob, { contentType: 'image/jpeg', upsert: true });

            if (!thumbErr && thumbUploadData?.path) {
              const { data: thumbPublicUrl } = supabase.storage
                .from('videos')
                .getPublicUrl(thumbUploadData.path);

              finalThumbUrl = thumbPublicUrl.publicUrl;
            }
          }

          if (!finalThumbUrl) {
            finalThumbUrl = await blobToBase64(thumbBlob);
          }
        } catch (thumbErr) {
          console.warn('Falha ao gerar frame do vídeo, usando fallback Base64 do arquivo:', thumbErr);
        }
      }

      if (!finalThumbUrl) {
        finalThumbUrl = finalVideoUrl;
      }

      const payload = {
        store_id: settings.store_id,
        title: file.name,
        video_source_type: isVideo ? 'upload' : 'url',
        source_type: isVideo ? 'upload' : 'url',
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbUrl,
        thumbnail_source_type: 'auto',
        file_size: file.size,
        thumbnail_file_size: thumbnailSize,
        status: 'active',
        active: true,
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        const { error } = await supabase.from('videos').insert([payload]);
        if (error) throw error;
      } else if (typeof db.videos?.create === 'function') {
        await db.videos.create(payload);
      } else if (typeof db.videos?.insert === 'function') {
        await db.videos.insert(payload);
      } else {
        throw new Error('Nenhum método de gravação válido encontrado em db.videos');
      }

      showSuccess('Mídia adicionada com sucesso!');
      await loadAccountStorageData();
    } catch (err) {
      console.error('Erro ao realizar upload:', err);
      showError('Falha ao salvar o arquivo enviado.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Função de Download Forçado via Blob
  const handleDownloadFile = async (url: string, fileName: string) => {
    if (!url) {
      showError('URL do arquivo indisponível para download.');
      return;
    }

    try {
      showSuccess(`Preparando download de "${fileName}"...`);

      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Erro ao baixar arquivo por Blob, executando fallback:', err);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Carrega vídeos e imagens cadastrados na conta real do usuário
  const loadAccountStorageData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedItems: StorageItem[] = [];

      let activeStoreId =
        localStorage.getItem('vidlytics_current_store_id') ||
        localStorage.getItem('current_store_id') ||
        localStorage.getItem('store_id');

      if (!activeStoreId && supabase) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data: storeRow } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (storeRow) {
            activeStoreId = storeRow.id;
            localStorage.setItem('vidlytics_current_store_id', storeRow.id);
          }
        }
      }

      if (activeStoreId) {
        setStoreId(activeStoreId);
      }

      // Busca vídeos reais da loja ativa
      const realVideos = activeStoreId ? await db.videos.getAll(activeStoreId) : [];
      if (Array.isArray(realVideos)) {
        const sanitizeUrl = (rawUrl?: string) => {
          if (!rawUrl) return '';
          if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
            return rawUrl;
          }
          if (rawUrl.startsWith('blob:')) {
            return '';
          }
          return `https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/${rawUrl}`;
        };

        realVideos.forEach((vid: any) => {
          const validVideoUrl = sanitizeUrl(vid.video_url);
          const validThumbUrl = sanitizeUrl(vid.thumbnail_url);
          const finalMediaUrl = validVideoUrl || validThumbUrl;

          const videoUrlStr = String(finalMediaUrl || '').toLowerCase();
          const isExplicitUrlType = vid.video_source_type === 'url' || vid.source_type === 'url';
          const isHostedOnPlatform = videoUrlStr.includes('supabase');
          const isExternalUrl = isExplicitUrlType || (!isHostedOnPlatform && videoUrlStr.startsWith('http'));

          const videoBytes = isExternalUrl 
            ? 0 
            : (vid.file_size && Number(vid.file_size) > 0 
                ? Number(vid.file_size) 
                : 20971520);

          const thumbnailBytes = vid.thumbnail_source_type === 'upload' && vid.thumbnail_file_size
            ? Number(vid.thumbnail_file_size)
            : 0;

          const totalMediaBytes = videoBytes + thumbnailBytes;

          const formattedDate = vid.created_at 
            ? new Date(vid.created_at).toLocaleDateString('pt-BR') 
            : 'Hoje';

          loadedItems.push({
            id: vid.id || String(Math.random()),
            name: vid.title || `VIDEO_${vid.id?.slice(0, 6) || 'UPLOAD'}.mp4`,
            type: 'video',
            sizeInBytes: totalMediaBytes,
            createdAt: formattedDate,
            thumbnailUrl: validThumbUrl || finalMediaUrl,
            fileUrl: finalMediaUrl,
            productName: vid.product_name || vid.product?.title || undefined,
            storyTitle: vid.story_title || vid.story?.title || undefined,
            canDelete: true,
          });
        });
      }

      // Busca cota oficial e plano da loja ativa no Supabase
      if (activeStoreId && supabase) {
        const { data: storeRow } = await supabase
          .from('stores')
          .select('storage_used_bytes, storage_limit_bytes, plan_id, plans(name, storage_limit_bytes)')
          .eq('id', activeStoreId)
          .maybeSingle();

        if (storeRow) {
          if (storeRow.storage_used_bytes !== null && storeRow.storage_used_bytes !== undefined) {
            setServerStorageUsedBytes(Number(storeRow.storage_used_bytes));
          }
          if (storeRow.storage_limit_bytes) {
            setServerStorageLimitBytes(Number(storeRow.storage_limit_bytes));
          } else if ((storeRow as any).plans?.storage_limit_bytes) {
            setServerStorageLimitBytes(Number((storeRow as any).plans.storage_limit_bytes));
          }
          if ((storeRow as any).plans?.name) {
            setPlanName((storeRow as any).plans.name);
          }
        }

        const { data: settingsData } = await supabase
          .from('store_settings')
          .select('logo_url')
          .eq('store_id', activeStoreId)
          .maybeSingle();

        if (settingsData?.logo_url) {
          loadedItems.push({
            id: 'logo-setting-file',
            name: 'LOGOTIPO_OFICIAL_LOJA.png',
            type: 'image',
            sizeInBytes: 0,
            createdAt: 'Ativo',
            thumbnailUrl: settingsData.logo_url,
            fileUrl: settingsData.logo_url,
            canDelete: false,
          });
        }
      }

      setFiles(loadedItems);
    } catch (err) {
      console.error('Erro ao carregar arquivos da conta:', err);
      showError('Erro ao carregar dados de armazenamento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccountStorageData();
  }, [loadAccountStorageData]);

  // Cálculo oficial do consumo de armazenamento (prioriza a autoridade do banco de dados)
  const totalUsedBytes = useMemo(() => {
    if (serverStorageUsedBytes !== null) {
      return serverStorageUsedBytes;
    }
    return files.reduce((acc, file) => acc + file.sizeInBytes, 0);
  }, [serverStorageUsedBytes, files]);

  const maxLimitBytes = useMemo(() => {
    return serverStorageLimitBytes || PLAN_LIMIT_BYTES;
  }, [serverStorageLimitBytes]);

  const usedPercentage = useMemo(() => {
    const pct = (totalUsedBytes / maxLimitBytes) * 100;
    if (totalUsedBytes === 0) return 0;
    return Math.max(0.1, Math.min(100, Number(pct.toFixed(2))));
  }, [totalUsedBytes, maxLimitBytes]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || file.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [files, searchTerm, selectedType]);

  const handleDeleteFile = async (id: string, name: string) => {
    if (id === 'logo-setting-file') {
      showError('O logotipo da loja não pode ser excluído por este painel.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o arquivo "${name}"?`)) {
      try {
        if (supabase) {
          const { error } = await supabase.from('videos').delete().eq('id', id);
          if (error) throw error;
        } else if (typeof db.videos?.delete === 'function') {
          await db.videos.delete(id);
        }

        showSuccess('Arquivo removido com sucesso!');
        await loadAccountStorageData();
      } catch (err) {
        console.error('Erro ao excluir arquivo:', err);
        showError('Não foi possível excluir o arquivo no banco de dados.');
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-16">
      {/* Header da Página */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Meu Armazenamento
          </h1>
          <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
            Gerencie os vídeos e imagens hospedados no seu plano.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Instagram */}
          <button
            type="button"
            onClick={() => {
              if (connectedPlatforms.includes('instagram')) {
                setActivePlatformTab(activePlatformTab === 'instagram' ? 'none' : 'instagram');
              } else {
                connectInstagramAccount();
              }
            }}
            title={connectedPlatforms.includes('instagram') ? "Ver Mídias do Instagram" : "Conectar Conta do Instagram"}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border shadow-sm",
              connectedPlatforms.includes('instagram')
                ? "border-pink-500/40 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-pink-500/20 hover:opacity-95"
                : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
            )}
          >
            <SocialIcons.Instagram />
            Instagram
          </button>

          {/* Botão TikTok */}
          <button
            type="button"
            onClick={() => {
              if (connectedPlatforms.includes('tiktok')) {
                setActivePlatformTab(activePlatformTab === 'tiktok' ? 'none' : 'tiktok');
              } else {
                connectTikTokAccount();
              }
            }}
            title={connectedPlatforms.includes('tiktok') ? "Ver Vídeos do TikTok" : "Conectar Conta do TikTok"}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border shadow-sm",
              connectedPlatforms.includes('tiktok')
                ? activePlatformTab === 'tiktok'
                  ? "border-slate-800 bg-slate-800 text-white shadow-slate-900/40"
                  : "border-slate-700 bg-black text-white shadow-slate-900/40 hover:bg-slate-950"
                : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
            )}
          >
            <SocialIcons.TikTok />
            TikTok
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*,image/*"
            className="hidden"
          />

          {/* Botão URL Externa */}
          <button
            type="button"
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-purple-800 dark:hover:bg-purple-950/40 dark:hover:text-purple-400 transition-all"
          >
            <Link size={16} className="text-purple-500" />
            URL Externa
          </button>

          {/* Botão Fazer Upload */}
          <button
            type="button"
            disabled={uploading}
            onClick={handleTriggerUpload}
            className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#0E4787] transition-all disabled:opacity-50"
          >
            <UploadCloud size={16} className={uploading ? 'animate-bounce' : ''} />
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </div>
      </div>

      {/* Card da Régua de Porcentagem de Armazenamento Dinâmica */}
      {(() => {
        const isCritical = usedPercentage >= 95;
        const isWarning = usedPercentage >= 70 && usedPercentage < 95;

        const progressColorClass = isCritical
          ? 'bg-[#E11D48]'
          : isWarning
            ? 'bg-amber-500'
            : 'bg-emerald-500';

        const textColorClass = isCritical
          ? 'text-[#E11D48]'
          : isWarning
            ? 'text-amber-500'
            : 'text-emerald-500';

        return (
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                    isCritical
                      ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/40'
                      : isWarning
                        ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40'
                        : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40'
                  )}
                >
                  <HardDrive size={24} />
                </div>
                <div>
<div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {planName}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {formatSize(maxLimitBytes)} Limite
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Uso atual: <strong className="text-slate-800 dark:text-slate-200">{formatSize(totalUsedBytes)}</strong> de {formatSize(maxLimitBytes)}
                  </p>
                                  </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                {(isWarning || isCritical) && (
                  <button
                    type="button"
                    onClick={() => showSuccess('Redirecionando para a página de planos...')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-md transition-all',
                      isCritical
                        ? 'bg-[#E11D48] hover:bg-rose-700 shadow-rose-500/20'
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    )}
                  >
                    <Sparkles size={14} />
                    Faça Upgrade
                  </button>
                )}

                <div>
                  <span className={cn('text-2xl font-black', textColorClass)}>
                    {usedPercentage}%
                  </span>
                  <span className="block text-[11px] font-bold text-slate-400">Espaço Consumido</span>
                </div>
              </div>
            </div>

            {(isWarning || isCritical) && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl p-3 text-xs font-bold',
                  isCritical
                    ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/30'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                )}
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  {isCritical
                    ? 'Atenção: Seu armazenamento está quase cheio! Faça upgrade agora para não interromper a exibição das mídias.'
                    : 'Seu limite de armazenamento está se aproximando do fim. Considere fazer upgrade do seu plano.'}
                </span>
              </div>
            )}

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full transition-all duration-500', progressColorClass)}
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>
        );
      })()}

// trecho novo
      {/* Seção de Vídeos Importados do Instagram (Exibido somente ao clicar na aba do Instagram) */}
      {connectedPlatforms.includes('instagram') && activePlatformTab === 'instagram' && (
        <div className="rounded-[1.5rem] border border-pink-500/20 bg-white p-6 shadow-sm dark:border-pink-900/30 dark:bg-slate-950 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Reels da sua Conta do Instagram
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {instagramVideos.length} mídias encontradas
              </span>
              <button
                type="button"
                onClick={() => setActivePlatformTab('none')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                title="Fechar gaveta"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {loadingVideos ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400">Carregando mídias do Instagram...</span>
            </div>
          ) : instagramVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {instagramVideos.map((video) => (
                <div
                  key={video.id}
                  className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pink-500 transition-all duration-300 shadow-sm"
                >
                  <img
                    src={video.thumbnail_url || video.media_url}
                    alt={video.caption || 'Reels do Instagram'}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                  
                  {/* Botão de Ação Rápida no Hover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => handleImportAndEditInstagramVideo(video)}
                      className="flex items-center gap-1.5 rounded-xl bg-pink-600 px-3 py-2 text-[10px] font-black text-white shadow-lg hover:bg-pink-700 transition-all transform hover:scale-105"
                    >
                      <Sparkles size={12} />
                      Usar & Editar
                    </button>
                  </div>

                  {video.caption && (
                    <p className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] font-bold text-white line-clamp-2 leading-tight pointer-events-none">
                      {video.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-slate-400">Nenhum Reels ou vídeo encontrado nesta conta do Instagram.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Seção de Vídeos Importados do TikTok */}
      {connectedPlatforms.includes('tiktok') && activePlatformTab === 'tiktok' && (
        <div className="rounded-[1.5rem] border border-slate-700/20 bg-white p-6 shadow-sm dark:border-slate-700/30 dark:bg-slate-950 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <div className="text-black dark:text-white"><SocialIcons.TikTok /></div>
              Vídeos da sua Conta do TikTok
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {tiktokVideos.length} mídias encontradas
              </span>
              <button
                type="button"
                onClick={() => setActivePlatformTab('none')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                title="Fechar gaveta"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {loadingTikTok ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400">Carregando mídias do TikTok...</span>
            </div>
          ) : tiktokVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tiktokVideos.map((video) => (
                <div
                  key={video.id}
                  className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 transition-all duration-300 shadow-sm"
                >
                  <img
                    src={video.cover_image_url || video.thumbnail_url || video.video_url}
                    alt={video.title || video.description || 'Vídeo do TikTok'}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => handleImportAndEditTikTokVideo(video)}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[10px] font-black text-black shadow-lg hover:bg-slate-200 transition-all transform hover:scale-105"
                    >
                      <Sparkles size={12} />
                      Usar & Editar
                    </button>
                  </div>

                  {(video.title || video.description) && (
                    <p className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] font-bold text-white line-clamp-2 leading-tight pointer-events-none">
                      {video.title || video.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-slate-400">Nenhum vídeo encontrado nesta conta do TikTok.</p>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Arquivos */}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar pelo nome do arquivo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={cn(
                "rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'all'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('video')}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'video'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              <FileVideo size={14} />
              Vídeos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('image')}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'image'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              <FileImage size={14} />
              Imagens
            </button>
          </div>
        </div>

        {/* Tabela de Mídias */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Mídia</th>
                <th className="px-6 py-4">Nome do Arquivo</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Story Vinculado</th>
                <th className="px-6 py-4 text-center">Tamanho</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    Carregando mídias da sua conta...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    Nenhum arquivo encontrado no seu armazenamento.
                  </td>
                </tr>
              ) : (
                filteredFiles.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-3.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm dark:border-slate-800 flex items-center justify-center shrink-0">
                        {file.type === 'video' ? (
                          file.thumbnailUrl && !file.thumbnailUrl.includes('unsplash.com') && (file.thumbnailUrl.startsWith('http') || file.thumbnailUrl.startsWith('data:')) ? (
                            <img 
                              src={file.thumbnailUrl} 
                              alt={file.name} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }} 
                            />
                          // trecho novo
                          ) : (
                            <video
                              src={file.fileUrl || undefined}
                              className="h-full w-full object-cover"
                              preload="auto"
                              controls
                              autoPlay
                              muted
                              playsInline
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                console.warn('Falha no streaming do vídeo:', e);
                              }}
                            />
                          )
                        ) : (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
                          {file.type === 'video' ? <FileVideo size={16} /> : <FileImage size={16} />}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 max-w-xs truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#0094EB] uppercase">
                        {file.sizeInBytes === 0 && file.type === 'video' 
                          ? 'Vídeo (URL Externa)' 
                          : file.type === 'video' 
                            ? 'Vídeo MP4 (Hospedado)' 
                            : 'Imagem'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {file.productName || 'Sem produto'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      {file.storyTitle ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                          {file.storyTitle}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatSize(file.sizeInBytes)}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        Disponível
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {file.type === 'video' && (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/videos/${file.id}/edit`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
                            title="Editar vínculos e dados do vídeo"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.open(file.fileUrl || file.thumbnailUrl, '_blank')}
                          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#0094EB] dark:hover:bg-blue-950"
                          title="Visualizar mídia"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file.fileUrl || file.thumbnailUrl, file.name)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950"
                          title="Baixar arquivo"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                          title="Excluir arquivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro por URL Externa */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                  <Link size={20} />
                </div>
<div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Adicionar Vídeo por URL
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Insira links do Pinterest, YouTube, Panda Video, Bunny CDN ou link direto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExternalUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link / URL Externa do Vídeo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://pinterest.com/pin/... ou YouTube / Link direto"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Título ou Identificação da Mídia
                </label>
                <input
                  type="text"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  placeholder="Ex: REEL_PROMO_LANCAMENTO.mp4"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

<div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular a um Produto (Opcional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Sem produto vinculado</option>
                  {productsList.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.title || prod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular a um Modelo de Medidas (Opcional)
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Sem modelo de medidas vinculado</option>
                  {sizingModelsList.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.title || `Modelo ${model.id.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUrl}
                  className="rounded-xl bg-[#0094EB] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0E4787] transition-all disabled:opacity-50"
                >
                  {savingUrl ? 'Salvando...' : 'Cadastrar Mídia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}