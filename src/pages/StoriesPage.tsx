import React, { useEffect, useState, useMemo } from 'react';
import { db, Story, Video } from '@/lib/db';
import { Plus, Eye, Trash2, Edit3, Film, Search, Layers, Layout, MousePointer2, X, Check } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as Story['format'],
    active: true,
    position: 1,
  });

  const loadData = async () => {
    try {
      const s = await db.stories.getAll();
      const v = await db.videos.getAll();
      setStories(s.sort((a, b) => a.position - b.position));
      setVideos(v);
    } catch (e) {
      showError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      format: story.format,
      active: story.active,
      position: story.position,
    });
    // Simulação de vídeos selecionados (aqui buscaria a relação real)
    setSelectedVideoIds([]); 
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Story = {
      ...editingStory,
      id: editingStory?.id || Math.random().toString(36).substr(2, 9),
      store_id: '11111111-1111-1111-1111-111111111111',
      title: formData.title,
      format: formData.format,
      active: formData.active,
      position: formData.position,
      cta_enabled: true,
      cta_type: 'none',
    };
    await db.stories.save(data);
    showSuccess('Story salvo com sucesso!');
    setIsModalOpen(false);
    loadData();
  };

  const toggleVideoSelection = (id: string) => {
    setSelectedVideoIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stories</h1>
          <p className="text-slate-500 font-medium mt-1">Organize seus vídeos em carrosséis ou grades interativas.</p>
        </div>
        <button 
          onClick={() => { setEditingStory(null); setIsModalOpen(true); }}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Story
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stories.map(story => (
          <div key={story.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
            <div className="aspect-[9/12] bg-slate-50 relative flex items-center justify-center text-slate-200">
               <Film size={60} strokeWidth={1} />
               <div className="absolute top-5 right-5">
                  <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider", story.active ? "bg-emerald-500 text-white" : "bg-slate-300 text-white")}>
                    {story.active ? 'Ativo' : 'Inativo'}
                  </span>
               </div>
            </div>
            <div className="p-8">
               <h3 className="font-black text-xl text-slate-800 truncate mb-6">{story.title}</h3>
               <div className="flex gap-3">
                  <button onClick={() => handleEdit(story)} className="flex-1 bg-[#EAF6FF] hover:bg-blue-100 text-[#0094EB] py-3 rounded-2xl text-xs font-black transition-all">Editar Story</button>
                  <button className="p-3 border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingStory ? 'Editar Story' : 'Novo Story'}
        maxWidth="max-w-3xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
      >
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Story</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato de Exibição</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'carousel', icon: Layout, label: 'Carrossel' },
                  { id: 'grid', icon: Layers, label: 'Grade' },
                  { id: 'floating_widget', icon: MousePointer2, label: 'Flutuante' },
                ].map(item => (
                  <button 
                    key={item.id} type="button" onClick={() => setFormData({...formData, format: item.id as any})}
                    className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border text-[10px] font-black transition-all", formData.format === item.id ? "bg-blue-50 border-[#0094EB] text-[#0094EB]" : "bg-white border-slate-100 text-slate-400")}
                  >
                    <item.icon size={18} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
             <h4 className="text-sm font-black text-slate-800 mb-6">Selecionar Vídeos do Story</h4>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {videos.map(v => (
                  <button 
                    key={v.id} type="button" onClick={() => toggleVideoSelection(v.id)}
                    className={cn("relative aspect-square rounded-2xl border-2 overflow-hidden transition-all", selectedVideoIds.includes(v.id) ? "border-[#0094EB]" : "border-transparent opacity-60 hover:opacity-100")}
                  >
                     <img src={v.thumbnail_url} className="w-full h-full object-cover" alt={v.title} />
                     {selectedVideoIds.includes(v.id) && (
                       <div className="absolute top-2 right-2 bg-[#0094EB] text-white rounded-full p-1"><Check size={12} /></div>
                     )}
                     <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 text-white text-[9px] font-black truncate">{v.title}</div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default StoriesPage;