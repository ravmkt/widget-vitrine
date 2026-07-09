import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection, DisplayLocation, PageRule, Product, StoryProduct, SizingModel } from '@/lib/db';
import { ArrowLeft, Film, Save, X, Edit3, ShoppingBag, Ruler, Palette } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideosList, setAllVideosList] = useState<Video[]>([]);
  const [storyVideos, setStoryVideos] = useState<StoryVideo[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyProducts, setStoryProducts] = useState<StoryProduct[]>([]);
  const [displayLocations, setDisplayLocations] = useState<DisplayLocation[]>([]);
  const [pageRules, setPageRules] = useState<PageRule[]>([]);
  const [sizingModels, setSizingModels] = useState<SizingModel[]>([]);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [videoSelectTab, setVideoSelectTab] = useState<'gallery' | 'all_videos'>('gallery');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: undefined as string | undefined,
    model_id: undefined as string | undefined,
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
      setAllVideosList(fetchedVideos);
      setVideos(fetchedVideos.filter(v => v.status === 'active'));

      const fetchedStoryVideos = await db.storyVideos.getAll(mainStore.id);
      const currentStoryVideos = fetchedStoryVideos.filter(sv => sv.story_id === id).sort((a, b) => a.position - b.position);
      setStoryVideos(currentStoryVideos);
      setSelectedVideoIds(currentStoryVideos.map(sv => sv.video_id));

      const fetchedAppearances = await db.appearances.getAll(mainStore.id);
      setAppearances(fetchedAppearances);

      const fetchedProducts = await db.products.getAll(mainStore.id);
      setProducts(fetchedProducts);

      const fetchedStoryProducts = await db.storyProducts.getAll();
      const currentStoryProducts = fetchedStoryProducts.filter(sp => sp.story_id === id);
      setStoryProducts(currentStoryProducts);
      setSelectedProductId(currentStoryProducts[0]?.product_id || undefined);

      const fetchedDisplayLocations = await db.displayLocations.getAll(mainStore.id);
      setDisplayLocations(fetchedDisplayLocations.filter(dl => dl.story_id === id));

      const fetchedPageRules = await db.pageRules.getAll(mainStore.id);
      setPageRules(fetchedPageRules.filter(pr => pr.story_id === id));

      const fetchedSizing = await db.sizingModels.getAll(mainStore.id);
      setSizingModels(fetchedSizing);

      if (currentStory) {
        setFormData({
          title: currentStory.title,
          format: currentStory.format,
          scroll_direction: currentStory.scroll_direction || 'horizontal',
          active: currentStory.active,
          appearance_id: currentStory.appearance_id || undefined,
          model_id: currentStory.model_id || undefined,
          cta_enabled: currentStory.cta_enabled,
          cta_text: currentStory.cta_text || "",
          cta_type: currentStory.cta_type,
          cta_url: currentStory.cta_url || "",
          whatsapp_message: currentStory.whatsapp_message || "",
          position: Number(currentStory.position) || 1,
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

    const errors: Record<string, string> = {};

    if (!formData.title.trim()) { errors.title = 'Título é obrigatório.'; }
    if (selectedVideoIds.length === 0) { errors.videos = 'Selecione ao menos um vídeo.'; }
    
    if (formData.cta_enabled) {
      if (formData.cta_type === 'custom_link' && (!formData.cta_url.trim() || !isValidUrl(formData.cta_url))) {
        errors.ctaUrl = 'URL de CTA inválida.';
      }
      if (formData.cta_type === 'whatsapp' && !formData.whatsapp_message.trim()) {
        errors.whatsappMessage = 'Mensagem de WhatsApp é obrigatória.';
      }
      if (formData.cta_type === 'product' && !selectedProductId) {
        errors.productSelection = 'Selecione um produto.';
      }
    }

    if (Object.keys(errors).length > 0) {
      console.error("Erros de validação story:", errors);
      setFormErrors(errors);
      showError('Ajuste os campos incorretos antes de salvar as alterações.');
      return;
    }

    setFormErrors({});

    try {
      setIsSaving(true);

      const updatedStory: Story = {
        ...story,
        title: formData.title.trim(),
        format: formData.format,
        scroll_direction: formData.format === 'carousel' ? formData.scroll_direction : undefined,
        active: formData.active,
        appearance_id: formData.appearance_id || undefined,
        model_id: formData.model_id || undefined,
        cta_enabled: formData.cta_enabled,
        cta_text: formData.cta_text.trim() || undefined,
        cta_type: formData.cta_enabled ? formData.cta_type : 'none',
        cta_url: formData.cta_enabled && formData.cta_type === 'custom_link' ? formData.cta_url.trim() : undefined,
        whatsapp_message: formData.cta_enabled && formData.cta_type === 'whatsapp' ? formData.whatsapp_message.trim() : undefined,
        position: Number(formData.position) || 1,
        view_count: formData.view_count,
        click_count: formData.click_count,
        updated_at: new Date().toISOString(),
      };

      console.log("Payload edição story:", updatedStory);
      await db.stories.save(updatedStory);

      const currentVideoIds = new Set(selectedVideoIds);
      for (const sv of storyVideos) {
        if (!currentVideoIds.has(sv.video_id)) {
          await db.storyVideos.delete(sv.id);
        }
      }

      for (let i = 0; i < selectedVideoIds.length; i++) {
        const videoId = selectedVideoIds[i];
        const existingSv = storyVideos.find(sv => sv.video_id === videoId);
        const newPos = i + 1;
        const isCover = i === 0;

        if (existingSv) {
          if (existingSv.position !== newPos || existingSv.is_cover !== isCover) {
            await db.storyVideos.save({ ...existingSv, position: newPos, is_cover: isCover });
          }
        } else {
          await db.storyVideos.save({
            id: Math.random().toString(36).substr(2, 9),
            story_id: story.id,
            video_id: videoId,
            position: newPos,
            is_cover: isCover,
          });
        }
      }

      for (const sp of storyProducts) {
        await db.storyProducts.delete(sp.id);
      }
      if (formData.cta_enabled && formData.cta_type === 'product' && selectedProductId) {
        await db.storyProducts.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: story.id,
          product_id: selectedProductId,
        });
      }

      showSuccess('Story atualizado com sucesso!');
      setIsEditing(false);
      await loadStoryDetails();
    } catch (error) {
      console.error("Erro Supabase/API ao editar story:", error);
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
        model_id: story.model_id || undefined,
        cta_enabled: story.cta_enabled,
        cta_text: story.cta_text || "",
        cta_type: story.cta_type,
        cta_url: story.cta_url || "",
        whatsapp_message: story.whatsapp_message || "",
        position: Number(story.position) || 1,
        view_count: story.view_count || 0,
        click_count: story.click_count || 0,
      });
      setSelectedVideoIds(storyVideos.map(sv => sv.video_id));
      setSelectedProductId(storyProducts[0]?.product_id || undefined);
    }
    setFormErrors({});
    setIsEditing(false);
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
    <div className="min-h-screen bg-[#F7FAFC] text-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
             <Link to="/stories" className="p-2 hover:bg-white border border-slate-200 rounded-xl transition-all">
                <ArrowLeft size={20} className="text-slate-500" />
             </Link>
             <div>
                <h1 className="text-3xl font-black mt-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={cn("bg-white border focus:outline-none rounded-xl text-xl font-bold text-slate-900 p-2", formErrors.title ? "border-rose-500" : "border-slate-200")}
                    />
                  ) : (
                    story.title
                  )}
                </h1>
             </div>
          </div>

          <div className="flex gap-3 self-start sm:self-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 font-bold text-sm transition-all"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-[#0094EB] hover:bg-[#0E4787] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" /> Salvar Configurações
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-[#0094EB] font-bold text-sm transition-all"
              >
                <Edit3 className="w-4 h-4" /> Editar Story
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-2">
            <div className="relative aspect-[9/16] bg-slate-50 rounded-[1.5rem] overflow-hidden">
              <img
                src={currentThumbnailUrl}
                alt={story.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider", story.active ? "bg-emerald-500 text-white" : "bg-slate-300 text-white")}>
                  {story.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
                  <Palette className="w-5 h-5 text-[#0094EB]" /> Configurações Gerais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Posição na Loja</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: Number(e.target.value) }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                      />
                    ) : (
                      <p className="text-lg font-black text-[#0094EB]">Ordem: #{story.position}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tabela de Medidas</label>
                    {isEditing ? (
                      <select
                        value={formData.model_id || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value || undefined }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                      >
                        <option value="">Nenhuma tabela</option>
                        {sizingModels.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <Ruler size={16} className="text-slate-400" />
                        {sizingModels.find(m => m.id === story.model_id)?.name || "Nenhuma vinculada"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
                  <ShoppingBag className="w-5 h-5 text-[#0094EB]" /> Call to Action (CTA)
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Botão de Ação</h4>
                      <p className="text-xs text-slate-500 font-medium">Exibe um botão de compra ou link no story.</p>
                    </div>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, cta_enabled: !prev.cta_enabled }))}
                        className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", formData.cta_enabled ? "bg-[#0094EB]" : "bg-slate-300")}
                      >
                        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", formData.cta_enabled ? "translate-x-6" : "translate-x-1")} />
                      </button>
                    ) : (
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", story.cta_enabled ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400")}>
                        {story.cta_enabled ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    )}
                  </div>

                  {formData.cta_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Texto do Botão</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.cta_text}
                          onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                          placeholder="Ex: Comprar Agora"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Destino do Clique</label>
                        <select
                          disabled={!isEditing}
                          value={formData.cta_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, cta_type: e.target.value as CTAType }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] disabled:opacity-50"
                        >
                          <option value="custom_link">Link Externo</option>
                          <option value="product">Vincular Produto</option>
                          <option value="whatsapp">Falar no WhatsApp</option>
                        </select>
                      </div>

                      {formData.cta_type === 'product' && (
                        <div className="md:col-span-2 space-y-2">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Produto Selecionado</label>
                          <select
                            disabled={!isEditing}
                            value={selectedProductId || ""}
                            onChange={(e) => setSelectedProductId(e.target.value || undefined)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] disabled:opacity-50"
                          >
                            <option value="">Selecione um produto</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formData.cta_type === 'custom_link' && (
                        <div className="md:col-span-2 space-y-2">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">URL de Destino</label>
                          <input
                            type="url"
                            disabled={!isEditing}
                            value={formData.cta_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, cta_url: e.target.value }))}
                            placeholder="https://sualoja.com/produto"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
        onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default StoryDetailsPage;