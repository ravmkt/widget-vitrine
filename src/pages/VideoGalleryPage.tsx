import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Link as LinkIcon,
  Copy,
  Eye,
  AlertCircle,
  FileVideo,
  Info,
  Image as ImageIcon,
  Instagram,
  Video as VideoIcon,
  ExternalLink
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const VideoGalleryPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Previewing video in gallery
  const [previewingVideo, setPreviewingVideo] = useState<Video | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | Video['source_type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Video['status']>('all');

  // Custom Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  // Form states
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<Video['source_type']>('external_url');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Video['status']>('active');

  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const loadVideos = useCallback(async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedVideos = await db.videos.getAll(mainStore.id);
        setAllVideos(fetchedVideos);
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
      currentVideos = currentVideos.filter(v => v.status === filterStatus);
    }

    if (filterSource !== 'all') {
      currentVideos = currentVideos.filter(v => v.source_type === filterSource);
    }

    if (searchTerm) {
      currentVideos = currentVideos.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVideos(currentVideos);
  }, [allVideos, filterStatus, filterSource, searchTerm]);

  // Capture video duration and frame automatically on load
  const extractVideoMetadata = (file: File) => {
    const videoNode = document.createElement('video');
    videoNode.preload = 'metadata';
    videoNode.muted = true;
    videoNode.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    videoNode.src = objectUrl;

    videoNode.onloadedmetadata = () => {
      setDuration(Math.round(videoNode.duration));
      videoNode.currentTime = Math.min(1, videoNode.duration / 2);
    };

    videoNode.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoNode.videoWidth || 320;
        canvas.height = videoNode.videoHeight || 568;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoNode, 0, 0, canvas.width, canvas.height);
          const autoFrameBase64 = canvas.toDataURL('image/jpeg', 0.85);
          if (!thumbnailUrl) {
            setThumbnailUrl(autoFrameBase64);
          }
        }
      } catch (e) {
        console.warn('CORS/Canvas Frame capture block. Skipping frame auto-render.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
  };

  const handleSourceTypeChange = (newType: Video['source_type']) => {
    const cleanType = newType === 'mobile_upload' ? 'upload' : newType;
    setSourceType(cleanType);
    setVideoUrl(''); // Always blank on load
    setThumbnailUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileSize(file.size);
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      extractVideoMetadata(file);
      showSuccess(`Arquivo de vídeo selecionado: ${file.name}`);
    }
  };

  const handleManualThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        showError('A imagem de capa deve ter no máximo 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailUrl(reader.result as string);
        showSuccess('Capa carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    if (!title.trim()) {
      showError('O título do vídeo é obrigatório.');
      return;
    }

    if (!videoUrl.trim()) {
      showError('A URL ou arquivo de vídeo é obrigatório.');
      return;
    }

    const videoToSave: Video = editingVideo ? {
      ...editingVideo,
      title: title.trim(),
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
      duration: duration || 15,
      file_size: fileSize || 4500000,
      status,
    } : {
      id: Math.random().toString(36).substr(2, 9),
      store_id: store.id,
      title: title.trim(),
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
      duration: duration || 15,
      file_size: fileSize || 4500000,
      status,
      created_at: new Date().toISOString(),
    };

    try {
      await db.videos.save(videoToSave);
      showSuccess(`Vídeo "${videoToSave.title}" salvo com sucesso!`);
      
      setTitle('');
      setSourceType('external_url');
      setVideoUrl('');
      setThumbnailUrl('');
      setDuration(undefined);
      setFileSize(undefined);
      setStatus('active');
      setEditingVideo(null);
      setSelectedFileName('');
      setShowForm(false);
      
      loadVideos();
    } catch (error) {
      showError(`Erro ao salvar o vídeo.`);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setSourceType(video.source_type === 'mobile_upload' ? 'upload' : video.source_type);
    setVideoUrl(video.video_url);
    setThumbnailUrl(video.thumbnail_url);
    setDuration(video.duration);
    setFileSize(video.file_size);
    setStatus(video.status);
    setSelectedFileName(video.source_type === 'upload' ? 'Video_Original.mp4' : '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Remover Vídeo da Galeria?',
      description: 'Esta ação irá remover o arquivo definitivamente da sua biblioteca. O vídeo deixará de rodar em todos os blocos de stories vinculados.',
      onConfirm: async () => {
        try {
          await db.videos.delete(id);
          const relatedStoryVideos = (await db.storyVideos.getAll()).filter(sv => sv.video_id === id);
          for (const sv of relatedStoryVideos) {
            await db.storyVideos.delete(sv.id);
          }
          showSuccess('Vídeo removido da galeria!');
          setDialog(prev => ({ ...prev, isOpen: false }));
          loadVideos();
        } catch (error) {
          showError('Erro ao excluir o vídeo.');
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleCancelForm = () => {
    setTitle('');
    setSourceType('external_url');
    setVideoUrl('');
    setThumbnailUrl('');
    setDuration(undefined);
    setFileSize(undefined);
    setStatus('active');
    setEditingVideo(null);
    setSelectedFileName('');
    setShowForm(false);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    showSuccess('URL copiada!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getSourceTypeLabel = (type: Video['source_type']) => {
    switch (type) {
      case 'upload': return '📦 Upload';
      case 'instagram': return '📸 Instagram';
      case 'tiktok': return '🎵 TikTok';
      case 'external_url': return '🔗 URL Externa';
      case 'mobile_upload': return '📦 Upload';
      case 'gallery': return '🖼️ Galeria';
      default: return 'Vídeo';
    }
  };

  const getInstagramEmbedUrl = (url: string) => {
    try {
      const match = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/)([^\/?#&]+)/i);
      if (match && match[1]) {
        return `https://www.instagram.com/p/${match[1]}/embed/`;
      }
    } catch (e) {}
    return '';
  };

  const getTikTokEmbedUrl = (url: string) => {
    try {
      const match = url.match(/(?:tiktok\.com\/@[^\/]+\/video\/)(\d+)/i);
      if (match && match[1]) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
    } catch (e) {}
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-base text-slate-400 font-semibold">Carregando galeria de vídeos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Biblioteca de Vídeos</h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Organize os arquivos de vídeo e links de redes sociais que farão parte do feed dos seus stories.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) handleCancelForm();
              else {
                setTitle('');
                setSourceType('external_url');
                setVideoUrl(''); // Ensure blank on load
                setThumbnailUrl('');
                setDuration(undefined);
                setFileSize(undefined);
                setSelectedFileName('');
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-violet-100 transition-all self-start sm:self-auto"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? 'Fechar Cadastro' : 'Adicionar vídeo'}
          </button>
        </div>

        {/* Improved Responsive Video & Social Media Embed Preview Modal */}
        {previewingVideo && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPreviewingVideo(null)}>
            <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-sm w-full relative border border-slate-800 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-white text-xs block truncate">{previewingVideo.title}</span>
                  <span className="text-[10px] text-violet-400 font-bold uppercase">{getSourceTypeLabel(previewingVideo.source_type)}</span>
                </div>
                <button onClick={() => setPreviewingVideo(null)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="aspect-[9/16] bg-black relative flex flex-col justify-center items-center">
                {previewingVideo.source_type === 'instagram' ? (
                  getInstagramEmbedUrl(previewingVideo.video_url) ? (
                    <iframe
                      src={getInstagramEmbedUrl(previewingVideo.video_url)}
                      className="w-full h-full border-0"
                      allowFullScreen
                      scrolling="no"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-4">
                      <Instagram className="w-12 h-12 text-pink-500 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">Não foi possível carregar o preview direto.</p>
                      <p className="text-xs text-slate-500">Este post do Instagram pode estar configurado como privado ou bloqueado para embeds.</p>
                      <a
                        href={previewingVideo.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Abrir no Instagram <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )
                ) : previewingVideo.source_type === 'tiktok' ? (
                  getTikTokEmbedUrl(previewingVideo.video_url) ? (
                    <iframe
                      src={getTikTokEmbedUrl(previewingVideo.video_url)}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div className="p-6 text-center space-y-4">
                      <VideoIcon className="w-12 h-12 text-cyan-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">Não foi possível carregar o preview do TikTok.</p>
                      <p className="text-xs text-slate-500">Links alternativos do TikTok podem exigir visualização direta no aplicativo.</p>
                      <a
                        href={previewingVideo.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Abrir no TikTok <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )
                ) : (
                  <video src={previewingVideo.video_url} controls autoPlay loop className="w-full h-full object-cover"></video>
                )}
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 md:p-8 max-w-2xl mx-auto transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold">
                  {editingVideo ? `Editar Vídeo: ${editingVideo.title}` : 'Adicionar Vídeo à Biblioteca'}
                </h3>
              </div>
              <button onClick={handleCancelForm} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Título do Vídeo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Unboxing de Camisa..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-2xl px-4 py-3 text-sm md:text-base text-slate-100 placeholder-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Origem do Vídeo *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { value: 'external_url', label: '🔗 Link Direto' },
                    { value: 'upload', label: '📦 Upload Local' },
                    { value: 'instagram', label: '📸 Instagram' },
                    { value: 'tiktok', label: '🎵 TikTok' }
                  ] as { value: Video['source_type']; label: string }[]).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleSourceTypeChange(type.value)}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                        sourceType === type.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                          : 'border-slate-800 hover:bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span>{type.label.split(' ')[1]}</span>
                      <span className="text-sm">{type.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === 'upload' ? (
                <div className="p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/50 hover:bg-slate-950 transition-all flex flex-col items-center justify-center text-center">
                  <FileVideo className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-slate-300">Escolha um arquivo MP4 local</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">O sistema detectará a duração e extrairá a imagem de capa automaticamente.</p>
                  
                  <label className="cursor-pointer bg-slate-900 border border-slate-850 hover:border-violet-500 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {selectedFileName && (
                    <div className="mt-3 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{selectedFileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Link de Origem / URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={sourceType === 'instagram' ? "https://www.instagram.com/p/..." : sourceType === 'tiktok' ? "https://www.tiktok.com/..." : "https://example.com/seu-video.mp4"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-200 font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              )}

              {/* Subida Manual da Thumbnail / Capa com Preview de Ativação */}
              <div className="space-y-3 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Imagem de Capa (Thumbnail)</span>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-24 h-36 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-500 font-bold block">Sem Capa</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">Envie uma imagem para capa do story (JPG/PNG). Se for upload local e você não enviar, extrairemos um frame do vídeo.</p>
                    
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-violet-500 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4" /> Enviar Capa
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleManualThumbUpload}
                          className="hidden"
                        />
                      </label>
                      {thumbnailUrl && (
                        <button type="button" onClick={() => setThumbnailUrl('')} className="bg-slate-900 border border-slate-800 text-rose-500 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-950/20">Remover</button>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Ou cole o link direto da imagem</span>
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://example.com/imagem.jpg"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Status de Ativação *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 font-semibold"
                >
                  <option value="active">Ativo (visível na galeria do story)</option>
                  <option value="inactive">Inativo (arquivado)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {editingVideo ? 'Salvar Alterações' : 'Adicionar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase tracking-wider">Busca</span>
            <input
              type="text"
              placeholder="Pesquisar vídeo pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl text-sm font-semibold text-slate-200"
            />
          </div>

          <div className="w-full md:w-auto min-w-[180px]">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-300"
            >
              <option value="all">Todas as origens</option>
              <option value="upload">Upload</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="external_url">URL externa</option>
            </select>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-300"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto">
            <Film className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum vídeo correspondente</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Nenhum arquivo encontrado. Comece a criar o seu portfólio de vídeos adicionando um arquivo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-slate-900 rounded-3xl border border-slate-800/80 overflow-hidden flex flex-col hover:border-slate-700 transition-all group"
              >
                <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
                      {getSourceTypeLabel(video.source_type)}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${
                      video.status === 'active'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-500 text-white'
                    }`}>
                      {video.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <button
                    onClick={() => setPreviewingVideo(video)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 animate-fade-in"
                  >
                    <div className="bg-white/95 p-3.5 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                      <Play className="w-5 h-5 text-violet-600 fill-violet-600" />
                    </div>
                  </button>

                  {video.duration && (
                    <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md z-10">
                      ⏱️ {video.duration}s
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-slate-900">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm md:text-base line-clamp-2" title={video.title}>
                      {video.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setPreviewingVideo(video)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all flex items-center justify-center"
                      title="Visualizar vídeo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(video)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all flex items-center justify-center"
                      title="Editar vídeo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopyUrl(video.video_url)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all flex items-center justify-center"
                      title="Copiar link"
                    >
                      {copiedUrl === video.video_url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <Link
                      to={`/stories?videoId=${video.id}`}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all flex items-center justify-center"
                      title="Usar em story"
                    >
                      <Film className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center"
                      title="Excluir vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
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