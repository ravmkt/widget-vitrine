import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection, DisplayLocation, PageRule, Product, StoryProduct, ConditionType, DisplayPosition } from '@/lib/db';
import { Plus, Film, Eye, Trash2, Edit3, Sparkles, ToggleLeft, ToggleRight, Copy, Check, Eye as EyeIcon, MousePointerClick, Video as VideoIcon, LayoutGrid, LayoutList, MessageSquareText, Share2, Heart, Phone, GripVertical, ExternalLink, Search, Filter, XCircle, PlusCircle, FolderHeart, Layers } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoriesPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideosList, setAllVideosList] = useState<Video[]>([]); // Todos os vídeos cadastrados (ativos e inativos)
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, StoryVideo[]>>(new Map());
  const [displayLocationsMap, setDisplayLocationsMap] = useState<Map<string, DisplayLocation[]>>(new Map());
  const [pageRulesMap, setPageRulesMap] = useState<Map<string, PageRule[]>>(new Map());

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterFormat, setFilterFormat] = useState<'all' | StoryFormat>('all');

  // Video selection tabs inside story creation form
  const [videoSelectTab, setVideoSelectTab] = useState<'gallery' | 'all_videos'>('gallery');

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
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [newProductForm, setNewProductForm] = useState({ name: '', product_url: '', image_url: '', price: 0 });
  const [displayLocations, setDisplayLocations] = useState<Omit<DisplayLocation, 'id' | 'store_id' | 'story_id' | 'created_at' | 'updated_at'>[]>([]);
  const [pageRules, setPageRules] = useState<Omit<PageRule, 'id' | 'store_id' | 'story_id' | 'created_at' | 'updated_at'>[]>([]);

  const loadStoriesData = useCallback(async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedStories = await db.stories.getAll(mainStore.id);
        setAllStories(fetchedStories.sort((a, b) => a.position - b.position));

        const fetchedVideos = await db.videos.getAll(mainStore.id);
        setAllVideosList(fetchedVideos); // Todos os vídeos cadastrados na galeria (independente de status)
        setVideos(fetchedVideos.filter(v => v.status === 'active')); // Apenas ativos para a aba 'Galeria'

        const fetchedAppearances = await db.appearances.getAll(mainStore.id);
        setAppearances(fetchedAppearances);

        const fetchedProducts = await db.products.getAll(mainStore.id);
        setProducts(fetchedProducts);

        const fetchedStoryVideos = await db.storyVideos.getAll(mainStore.id);
        const svMap = new Map<string, StoryVideo[]>();
        fetchedStoryVideos.forEach(sv => {
          if (!svMap.has(sv.story_id)) svMap.set(sv.story_id, []);
          svMap.get(sv.story_id)?.push(sv);
        });
        svMap.forEach(arr => arr.sort((a, b) => a.position - b.position));
        setStoryVideosMap(svMap);

        const fetchedDisplayLocations = await db.displayLocations.getAll(mainStore.id);
        const dlMap = new Map<string, DisplayLocation[]>();
        fetchedDisplayLocations.forEach(dl => {
          if (!dlMap.has(dl.story_id)) dlMap.set(dl.story_id, []);
          dlMap.get(dl.story_id)?.push(dl);
        });
        setDisplayLocationsMap(dlMap);

        const fetchedPageRules = await db.pageRules.getAll(mainStore.id);
        const prMap = new Map<string, PageRule[]>();
        fetchedPageRules.forEach(pr => {
          if (!prMap.has(pr.story_id)) prMap.set(pr.story_id, []);
          prMap.get(pr.story_id)?.push(pr);
        });
        setPageRulesMap(prMap);
        
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
  }, []);

  useEffect(() => {
    loadStoriesData();
  }, [loadStoriesData]);

  useEffect(() => {
    let currentStories = allStories;

    if (filterStatus !== 'all') {
      currentStories = currentStories.filter(s => s.active === (filterStatus === 'active'));
    }

    if (filterFormat !== 'all') {
      currentStories = currentStories.filter(s => s.format === filterFormat);
    }

    if (searchTerm) {
      currentStories = currentStories.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStories(currentStories);
  }, [allStories, filterStatus, filterFormat, searchTerm]);

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

    // Basic Validations
    if (!title.trim()) { showError('Por favor, preencha o título do story.'); return; }
    if (selectedVideoIds.length === 0) { showError('Por favor, selecione pelo menos um vídeo para o story.'); return; }
    if (ctaEnabled && ctaType === 'custom_link' && (!ctaUrl.trim() || !isValidUrl(ctaUrl))) { showError('Por favor, forneça uma URL de CTA válida ou desative o CTA.'); return; }
    if (ctaEnabled && ctaType === 'whatsapp' && !whatsappMessage.trim()) { showError('Por favor, forneça uma mensagem padrão para o WhatsApp.'); return; }
    if (displayLocations.some(dl => !dl.selector.trim())) { showError('Por favor, preencha todos os seletores de local de exibição.'); return; }
    if (pageRules.some(pr => (pr.condition_type !== 'all_pages' && pr.condition_type !== 'home_only' && pr.condition_type !== 'product_pages' && pr.condition_type !== 'category_pages') && !pr.value?.trim())) { showError('Por favor, preencha todos os valores das regras de página ou selecione uma condição sem valor.'); return; }
    if (ctaEnabled && ctaType === 'product' && !selectedProductId && !newProductForm.name) { showError('Por favor, selecione um produto existente ou cadastre um novo.'); return; }
    if (newProductForm.name && (!newProductForm.product_url || !isValidUrl(newProductForm.product_url) || !newProductForm.image_url || !isValidUrl(newProductForm.image_url) || newProductForm.price <= 0)) { showError('Por favor, preencha todos os campos do novo produto corretamente.'); return; }


    try {
      // 1. Save new product if applicable
      let finalProductId = selectedProductId;
      if (newProductForm.name && store) {
        const newProduct: Product = {
          id: Math.random().toString(36).substr(2, 9),
          store_id: store.id,
          name: newProductForm.name,
          product_url: newProductForm.product_url,
          image_url: newProductForm.image_url,
          price: newProductForm.price,
          active: true,
        };
        const savedProduct = await db.products.save(newProduct);
        finalProductId = savedProduct.id;
      }

      // 2. Create Story
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
      const savedStory = await db.stories.save(newStory);

      // 3. Save StoryVideos
      for (let i = 0; i < selectedVideoIds.length; i++) {
        const videoId = selectedVideoIds[i];
        await db.storyVideos.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: savedStory.id,
          video_id: videoId,
          position: i + 1,
          is_cover: i === 0,
        });
      }

      // 4. Save StoryProduct
      if (ctaEnabled && ctaType === 'product' && finalProductId) {
        await db.storyProducts.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: savedStory.id,
          product_id: finalProductId,
        });
      }

      // 5. Save DisplayLocations
      for (const dl of displayLocations) {
        await db.displayLocations.save({
          id: Math.random().toString(36).substr(2, 9),
          store_id: store.id,
          story_id: savedStory.id,
          selector: dl.selector,
          position: dl.position,
        });
      }

      // 6. Save PageRules
      for (const pr of pageRules) {
        await db.pageRules.save({
          id: Math.random().toString(36).substr(2, 9),
          store_id: store.id,
          story_id: savedStory.id,
          condition_type: pr.condition_type,
          value: pr.value,
        });
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
      setSelectedProductId(undefined);
      setNewProductForm({ name: '', product_url: '', image_url: '', price: 0 });
      setDisplayLocations([]);
      setPageRules([]);
      setShowForm(false);
      
      // Reload list
      loadStoriesData();
    } catch (error) {
      showError('Erro ao criar o story.');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este story? Isso também removerá os vídeos, produtos, regras e locais de exibição associados.')) {
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

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
    setSelectedVideoIds(prev => {
      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(index, 1);
      if (direction === 'up') {
        newOrder.splice(index - 1, 0, movedItem);
      } else {
        newOrder.splice(index + 1, 0, movedItem);
      }
      return newOrder;
    });
  };

  const handleSetCoverVideo = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newOrder = prev.filter(id => id !== videoId);
      return [videoId, ...newOrder];
    });
  };

  const addDisplayLocation = () => {
    setDisplayLocations(prev => [...prev, { selector: '', position: 'after_element' }]);
  };

  const updateDisplayLocation = (index: number, field: string, value: string) => {
    setDisplayLocations(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeDisplayLocation = (index: number) => {
    setDisplayLocations(prev => prev.filter((_, i) => i !== index));
  };

  const addPageRule = () => {
    setPageRules(prev => [...prev, { condition_type: 'contains', value: '' }]);
  };

  const updatePageRule = (index: number, field: string, value: string) => {
    setPageRules(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removePageRule = (index: number) => {
    setPageRules(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando seus stories...</p>
      </div>
    );
  }

  // Determine active video list based on selected tab
  const currentVideoList = videoSelectTab === 'gallery' ? videos : allVideosList;

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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-bold text-slate-800">Cadastrar Novo Story</h3>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-8">
              {/* Seção: Informações Básicas */}
              <div className="space-y-5">
                <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Informações Básicas</h4>
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

                {format === 'carousel' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Direção de Rolagem do Carrossel
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

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Aparência Personalizada
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={appearanceId || ''}
                      onChange={(e) => setAppearanceId(e.target.value || undefined)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    >
                      <option value="">Usar Aparência Padrão da Loja</option>
                      {appearances.map(app => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => alert('Funcionalidade em breve!')} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all" title="Adicionar Nova Aparência"><PlusCircle className="w-4 h-4" /></button>
                    <button type="button" onClick={() => alert('Funcionalidade em breve!')} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all" title="Editar Aparência Selecionada"><Edit3 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Define o estilo visual (cores, botões, etc.) para este story.
                  </p>
                </div>

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
              </div>

              {/* Seção: Vídeos/Imagens com Abas da Galeria */}
              <div className="space-y-5">
                <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Vídeos do Story *</h4>
                
                {/* Abas: Galeria e Todos os Vídeos */}
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setVideoSelectTab('gallery')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                      videoSelectTab === 'gallery'
                        ? 'border-violet-600 text-violet-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FolderHeart className="w-4 h-4" />
                    Galeria (Ativos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSelectTab('all_videos')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                      videoSelectTab === 'all_videos'
                        ? 'border-violet-600 text-violet-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    Todos os vídeos
                  </button>
                </div>

                <div>
                  {currentVideoList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-sm text-slate-500">Nenhum vídeo disponível nesta aba. Adicione vídeos na aba Galeria primeiro.</p>
                      <Link to="/gallery" className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-600 font-bold hover:underline">
                        Ir para Galeria de Vídeos <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                      {currentVideoList.map(video => (
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
                          {video.status === 'inactive' && (
                            <span className="absolute top-1 left-1 text-[7px] text-white bg-red-600 px-1 py-0.2 rounded-sm uppercase font-bold">Inativo</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    Selecione os vídeos que farão parte deste story. O primeiro vídeo selecionado será a capa.
                  </p>
                </div>

                {selectedVideoIds.length > 0 && (
                  <div className="space-y-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <h5 className="text-sm font-bold text-slate-700">Vídeos Selecionados ({selectedVideoIds.length})</h5>
                    <ul className="space-y-2">
                      {selectedVideoIds.map((videoId, index) => {
                        const video = allVideosList.find(v => v.id === videoId);
                        if (!video) return null;
                        const isCover = index === 0;
                        return (
                          <li key={video.id} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                            <img src={video.thumbnail_url} alt={video.title} className="w-12 h-12 object-cover rounded-md" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{video.title}</p>
                              <p className="text-xs text-slate-500">{video.duration}s</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCover && <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold">Capa</span>}
                              <button type="button" onClick={() => handleSetCoverVideo(video.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Definir como capa">
                                <Film className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => handleMoveVideo(index, 'up')} disabled={index === 0} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-50" title="Mover para cima">▲</button>
                              <button type="button" onClick={() => handleMoveVideo(index, 'down')} disabled={index === selectedVideoIds.length - 1} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-50" title="Mover para baixo">▼</button>
                              <button type="button" onClick={() => handleVideoSelection(video.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" title="Remover"><XCircle className="w-4 h-4" /></button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Seção: Chamada para Ação */}
              <div className="space-y-5">
                <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Chamada para Ação (CTA)</h4>
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
                        <option value="product">Produto</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="none">Nenhuma Ação</option>
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
              </div>

              {/* Seção: Produto Vinculado */}
              {ctaEnabled && ctaType === 'product' && (
                <div className="space-y-5">
                  <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Produto Vinculado</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Selecionar Produto Existente
                    </label>
                    <select
                      value={selectedProductId || ''}
                      onChange={(e) => { setSelectedProductId(e.target.value || undefined); setNewProductForm({ name: '', product_url: '', image_url: '', price: 0 }); }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    >
                      <option value="">Nenhum produto selecionado</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name} - R${product.price.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold">Ou Cadastrar Rápido</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="space-y-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <h5 className="text-sm font-bold text-slate-700">Novo Produto</h5>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome do Produto</label>
                      <input type="text" value={newProductForm.name} onChange={(e) => { setNewProductForm(prev => ({ ...prev, name: e.target.value })); setSelectedProductId(undefined); }} placeholder="Nome do Produto" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL do Produto</label>
                      <input type="url" value={newProductForm.product_url} onChange={(e) => setNewProductForm(prev => ({ ...prev, product_url: e.target.value }))} placeholder="https://sua-loja.com.br/produto" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL da Imagem</label>
                      <input type="url" value={newProductForm.image_url} onChange={(e) => setNewProductForm(prev => ({ ...prev, image_url: e.target.value }))} placeholder="https://sua-loja.com.br/imagem.jpg" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preço</label>
                      <input type="number" step="0.01" min="0" value={newProductForm.price} onChange={(e) => setNewProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} placeholder="99.90" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800" />
                    </div>
                  </div>
                </div>
              )}

              {/* Seção: Local de Exibição */}
              <div className="space-y-5">
                <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Local de Exibição</h4>
                {displayLocations.length === 0 && <p className="text-sm text-slate-500">Nenhum local de exibição configurado. O widget não aparecerá na loja.</p>}
                {displayLocations.map((dl, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seletor CSS *</label>
                      <input type="text" required value={dl.selector} onChange={(e) => updateDisplayLocation(index, 'selector', e.target.value)} placeholder=".minha-div-alvo" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Posição *</label>
                      <select required value={dl.position} onChange={(e) => updateDisplayLocation(index, 'position', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800">
                        <option value="after_element">Abaixo do elemento</option>
                        <option value="before_element">Acima do elemento</option>
                        <option value="inside_start">Dentro do elemento (início)</option>
                        <option value="inside_end">Dentro do elemento (final)</option>
                        <option value="replace_element">Substituir elemento</option>
                        <option value="fixed_bottom_right">Fixo: Inferior Direita</option>
                        <option value="fixed_bottom_left">Fixo: Inferior Esquerda</option>
                        <option value="fixed_top_right">Fixo: Superior Direita</option>
                        <option value="fixed_top_left">Fixo: Superior Esquerda</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeDisplayLocation(index)} className="p-2.5 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all self-end md:self-auto" title="Remover Local"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addDisplayLocation} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
                  <PlusCircle className="w-4 h-4" /> Adicionar Local de Exibição
                </button>
              </div>

              {/* Seção: Qual Página Irá Aparecer */}
              <div className="space-y-5">
                <h4 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2">Regras de Página</h4>
                {pageRules.length === 0 && <p className="text-sm text-slate-500">Nenhuma regra de página configurada. O widget aparecerá em todas as páginas.</p>}
                {pageRules.map((pr, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Condição *</label>
                      <select required value={pr.condition_type} onChange={(e) => updatePageRule(index, 'condition_type', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800">
                        <option value="contains">Contém</option>
                        <option value="equals">É igual</option>
                        <option value="not_equals">Não é igual</option>
                        <option value="starts_with">Começa com</option>
                        <option value="ends_with">Termina com</option>
                        <option value="regex">Regex</option>
                        <option value="all_pages">Todas as Páginas</option>
                        <option value="home_only">Apenas Home</option>
                        <option value="product_pages">Páginas de Produto</option>
                        <option value="category_pages">Páginas de Categoria</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor / URL</label>
                      <input type="text" value={pr.value || ''} onChange={(e) => updatePageRule(index, 'value', e.target.value)} placeholder="/caminho-da-pagina" disabled={['all_pages', 'home_only', 'product_pages', 'category_pages'].includes(pr.condition_type)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400" />
                    </div>
                    <button type="button" onClick={() => removePageRule(index)} className="p-2.5 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all self-end md:self-auto" title="Remover Regra"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addPageRule} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
                  <PlusCircle className="w-4 h-4" /> Adicionar Regra de Página
                </button>
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

        {/* Filtros e Busca */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título do story..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value as 'all' | StoryFormat)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
            >
              <option value="all">Todos os Formatos</option>
              <option value="carousel">Carrossel</option>
              <option value="floating_widget">Widget Flutuante</option>
              <option value="grid">Grade</option>
            </select>
          </div>
        </div>

        {/* Lista de Stories */}
        {filteredStories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center max-w-2xl mx-auto">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Nenhum story encontrado</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              {searchTerm || filterStatus !== 'all' || filterFormat !== 'all' ? 'Ajuste seus filtros ou termos de busca.' : 'Comece adicionando seu primeiro story em vídeo para engajar seus clientes.'}
            </p>
            {(!searchTerm && filterStatus === 'all' && filterFormat === 'all') && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Primeiro Story
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => {
              const coverVideo = storyVideosMap.get(story.id)?.find(sv => sv.is_cover);
              const thumbnailUrl = allVideosList.find(v => v.id === coverVideo?.video_id)?.thumbnail_url || 'https://via.placeholder.com/150';
              const appearanceName = appearances.find(app => app.id === story.appearance_id)?.name || 'Padrão da Loja';
              const mainPageRule = pageRulesMap.get(story.id)?.[0];
              const mainDisplayLocation = displayLocationsMap.get(story.id)?.[0];
              const videoCount = storyVideosMap.get(story.id)?.length || 0;

              return (
                <div
                  key={story.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"
                >
                  {/* Thumbnail Preview */}
                  <div className="relative aspect-[9/16] max-h-[280px] bg-slate-900 overflow-hidden">
                    <img
                      src={thumbnailUrl}
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
                      <p className="text-xs text-slate-400 font-mono mt-1 truncate">Formato: {story.format} ({videoCount} vídeos)</p>
                      <p className="text-xs text-slate-400 mt-0.5">Aparência: {appearanceName}</p>
                      {mainPageRule && (
                        <p className="text-xs text-slate-400 mt-0.5">Regra: {mainPageRule.condition_type} {mainPageRule.value ? `: ${mainPageRule.value}` : ''}</p>
                      )}
                      {mainDisplayLocation && (
                        <p className="text-xs text-slate-400 mt-0.5">Local: {mainDisplayLocation.position} {mainDisplayLocation.selector ? `: ${mainDisplayLocation.selector}` : ''}</p>
                      )}
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
                      {/* Curtidas - Placeholder */}
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-violet-500" />
                        <span>0</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                      <Link
                        to={`/stories/${story.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-violet-50 hover:text-violet-600 text-slate-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </Link>
                      <Link
                        to={`/widget/${store?.id}?storyId=${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-100 hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-all"
                        title="Visualizar Story"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => alert('Funcionalidade de duplicar em breve!')}
                        className="p-2.5 rounded-xl border border-slate-100 hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-all"
                        title="Duplicar Story"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StoriesPage;