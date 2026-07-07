import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection, DisplayLocation, PageRule, Product, StoryProduct, ConditionType, DisplayPosition } from '@/lib/db';
import { ArrowLeft, ExternalLink, Film, Image, Link as LinkIcon, Save, X, Edit3, ToggleLeft, ToggleRight, Eye as EyeIcon, MousePointerClick, Video as VideoIcon, LayoutGrid, LayoutList, MessageSquareText, Share2, Heart, Phone, GripVertical, PlusCircle, Trash2, XCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [storyVideos, setStoryVideos] = useState<StoryVideo[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyProducts, setStoryProducts] = useState<StoryProduct[]>([]);
  const [displayLocations, setDisplayLocations] = useState<DisplayLocation[]>([]);
  const [pageRules, setPageRules] = useState<PageRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: undefined as string | undefined,
    cta_enabled: true,
    cta_text: "",
    cta_type: 'custom_link' as CTAType,
    cta_url: "",
    whatsapp_message: "",
    position: 1,
    view_count: 0,
    click_count: 0,
  });
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [newProductForm, setNewProductForm] = useState({ name: '', product_url: '', image_url: '', price: 0 });

  const loadStoryDetails = useCallback(async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (!mainStore) {
        setStory(null);
        return;
      }

      const fetchedStories = await db.stories.getAll(mainStore.id);
      const currentStory = fetchedStories.find((item) => item.id === id);
      setStory(currentStory || null);

      const fetchedVideos = await db.videos.getAll(mainStore.id);
      setVideos(fetchedVideos.filter(v => v.status === 'active'));

      const fetchedStoryVideos = await db.storyVideos.getAll(mainStore.id);
      const currentStoryVideos = fetchedStoryVideos.filter(sv => sv.story_id === id).sort((a, b) => a.position - b.position);
      setStoryVideos(currentStoryVideos);
      setSelectedVideoIds(currentStoryVideos.map(sv => sv.video_id));

      const fetchedAppearances = await db.appearances.getAll(mainStore.id);
      setAppearances(fetchedAppearances);

      const fetchedProducts = await db.products.getAll(mainStore.id);
      setProducts(fetchedProducts);

      const fetchedStoryProducts = await db.storyProducts.getAll(mainStore.id);
      const currentStoryProducts = fetchedStoryProducts.filter(sp => sp.story_id === id);
      setStoryProducts(currentStoryProducts);
      setSelectedProductId(currentStoryProducts[0]?.product_id || undefined);

      const fetchedDisplayLocations = await db.displayLocations.getAll(mainStore.id);
      setDisplayLocations(fetchedDisplayLocations.filter(dl => dl.story_id === id));

      const fetchedPageRules = await db.pageRules.getAll(mainStore.id);
      setPageRules(fetchedPageRules.filter(pr => pr.story_id === id));

      if (currentStory) {
        setFormData({
          title: currentStory.title,
          format: currentStory.format,
          scroll_direction: currentStory.scroll_direction || 'horizontal',
          active: currentStory.active,
          appearance_id: currentStory.appearance_id || undefined,
          cta_enabled: currentStory.cta_enabled,
          cta_text: currentStory.cta_text || "",
          cta_type: currentStory.cta_type,
          cta_url: currentStory.cta_url || "",
          whatsapp_message: currentStory.whatsapp_message || "",
          position: currentStory.position,
          view_count: currentStory.view_count || 0,
          click_count: currentStory.click_count || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do story:', error);
      showError('Erro ao carregar os detalhes do story.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStoryDetails();
  }, [loadStoryDetails]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || isSaving) return;

    // Validations
    if (!formData.title.trim()) { showError('Por favor, preencha o título do story.'); return; }
    if (selectedVideoIds.length === 0) { showError('Por favor, selecione pelo menos um vídeo para o story.'); return; }
    if (formData.cta_enabled && formData.cta_type === 'custom_link' && (!formData.cta_url.trim() || !isValidUrl(formData.cta_url))) { showError('Por favor, forneça uma URL de CTA válida ou desative o CTA.'); return; }
    if (formData.cta_enabled && formData.cta_type === 'whatsapp' && !formData.whatsapp_message.trim()) { showError('Por favor, forneça uma mensagem padrão para o WhatsApp.'); return; }
    if (displayLocations.some(dl => !dl.selector.trim())) { showError('Por favor, preencha todos os seletores de local de exibição.'); return; }
    if (pageRules.some(pr => (pr.condition_type !== 'all_pages' && pr.condition_type !== 'home_only' && pr.condition_type !== 'product_pages' && pr.condition_type !== 'category_pages') && !pr.value?.trim())) { showError('Por favor, preencha todos os valores das regras de página ou selecione uma condição sem valor.'); return; }
    if (formData.cta_enabled && formData.cta_type === 'product' && !selectedProductId && !newProductForm.name) { showError('Por favor, selecione um produto existente ou cadastre um novo.'); return; }
    if (newProductForm.name && (!newProductForm.product_url || !isValidUrl(newProductForm.product_url) || !newProductForm.image_url || !isValidUrl(newProductForm.image_url) || newProductForm.price <= 0)) { showError('Por favor, preencha todos os campos do novo produto corretamente.'); return; }

    try {
      setIsSaving(true);

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

      // 2. Update Story
      const updatedStory: Story = {
        ...story,
        title: formData.title,
        format: formData.format,
        scroll_direction: formData.format === 'carousel' ? formData.scroll_direction : undefined,
        active: formData.active,
        appearance_id: formData.appearance_id || undefined,
        cta_enabled: formData.cta_enabled,
        cta_text: formData.cta_text || undefined,
        cta_type: formData.cta_enabled ? formData.cta_type : 'none',
        cta_url: formData.cta_enabled && formData.cta_type === 'custom_link' ? formData.cta_url : undefined,
        whatsapp_message: formData.cta_enabled && formData.cta_type === 'whatsapp' ? formData.whatsapp_message : undefined,
        position: formData.position,
        view_count: formData.view_count,
        click_count: formData.click_count,
        updated_at: new Date().toISOString(),
      };
      await db.stories.save(updatedStory);

      // 3. Update StoryVideos
      const existingStoryVideoIds = new Set(storyVideos.map(sv => sv.video_id));
      const newVideoIds = new Set(selectedVideoIds);

      // Remover StoryVideos não selecionados
      for (const sv of storyVideos) {
        if (!newVideoIds.has(sv.video_id)) {
          await db.storyVideos.delete(sv.id);
        }
      }

      // Adicionar/Atualizar StoryVideos selecionados
      for (let i = 0; i < selectedVideoIds.length; i++) {
        const videoId = selectedVideoIds[i];
        const existingSv = storyVideos.find(sv => sv.video_id === videoId);
        const newPosition = i + 1;
        const isCover = i === 0;

        if (existingSv) {
          if (existingSv.position !== newPosition || existingSv.is_cover !== isCover) {
            await db.storyVideos.save({ ...existingSv, position: newPosition, is_cover: isCover });
          }
        } else {
          await db.storyVideos.save({
            id: Math.random().toString(36).substr(2, 9),
            story_id: story.id,
            video_id: videoId,
            position: newPosition,
            is_cover: isCover,
          });
        }
      }

      // 4. Update StoryProducts
      // Remover produtos antigos
      for (const sp of storyProducts) {
        await db.storyProducts.delete(sp.id);
      }
      // Adicionar novo produto se aplicável
      if (formData.cta_enabled && formData.cta_type === 'product' && finalProductId && store) {
        await db.storyProducts.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: story.id,
          product_id: finalProductId,
        });
      }

      // 5. Update DisplayLocations
      // Remover locais antigos
      for (const dl of displayLocations) {
        await db.displayLocations.delete(dl.id);
      }
      // Adicionar novos locais
      for (const dl of displayLocations) {
        if (store) {
          await db.displayLocations.save({
            id: Math.random().toString(36).substr(2, 9),
            store_id: store.id,
            story_id: story.id,
            selector: dl.selector,
            position: dl.position,
          });
        }
      }

      // 6. Update PageRules
      // Remover regras antigas
      for (const pr of pageRules) {
        await db.pageRules.delete(pr.id);
      }
      // Adicionar novas regras
      for (const pr of pageRules) {
        if (store) {
          await db.pageRules.save({
            id: Math.random().toString(36).substr(2, 9),
            store_id: store.id,
            story_id: story.id,
            condition_type: pr.condition_type,
            value: pr.value,
          });
        }
      }

      showSuccess('Story atualizado com sucesso!');
      setIsEditing(false);
      await loadStoryDetails(); // Recarrega os dados para atualizar a UI
    } catch (error) {
      console.error("Erro ao salvar story:", error);
      showError("Erro ao salvar alterações do story.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (story) {
      setFormData({
        title: story.title,
        format: story.format,
        scroll_direction: story.scroll_direction || 'horizontal',
        active: story.active,
        appearance_id: story.appearance_id || undefined,
        cta_enabled: story.cta_enabled,
        cta_text: story.cta_text || "",
        cta_type: story.cta_type,
        cta_url: story.cta_url || "",
        whatsapp_message: story.whatsapp_message || "",
        position: story.position,
        view_count: story.view_count || 0,
        click_count: story.click_count || 0,
      });
      setSelectedVideoIds(storyVideos.map(sv => sv.video_id));
      setSelectedProductId(storyProducts[0]?.product_id || undefined);
      setNewProductForm({ name: '', product_url: '', image_url: '', price: 0 });
      setDisplayLocations(displayLocations.filter(dl => dl.story_id === id)); // Reset to original fetched
      setPageRules(pageRules.filter(pr => pr.story_id === id)); // Reset to original fetched
    }
    setIsEditing(false);
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
    setDisplayLocations(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), store_id: store?.id || '', story_id: story?.id || '', selector: '', position: 'after_element' }]);
  };

  const updateDisplayLocation = (index: number, field: string, value: string) => {
    setDisplayLocations(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeDisplayLocation = (index: number) => {
    setDisplayLocations(prev => prev.filter((_, i) => i !== index));
  };

  const addPageRule = () => {
    setPageRules(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), store_id: store?.id || '', story_id: story?.id || '', condition_type: 'contains', value: '' }]);
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
        <p className="text-sm text-slate-500 font-medium">
          Carregando detalhes do story...
        </p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />

            <h1 className="text-2xl font-bold text-slate-900">
              Story não encontrado
            </h1>

            <p className="text-slate-500 text-sm mt-2 mb-6">
              Não encontramos nenhum story com este identificador.
            </p>

            <Link
              to="/stories"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Stories
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentThumbnailUrl = videos.find(v => v.id === selectedVideoIds[0])?.thumbnail_url || 'https://via.placeholder.com/150';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-violet-600">
              Detalhes do Story
            </p>

            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-transparent border-b border-slate-200 focus:outline-none focus:border-violet-500 text-3xl font-bold text-slate-900"
                />
              ) : (
                story.title
              )}
            </h1>

            <p className="text-slate-500 mt-1">
              {isEditing ? "Edite as informações do story abaixo." : "Visualize as informações cadastradas para este story."}
            </p>
          </div>

          <div className="flex gap-3 self-start sm:self-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all self-start sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Story
                </button>
                <Link
                  to="/stories"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="relative aspect-[9/16] bg-slate-900">
              <img
                src={currentThumbnailUrl}
                alt={isEditing ? formData.title : story.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

              <div className="absolute top-4 right-4">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm transition-all ${
                      formData.active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {formData.active ? 'Ativo' : 'Inativo'}
                  </button>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${
                      story.active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {story.active ? 'Ativo' : 'Inativo'}
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-lg font-bold">{isEditing ? formData.title : story.title}</p>
                <p className="text-white/70 text-xs mt-1">
                  Posição #{isEditing ? formData.position : story.position}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">
                Informações principais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    ID
                  </p>
                  <p className="mt-2 text-sm font-mono text-slate-800 break-all">
                    {story.id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  {isEditing ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          formData.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <span>{formData.active ? 'Ativo' : 'Inativo'}</span>
                        {formData.active ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.active ? 'Ativo' : 'Inativo'}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Posição
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      #{story.position}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Formato
                  </p>
                  {isEditing ? (
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as StoryFormat }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    >
                      <option value="carousel">Carrossel de Vídeos</option>
                      <option value="floating_widget">Widget Flutuante</option>
                      <option value="grid">Grade de Vídeos</option>
                    </select>
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.format === 'carousel' ? 'Carrossel' : story.format === 'floating_widget' ? 'Widget Flutuante' : 'Grade'}
                    </p>
                  )}
                </div>

                {formData.format === 'carousel' && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Direção de Rolagem
                    </p>
                    {isEditing ? (
                      <select
                        value={formData.scroll_direction}
                        onChange={(e) => setFormData(prev => ({ ...prev, scroll_direction: e.target.value as ScrollDirection }))}
                        className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                      >
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    ) : (
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {story.scroll_direction === 'horizontal' ? 'Horizontal' : 'Vertical'}
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Loja
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800 break-all">
                    {store?.name || story.store_id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Visualizações
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={formData.view_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, view_count: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.view_count || 0}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cliques no CTA
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={formData.click_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, click_count: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.click_count || 0}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">
                Vídeos do Story
              </h2>
              {isEditing ? (
                <div>
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
                  <p className="text-xs text-slate-400 mt-1.5">
                    Selecione os vídeos que farão parte deste story. O primeiro vídeo selecionado será a capa.
                  </p>
                  {selectedVideoIds.length > 0 && (
                    <div className="space-y-3 p-4 border border-slate-200 rounded-xl bg-slate-50 mt-4">
                      <h5 className="text-sm font-bold text-slate-700">Vídeos Selecionados ({selectedVideoIds.length})</h5>
                      <ul className="space-y-2">
                        {selectedVideoIds.map((videoId, index) => {
                          const video = videos.find(v => v.id === videoId);
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
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {storyVideos.map(sv => {
                    const video = videos.find(v => v.id === sv.video_id);
                    return video ? (
                      <div key={sv.id} className="relative aspect-video rounded-lg overflow-hidden shadow-sm">
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 text-[8px] text-white bg-black/50 px-1 py-0.5 rounded-sm">{video.title}</span>
                        {sv.is_cover && (
                          <span className="absolute top-1 right-1 text-[8px] text-white bg-violet-600 px-1.5 py-0.5 rounded-full">Capa</span>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">
                Configurações de CTA
              </h2>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      CTA Ativado
                    </p>
                  </div>
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cta_enabled: !prev.cta_enabled }))}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        formData.cta_enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>{formData.cta_enabled ? 'Ativado' : 'Desativado'}</span>
                      {formData.cta_enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.cta_enabled ? 'Sim' : 'Não'}
                    </p>
                  )}
                </div>

                {formData.cta_enabled && (
                  <>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquareText className="w-4 h-4 text-violet-600" />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Texto do Botão CTA
                        </p>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.cta_text}
                          onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                          placeholder="Ex: Comprar Agora"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                        />
                      ) : (
                        <p className="mt-2 text-sm font-medium text-slate-800 break-all">
                          {story.cta_text || 'Nenhum texto definido'}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="w-4 h-4 text-violet-600" />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Tipo de Ação CTA
                        </p>
                      </div>
                      {isEditing ? (
                        <select
                          value={formData.cta_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, cta_type: e.target.value as CTAType }))}
                          className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                        >
                          <option value="custom_link">Link Personalizado</option>
                          <option value="product">Produto</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="none">Nenhuma Ação</option>
                        </select>
                      ) : (
                        <p className="mt-2 text-sm font-medium text-slate-800 break-all">
                          {story.cta_type === 'custom_link' ? 'Link Personalizado' : story.cta_type === 'product' ? 'Produto' : story.cta_type === 'whatsapp' ? 'WhatsApp' : 'Nenhuma Ação'}
                        </p>
                      )}
                    </div>

                    {formData.cta_type === 'custom_link' && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <LinkIcon className="w-4 h-4 text-violet-600" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            URL do Link CTA *
                          </p>
                        </div>
                        {isEditing ? (
                          <input
                            type="url"
                            value={formData.cta_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, cta_url: e.target.value }))}
                            placeholder="https://example.com/product"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                          />
                        ) : story.cta_url ? (
                          <a
                            href={story.cta_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                          >
                            {story.cta_url}
                            <ExternalLink className="w-4 h-4 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-sm text-slate-500">Nenhum link de CTA cadastrado.</p>
                        )}
                      </div>
                    )}

                    {formData.cta_type === 'whatsapp' && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-violet-600" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Mensagem WhatsApp
                          </p>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={formData.whatsapp_message}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_message: e.target.value }))}
                            placeholder="Olá! Tenho interesse neste produto do story."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800 resize-y"
                          />
                        ) : story.whatsapp_message ? (
                          <p className="text-sm font-medium text-slate-800 break-all">
                            {story.whatsapp_message}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">Nenhuma mensagem WhatsApp cadastrada para este story.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Seção: Produto Vinculado */}
              {isEditing && formData.cta_enabled && formData.cta_type === 'product' && (
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
                  <div key={dl.id} className="flex flex-col md:flex-row gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
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
                  <div key={pr.id} className="flex flex-col md:flex-row gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
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
                  onClick={handleCancelEdit}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StoryDetailsPage;