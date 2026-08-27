import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import {
  connectInstagramAccount,
  connectTikTokAccount,
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

// Converte links do YouTube para formato de incorporação (Embed) compatível com iframe
const getYoutubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
};

// Converte links do Instagram Reels/Posts para formato de incorporação (Embed) compatível com iframe
const getInstagramEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  return match ? `https://www.instagram.com/p/${match[1]}/embed` : null;
};

// Utilitário global para extrair o primeiro frame de um vídeo via Canvas de forma resiliente
const generateVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let captured = false;
    let timeoutId: any = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}
    };

    const captureFrame = () => {
      if (captured) return;
      captured = true;
      cleanup();

      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');

        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(new Error('Blob gerado está vazio.'));
              }
            },
            'image/jpeg',
            0.85
          );
        } else {
          reject(new Error('Dimensões do vídeo inválidas para captura.'));
        }
      } catch (err) {
        reject(err);
      }
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = 0.001;
      } catch (_) {
        captureFrame();
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = (err) => {
      if (captured) return;
      captured = true;
      cleanup();
      reject(err);
    };

    // Timeout defensivo de 4 segundos com guarda de decodificação
    timeoutId = setTimeout(() => {
      if (!captured) {
        if (video.readyState >= 2) {
          captureFrame();
        } else {
          captured = true;
          cleanup();
          reject(new Error('Timeout ao decodificar frame do vídeo.'));
        }
      }
    }, 4000);
  });
};

// Utilitário para extrair o primeiro frame de um vídeo hospedado via URL pública (com suporte a CORS)
const generateVideoThumbnailFromUrl = (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; // Essencial para evitar bloqueio de Canvas CORS taints
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let captured = false;
    let timeoutId: any = null;

    const captureFrame = () => {
      if (captured) return;
      captured = true;
      if (timeoutId) clearTimeout(timeoutId);

      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');

        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(new Error('Blob gerado pela URL está vazio.'));
              }
            },
            'image/jpeg',
            0.85
          );
        } else {
          reject(new Error('Dimensões do vídeo inválidas para captura via URL.'));
        }
      } catch (err) {
        reject(err);
      }
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = 0.001;
      } catch (_) {
        captureFrame();
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = (err) => {
      if (captured) return;
      captured = true;
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    };

    timeoutId = setTimeout(() => {
      if (!captured) {
        if (video.readyState >= 2) {
          captureFrame();
        } else {
          captured = true;
          reject(new Error('Timeout ao decodificar frame do vídeo por URL.'));
        }
      }
    }, 4000);
  });
};

