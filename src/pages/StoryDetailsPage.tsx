import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Video, StoryVideo, Appearance, StoryFormat, ScrollDirection, SizingModel } from '@/lib/db';
import { ArrowLeft, Save, X, Edit3, Settings, Layout, Layers, MousePointer2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: undefined as string | undefined,
    position: 1,
  });

  const loadStoryDetails = useCallback(async () => {
    try {
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
      const fetchedVideos = await db.videos.getAll(mainStore.id);
      setVideos(fetchedVideos);

      const fetchedAppearances = await db.appearances.getAll(mainStore.id);
      setAppearances(fetchedAppearances);

      setFormData({
        title: currentStory.title,
        format: currentStory.format,
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: currentStory.active,
        appearance_id: currentStory.appearance_id || undefined,
        position: Number(currentStory.position) || 1,
      });
    } catch (error) {
      showError('Erro ao carregar configurações do story.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStoryDetails();
  }, [loadStoryDetails]);

  const handleSaveConfig = async (e: React.FormEvent) => {
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
        appearance_id: formData.appearance_id,
        position: formData.position,
        updated_at: new Date().toISOString(),
      };

      await db.stories.save(updatedStory);
      showSuccess('Configurações de exibição salvas!');
    } catch (error) {
      showError("Erro ao salvar Story.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  if (!story) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex flex-col items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center shadow-sm">
           <X size={48} className="text-rose-500 mx-auto mb-4" />
           <h2 className="text-2xl font-black text-slate-800 mb-2">Story não encontrado</h2>
           <p className="text-slate-500 font-medium mb-8">O ID "{id}" não corresponde a nenhuma configuração de Story.</p>
           <Link to="/stories" className="bg-[#0094EB] text-white px-8 py-3 rounded-2xl font-black">Voltar para Stories</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/stories" className="p-2.5 bg-white border border-slate-200 rounded-xl"><ArrowLeft size={20}/></Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurar Exibição</h1>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
             <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                <Settings className="text-[#0094EB]" size={20} />
                <h3 className="text-lg font-black text-slate-800">Parâmetros do Bloco</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Bloco</label>
                   <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição na Loja</label>
                   <input type="number" value={formData.position} onChange={e => setFormData({...formData, position: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                </div>
                <div className="md:col-span-2 space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato de Exibição na Loja</label>
                   <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'carousel', icon: Layout, label: 'Carrossel' },
                        { id: 'grid', icon: Layers, label: 'Grade' },
                        { id: 'floating_widget', icon: MousePointer2, label: 'Flutuante' },
                      ].map(f => (
                        <button 
                          key={f.id} type="button" onClick={() => setFormData({...formData, format: f.id as any})}
                          className={cn("flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all", formData.format === f.id ? "border-[#0094EB] bg-blue-50 text-[#0094EB]" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200")}
                        >
                          <f.icon size={24} />
                          <span className="text-[10px] font-black uppercase">{f.label}</span>
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3">
             <Link to="/stories" className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-sm">Cancelar</Link>
             <button type="submit" disabled={isSaving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all">
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
             </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default StoryDetailsPage;