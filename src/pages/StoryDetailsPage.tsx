import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { 
  db, Story, Video, Appearance, StoryFormat, ScrollDirection, 
  DisplayLocation, PageRule, StoryVideo, ConditionType, DisplayPosition 
} from '@/lib/db';
import { 
  ArrowLeft, Save, X, Settings, Layout, Layers, MousePointer2, 
  Film, MapPin, Globe, CheckCircle2, XCircle, Plus, Trash2, 
  Loader2
} from 'lucide-react';
import { showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const StoryDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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

      const videos = await db.videos.getAll(mainStore.id);
      setAllVideos(videos);
      const relations = await db.storyVideos.getAll();
      const storyVideoIds = relations
        .filter(rv => rv.story_id === id)
        .sort((a, b) => a.position - b.position)
        .map(rv => rv.video_id);
      setSelectedVideoIds(storyVideoIds);

      const apps = await db.appearances.getAll(mainStore.id);
      setAppearances(apps);

      const locs = await db.displayLocations.getAll();
      setLocations(locs.filter(l => l.story_id === id));
      const rls = await db.pageRules.getAll();
      setRules(rls.filter(r => r.story_id === id));

    } catch (error) {
      showError('Erro ao carregar os dados do Story.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadStoryData(); }, [loadStoryData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || isSaving) return;

    try {
      setIsSaving(true);
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

  const handleAddLocation = async () => {
    const newLoc: DisplayLocation = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: story!.store_id,
      story_id: story!.id,
      selector: 'body',
      position: 'fixed_bottom_right'
    };
    await db.displayLocations.save(newLoc);
    setLocations([...locations, newLoc]);
  };

  const handleAddRule = async () => {
    const newRule: PageRule = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: story!.store_id,
      story_id: story!.id,
      condition_type: 'all_pages'
    };
    await db.pageRules.save(newRule);
    setRules([...rules, newRule]);
  };

  const handleDeleteSubItem = async () => {
    try {
      if (deleteModal.type === 'location') {
        await db.displayLocations.delete(deleteModal.id);
        setLocations(prev => prev.filter(l => l.id !== deleteModal.id));
      } else {
        await db.pageRules.delete(deleteModal.id);
        setRules(prev => prev.filter(r => r.id !== deleteModal.id));
      }
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao remover item.');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F7FAFC] pb-20">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/stories')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Editar Story</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{formData.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={isSaving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-8">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</label>
                  <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value as any})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                    <option value="carousel">Carrossel</option>
                    <option value="grid">Grade</option>
                    <option value="floating_widget">Flutuante</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
                <Film className="text-[#0094EB]" size={20} />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Vídeos do Story</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allVideos.map(video => (
                  <button key={video.id} onClick={() => handleToggleVideo(video.id)} className={cn("relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all", selectedVideoIds.includes(video.id) ? "border-[#0094EB] shadow-lg" : "border-transparent opacity-60")}>
                    <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                    {selectedVideoIds.includes(video.id) && <div className="absolute inset-0 bg-[#0094EB]/20 flex items-center justify-center"><CheckCircle2 className="text-white" size={24}/></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-slate-800 uppercase">Onde Aparece</h4>
                <button type="button" onClick={handleAddLocation} className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><Plus size={16}/></button>
              </div>
              <div className="space-y-4">
                {locations.map(loc => (
                  <div key={loc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                    <button onClick={() => setDeleteModal({ isOpen: true, type: 'location', id: loc.id, name: loc.selector })} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"><X size={12}/></button>
                    <input type="text" value={loc.selector} onChange={e => setLocations(locations.map(l => l.id === loc.id ? {...l, selector: e.target.value} : l))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="Confirmar Exclusão" itemName={deleteModal.name} onConfirm={handleDeleteSubItem} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
      <SuccessDialog isOpen={showSuccess} description="Story atualizado com sucesso." onClose={() => navigate('/stories')} />
    </div>
  );
};

export default StoryDetailsPage;