// Chamada à Edge Function do Supabase para processar o vídeo no servidor se o navegador falhar
const fetchThumbnailFromEdge = async (videoUrl: string, storeId: string): Promise<string | null> => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('fetch-thumbnail', {
      body: { videoUrl, storeId },
    });
    if (!error && data?.thumbnailUrl) {
      return data.thumbnailUrl;
    }
  } catch (e) {
    console.warn('[Vidlytics Storage] Falha ao chamar a Edge Function de thumbnail:', e);
  }
  return null;
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
  productImageUrl?: string;
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

  // Estado para gerenciar a visualização da mídia atual no modal interno
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: 'video' | 'image' | 'youtube' | 'iframe';
    name: string;
  } | null>(null);

  // ── RESOLUÇÃO DE STORE ID ULTRA RESILIENTE (ANTI-FALHAS E MULTI-TENANT) ──
  const resolveActiveStoreId = useCallback(async (): Promise<string | null> => {
    // 1. Prioriza o estado carregado em memória
    if (storeId) return storeId;

    // 2. Tenta recuperar de todas as chaves comuns de armazenamento local
    const keys = [
      'vidlytics_current_store_id',
      'current_store_id',
      'store_id',
      'storeId',
      'tenant_id',
      'tenantId',
      'active_store_id'
    ];

    for (const key of keys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val !== 'undefined' && val !== 'null' && val.trim() !== '') {
        setStoreId(val);
        return val;
      }
    }

    // 3. Tenta recuperar do IndexedDB local de configurações
    try {
      const settings = await db.getSettings();
      if (settings) {
        const resolvedId = settings.store_id || settings.storeId;
        if (resolvedId) {
          localStorage.setItem('vidlytics_current_store_id', resolvedId);
          setStoreId(resolvedId);
          return resolvedId;
        }
      }
    } catch (_) {}

    // 4. Fallback de API do Supabase (autenticação) de forma resiliente a falhas de colunas
    if (supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
          // Tenta query na tabela stores tratando erros (caso mude owner_user_id por user_id)
          const { data: storeRow } = await supabase
            .from('stores')
            .select('id')
            .or(`owner_user_id.eq.${user.id},user_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (storeRow?.id) {
            localStorage.setItem('vidlytics_current_store_id', storeRow.id);
            setStoreId(storeRow.id);
            return storeRow.id;
          }

          // Segunda tentativa na tabela profiles/users comuns
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profileRow?.store_id) {
            localStorage.setItem('vidlytics_current_store_id', profileRow.store_id);
            setStoreId(profileRow.store_id);
            return profileRow.store_id;
          }
        }
      } catch (_) {}
    }

    // 5. Tenta extrair diretamente do caminho de URL ativa ou query params (Fallback definitivo)
    try {
      const pathParts = window.location.pathname.split('/');
      for (const part of pathParts) {
        if (part.length === 36 && part.includes('-')) { // Detecção de formato UUID v4
          localStorage.setItem('vidlytics_current_store_id', part);
          setStoreId(part);
          return part;
        }
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const urlStoreId = urlParams.get('store_id') || urlParams.get('storeId');
      if (urlStoreId) {
        localStorage.setItem('vidlytics_current_store_id', urlStoreId);
        setStoreId(urlStoreId);
        return urlStoreId;
      }
    } catch (_) {}

    return null;
  }, [storeId]);

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

        const resolvedId = await resolveActiveStoreId();
        if (resolvedId) {
          const data = await getConnectedIntegrations(resolvedId);
          setConnectedPlatforms(data.map((item: any) => item.platform));
        }
      } catch (err) {
        console.warn('Erro ao carregar integrações sociais:', err);
      }
    };
    checkIntegrations();
  }, [resolveActiveStoreId]);

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
          const activeId = await resolveActiveStoreId();
          if (activeId) {
            const { data: modelsData } = await supabase
              .from('sizing_models')
              .select('*')
              .eq('store_id', activeId);
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
  }, [resolveActiveStoreId]);

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
      const activeId = await resolveActiveStoreId();
      if (!activeId) {
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
            storeId: activeId,
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
        store_id: activeId,
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

  // Processa o arquivo selecionado na janela e gera a miniatura de forma resiliente em 3 níveis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      showSuccess(`Enviando "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

      const activeId = await resolveActiveStoreId();
      if (!activeId) {
        throw new Error('ID da loja não encontrado. Recarregue a página.');
      }

      // 🛑 Validação cirúrgica contra duplicados (mesmo nome e tamanho)
      if (supabase) {
        const { data: duplicate } = await supabase
          .from('videos')
          .select('id')
          .eq('store_id', activeId)
          .eq('title', file.name)
          .eq('file_size', file.size)
          .maybeSingle();

        if (duplicate) {
          showError(`O arquivo "${file.name}" já existe na sua biblioteca de mídias.`);
          setUploading(false);
          if (e.target) e.target.value = '';
          return;
        }
      }

      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const safeStoragePath = `${activeId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}`;

      let finalVideoUrl = '';
      let finalThumbUrl = '';
      let thumbnailSize = 0;

      if (supabase) {
        const targetBucket = isImage ? 'store-assets' : 'videos';
        const detectedContentType = file.type || (isImage ? 'image/jpeg' : 'video/mp4');

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(targetBucket)
          .upload(safeStoragePath, file, {
            cacheControl: '3600',
            contentType: detectedContentType,
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[Vidlytics Storage] Erro no upload para o bucket ${targetBucket}:`, uploadErr);
          throw new Error(`Falha ao enviar arquivo para o armazenamento (${targetBucket}).`);
        }

        if (uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(targetBucket)
            .getPublicUrl(uploadData.path);

          finalVideoUrl = publicUrlData.publicUrl;
        }
      }

      if (!finalVideoUrl) {
        throw new Error('Não foi possível obter o endereço público do arquivo.');
      }

      if (isImage) {
        finalThumbUrl = finalVideoUrl;
        thumbnailSize = file.size;
      } else if (isVideo) {
        // ── ESTEIRA DE GERAÇÃO ULTRA-RESILIENTE DE THUMBNAIL (3 NÍVEIS) ──
        let thumbBlob: Blob | null = null;

        // Nível 1: Geração Local no Browser usando o arquivo File original (Super rápido)
        try {
          thumbBlob = await generateVideoThumbnail(file);
          console.log('[Vidlytics Storage] Nível 1: Thumbnail obtida localmente do File com sucesso.');
        } catch (localFileErr) {
          console.warn('[Vidlytics Storage] Nível 1 falhou (File local incompatível):', localFileErr);

          // Nível 2: Geração Local no Browser usando a URL pública recém-enviada
          try {
            if (finalVideoUrl) {
              thumbBlob = await generateVideoThumbnailFromUrl(finalVideoUrl);
              console.log('[Vidlytics Storage] Nível 2: Thumbnail obtida da URL do Storage com sucesso.');
            }
          } catch (localUrlErr) {
            console.warn('[Vidlytics Storage] Nível 2 falhou (URL do Storage incompatível):', localUrlErr);
          }
        }

        // Se conseguimos obter o Blob localmente (seja do Nível 1 ou Nível 2), fazemos o upload
        if (thumbBlob && thumbBlob.size > 0) {
          thumbnailSize = thumbBlob.size;
          if (supabase) {
            const thumbStoragePath = `${activeId}/thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

            const { data: thumbUploadData, error: thumbUploadErr } = await supabase.storage
              .from('videos')
              .upload(thumbStoragePath, thumbBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true,
              });

            if (!thumbUploadErr && thumbUploadData?.path) {
              const { data: thumbPublicUrlData } = supabase.storage
                .from('videos')
                .getPublicUrl(thumbUploadData.path);

              finalThumbUrl = thumbPublicUrlData.publicUrl;
            } else if (thumbUploadErr) {
              console.warn('[Vidlytics Storage] Erro ao enviar thumbnail gerada localmente:', thumbUploadErr);
            }
          }
        }

        // Nível 3: Fallback Definitivo via Edge Function se todos os métodos do navegador falharem
        if (!finalThumbUrl) {
          console.log('[Vidlytics Storage] Nível 3: Chamando Edge Function "fetch-thumbnail" para decodificação remota...');
          try {
            const edgeThumbUrl = await fetchThumbnailFromEdge(finalVideoUrl, activeId);
            if (edgeThumbUrl) {
              finalThumbUrl = edgeThumbUrl;
              thumbnailSize = 120 * 1024; // Tamanho estimado de 120KB para estatísticas do plano
              console.log('[Vidlytics Storage] Nível 3: Thumbnail obtida do servidor com sucesso!');
            }
          } catch (edgeErr) {
            console.error('[Vidlytics Storage] Todos os níveis de geração de miniatura falharam:', edgeErr);
          }
        }
      }

      if (!finalThumbUrl) {
        finalThumbUrl = isImage ? finalVideoUrl : '';
      }

      const payload = {
        store_id: activeId,
        title: file.name,
        video_source_type: isImage ? 'image' : 'upload',
        source_type: isImage ? 'image' : 'upload',
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbUrl,
        thumbnail_source_type: isImage ? 'upload' : 'auto',
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
    } catch (err: any) {
      console.error('Erro ao realizar upload:', err);
      showError(err.message || 'Falha ao salvar o arquivo enviado.');
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

  // Redireciona a visualização da mídia para o modal interno
  const handlePreviewMedia = (file: StorageItem) => {
    const url = file.fileUrl || file.thumbnailUrl;
    if (!url || url.trim() === '') {
      showError('Endereço do arquivo indisponível para visualização.');
      return;
    }

    let type: 'video' | 'image' | 'youtube' | 'iframe' = 'image';

    if (file.type === 'image') {
      type = 'image';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      type = 'youtube';
    } else if (url.includes('instagram.com')) {
      type = 'iframe';
    } else {
      type = 'video';
    }

    setPreviewMedia({
      url,
      type,
      name: file.name,
    });
  };

  // Carrega vídeos e imagens cadastrados na conta real do usuário
  const loadAccountStorageData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedItems: StorageItem[] = [];

      const activeStoreId = await resolveActiveStoreId();

      // Busca vídeos reais da loja ativa com joints relacionais e fallback defensivo
      let realVideos: any[] = [];
      if (activeStoreId) {
        if (supabase) {
          try {
            const { data: vidsData, error: vidsError } = await supabase
              .from('videos')
              .select(`
                *,
                products:product_id (id, name, image_url),
                story_videos (
                  story_id,
                  stories:story_id (id, title)
                )
              `)
              .eq('store_id', activeStoreId)
              .order('created_at', { ascending: false });

            if (vidsError || !vidsData) {
              console.warn('[Vidlytics Storage] Query relacional falhou, aplicando fallback local:', vidsError);
              realVideos = await db.videos.getAll(activeStoreId);
            } else {
              realVideos = vidsData;
            }
          } catch (queryErr) {
            console.warn('[Vidlytics Storage] Exceção na query relacional:', queryErr);
            realVideos = await db.videos.getAll(activeStoreId);
          }
        } else {
          realVideos = await db.videos.getAll(activeStoreId);
        }
      }

      if (Array.isArray(realVideos)) {
        const sanitizeUrl = (rawUrl?: string) => {
          if (!rawUrl) return '';
          const str = String(rawUrl).trim();
          if (!str || str === 'null' || str === 'undefined') return '';
          if (str.startsWith('data:')) return str;
          if (str.startsWith('blob:')) return '';

          // Se já for uma URL absoluta completa com scheme (Supabase store-assets, videos ou CDN externo)
          if (/^https?:\/\//i.test(str)) {
            try {
              const [baseUrl, ...queryParts] = str.split('?');
              const queryPart = queryParts.length ? '?' + queryParts.join('?') : '';
              return baseUrl.replace(/ /g, '%20') + queryPart;
            } catch (_) {
              return str;
            }
          }

          // Caminho relativo dentro do bucket videos
          const cleanPath = str
            .replace(/^\/+/, '')
            .replace(/^storage\/v1\/object\/public\/videos\//, '')
            .replace(/^videos\//, '');

          const encodedPath = cleanPath
            .split('/')
            .map(seg => {
              try {
                return encodeURIComponent(decodeURIComponent(seg));
              } catch (_) {
                return encodeURIComponent(seg);
              }
            })
            .join('/');

          return `https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/${encodedPath}`;
        };

        realVideos.forEach((vid: any) => {
          try {
            const validVideoUrl = sanitizeUrl(vid.video_url);
            const rawThumb = sanitizeUrl(vid.thumbnail_url);

            const isFileImage = /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(validVideoUrl) || 
                                /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(vid.title || '') ||
                                vid.source_type === 'image' ||
                                vid.video_source_type === 'image';

            // Para imagens, a própria URL do arquivo serve como thumbnail
            let finalThumbnail = '';
            if (isFileImage) {
              finalThumbnail = rawThumb || validVideoUrl;
            } else if (rawThumb && (
              rawThumb.startsWith('data:image') ||
              /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(rawThumb) ||
              rawThumb.includes('img.youtube.com')
            )) {
              finalThumbnail = rawThumb;
            }

            const videoUrlStr = String(validVideoUrl || '').toLowerCase();
            const isExplicitUrlType = (vid.video_source_type === 'url' || vid.source_type === 'url') && !videoUrlStr.includes('supabase');
            const isHostedOnPlatform = videoUrlStr.includes('supabase');
            const isExternalUrl = isExplicitUrlType || (!isHostedOnPlatform && videoUrlStr.startsWith('http'));

            // Tamanho em bytes do vídeo físico no storage
            const videoBytes = isExternalUrl 
              ? 0 
              : (vid.file_size && Number(vid.file_size) > 0 
                  ? Number(vid.file_size) 
                  : 20971520); // Fallback robusto de 20MB caso não esteja gravado

            // ⚠️ Correção Crucial: Se o Thumbnail está hospedado no Supabase, ele consome storage!
            const isThumbHosted = rawThumb && rawThumb.includes('supabase');
            const thumbnailBytes = isThumbHosted
              ? (vid.thumbnail_file_size && Number(vid.thumbnail_file_size) > 0 
                  ? Number(vid.thumbnail_file_size) 
                  : 150 * 1024) // Fallback inteligente de 150KB para thumbnails hospedados sem metadado de tamanho
              : 0;

            // ⚠️ Correção Crucial: Soma o vídeo e a thumbnail que estão consumindo espaço no Storage (antes usava Math.max)
            const totalMediaBytes = videoBytes + thumbnailBytes;

            const formattedDate = vid.created_at 
              ? new Date(vid.created_at).toLocaleDateString('pt-BR') 
              : 'Hoje';

            // Resolução do Nome e Imagem do Produto
            const resolvedProductName = vid.products?.name || vid.product_name || vid.product?.name || vid.product?.title || undefined;
            const resolvedProductImage = sanitizeUrl(
              vid.products?.image_url || (vid.products as any)?.image ||
              vid.product?.image_url || (vid.product as any)?.image || vid.product_image_url
            );

            // Resolução do Nome do Story Vinculado (cobre array 1:N e objeto 1:1)
            let resolvedStoryTitle: string | undefined = undefined;
            if (Array.isArray(vid.story_videos) && vid.story_videos.length > 0) {
              const firstStory = vid.story_videos[0]?.stories;
              if (firstStory) {
                resolvedStoryTitle = firstStory.title || undefined;
              }
            } else if (vid.story_videos && typeof vid.story_videos === 'object') {
              const directStory = (vid.story_videos as any).stories;
              if (directStory) {
                resolvedStoryTitle = directStory.title || undefined;
              }
            }
            if (!resolvedStoryTitle) {
              resolvedStoryTitle = vid.story_title || vid.story?.title || undefined;
            }

            loadedItems.push({
              id: vid.id || String(Math.random()),
              name: vid.title || (isFileImage ? `IMAGEM_${vid.id?.slice(0, 6) || 'UPLOAD'}.jpg` : `VIDEO_${vid.id?.slice(0, 6) || 'UPLOAD'}.mp4`),
              type: isFileImage ? 'image' : 'video',
              sizeInBytes: totalMediaBytes,
              createdAt: formattedDate,
              thumbnailUrl: finalThumbnail,
              fileUrl: validVideoUrl,
              productName: resolvedProductName,
              productImageUrl: resolvedProductImage || undefined,
              storyTitle: resolvedStoryTitle,
              canDelete: true,
            });
          } catch (itemErr) {
            console.warn('[Vidlytics Storage] Erro defensivo ao mapear item individual:', itemErr, vid);
          }
        });
      }

      // Busca cota oficial e plano da loja ativa no Supabase
      if (activeStoreId && supabase) {
        try {
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
        } catch (_) {}

        try {
          const { data: settingsData } = await supabase
            .from('store_settings')
            .select('logo_url')
            .eq('store_id', activeStoreId)
            .maybeSingle();

          if (settingsData?.logo_url) {
            // ── CÁLCULO DINÂMICO DE TAMANHO DA LOGO (EVITA 0 B) ──
            let logoSize = 150 * 1024; // Fallback elegante: 150 KB padrão caso CORS bloqueie HEAD e GET
            try {
              // Tenta HEAD request para capturar o Content-Length sem baixar o arquivo inteiro
              const response = await fetch(settingsData.logo_url, { method: 'HEAD' });
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                logoSize = parseInt(contentLength, 10);
              } else {
                // Caso o header não venha de primeira, fazemos um GET simples para obter o Blob
                const getResponse = await fetch(settingsData.logo_url);
                const blob = await getResponse.blob();
                if (blob && blob.size > 0) {
                  logoSize = blob.size;
                }
              }
            } catch (e) {
              console.warn('[Vidlytics Storage] Não foi possível obter o tamanho exato do logotipo via requisição, aplicando fallback estimado.', e);
            }

            loadedItems.push({
              id: 'logo-setting-file',
              name: 'LOGOTIPO_OFICIAL_LOJA.png',
              type: 'image',
              sizeInBytes: logoSize, // Agora calcula o tamanho real!
              createdAt: 'Ativo',
              thumbnailUrl: settingsData.logo_url,
              fileUrl: settingsData.logo_url,
              canDelete: false,
            });
          }
        } catch (_) {}
      }

      setFiles(loadedItems);
    } catch (err) {
      console.error('Erro ao carregar arquivos da conta:', err);
      showError('Erro ao carregar dados de armazenamento.');
    } finally {
      setLoading(false);
    }
  }, [resolveActiveStoreId]);

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
          // 1. Busca as URLs da mídia no banco de dados antes de remover o registro
          const { data: videoData, error: fetchError } = await supabase
            .from('videos')
            .select('video_url, thumbnail_url')
            .eq('id', id)
            .maybeSingle();

          if (fetchError) throw fetchError;

          // 2. Exclui o registro definitivo na tabela 'videos'
          const { error: dbError } = await supabase.from('videos').delete().eq('id', id);
          if (dbError) throw dbError;

          // 3. Se a mídia existia e temos as URLs, deletamos fisicamente do Supabase Storage
          if (videoData) {
            // Helper resiliente para extrair bucket e path interno das URLs do Storage
            const extractStorageParams = (url: string) => {
              if (!url) return null;
              const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
              if (match) {
                return { bucket: match[1], path: match[2] };
              }
              return null;
            };

            // Remove o arquivo principal (vídeo ou imagem) do Storage
            const mainFile = extractStorageParams(videoData.video_url || '');
            if (mainFile) {
              const { error: mainDeleteErr } = await supabase.storage
                .from(mainFile.bucket)
                .remove([mainFile.path]);
              if (mainDeleteErr) {
                console.warn(`[Storage Hard Delete] Erro ao remover arquivo principal (${mainFile.path}):`, mainDeleteErr);
              }
            }

            // Remove a thumbnail (miniatura) do Storage, caso exista e seja um arquivo diferente
            const thumbFile = extractStorageParams(videoData.thumbnail_url || '');
            if (thumbFile && thumbFile.path !== mainFile?.path) {
              const { error: thumbDeleteErr } = await supabase.storage
                .from(thumbFile.bucket)
                .remove([thumbFile.path]);
              if (thumbDeleteErr) {
                console.warn(`[Storage Hard Delete] Erro ao remover miniatura (${thumbFile.path}):`, thumbDeleteErr);
              }
            }
          }
        } else if (typeof db.videos?.delete === 'function') {
          await db.videos.delete(id);
        }

        showSuccess('Arquivo removido com sucesso!');
        await loadAccountStorageData();
      } catch (err) {
        console.error('Erro ao excluir arquivo:', err);
        showError('Não foi possível excluir o arquivo.');
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Armazenamento
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">
            Gerencie os vídeos e imagens hospedados no seu plano e monitore o uso de espaço.
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
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border shadow-sm cursor-pointer",
              connectedPlatforms.includes('instagram')
                ? "border-pink-500/40 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-pink-500/20 hover:opacity-95"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-slate-600 dark:text-[#c0c5d4] hover:bg-slate-50 dark:hover:bg-white/5"
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
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border shadow-sm cursor-pointer",
              connectedPlatforms.includes('tiktok')
                ? activePlatformTab === 'tiktok'
                  ? "border-slate-700 bg-slate-800 text-white shadow-slate-900/40"
                  : "border-slate-700 bg-black text-white shadow-slate-900/40 hover:bg-slate-950"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-slate-600 dark:text-[#c0c5d4] hover:bg-slate-50 dark:hover:bg-white/5"
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
            className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] shadow-sm hover:border-purple-400 hover:text-purple-500 transition-all cursor-pointer"
          >
            <Link size={15} className="text-purple-500" />
            URL Externa
          </button>

          {/* Botão Primário: Fazer Upload */}
          <button
            type="button"
            disabled={uploading}
            onClick={handleTriggerUpload}
            className="flex items-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud size={16} className={cn("!text-white stroke-[2.5]", uploading && "animate-bounce")} />
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </div>
      </div>

      {/* ── CARD DA RÉGUA DE USO ── */}
      {(() => {
        const isCritical = usedPercentage >= 90;
        const isWarning = usedPercentage >= 70 && usedPercentage < 90;

        const currentColorHex = isCritical
          ? '#ef4444'
          : isWarning
            ? '#ff7a29'
            : '#22c55e';

        return (
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] transition-transform hover:scale-105 shrink-0">
                  <HardDrive size={22} className="!text-white stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {planName}
                    </h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#0f1220] px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:text-[#ff7a29] border border-transparent dark:border-white/5">
                      {formatSize(maxLimitBytes)} Limite
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] mt-0.5">
                    Uso atual: <strong className="text-slate-800 dark:text-white">{formatSize(totalUsedBytes)}</strong> de {formatSize(maxLimitBytes)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                {(isWarning || isCritical) && (
                  <button
                    type="button"
                    onClick={() => showSuccess('Redirecionando para a página de planos...')}
                    style={{ backgroundColor: currentColorHex }}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-md transition-all hover:opacity-90"
                  >
                    <Sparkles size={14} className="!text-white" />
                    Faça Upgrade
                  </button>
                )}

                <div>
                  <span 
                    style={{ color: currentColorHex }}
                    className="text-2xl font-black tracking-tight block"
                  >
                    {usedPercentage}%
                  </span>
                  <span className="block text-[11px] font-bold text-slate-400 dark:text-[#8a90a0]">
                    Espaço Consumido
                  </span>
                </div>
              </div>
            </div>

            {(isWarning || isCritical) && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl p-3 text-xs font-bold',
                  isCritical
                    ? 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/30 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-orange-50 text-[#ff7a29] dark:bg-orange-950/30 dark:text-orange-400 border border-orange-500/20'
                )}
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  {isCritical
                    ? 'Atenção: Seu armazenamento atingiu 90% ou mais! Faça upgrade para garantir a continuidade dos vídeos.'
                    : 'Atenção: Você atingiu 70% do seu limite de armazenamento. Considere fazer upgrade do seu plano.'}
                </span>
              </div>
            )}

            {/* Barra de Progresso */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#0f1220] p-0.5 border border-transparent dark:border-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPercentage}%`,
                  backgroundColor: currentColorHex,
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Seção de Vídeos Importados do Instagram */}
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

      {/* ── CARD PRINCIPAL UNIFICADO (Tabela e Busca) ── */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* BARRA INTERNA DE FILTROS E BUSCA (O Input se estende totalmente usando flex-1) */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-white/5 pb-5">
          
          {/* Input de Busca Flexível (Estica até o limite dos botões) */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8a90a0]" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar pelo nome do arquivo..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] pl-12 pr-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
            />
          </div>

          {/* CONTAINER ÚNICO CINZA QUE AGRUPA OS FILTROS (Sem separação) */}
          <div className="flex items-center bg-[#F1F5F9] dark:bg-[#0f1220] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={cn(
                "rounded-lg px-6 py-2 text-[13px] font-black uppercase tracking-wider transition-all text-center flex-1 md:flex-initial cursor-pointer",
                selectedType === 'all'
                  ? "bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-orange-500/30"
                  : "text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white bg-transparent"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('video')}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-6 py-2 text-[13px] font-black uppercase tracking-wider transition-all text-center flex-1 md:flex-initial cursor-pointer",
                selectedType === 'video'
                  ? "bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-orange-500/30"
                  : "text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white bg-transparent"
              )}
            >
              <FileVideo size={14} />
              Vídeos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('image')}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-6 py-2 text-[13px] font-black uppercase tracking-wider transition-all text-center flex-1 md:flex-initial cursor-pointer",
                selectedType === 'image'
                  ? "bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-orange-500/30"
                  : "text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white bg-transparent"
              )}
            >
              <FileImage size={14} />
              Imagens
            </button>
          </div>
        </div>
        
        {/* Tabela de Mídias com Estilo Limpo */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                <th className="px-6 py-4 rounded-l-2xl">Mídia</th>
                <th className="px-6 py-4">Nome do Arquivo</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 text-center">Story Vinculado</th>
                <th className="px-6 py-4 text-center">Tamanho</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right rounded-r-2xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400 dark:text-[#8a90a0]">
                    Carregando mídias da sua conta...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400 dark:text-[#8a90a0]">
                    Nenhum arquivo encontrado no seu armazenamento.
                  </td>
                </tr>
              ) : (
                filteredFiles.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-3.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0f1220] shadow-xs flex items-center justify-center shrink-0">
                        {/* Camada de Imagem */}
                        {file.thumbnailUrl || (file.type === 'image' && file.fileUrl) ? (
                          <img 
                            src={file.thumbnailUrl || file.fileUrl} 
                            alt={file.name} 
                            referrerPolicy="no-referrer"
                            className="relative z-10 h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : file.fileUrl && file.type === 'video' ? (
                          <video
                            src={file.fileUrl.indexOf('#t=') === -1 ? `${file.fileUrl}#t=0.001` : file.fileUrl}
                            className="h-full w-full object-cover"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : null}

                        {/* Ícones de Fundo / Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {file.type === 'video' ? (
                            <div className="flex h-full w-full items-center justify-center bg-black/20 text-white">
                              <FileVideo size={16} />
                            </div>
                          ) : (
                            <FileImage size={16} className="text-slate-400 dark:text-[#8a90a0]" />
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-3.5 max-w-xs truncate">
                      <span className="text-xs font-black text-slate-800 dark:text-[#e8ecf4] block truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#0094EB] dark:text-[#ff7a29] uppercase tracking-wider">
                        {file.type === 'image'
                          ? 'Imagem (Hospedada)'
                          : file.sizeInBytes === 0
                            ? 'Vídeo (URL Externa)'
                            : 'Vídeo MP4 (Hospedado)'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      {file.productName ? (
                        <div 
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-[#0f1220]/60 p-1.5 pr-3 shadow-xs"
                          title={file.productName}
                        >
                          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35]">
                            {file.productImageUrl ? (
                              <img
                                src={file.productImageUrl}
                                alt={file.productName}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-[#1a1f35] text-[10px] font-black text-slate-400">
                                {file.productName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="max-w-[120px] truncate text-[11px] font-bold text-slate-700 dark:text-[#c0c5d4]">
                            {file.productName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#0f1220] px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-[#8a90a0] border border-transparent dark:border-white/5">
                          Sem produto
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      {file.storyTitle ? (
                        <span 
                          style={{ backgroundColor: 'rgba(0, 148, 235, 0.12)', color: '#0094EB', borderColor: 'rgba(0, 148, 235, 0.25)' }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border shadow-xs"
                        >
                          {file.storyTitle}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">—</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-center font-mono text-xs font-black text-slate-700 dark:text-[#e8ecf4]">
                      {formatSize(file.sizeInBytes)}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        Disponível
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {file.type === 'video' && (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/videos/${file.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer"
                            title="Editar vínculos do vídeo"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePreviewMedia(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0094EB] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                          title="Visualizar mídia"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file.fileUrl || file.thumbnailUrl, file.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                          title="Baixar arquivo"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Excluir arquivo"
                        >
                          <Trash2 size={15} />
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
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
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
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUrl}
                  className="rounded-xl bg-[#0094EB] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0081cc] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingUrl ? 'Salvando...' : 'Cadastrar Mídia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE PREVIEW DA MÍDIA ── */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={cn(
            "relative w-full rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1220] p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh] transition-all duration-300",
            previewMedia.type === 'image' ? 'max-w-3xl' : 'max-w-[400px]'
          )}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-orange-500/10 text-[#0094EB] dark:text-[#ff7a29]">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs" title={previewMedia.name}>
                    {previewMedia.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-[#8a90a0] uppercase tracking-widest">
                    Visualização de Mídia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo Dinâmico */}
            <div className={cn(
              "flex-1 flex items-center justify-center overflow-hidden bg-slate-950 rounded-2xl w-full relative",
              previewMedia.type === 'image' ? 'h-[55vh] max-h-[480px]' : 'aspect-[9/16] max-h-[62vh]'
            )}>
              {(() => {
                if (previewMedia.type === 'image') {
                  return (
                    <img
                      src={previewMedia.url}
                      alt={previewMedia.name}
                      className="max-h-full max-w-full object-contain rounded-lg animate-fade-in"
                    />
                  );
                }

                if (previewMedia.type === 'youtube') {
                  const embedUrl = getYoutubeEmbedUrl(previewMedia.url);
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        title={previewMedia.name}
                        className="w-full h-full rounded-lg border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    );
                  }
                }

                if (previewMedia.type === 'iframe') {
                  const embedUrl = getInstagramEmbedUrl(previewMedia.url);
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        title={previewMedia.name}
                        className="w-full h-full rounded-lg bg-white border-0"
                        allowTransparency
                        scrolling="yes"
                      />
                    );
                  }
                }

                return (
                  <video
                    src={previewMedia.url}
                    controls
                    autoPlay
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                );
              })()}
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-stretch gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="w-full rounded-xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] py-3 text-xs font-black text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer text-center uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
