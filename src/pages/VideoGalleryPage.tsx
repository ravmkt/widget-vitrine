import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, Video, Store } from '@/lib/db';
import { Film, UploadCloud, Plus, Trash2, Edit3, Check, X, Play } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const VideoGalleryPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<Video['source_type']>('external_url');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Video['status']>('active');

  const loadVideos = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedVideos = await db.videos.getAll(mainStore.id);
        setVideos(fetchedVideos);
      }
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      showError('Erro ao carregar a galeria de vídeos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    if (!title.trim()) {
      showError('Por favor, preencha o título do vídeo.');
      return;
    }
    if (!videoUrl.trim() || !isValidUrl(videoUrl)) {
      showError('Por favor, forneça uma URL de vídeo válida (começando com http/https).');
      return;
    }
    if (!thumbnailUrl.trim() || !isValidUrl(thumbnailUrl)) {
      showError('Por favor, forneça uma URL de thumbnail válida (começando com http/https).');
      return;
    }

    const videoToSave: Video = editingVideo ? {
      ...editingVideo,
      title,
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      file_size: fileSize,
      status,
    } : {
      id: Math.random().toString(36).substr(2, 9),
      store_id: store.id,
      title,
      source_type: sourceType,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      file_size: fileSize,
      status,
    };

    try {
      await db.videos.save(videoToSave);
      showSuccess(`Vídeo ${editingVideo ? 'atualizado' : 'adicionado'} com sucesso!`);
      
      // Reset form
      setTitle('');
      setSourceType('external_url');
      setVideoUrl('');
      setThumbnailUrl('');
      setDuration(undefined);
      setFileSize(undefined);
      setStatus('active');
      setEditingVideo(null);
      setShowForm(false);
      
      loadVideos();
    } catch (error) {
      showError(`Erro ao ${editingVideo ? 'atualizar' : 'adicionar'} o vídeo.`);
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
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este vídeo? Ele será removido de todos os stories onde estiver sendo usado.')) {
      try {
        await db.videos.delete(id);
        // Remover StoryVideos que usam este vídeo
        const relatedStoryVideos = (await db.storyVideos.getAll()).filter(sv => sv.video_id === id);
        for (const sv of relatedStoryVideos) {
          await db.storyVideos.delete(sv.id);
        }
        showSuccess('Vídeo excluído com sucesso!');
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
    setShowForm(false);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Galeria de Vídeos</h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus arquivos de vídeo para usar em stories e carrosséis.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Fechar Formulário' : 'Novo Vídeo'}
          </button>
        </div>

        {/* Formulário de Criação/Edição */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 max-w-3xl">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <UploadCloud className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-bold text-slate-800">
                {editingVideo ? 'Editar Vídeo' : 'Adicionar Novo Vídeo'}
              </h3>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Título do Vídeo *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Vídeo de Lançamento"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Tipo de Fonte *
                  </label>
                  <select
                    required
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as Video['source_type'])}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  >
                    <option value="external_url">URL Externa (MP4)</option>
                    <option value="upload" disabled>Upload (Em breve)</option>
                    <option value="instagram" disabled>Instagram (Em breve)</option>
                    <option value="tiktok" disabled>TikTok (Em breve)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  URL do Vídeo (MP4) *
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/seu-video.mp4"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  A URL direta para o arquivo de vídeo (formato MP4 recomendado).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  URL da Thumbnail (Imagem de Capa) *
                </label>
                <input
                  type="url"
                  required
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/capa-do-video.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  A URL para a imagem de capa que será exibida antes do vídeo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Duração (segundos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={duration || ''}
                    onChange={(e) => setDuration(parseInt(e.target.value) || undefined)}
                    placeholder="Ex: 30"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Tamanho do Arquivo (bytes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fileSize || ''}
                    onChange={(e) => setFileSize(parseInt(e.target.value) || undefined)}
                    placeholder="Ex: 5000000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Status
                </label>
                <select
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Video['status'])}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
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
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                >
                  {editingVideo ? 'Salvar Alterações' : 'Adicionar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Vídeos */}
        {videos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center max-w-2xl mx-auto">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Nenhum vídeo na galeria</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Adicione vídeos para usar em seus stories e carrosséis.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Vídeo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-video max-h-[180px] bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Badge de Status */}
                  <span
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${
                      video.status === 'active'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {video.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>

                  {/* Play Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white fill-white/80" />
                  </div>
                </div>

                {/* Detalhes */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{video.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">{video.video_url}</p>
                  </div>

                  {/* Métricas/Info */}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    {video.duration && (
                      <div className="flex items-center gap-1">
                        <Film className="w-4 h-4 text-violet-500" />
                        <span>{video.duration}s</span>
                      </div>
                    )}
                    {video.file_size && (
                      <div className="flex items-center gap-1">
                        <UploadCloud className="w-4 h-4 text-violet-500" />
                        <span>{(video.file_size / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                    <button
                      onClick={() => handleEdit(video)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-violet-50 hover:text-violet-600 text-slate-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                      title="Excluir Vídeo"
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