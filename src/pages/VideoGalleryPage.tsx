import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Video, Store } from '@/lib/db';
import {
  Film,
  UploadCloud,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Play,
  Copy,
  Eye,
  FileVideo,
  Image as ImageIcon,
  Instagram,
  Video as VideoIcon,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).substring(2, 11);
};

const isValidVideoFile = (file: File) => {
  return file.type.startsWith('video/');
};

const VideoGalleryPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewingVideo, setPreviewingVideo] = useState<Video | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | Video['source_type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Video['status']>('all');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<Video['source_type']>('external_url');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Video['status']>('active');

  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isFetchingSocialThumb, setIsFetchingSocialThumb] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);

      const stores = await db.stores.getAll();
      const mainStore = stores[0];

      setStore(mainStore || null);

      if (mainStore) {
        const fetchedVideos = await db.videos.getAll(mainStore.id);
        setAllVideos(fetchedVideos);
      } else {
        setAllVideos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      showError('Erro ao carregar a galeria de vídeos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    let currentVideos = allVideos;

    if (filterStatus !== 'all') {
      currentVideos = currentVideos.filter((video) => video.status === filterStatus);
    }

    if (filterSource !== 'all') {
      currentVideos = currentVideos.filter((video) => video.source_type === filterSource);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      currentVideos = currentVideos.filter((video) =>
        video.title.toLowerCase().includes(search)
      );
    }

    setFilteredVideos(currentVideos);
  }, [allVideos, filterStatus, filterSource, searchTerm]);

  const resetForm = () => {
    setTitle('');
    setSourceType('external_url');
    setVideoUrl('');
    setThumbnailUrl('');
    setDuration(undefined);
    setFileSize(undefined);
    setStatus('active');
    setEditingVideo(null);
    setSelectedFileName('');
    setIsReadingFile(false);
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const fetchSocialThumbnailAndTitle = async (url: string, type: 'instagram' | 'tiktok') => {
    if (!url || !url.startsWith('http')) return;

    setIsFetchingSocialThumb(true);

    const cleanUrl = url.split('?')[0];

    const oEmbedApiUrl =
      type === 'instagram'
        ? `https://api.instagram.com/oembed?url=${encodeURIComponent(cleanUrl)}`
        : `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;

    const safeProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oEmbedApiUrl)}`;

    try {
      const response = await fetch(safeProxyUrl);

      if (!response.ok) {
        throw new Error('Falha no proxy.');
      }

      const parsed = await response.json();
      const rawJsonString = parsed.contents;
      const data = JSON.parse(rawJsonString);

      if (data.thumbnail_url) {
        setThumbnailUrl(data.thumbnail_url);

        if (!title && data.title) {
          setTitle(data.title.substring(0, 50) + (data.title.length > 50 ? '...' : ''));
        }

        showSuccess('Capa vinculada automaticamente!');
      } else {
        throw new Error('Capa não encontrada.');
      }
    } catch {
      if (type === 'instagram') {
        setThumbnailUrl(
          'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&q=80'
        );
      } else {
        setThumbnailUrl(
          'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80'
        );
      }
    } finally {
      setIsFetchingSocialThumb(false);
    }
  };

  useEffect(() => {
    if ((sourceType === 'instagram' || sourceType === 'tiktok') && videoUrl) {
      const delayTimer = setTimeout(() => {
        fetchSocialThumbnailAndTitle(videoUrl, sourceType);
      }, 800);

      return () => clearTimeout(delayTimer);
    }
  }, [videoUrl, sourceType]);

  const extractVideoMetadata = (file: File) => {
    const videoNode = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    videoNode.preload = 'metadata';
    videoNode.muted = true;
    videoNode.playsInline = true;
    videoNode.src = objectUrl;

    videoNode.onloadedmetadata = () => {
      if (Number.isFinite(videoNode.duration)) {
        setDuration(Math.round(videoNode.duration));
      }

      try {
        videoNode.currentTime = Math.min(1, videoNode.duration / 2 || 0.1);
      } catch {
        URL.revokeObjectURL(objectUrl);
      }
    };

    videoNode.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');

        canvas.width = videoNode.videoWidth || 320;
        canvas.height = videoNode.videoHeight || 568;

        const context = canvas.getContext('2d');

        if (context) {
          context.drawImage(videoNode, 0, 0, canvas.width, canvas.height);
          const autoFrameBase64 = canvas.toDataURL('image/jpeg', 0.85);

          setThumbnailUrl((current) => current || autoFrameBase64);
        }
      } catch {
        console.warn('Não foi possível extrair capa automática do vídeo.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    videoNode.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleSourceTypeChange = (newType: Video['source_type']) => {
    const cleanType = newType === 'mobile_upload' ? 'upload' : newType;

    setSourceType(cleanType);
    setVideoUrl('');
    setThumbnailUrl('');
    setSelectedFileName('');
    setDuration(undefined);
    setFileSize(undefined);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isValidVideoFile(file)) {
      showError('Selecione um arquivo de vídeo válido.');
      return;
    }

    setSelectedFileName(file.name);
    setFileSize(file.size);
    setIsReadingFile(true);

    extractVideoMetadata(file);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        setIsReadingFile(false);
        showError('Não foi possível ler o arquivo de vídeo.');
        return;
      }

      setVideoUrl(result);
      setIsReadingFile(false);
      showSuccess(`Vídeo carregado: ${file.name}`);
    };

    reader.onerror = () => {
      setIsReadingFile(false);
      showError('Erro ao carregar o vídeo.');
    };

    reader.readAsDataURL(file);
  };

  const handleManualThumbUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem válida.');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      showError('A imagem de capa deve ter no máximo 1MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnailUrl(reader.result);
        showSuccess('Capa carregada com sucesso!');
      }
    };

    reader.onerror = () => {
      showError('Erro ao carregar a imagem de capa.');
    };

    reader.readAsDataURL(file);
  };

  const handleSaveVideo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!store) {
      showError('Nenhuma loja encontrada.');
      return;
    }

    if (!title.trim()) {
      showError('O título do vídeo é obrigatório.');
      return;
    }

    if (!videoUrl.trim()) {
      showError('A URL ou arquivo de vídeo é obrigatório.');
      return;
    }

    if (isReadingFile) {
      showError('Aguarde o vídeo terminar de carregar.');
      return;
    }

    const now = new Date().toISOString();

    const videoToSave: Video = editingVideo
      ? {
          ...editingVideo,
          title: title.trim(),
          source_type: sourceType,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || DEFAULT_THUMBNAIL,
          duration: duration || editingVideo.duration || 15,
          file_size: fileSize || editingVideo.file_size || 0,
          status,
          updated_at: now,
        }
      : {
          id: generateId(),
          store_id: store.id,
          title: title.trim(),
          source_type: sourceType,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || DEFAULT_THUMBNAIL,
          duration: duration || 15,
          file_size: fileSize || 0,
          status,
          created_at: now,
          updated_at: now,
        };

    try {
      await db.videos.save(videoToSave);

      showSuccess(`Vídeo "${videoToSave.title}" salvo com sucesso!`);

      resetForm();
      setShowForm(false);
      loadVideos();
    } catch (error) {
      console.error('Erro ao salvar vídeo:', error);
      showError('Erro ao salvar o vídeo. Se o arquivo for muito grande, use uma URL externa ou storage.');
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setSourceType(video.source_type === 'mobile_upload' ? 'upload' : video.source_type);
    setVideoUrl(video.video_url || '');
    setThumbnailUrl(video.thumbnail_url || '');
    setDuration(video.duration);
    setFileSize(video.file_size);
    setStatus(video.status);
    setSelectedFileName(video.source_type === 'upload' ? 'Vídeo carregado anteriormente' : '');
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Remover vídeo da galeria?',
      description:
        'Esta ação removerá o vídeo da biblioteca e dos stories vinculados.',
      onConfirm: async () => {
        try {
          await db.videos.delete(id);

          const relatedStoryVideos = (await db.storyVideos.getAll()).filter(
            (storyVideo) => storyVideo.video_id === id
          );

          for (const storyVideo of relatedStoryVideos) {
            await db.storyVideos.delete(storyVideo.id);
          }

          showSuccess('Vídeo removido da galeria!');
          setDialog((previous) => ({ ...previous, isOpen: false }));
          loadVideos();
        } catch {
          showError('Erro ao excluir o vídeo.');
        }
      },
      onCancel: () => setDialog((previous) => ({ ...previous, isOpen: false })),
    });
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showSuccess('URL copiada!');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      showError('Não foi possível copiar.');
    }
  };

  const getSourceTypeLabel = (type: Video['source_type']) => {
    switch (type) {
      case 'upload':
        return '📦 Upload';
      case 'instagram':
        return '📸 Instagram';
      case 'tiktok':
        return '🎵 TikTok';
      case 'external_url':
        return '🔗 URL Externa';
      case 'mobile_upload':
        return '📦 Upload';
      case 'gallery':
        return '🖼️ Galeria';
      default:
        return 'Vídeo';
    }
  };

  const isSocialVideo = (video?: Video | null) => {
    return video?.source_type === 'instagram' || video?.source_type === 'tiktok';
  };

  const isPlayableVideoUrl = (url?: string) => {
    if (!url) return false;

    return (
      url.startsWith('data:video/') ||
      url.startsWith('blob:') ||
      /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
        <p className="text-base font-semibold text-slate-400">Carregando galeria de vídeos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-3xl font-black text-transparent">
              Biblioteca de Vídeos
            </h1>
            <p className="mt-1 text-sm text-slate-400 md:text-base">
              Organize vídeos, uploads e links que serão usados nos stories.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-violet-500 hover:to-fuchsia-500 sm:self-auto md:text-base"
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Fechar Cadastro' : 'Adicionar vídeo'}
          </button>
        </div>

        {previewingVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewingVideo(null)}
          >
            <div
              className="animate-fade-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <div className="min-w-0 pr-2">
                  <span className="block truncate text-xs font-bold text-white">
                    {previewingVideo.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-violet-400">
                    {getSourceTypeLabel(previewingVideo.source_type)}
                  </span>
                </div>

                <button
                  onClick={() => setPreviewingVideo(null)}
                  className="rounded-full bg-slate-800 p-1.5 text-slate-400 transition-colors hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex aspect-[9/16] flex-col items-center justify-center bg-black">
                {isSocialVideo(previewingVideo) ? (
                  <div className="space-y-4 p-6 text-center">
                    {previewingVideo.source_type === 'instagram' ? (
                      <Instagram className="mx-auto h-12 w-12 text-pink-500" />
                    ) : (
                      <VideoIcon className="mx-auto h-12 w-12 text-cyan-400" />
                    )}

                    {previewingVideo.thumbnail_url && (
                      <img
                        src={previewingVideo.thumbnail_url}
                        alt={previewingVideo.title}
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 blur-sm"
                      />
                    )}

                    <div className="relative z-10 space-y-4">
                      <p className="text-sm font-semibold text-slate-200">
                        Publicação do{' '}
                        {previewingVideo.source_type === 'instagram' ? 'Instagram' : 'TikTok'}
                      </p>

                      <a
                        href={previewingVideo.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:opacity-90"
                      >
                        Abrir publicação original <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ) : isPlayableVideoUrl(previewingVideo.video_url) ? (
                  <video
                    src={previewingVideo.video_url}
                    poster={previewingVideo.thumbnail_url || undefined}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center">
                    <Play className="mx-auto mb-4 h-12 w-12 fill-white text-white" />
                    <p className="text-sm font-bold text-white">
                      Este link não parece ser um arquivo MP4 direto.
                    </p>
                    <a
                      href={previewingVideo.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white"
                    >
                      Abrir link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl transition-all md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-violet-400" />
                <h3 className="text-lg font-bold">
                  {editingVideo ? `Editar Vídeo: ${editingVideo.title}` : 'Adicionar Vídeo'}
                </h3>
              </div>

              <button
                onClick={handleCancelForm}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Título do Vídeo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: Vestido nova coleção..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 placeholder-slate-700 focus:border-violet-500 md:text-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Origem do Vídeo *
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: 'external_url', label: '🔗 Link Direto' },
                    { value: 'upload', label: '📦 Upload Local' },
                    { value: 'instagram', label: '📸 Instagram' },
                    { value: 'tiktok', label: '🎵 TikTok' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSourceTypeChange(item.value as Video['source_type'])}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-xs font-bold transition-all ${
                        sourceType === item.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                          : 'border-slate-800 text-slate-400 hover:bg-slate-950'
                      }`}
                    >
                      <span>{item.label.split(' ')[1]}</span>
                      <span className="text-sm">{item.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === 'upload' ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/50 p-6 text-center transition-all hover:bg-slate-950">
                  <FileVideo className="mb-2 h-10 w-10 text-slate-600" />

                  <p className="text-sm font-bold text-slate-300">Escolha um arquivo de vídeo</p>
                  <p className="mb-4 mt-1 text-xs text-slate-500">
                    O arquivo será salvo em base64 no campo <strong>video_url</strong>.
                  </p>

                  <label className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 shadow-md transition-all hover:border-violet-500">
                    {isReadingFile ? 'Carregando...' : 'Selecionar Arquivo'}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isReadingFile}
                    />
                  </label>

                  {selectedFileName && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400">
                      <Check className="h-3.5 w-3.5" />
                      <span>{selectedFileName}</span>
                    </div>
                  )}

                  {videoUrl.startsWith('data:video/') && (
                    <p className="mt-3 text-[11px] font-bold text-emerald-400">
                      Vídeo pronto para salvar.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Link de Origem / URL *
                  </label>

                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={videoUrl}
                      onChange={(event) => setVideoUrl(event.target.value)}
                      placeholder={
                        sourceType === 'instagram'
                          ? 'https://www.instagram.com/p/...'
                          : sourceType === 'tiktok'
                            ? 'https://www.tiktok.com/...'
                            : 'https://example.com/seu-video.mp4'
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-4 pr-10 font-mono text-sm text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />

                    {isFetchingSocialThumb && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Imagem de Capa
                </span>

                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="Capa"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="p-2 text-center">
                        <ImageIcon className="mx-auto mb-1 h-6 w-6 text-slate-600" />
                        <span className="block text-[10px] font-bold text-slate-500">
                          Sem Capa
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      Envie uma imagem para a capa do story. Se for upload local, tentamos extrair
                      automaticamente um frame do vídeo.
                    </p>

                    <div className="flex gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 transition-all hover:border-violet-500">
                        <UploadCloud className="h-4 w-4" />
                        Enviar Capa
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleManualThumbUpload}
                          className="hidden"
                        />
                      </label>

                      {thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => setThumbnailUrl('')}
                          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-950/20"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                        Ou cole o link direto da imagem
                      </span>
                      <input
                        type="url"
                        value={thumbnailUrl.startsWith('data:') ? '' : thumbnailUrl}
                        onChange={(event) => setThumbnailUrl(event.target.value)}
                        placeholder="https://example.com/imagem.jpg"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status de Ativação *
                </label>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Video['status'])}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-xl border border-slate-800 px-5 py-2.5 text-sm font-bold text-slate-400 transition-all hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isReadingFile}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReadingFile
                    ? 'Carregando vídeo...'
                    : editingVideo
                      ? 'Salvar Alterações'
                      : 'Adicionar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Busca
            </span>

            <input
              type="text"
              placeholder="Pesquisar vídeo pelo nome..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-16 pr-4 text-sm font-semibold text-slate-200 focus:border-violet-500"
            />
          </div>

          <div className="w-full min-w-[180px] md:w-auto">
            <select
              value={filterSource}
              onChange={(event) => setFilterSource(event.target.value as any)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 md:text-sm"
            >
              <option value="all">Todas as origens</option>
              <option value="upload">Upload</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="external_url">URL externa</option>
            </select>
          </div>

          <div className="w-full min-w-[150px] md:w-auto">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as any)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 md:text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-16 text-center">
            <Film className="mx-auto mb-4 h-12 w-12 text-slate-700" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum vídeo correspondente</h3>
            <p className="mb-6 mt-1 text-sm text-slate-400">
              Comece adicionando um vídeo à biblioteca.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900 transition-all hover:border-slate-700"
              >
                <div className="relative aspect-[9/16] overflow-hidden bg-slate-950">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : isPlayableVideoUrl(video.video_url) ? (
                    <video
                      src={video.video_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-950">
                      <Film className="h-12 w-12 text-slate-700" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  <div className="absolute left-3 right-3 top-3 z-10 flex items-center justify-between">
                    <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      {getSourceTypeLabel(video.source_type)}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm ${
                        video.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    >
                      {video.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <button
                    onClick={() => setPreviewingVideo(video)}
                    className="animate-fade-in absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <div className="scale-90 rounded-full bg-white/95 p-3.5 shadow-lg transition-all group-hover:scale-100">
                      <Play className="h-5 w-5 fill-violet-600 text-violet-600" />
                    </div>
                  </button>

                  {video.duration && (
                    <span className="absolute bottom-3 right-3 z-10 rounded-md bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                      ⏱️ {video.duration}s
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 bg-slate-900 p-4">
                  <div>
                    <h4
                      className="line-clamp-2 text-sm font-bold text-slate-100 md:text-base"
                      title={video.title}
                    >
                      {video.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-5 gap-1 border-t border-slate-800 pt-3">
                    <button
                      onClick={() => setPreviewingVideo(video)}
                      className="flex items-center justify-center rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:bg-violet-600/20 hover:text-violet-400"
                      title="Visualizar vídeo"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleEdit(video)}
                      className="flex items-center justify-center rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:bg-violet-600/20 hover:text-violet-400"
                      title="Editar vídeo"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleCopyUrl(video.video_url)}
                      className="flex items-center justify-center rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:bg-violet-600/20 hover:text-violet-400"
                      title="Copiar link"
                    >
                      {copiedUrl === video.video_url ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    <Link
                      to={`/stories?videoId=${video.id}`}
                      className="flex items-center justify-center rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:bg-violet-600/20 hover:text-violet-400"
                      title="Usar em story"
                    >
                      <Film className="h-4 w-4" />
                    </Link>

                    <button
                      onClick={() => handleDelete(video.id)}
                      className="flex items-center justify-center rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:bg-rose-500/20 hover:text-rose-400"
                      title="Excluir vídeo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Excluir Vídeo"
        cancelText="Manter Vídeo"
      />
    </div>
  );
};

export default VideoGalleryPage;
