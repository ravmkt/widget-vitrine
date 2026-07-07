import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/db';
import { Plus, Film, Play, Eye, Trash2, Edit3, Sparkles, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoriesPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  // const [whatsappNumber, setWhatsappNumber] = useState(''); // Removido: WhatsApp agora é global
  const [position, setPosition] = useState(1);
  const [active, setActive] = useState(true);

  const loadStoriesData = async () => {
    try {
      const stores = await db.getStores();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedStories = await db.getStories(mainStore.id);
        setStories(fetchedStories);
        // Set next position
        const maxPos = fetchedStories.reduce((max, s) => s.position > max ? s.position : max, 0);
        setPosition(maxPos + 1);
      }
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
      showError('Erro ao carregar a lista de stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoriesData();
  }, []);

  const handleCopyStoreId = () => {
    if (store?.id) {
      navigator.clipboard.writeText(store.id);
      setCopiedId(true);
      showSuccess('ID da loja copiado com sucesso!');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    if (!title.trim()) {
      showError('Por favor, preença o título do story.');
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
    if (ctaLink.trim() && !isValidUrl(ctaLink)) {
      showError('Por favor, forneça uma URL de CTA válida (começando com http/https) ou deixe em branco.');
      return;
    }

    const newStory: Story = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: store.id,
      title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      cta_link: ctaLink || undefined,
      // whatsapp_number: whatsappNumber || undefined, // Removido: WhatsApp agora é global
      active,
      position,
    };

    try {
      await db.saveStory(newStory);
      showSuccess('Story criado com sucesso!');
      
      // Reset form
      setTitle('');
      setVideoUrl('');
      setThumbnailUrl('');
      setCtaLink('');
      // setWhatsappNumber(''); // Removido: WhatsApp agora é global
      setActive(true);
      setShowForm(false);
      
      // Reload list
      loadStoriesData();
    } catch (error) {
      showError('Erro ao criar o story.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este story?')) {
      try {
        await db.deleteStory(id);
        showSuccess('Story excluído com sucesso!');
        loadStoriesData();
      } catch (error) {
        showError('Erro ao excluir o story.');
      }
    }
  };

  const handleToggleActive = async (story: Story) => {
    const updated = { ...story, active: !story.active };
    try {
      await db.saveStory(updated);
      showSuccess(`Story ${updated.active ? 'ativado' : 'desativado'} com sucesso!`);
      loadStoriesData();
    } catch (error) {
      showError('Erro ao atualizar status do story.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando seus stories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Teste do ID da Loja */}
        {store && (
          <div className="mb-6 bg-violet-50 border border-violet-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-violet-700 font-medium shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="bg-violet-600 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider self-start sm:self-auto">
                Dica de Teste
              </span>
              <span>
                ID da loja para teste do widget: <code className="font-mono bg-white px-2 py-1 rounded-lg border border-violet-200/60 text-violet-800 font-bold">{store.id}</code>
              </span>
            </div>
            <button
              onClick={handleCopyStoreId}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-violet-100 text-violet-700 px-3.5 py-2 rounded-xl border border-violet-200 transition-all font-bold shadow-sm self-start sm:self-auto"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId ? 'Copiado!' : 'Copiar ID'}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gerenciador de Stories</h1>
            <p className="text-slate-500 mt-1">
              Crie, edite e organize a ordem de exibição dos seus stories em vídeo.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Fechar Formulário' : 'Novo Story'}
          </button>
        </div>

        {/* Formulário de Criação */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 max-w-3xl">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-bold text-slate-800">Cadastrar Novo Story</h3>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Título do Story *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Nova Coleção Outono 🍂"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Link de Compra (CTA)
                  </label>
                  <input
                    type="url"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="https://useanny.com.br/produtos/vestido"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL do Vídeo (MP4) *
                  </label>
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                  />
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
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Removido: Campo de WhatsApp individual do story */}
              {/* <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Número de WhatsApp (para este Story)
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ex: 5545999629702"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Se preenchido, este número será usado para o botão de WhatsApp deste story. Caso contrário, usará o da loja.
                </p>
              </div> */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ordem de Exibição (Posição)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={position}
                    onChange={(e) => setPosition(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Status Inicial
                  </label>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span>{active ? 'Ativo no Widget' : 'Inativo / Rascunho'}</span>
                    {active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                >
                  Salvar Story
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Stories */}
        {stories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center max-w-2xl mx-auto">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Nenhum story cadastrado</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Comece adicionando seu primeiro story em vídeo para engajar seus clientes.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Story
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-[9/16] max-h-[280px] bg-slate-900 overflow-hidden">
                  <img
                    src={story.thumbnail_url}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Badge de Status */}
                  <button
                    onClick={() => handleToggleActive(story)}
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm transition-all ${
                      story.active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {story.active ? 'Ativo' : 'Inativo'}
                  </button>

                  {/* Posição */}
                  <span className="absolute bottom-4 left-4 bg-black/40 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">
                    Posição #{story.position}
                  </span>
                </div>

                {/* Detalhes */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{story.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">{story.video_url}</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                    <Link
                      to={`/stories/${story.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-violet-50 hover:text-violet-600 text-slate-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar Detalhes
                    </Link>
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                      title="Excluir Story"
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

export default StoriesPage;