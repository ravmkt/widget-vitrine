import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Video, Store } from '@/lib/db';
import { Film, UploadCloud, Plus, Trash2, Edit3, Check, X, Play, Link as LinkIcon, Copy, Eye, AlertCircle, FileVideo, Info } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const VideoGalleryPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Previewing video in gallery
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | Video['source_type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Video['status']>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<Video['source_type']>('external_url');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Video['status']>('active');

  // For simulation files in local storage mock upload
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

  const isValidUrl = (url: string) => {
    if (!url) return false;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  const handleSourceTypeChange = (newType: Video['source_type']) => {
    setSourceType(newType);
    if (newType === 'instagram') {
      setVideoUrl('https://www.instagram.com/reel/Cw789_Xp_9Y/');
      setThumbnailUrl('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80');
    } else if (newType === 'tiktok') {
      setVideoUrl('https://www.tiktok.com/@fashion/video/721122334455');
      setThumbnailUrl('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80');
    } else if (newType === 'upload' || newType === 'mobile_upload') {
      setVideoUrl('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
      setThumbnailUrl('https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80');
    } else {
      setVideoUrl('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
      setThumbnailUrl('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileSize(file.size);
      setDuration(15);
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      showSuccess(`Arquivo selecionado: ${file.name}`);
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

    if (sourceType === 'instagram') {
      if (!videoUrl.toLowerCase().includes('instagram.com')) {
        showError('Para origem Instagram, forneça uma URL válida do Instagram (ex: instagram.com/reel/...).');
        return;
      }
    } else if (sourceType === 'tiktok') {
      if (!videoUrl.toLowerCase().includes('tiktok.com')) {
        showError('Para origem TikTok, forneça uma URL válida do TikTok (ex: tiktok.com/@username/video/...).');
        return;
      }
    } else if (sourceType === 'external_url') {
      if (!isValidUrl(videoUrl)) {
        showError('Por favor, forneça uma URL externa válida (http/https).');
        return;
      }
    } else if (sourceType === 'upload') {
      if (!videoUrl) {
        showError('Por favor, selecione um arquivo de vídeo para fazer o upload.');
        return;
      }
    }

    let finalThumbnail = thumbnailUrl.trim();
    if (!finalThumbnail) {
      finalThumbnail = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80';
    } else if (!isValidUrl(finalThumbnail)) {
      showError('Por favor, insira uma URL válida para a imagem de capa (Thumbnail).');
      return;
    }

    const videoToSave: Video = editingVideo ? {
      ...editingVideo,
      title: title.trim(),
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: finalThumbnail,
      duration: duration || 10,
      file_size: fileSize || 4500000,
      status,
    } : {
      id: Math.random().toString(36).substr(2, 9),
      store_id: store.id,
      title: title.trim(),
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: finalThumbnail,
      duration: duration || 10,
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
      console.error(error);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setSourceType(video.source_type);
    setVideoUrl(video.video_url);
    setThumbnailUrl(video.thumbnail_url);
    setDuration(video.duration);
    setFileSize(video.file_size);
    setStatus(video.status);
    setSelectedFileName(video.source_type === 'upload' ? 'Video_Original.mp4' : '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este vídeo? Ele será removido de todos os stories onde estiver sendo usado.')) {
      try {
        await db.videos.delete(id);
        const relatedStoryVideos = (await db.storyVideos.getAll()).filter(sv => sv.video_id === id);
        for (const sv of relatedStoryVideos) {
          await db.storyVideos.delete(sv.id);
        }
        showSuccess('Vídeo removido da galeria!');
        loadVideos();
      } catch (error) {
        showError('Erro ao excluir o vídeo.');
        console.error(error);
      }
    }
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
    showSuccess('URL copiada para a área de transferência!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getSourceTypeLabel = (type: Video['source_type']) => {
    switch (type) {
      case 'upload': return '📦 Upload';
      case 'instagram': return '📸 Instagram';
      case 'tiktok': return '🎵 TikTok';
      case 'external_url': return '🔗 URL Externa';
      case 'mobile_upload': return '📱 Celular';
      case 'gallery': return '🖼️ Galeria';
      default: return 'Vídeo';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando galeria de vídeos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Galeria</h1>
            <p className="text-slate-500 mt-1">
              Sua biblioteca centralizada de vídeos. Todos os arquivos cadastrados aqui ficam disponíveis para os seus stories.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-violet-100 transition-all self-start sm:self-auto"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Fechar Cadastro' : 'Adicionar vídeo'}
          </button>
        </div>

        {previewingVideoUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewingVideoUrl(null)}>
            <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-sm w-full relative border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Visualização de Vídeo</span>
                <button onClick={() => setPreviewingVideoUrl(null)} className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-[9/16] bg-black">
                <video src={previewingVideoUrl} controls autoPlay loop className="w-full h-full object-cover"></video>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 mb-8 max-w-2xl mx-auto transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">
                  {editingVideo ? `Editar Vídeo: ${editingVideo.title}` : 'Adicionar Vídeo à Biblioteca'}
                </h3>
              </div>
              <button onClick={handleCancelForm} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50">
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
                  placeholder="Ex: Unboxing Vestido Floral..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Origem do Vídeo *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['external_url', 'upload', 'instagram', 'tiktok', 'mobile_upload'] as Video['source_type'][]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSourceTypeChange(type)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                        sourceType === type
                          ? 'border-violet-600 bg-violet-50/50 text-violet-700 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span>{getSourceTypeLabel(type).split(' ')[1] || getSourceTypeLabel(type)}</span>
                      <span className="text-base">{getSourceTypeLabel(type).split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(sourceType === 'upload' || sourceType === 'mobile_upload') ? (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center">
                  <FileVideo className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Escolha um arquivo MP4 local</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Limite recomendado: 20MB</p>
                  
                  <label className="cursor-pointer bg-white border border-slate-200 hover:border-violet-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {selectedFileName && (
                    <div className="mt-3 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{selectedFileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL do Vídeo *
                  </label>
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={
                      sourceType === 'instagram' ? 'https://www.instagram.com/reel/YOUR_VIDEO_ID/' :
                      sourceType === 'tiktok' ? 'https://www.tiktok.com/@username/video/YOUR_VIDEO_ID' :
                      'https://example.com/seu-video.mp4'
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {sourceType === 'instagram' && 'Insira um link do Instagram.'}
                      {sourceType === 'tiktok' && 'Insira o link direto do vídeo do TikTok.'}
                      {sourceType === 'external_url' && 'Insira a URL direta terminando em .mp4 ou arquivo público.'}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  URL da Thumbnail / Capa (Opcional)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Duração (segundos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={duration || ''}
                    onChange={(e) => setDuration(parseInt(e.target.value) || undefined)}
                    placeholder="Ex: 15"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Video['status'])}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-semibold text-slate-800"
                  >
                    <option value="active">Ativo (visível na galeria do story)</option>
                    <option value="inactive">Inativo (arquivado)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {editingVideo ? 'Salvar Alterações' : 'Adicionar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Busca</span>
            <input
              type="text"
              placeholder="Pesquisar vídeo pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            />
          </div>

          <div className="w-full md:w-auto min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Origem do Vídeo</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            >
              <option value="all">Todas as origens</option>
              <option value="upload">Upload</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="external_url">URL externa</option>
              <option value="mobile_upload">Celular</option>
            </select>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center max-w-xl mx-auto">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Nenhum vídeo correspondente</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Ajuste seus filtros de busca ou adicione um novo vídeo para começar.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
            >
              Adicionar Primeiro Vídeo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group"
              >
                <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
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
                    onClick={() => setPreviewingVideoUrl(video.video_url)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    <div className="bg-white/90 p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                      <Play className="w-5 h-5 text-violet-600 fill-violet-600" />
                    </div>
                  </button>

                  {video.duration && (
                    <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-sm z-10">
                      ⏱️ {video.duration}s
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2" title={video.title}>
                      {video.title}
                    </h4>
                    <div className="text-[10px] text-slate-400 mt-1 font-medium space-y-0.5">
                      <p>Envio: {video.created_at ? new Date(video.created_at).toLocaleDateString('pt-BR') : 'Original'}</p>
                      {video.file_size && <p>Tamanho: {(video.file_size / 1024 / 1024).toFixed(1)} MB</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-50">
                    <button
                      onClick={() => setPreviewingVideoUrl(video.video_url)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-all flex items-center justify-center"
                      title="Visualizar vídeo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(video)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-all flex items-center justify-center"
                      title="Editar vídeo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopyUrl(video.video_url)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-all flex items-center justify-center"
                      title="Copiar link"
                    >
                      {copiedUrl === video.video_url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <Link
                      to={`/stories?videoId=${video.id}`}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-all flex items-center justify-center"
                      title="Usar em story"
                    >
                      <Film className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all flex items-center justify-center"
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
    </div>
  );
};

export default VideoGalleryPage;