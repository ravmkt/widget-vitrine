import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, CTAType, ScrollDirection, DisplayLocation, PageRule, Product, StoryProduct, SizingModel } from '@/lib/db';
import { ArrowLeft, Film, Save, X, Edit3, Trash2, Ruler, ShoppingBag, PlusCircle, Check, Plus, Palette } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [allVideosList, setAllVideosList] = useState<Video[]>([]);
  const [activeVideos, setActiveVideos] = useState<Video[]>([]);
  const [storyVideos, setStoryVideos] = useState<StoryVideo[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizingModels, setSizingModels] = useState<SizingModel[]>([]);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states populated from story
  const [formData, setFormData] = useState({
    title: "",
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: "" as string,
    cta_enabled: true,
    cta_text: "Comprar Agora",
    cta_type: 'custom_link' as CTAType,
    cta_url: "",
    whatsapp_message: "",
    position: "1", // Use string for input handling, convert to number on save
    product_id: "" as string,
    model_id: "" as string
  });
  
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [displayLocations, setDisplayLocations] = useState<DisplayLocation[]>([]);
  const [pageRules, setPageRules] = useState<PageRule[]>([]);

  const loadStoryDetails = useCallback(async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      const fetchedStory = await db.stories.getById(id!);
      if (!fetchedStory) return;
      setStory(fetchedStory);

      // Load Support Data
      const [vids, storyVids, apps, prods, models, storyProds, locations, rules] = await Promise.all([
        db.videos.getAll(mainStore.id),
        db.storyVideos.getAll(),
        db.appearances.getAll(mainStore.id),
        db.products.getAll(mainStore.id),
        db.sizingModels.getAll(mainStore.id),
        db.storyProducts.getAll(),
        db.displayLocations.getAll(mainStore.id),
        db.pageRules.getAll(mainStore.id)
      ]);

      setAllVideosList(vids);
      setActiveVideos(vids.filter(v => v.status === 'active'));
      setAppearances(apps);
      setProducts(prods);
      setSizingModels(models);

      const currentStoryVideos = storyVids.filter(sv => sv.story_id === id).sort((a, b) => a.position - b.position);
      setStoryVideos(currentStoryVideos);
      setSelectedVideoIds(currentStoryVideos.map(sv => sv.video_id));

      const currentProductRel = storyProds.find(sp => sp.story_id === id);
      
      setDisplayLocations(locations.filter(dl => dl.story_id === id));
      setPageRules(rules.filter(pr => pr.story_id === id));

      // Populate Form
      setFormData({
        title: fetchedStory.title || "",
        format: fetchedStory.format || 'carousel',
        scroll_direction: fetchedStory.scroll_direction || 'horizontal',
        active: fetchedStory.active,
        appearance_id: fetchedStory.appearance_id || "",
        cta_enabled: fetchedStory.cta_enabled,
        cta_text: fetchedStory.cta_text || "Comprar Agora",
        cta_type: fetchedStory.cta_type || 'custom_link',
        cta_url: fetchedStory.cta_url || "",
        whatsapp_message: fetchedStory.whatsapp_message || "",
        position: String(fetchedStory.position || 1),
        product_id: currentProductRel?.product_id || "",
        model_id: "" // We will handle this in future schema updates
      });

    } catch (error) {
      console.error('Erro ao carregar edição:', error);
      showError('Erro ao carregar os detalhes do story.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadStoryDetails(); }, [loadStoryDetails]);

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || isSaving) return;

    // Validation
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push("Título é obrigatório");
    if (selectedVideoIds.length === 0) errors.push("Pelo menos um vídeo é necessário");
    if (formData.cta_enabled && formData.cta_type === 'custom_link' && !formData.cta_url) errors.push("URL de CTA é necessária");

    if (errors.length > 0) {
      console.error("Erros de validação story:", errors);
      showError("Ajuste os campos obrigatórios antes de salvar.");
      return;
    }

    try {
      setIsSaving(true);

      const payload: Story = {
        ...story,
        title: formData.title.trim(),
        format: formData.format,
        scroll_direction: formData.format === 'carousel' ? formData.scroll_direction : undefined,
        active: formData.active,
        appearance_id: formData.appearance_id || undefined,
        cta_enabled: formData.cta_enabled,
        cta_text: formData.cta_text,
        cta_type: formData.cta_type,
        cta_url: formData.cta_url || undefined,
        whatsapp_message: formData.whatsapp_message || undefined,
        position: parseInt(formData.position) || 1,
        updated_at: new Date().toISOString()
      };

      console.log("Payload edição story:", payload);
      await db.stories.save(payload);

      // Save Story-Video Relations
      // 1. Delete old
      for (const sv of storyVideos) {
        await db.storyVideos.delete(sv.id);
      }
      // 2. Add new
      for (let i = 0; i < selectedVideoIds.length; i++) {
        await db.storyVideos.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: story.id,
          video_id: selectedVideoIds[i],
          position: i + 1,
          is_cover: i === 0
        });
      }

      // Save Product Relation
      const oldRels = (await db.storyProducts.getAll()).filter(sp => sp.story_id === story.id);
      for (const or of oldRels) await db.storyProducts.delete(or.id);
      
      if (formData.cta_enabled && formData.cta_type === 'product' && formData.product_id) {
        await db.storyProducts.save({
          id: Math.random().toString(36).substr(2, 9),
          story_id: story.id,
          product_id: formData.product_id
        });
      }

      showSuccess('Story editado com sucesso!');
      setIsEditing(false);
      loadStoryDetails();
    } catch (error) {
      console.error("Erro Supabase/API ao editar story:", error);
      showError("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">{isEditing ? "Editando Story" : story?.title}</h1>
            <p className="text-slate-400 mt-1">Gerencie vídeos, produtos e modelos vinculados.</p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold">Cancelar</button>
                <button onClick={handleSaveStory} disabled={isSaving} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold shadow-lg hover:bg-violet-700 transition-all">
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold flex items-center gap-2">
                <Edit3 size={18} /> Editar Story
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Seção 1: Vídeos */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Film size={22} className="text-violet-500" /> Vídeos do Story</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isEditing ? (
                  activeVideos.map(v => (
                    <button 
                      key={v.id} 
                      onClick={() => {
                        setSelectedVideoIds(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id]);
                      }}
                      className={cn(
                        "relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all",
                        selectedVideoIds.includes(v.id) ? "border-violet-500 ring-4 ring-violet-500/20" : "border-slate-800"
                      )}
                    >
                      <img src={v.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        {selectedVideoIds.includes(v.id) ? <Check className="text-emerald-400" /> : <Plus className="text-white" />}
                      </div>
                    </button>
                  ))
                ) : (
                  storyVideos.map(sv => {
                    const v = allVideosList.find(vi => vi.id === sv.video_id);
                    return v && (
                      <div key={sv.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-slate-800">
                        <img src={v.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-md text-[10px] text-white font-bold">{v.title}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Seção 2: Produto e Modelo */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ShoppingBag size={22} className="text-violet-500" /> Vínculos de E-commerce</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Produto Vinculado</label>
                  <select 
                    disabled={!isEditing}
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                  >
                    <option value="">Nenhum produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Modelo / Guia de Medidas</label>
                  <select 
                    disabled={!isEditing}
                    value={formData.model_id}
                    onChange={(e) => setFormData({...formData, model_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                  >
                    <option value="">Nenhuma modelo</option>
                    {sizingModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Configs */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-6 border-b border-slate-800 pb-3">Configurações Gerais</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Título do Story</label>
                  <input 
                    disabled={!isEditing}
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Posição</label>
                  <input 
                    type="number"
                    disabled={!isEditing}
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Aparência</label>
                  <select 
                    disabled={!isEditing}
                    value={formData.appearance_id}
                    onChange={(e) => setFormData({...formData, appearance_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="">Padrão</option>
                    {appearances.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryDetailsPage;