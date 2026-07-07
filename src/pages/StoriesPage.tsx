import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection } from '@/lib/db';
import { Plus, Film, Eye, Trash2, Edit3, Sparkles, ToggleLeft, ToggleRight, Copy, Check, Eye as EyeIcon, MousePointerClick, Video as VideoIcon, LayoutGrid, LayoutList, MessageSquareText, Share2, Heart, Phone } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoriesPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<StoryFormat>('carousel');
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('horizontal');
  const [active, setActive] = useState(true);
  const [appearanceId, setAppearanceId] = useState<string | undefined>(undefined);
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaText, setCtaText] = useState('');
  const [ctaType, setCtaType] = useState<CTAType>('custom_link');
  const [ctaUrl, setCtaUrl] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [position, setPosition] = useState(1);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  const loadStoriesData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedStories = await db.stories.getAll(mainStore.id);
        setStories(fetchedStories.sort((a, b) => a.position - b.position));

        const fetchedVideos = await db.videos.getAll(mainStore.id);
        setVideos(fetchedVideos.filter(v => v.status === 'active'));

        const fetchedAppearances = await db.appearances.getAll(mainStore.id);
        setAppearances(fetchedAppearances);
        
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
      showError('Por favor, preencha o título do story.');
      return;
    }
    if (selectedVideoIds.length === 0) {
      showError('Por favor, selecione pelo menos um vídeo para o story.');
      return;
    }
    if (ctaEnabled && ctaType === 'custom_link' && (!ctaUrl.trim() || !isValidUrl(ctaUrl))) {
      showError('Por favor, forneça uma URL de CTA válida ou desative o CTA.');
      return;
    }
    if (ctaEnabled && ctaType === 'whatsapp' && !whatsappMessage.trim()) {
      showError('Por favor, forneça uma mensagem padrão para o WhatsApp.');
      return;
    }

    const newStory: Story = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: store.id,
      title,
      format,
      scroll_direction: format === 'carousel' ? scrollDirection : undefined,
      active,
      appearance_id: appearanceId || undefined,
      cta_enabled: ctaEnabled,
      cta_text: ctaText || undefined,
      cta_type: ctaEnabled ? ctaType : 'none',
      cta_url: ctaEnabled && ctaType === 'custom_link' ? ctaUrl : undefined,
      whatsapp_message: ctaEnabled && ctaType === 'whatsapp' ? whatsappMessage : undefined,
      position,
      view_count: 0,
      click_count: 0,
    };

    try {
      const savedStory = await db.stories.save(newStory);

      // Salvar StoryVideos
      const storyVideosToSave: StoryVideo[] = selectedVideoIds.map((videoId, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        story_id: savedStory.id,
        video_id: videoId,
        position: index + 1,
        is_cover: index === 0,
      }));
      for (const sv of storyVideosToSave) {
        await db.storyVideos.save(sv);
      }

      showSuccess('Story criado com sucesso!');
      
      // Reset form
      setTitle('');
      setFormat('carousel');
      setScrollDirection('horizontal');
      setActive(true);
      setAppearanceId(undefined);
      setCtaEnabled(true);
      setCtaText('');
      setCtaType('custom_link');
      setCtaUrl('');
      setWhatsappMessage('');
      setSelectedVideoIds([]);
      setShowForm(false);
      
      // Reload list
      loadStoriesData();
    } catch (error) {
      showError('Erro ao criar o story.');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este story? Isso também removerá os vídeos e regras associadas.')) {
      try {
        // Deletar StoryVideos relacionados
        const relatedStoryVideos = (await db.storyVideos.getAll()).filter(sv => sv.story_id === id);
        for (const sv of relatedStoryVideos) {
          await db.storyVideos.delete(sv.id);
        }
        // Deletar DisplayLocations relacionadas
        const relatedDisplayLocations = (await db.displayLocations.getAll()).filter(dl => dl.story_id === id);
        for (const dl of relatedDisplayLocations) {
          await db.displayLocations.delete(dl.id);
        }
        // Deletar PageRules relacionadas
        const relatedPageRules = (await db.pageRules.getAll()).filter(pr => pr.story_id === id);
        for (const pr of relatedPageRules) {
          await db.pageRules.delete(pr.id);
        }
        // Deletar StoryProducts relacionadas
        const relatedStoryProducts = (await db.storyProducts.getAll()).filter(sp => sp.story_id === id);
        for (const sp of relatedStoryProducts) {
          await db.storyProducts.delete(sp.id);
        }
        // Deletar Comentários relacionados
        const relatedComments = (await db.comments.getAll()).filter(c => c.story_id === id);
        for (const c of relatedComments) {
          await db.comments.delete(c.id);
        }
        // Deletar o Story
        await db.stories.delete(id);
        showSuccess('Story excluído com sucesso!');
        loadStoriesData();
      } catch (error) {
        showError('Erro ao excluir o story.');
        console.error(error);
      }
    }
  };

  const handleToggleActive = async (story: Story) => {
    const updated = { ...story, active: !story.active };
    try {
      await db.stories.save(updated);
      showSuccess(`Story ${updated.active ? 'ativado' : 'desativado'} com sucesso!`);
      loadStoriesData();
    } catch (error) {
      showError('Erro ao atualizar status do story.');
    }
  };

  const handleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => 
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
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
              {/* Título e Formato */}
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
                    Formato de Exibição *
                  </label>
                  <select
                    required
                    value={format}
                    onChange={(e) => setFormat(e.target.value as StoryFormat)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  >
                    <option value="carousel">Carrossel de Vídeos</option>
                    <option value="floating_widget">Widget Flutuante (1 Vídeo)</option>
                    <option value="grid">Grade de Vídeos</option>
                  </select>
                </div>
              </div>

              {/* Direção de Scroll (apenas para Carrossel) */}
              {format === 'carousel' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Direção de Scroll do Carrossel
                  </label>
                  <select
                    value={scrollDirection}
                    onChange={(e) => setScrollDirection(e.target.value as ScrollDirection)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              )}

              {/* Seleção de Aparência */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Aparência Personalizada
                </label>
                <select
                  value={appearanceId || ''}
                  onChange={(e) => setAppearanceId(e.target.value || undefined)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                >
                  <option value="">Usar Aparência Padrão da Loja</option>
                  {appearances.map(app => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Define o estilo visual (cores, botões, etc.) para este story.
                </p>
              </div>

              {/* Seleção de Vídeos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <VideoIcon className="w-4 h-4 text-violet-600" />
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Vídeos do Story *
                  </label>
                </div>
                {videos.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum vídeo disponível na galeria. Adicione vídeos primeiro.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                    {videos.map(video => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleVideoSelection(video.id)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          selectedVideoIds.includes(video.id) ? 'border-violet-600 ring-2 ring-violet-500' : 'border-slate-200 hover:border-violet-300'
                        }`}
                      >
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          {selectedVideoIds.includes(video.id) ? (
                            <Check className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <Plus className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <span className="absolute bottom-1 left-1 text-[8px] text-white bg-black/50 px-1 py-0.5 rounded-sm">{video.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1.5">
                  Selecione os vídeos que farão parte deste story. O primeiro vídeo selecionado será a capa.
                </p>
              </div>

              {/* Configurações de CTA */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800">Botão de Ação (CTA)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ative um botão de chamada para ação no player do story.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCtaEnabled(!ctaEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    ctaEnabled ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ctaEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {ctaEnabled && (
                <div className="space-y-5 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Texto do Botão CTA
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Ex: Comprar Agora, Ver Produto"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Tipo de Ação CTA *
                    </label>
                    <select
                      required
                      value={ctaType}
                      onChange={(e) => setCtaType(e.target.value as CTAType)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    >
                      <option value="custom_link">Link Personalizado</option>
                      <option value="product">Produto (ainda não implementado)</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  {ctaType === 'custom_link' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        URL do Link CTA *
                      </label>
                      <input
                        type="url"
                        required
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="https://sua-loja.com.br/link-do-produto"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                      />
                    </div>
                  )}

                  {ctaType === 'whatsapp' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Mensagem WhatsApp (para este Story) *
                      </label>
                      <textarea
                        required
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        placeholder="Olá! Tenho interesse neste produto do story."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800 resize-y"
                      />
                      <p className="text-xs text-slate-400 mt-1.5">
                        Esta mensagem será enviada ao clicar no botão WhatsApp deste story.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ordem de Exibição e Status */}
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
                    src={videos.find(v => v.id === selectedVideoIds[0])?.thumbnail_url || 'https://via.placeholder.com/150'} // Usar o primeiro vídeo selecionado como thumbnail
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
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">Formato: {story.format}</p>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <EyeIcon className="w-4 h-4 text-violet-500" />
                      <span>{story.view_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointerClick className="w-4 h-4 text-violet-500" />
                      <span>{story.click_count || 0}</span>
                    </div>
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