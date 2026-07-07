import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection, DisplayLocation, PageRule, Product, StoryProduct, ConditionType, DisplayPosition } from '@/lib/db';
import { ArrowLeft, ExternalLink, Film, Image, Link as LinkIcon, Save, X, Edit3, ToggleLeft, ToggleRight, Eye as EyeIcon, MousePointerClick, Video as VideoIcon, LayoutGrid, LayoutList, MessageSquareText, Share2, Heart, Phone, GripVertical, PlusCircle, Trash2, XCircle, FolderHeart, Layers, Check, Plus } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideosList, setAllVideosList] = useState<Video[]>([]); // Todos os vídeos cadastrados
  const [storyVideos, setStoryVideos] = useState<StoryVideo[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyProducts, setStoryProducts] = useState<StoryProduct[]>([]);
  const [displayLocations, setDisplayLocations] = useState<DisplayLocation[]>([]);
  const [pageRules, setPageRules] = useState<PageRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Video selection tabs inside story edit form
  const [videoSelectTab, setVideoSelectTab] = useState<'gallery' | 'all_videos'>('gallery');

  // Custom Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

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
      setAllVideosList(fetchedVideos); // Todos os vídeos
      setVideos(fetchedVideos.filter(v => v.status === 'active')); // Apenas ativos para a aba 'Galeria'

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

      const newVideoIds = new Set(selectedVideoIds);

      for (const sv of storyVideos) {
        if (!newVideoIds.has(sv.video_id)) {
          await db.storyVideos.delete(sv.id);
        }
      }

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

      for (const sp of storyProducts) {
        await db.storyProducts.delete(sp.id);
      }
      if (formData.cta_enabled && formData.cta_type === 'product' && finalProductId && store) {
        await db.storyProducts.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: story.id,
          product_id: finalProductId,
        });
      }

      for (const dl of displayLocations) {
        await db.displayLocations.delete(dl.id);
      }
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

      for (const pr of pageRules) {
        await db.pageRules.delete(pr.id);
      }
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
      await loadStoryDetails();
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
      setDisplayLocations(displayLocations.filter(dl => dl.story_id === id));
      setPageRules(pageRules.filter(pr => pr.story_id === id));
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-base text-slate-400 font-semibold">Carregando detalhes do story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Story não encontrado</h1>
            <Link to="/stories" className="mt-6 inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold">
              Voltar
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentThumbnailUrl = allVideosList.find(v => v.id === selectedVideoIds[0])?.thumbnail_url || 'https://via.placeholder.com/150';
  const currentVideoList = videoSelectTab === 'gallery' ? videos : allVideosList;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-violet-400">Ficha Técnica do Story</p>
            <h1 className="text-3xl font-black mt-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-transparent border-b border-slate-800 focus:outline-none focus:border-violet-500 text-3xl font-black text-slate-100"
                />
              ) : (
                story.title
              )}
            </h1>
          </div>

          <div className="flex gap-3 self-start sm:self-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-semibold text-sm transition-all"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:text-white font-bold text-sm transition-all"
                >
                  <Edit3 className="w-4 h-4" /> Editar Story
                </button>
                <Link
                  to="/stories"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:text-white font-bold text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <section className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="relative aspect-[9/16] bg-slate-950">
              <img
                src={currentThumbnailUrl}
                alt={isEditing ? formData.title : story.title}
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
              <div className="absolute top-4 right-4">
                <span className={cn("px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider", story.active ? "bg-emerald-500 text-white" : "bg-slate-600 text-white")}>
                  {story.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-xl font-extrabold text-slate-100 pb-3 border-b border-slate-850">Informações principais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-850 bg-slate-950 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">ID de Controle</p>
                  <p className="mt-2 text-sm md:text-base font-mono text-slate-300 break-all">{story.id}</p>
                </div>
                <div className="rounded-2xl border border-slate-850 bg-slate-950 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Posição no Widget</p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: Number(e.target.value) }))}
                      className="w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-bold"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-black text-slate-100">#{story.position}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-xl font-extrabold text-slate-100 pb-3 border-b border-slate-850">Vídeos do Story</h2>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setVideoSelectTab('gallery')}
                      className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        videoSelectTab === 'gallery' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Galeria (Ativos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSelectTab('all_videos')}
                      className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        videoSelectTab === 'all_videos' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Todos os vídeos
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-800 rounded-2xl bg-slate-950">
                    {currentVideoList.map(video => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleVideoSelection(video.id)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          selectedVideoIds.includes(video.id) ? 'border-violet-500' : 'border-slate-850'
                        }`}
                      >
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {storyVideos.map(sv => {
                    const video = allVideosList.find(v => v.id === sv.video_id);
                    return video ? (
                      <div key={sv.id} className="relative aspect-video rounded-xl overflow-hidden shadow-md">
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/60 px-1.5 py-0.5 rounded">{video.title}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  );
};

export default StoryDetailsPage;