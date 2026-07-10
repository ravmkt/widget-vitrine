import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  db, Story, Video, Appearance, StoryFormat, ScrollDirection, 
  DisplayLocation, PageRule, StoryVideo, ConditionType, DisplayPosition 
} from '@/lib/db';
import { 
  ArrowLeft, Save, X, Settings, Layout, Layers, MousePointer2, 
  Film, MapPin, Globe, CheckCircle2, XCircle, Plus, Trash2, 
  Loader2
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const StoryDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [story, setStory] = useState<Story | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [rules, setRules] = useState<PageRule[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: '',
    position: 1,
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'location' | 'rule'; id: string; name: string }>({
    isOpen: false,
    type: 'location',
    id: '',
    name: ''
  });

  const loadStoryData = useCallback(async () => {
    try {
      setLoading(true);
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      if (!mainStore) return;

      const videos = await db.videos.getAll(mainStore.id);
      setAllVideos(videos);
      
      const apps = await db.appearances.getAll(mainStore.id);
      setAppearances(apps);

      if (isCreate) {
        setStory(null);
        setFormData({
          title: "",
          format: 'carousel',
          scroll_direction: 'horizontal',
          active: true,
          appearance_id: '',
          position: 1,
        });
        setSelectedVideoIds([]);
        setLocations([]);
        setRules([]);
        setLoading(false);
        return;
      }

      const fetchedStories = await db.stories.getAll(mainStore.id);
      const currentStory = fetchedStories.find((item) => item.id === id);
      if (!currentStory) {
        setStory(null);
        setLoading(false);
        return;
      }
      setStory(currentStory);
      setFormData({
        title: currentStory.title,
        format: currentStory.format,
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: currentStory.active,
        appearance_id: currentStory.appearance_id || '',
        position: currentStory.position || 1,
      });

      const relations = await db.storyVideos.getAll();
      const storyVideoIds = relations
        .filter(rv => rv.story_id === id)
        .sort((a, b) => a.position - b.position)
        .map(rv => rv.video_id);
      setSelectedVideoIds(storyVideoIds);

      const locs = await db.displayLocations.getAll();
      setLocations(locs.filter(l => l.story_id === id));
      const rls = await db.pageRules.getAll();
      setRules(rls.filter(r => r.story_id === id));

    } catch (error) {
      showError('Erro ao carregar os dados do Story.');
    } finally {
      setLoading(false);
    }
  }, [id, isCreate]);

  useEffect(() => { loadStoryData(); }, [loadStoryData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);

      if (isCreate) {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        const storeId = mainStore?.id || '11111111-1111-1111-1111-111111111111';

        const newStory: Story = {
          id: Math.random().toString(36).substr(2, 9),
          store_id: storeId,
          title: formData.title,
          format: formData.format,
          scroll_direction: formData.scroll_direction,
          active: formData.active,
          appearance_id: formData.appearance_id || undefined,
          position: formData.position,
          cta_enabled: false,
          cta_type: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.stories.save(newStory);

        const newRelations: StoryVideo[] = selectedVideoIds.map((vid, idx) => ({
          id: `rv-${newStory.id}-${vid}`,
          story_id: newStory.id,
          video_id: vid,
          position: idx + 1,
          is_cover: idx === 0,
          created_at: new Date().toISOString()
        }));
        
        const allRelations = await db.storyVideos.getAll();
        localStorage.setItem('vidlytics_story_videos', JSON.stringify([...allRelations, ...newRelations]));
        window.dispatchEvent(new Event('storage'));
        
        setShowSuccess(true);
        return;
      }

      if (!story) return;

      const updatedStory: Story = {
        ...story,
        title: formData.title,
        format: formData.format,
        scroll_direction: formData.scroll_direction,
        active: formData.active,
        appearance_id: formData.appearance_id || undefined,
        position: formData.position,
        updated_at: new Date().toISOString(),
      };
      await db.stories.save(updatedStory);

      const allRelations = await db.storyVideos.getAll();
      const otherRelations = allRelations.filter(rv => rv.story_id !== id);
      const newRelations: StoryVideo[] = selectedVideoIds.map((vid, idx) => ({
        id: `rv-${id}-${vid}`,
        story_id: id!,
        video_id: vid,
        position: idx + 1,
        is_cover: idx === 0,
        created_at: new Date().toISOString()
      }));
      
      localStorage.setItem('vidlytics_story_videos', JSON.stringify([...otherRelations, ...newRelations]));
      window.dispatchEvent(new Event('storage'));
      
      setShowSuccess(true);
    } catch (error) {
      showError('Erro ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideoIds(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleAddLocation = async () => {
    if (!story && !isCreate) return;
    const storeId = story?.store_id || '11111111-1111-1111-1111-111111111111';
    const storyId = story?.id || (isCreate ? 'pending' : '');
    const newLoc: DisplayLocation = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: storeId,
      story_id: storyId,
      selector: 'body',
      position: 'fixed_bottom_right'
    };
    await db.displayLocations.save(newLoc);
    setLocations([...locations, newLoc]);
  };

  const handleAddRule = async () => {
    if (!story && !isCreate) return;
    const storeId = story?.store_id || '11111111-1111-1111-1111-111111111111';
    const storyId = story?.id || (isCreate ? 'pending' : '');
    const newRule: PageRule = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: storeId,
      story_id: storyId,
      condition_type: 'all_pages'
    };
    await db.pageRules.save(newRule);
    setRules([...rules, newRule]);
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await db.displayLocations.delete(locationId);
      setLocations(prev => prev.filter(l => l.id !== locationId));
      showSuccess('Localização removida com sucesso!');
    } catch (e) {
      showError('Erro ao remover localização.');
    }
  };

  const handleDeleteRule = async (ruleId: string | undefined | null) => {
    // Validate ruleId before attempting deletion
    if (!ruleId) {
      // Invalid ID - just remove from local state if needed
      setRules(prev => prev.filter(r => r.id !== ruleId));
      return;
    }
    try {
      await db.pageRules.delete(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showSuccess('Regra removida com sucesso!');
    } catch (e) {
      showError('Erro ao remover regra.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Interno */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stories')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isCreate ? 'Novo Story' : 'Editar Story'}
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {isCreate ? 'Criar novo story' : formData.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 mr-4">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.active ? "text-emerald-500" : "text-slate-400")}>
              {formData.active ? 'Status: Ativo' : 'Status: Inativo'}
            </span>
            <button 
              type="button" 
              onClick={() => setFormData({...formData, active: !formData.active})}
              className={cn(
                "w-12 h-6 rounded-full p-1 transition-all duration-300",
                formData.active ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <div className={cn("bg-white w-4 h-4 rounded-full transition-all duration-300", formData.active ? "translate-x-6" : "translate-x-0")} />
            </button>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-8">
          {/* Configurações de Exibição */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
              <Layout className="text-[#0094EB]" size={20} />
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Design e Formato</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Bloco</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição / Ordem</label>
                <input type="number" value={formData.position} onChange={e => setFormData({...formData, position: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
              </div>

              <div className="md:col-span-2 space-y-4 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato de Exibição</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'carousel', icon: Layout, label: 'Carrossel' },
                    { id: 'grid', icon: Layers, label: 'Grade' },
                    { id: 'floating_widget', icon: MousePointer2, label: 'Flutuante' },
                  ].map(f => (
                    <button 
                      key={f.id} type="button" onClick={() => setFormData({...formData, format: f.id as any})}
                      className={cn("flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all", formData.format === f.id ? "border-[#0094EB] bg-blue-50 text-[#0094EB]" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200")}
                    >
                      <f.icon size={24} />
                      <span className="text-[10px] font-black uppercase">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direção de Rolagem</label>
                <select value={formData.scroll_direction} onChange={e => setFormData({...formData, scroll_direction: e.target.value as any})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estilo Visual (Aparência)</label>
                <select value={formData.appearance_id} onChange={e => setFormData({...formData, appearance_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                  <option value="">Seguir Padrão do App</option>
                  {appearances.map(app => (
                    <option key={app.id} value={app.id}>{app.name} {app.is_default ? '(Padrão)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <Film className="text-[#0094EB]" size={20} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Conteúdo Selecionado</h3>
          </div>
          <span className="text-xs font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {selectedVideoIds.length} Vídeos
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allVideos.map(video => {
            const isSelected = selectedVideoIds.includes(video.id);
            return (
              <button 
                key={video.id} 
                type="button"
                onClick={() => handleToggleVideo(video.id)}
                className={cn(
                  "relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all group",
                  isSelected ? "border-[#0094EB] shadow-lg shadow-blue-100 scale-[0.98]" : "border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                )}
              >
                <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                <div className={cn("absolute inset-0 flex items-center justify-center transition-all", isSelected ? "bg-[#0094EB]/20" : "bg-black/20")}>
                  {isSelected ? (
                    <div className="bg-[#0094EB] text-white p-1 rounded-full"><CheckCircle2 size={16}/></div>
                  ) : (
                    <Plus className="text-white opacity-0 group-hover:opacity-100" size={24}/>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[9px] font-black text-white truncate">{video.title}</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: Locais e Regras */}
      <div className="space-y-8">
        {/* Onde Aparece */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="text-orange-500" size={18} />
              <h4 className="text-sm font-black text-slate-800 uppercase">Onde Aparece</h4>
            </div>
            <button type="button" onClick={handleAddLocation} className="p-1.5 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100"><Plus size={16}/></button>
          </div>

          <div className="space-y-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                <button 
                  type="button" 
                  onClick={() => handleDeleteLocation(loc.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <X size={12}/>
                </button>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seletor CSS</label>
                    <input 
                      type="text" value={loc.selector} 
                      onChange={e => {
                        const next = locations.map(l => l.id === loc.id ? {...l, selector: e.target.value} : l);
                        setLocations(next);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Posição</label>
                    <select 
                      value={loc.position} 
                      onChange={e => {
                        const next = locations.map(l => l.id === loc.id ? {...l, position: e.target.value as DisplayPosition} : l);
                        setLocations(next);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    >
                    <option value="fixed_bottom_right">Flutuante (Direita)</option>
                    <option value="fixed_bottom_left">Flutuante (Esquerda)</option>
                    <option value="after_element">Depois do Seletor</option>
                    <option value="before_element">Antes do Seletor</option>
                    <option value="inside_end">Dentro (Fim)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quando Aparece */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-500" size={18} />
                <h4 className="text-sm font-black text-slate-800 uppercase">Quando Aparece</h4>
              </div>
              <button type="button" onClick={handleAddRule} className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg hover:bg-emerald-100"><Plus size={16}/></button>
            </div>

            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    <X size={12}/>
                  </button>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Regra</label>
                      <select 
                        value={rule.condition_type} 
                        onChange={e => {
                          const next = rules.map(r => r.id === rule.id ? {...r, condition_type: e.target.value as ConditionType} : r);
                          setRules(next);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="all_pages">Todas as Páginas</option>
                        <option value="home_only">Apenas Home</option>
                        <option value="product_pages">Páginas de Produto</option>
                        <option value="contains">URL Contém...</option>
                      </select>
                    </div>
                    {rule.condition_type === 'contains' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Filtro</label>
                        <input 
                          type="text" value={rule.value || ''} 
                          onChange={e => {
                            const next = rules.map(r => r.id === rule.id ? {...r, value: e.target.value} : r);
                            setRules(next);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Confirmar Exclusão"
        itemName={deleteModal.name}
        onConfirm={() => {
          if (deleteModal.type === 'location') {
            handleDeleteLocation(deleteModal.id);
          } else {
            handleDeleteRule(deleteModal.id);
          }
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <SuccessDialog isOpen={showSuccess} description={isCreate ? 'Story criado com sucesso.' : 'Story atualizado com sucesso.'} onClose={() => navigate('/stories')} />
    </div>
  );
};

export default StoryDetailsPage;