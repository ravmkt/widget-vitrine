import React, { useEffect, useState, useMemo } from 'react';
import { db, Story, Video } from '@/lib/db';
import { Plus, Eye, Trash2, Edit3, Film, Search, Filter, Play, Check, ChevronRight, Layers, Layout, Clock, MousePointer2, X } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Estados para Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as Story['format'],
    active: true,
  });

  const loadData = async () => {
    try {
      const allStories = await db.stories.getAll();
      setStories(allStories.sort((a, b) => a.position - b.position));
      const allVideos = await db.videos.getAll();
      setVideos(allVideos);
    } catch (e) {
      showError('Erro ao carregar stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.active : !s.active);
      return matchesSearch && matchesStatus;
    });
  }, [stories, searchTerm, filterStatus]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const newStory: Story = {
        id: Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        title: formData.title,
        format: formData.format,
        active: formData.active,
        cta_enabled: true,
        cta_type: 'none',
        position: stories.length + 1,
        view_count: 0,
        click_count: 0,
      };

      await db.stories.save(newStory);
      showSuccess('Story criado com sucesso!');
      setIsAddModalOpen(false);
      setFormData({ title: '', format: 'carousel', active: true });
      loadData();
    } catch (e) {
      showError('Erro ao criar story.');
    }
  };

  const handleDelete = (id: string, title: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Story?',
      description: `Deseja remover o story "${title}"? Esta ação é irreversível.`,
      onConfirm: async () => {
        await db.stories.delete(id);
        showSuccess('Story excluído com sucesso.');
        setDialog(p => ({ ...p, isOpen: false }));
        loadData();
      },
      onCancel: () => setDialog(p => ({ ...p, isOpen: false }))
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Meus Stories</h1>
          <p className="text-[#64748B] font-medium mt-1">Gerencie a exibição e os vídeos dos seus stories interativos.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Story
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0094EB]/10 font-medium"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-bold text-[#64748B] focus:outline-none cursor-pointer"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStories.map(story => (
          <div key={story.id} className="bg-white border border-[#E2E8F0] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="aspect-[9/12] bg-[#F1F5F9] relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center text-[#CBD5E1]">
                  <Film size={48} strokeWidth={1.5} />
               </div>
               <div className="absolute top-4 right-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                    story.active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {story.active ? 'Ativo' : 'Inativo'}
                  </span>
               </div>
            </div>
            <div className="p-6">
               <h3 className="font-black text-lg text-[#0F172A] truncate">{story.title}</h3>
               <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} className="text-[#0094EB]" />
                    <span className="text-xs font-bold text-[#64748B]">{story.view_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MousePointer2 size={14} className="text-[#0094EB]" />
                    <span className="text-xs font-bold text-[#64748B]">{story.click_count || 0}</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-2 mt-6">
                  <Link to={`/stories/${story.id}`} className="flex-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] py-2.5 rounded-xl text-xs font-bold transition-all text-center">
                    Configurar
                  </Link>
                  <button 
                    onClick={() => handleDelete(story.id, story.title)}
                    className="flex-1 border border-[#E2E8F0] hover:bg-red-50 hover:text-red-500 text-[#64748B] py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    Excluir
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Story */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-50">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">Criar Novo Story</h3>
            
            <form onSubmit={handleCreateStory} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Título do Story</label>
                <input 
                  type="text" required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                  placeholder="Ex: Lançamentos de Verão"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Formato de Exibição</label>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     { id: 'carousel', label: 'Carrossel Bolinha', icon: Layout },
                     { id: 'grid', label: 'Grade/Mosaico', icon: Layers },
                     { id: 'floating_widget', label: 'Widget Flutuante', icon: MousePointer2 },
                   ].map(item => (
                     <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({...formData, format: item.id as any})}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center",
                          formData.format === item.id ? "bg-blue-50 border-[#0094EB] text-[#0094EB]" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                        )}
                     >
                        <item.icon size={20} />
                        <span className="text-[10px] font-black uppercase">{item.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                 <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-700">Ativar Instantaneamente</h4>
                    <p className="text-[10px] text-slate-500 font-medium">O story ficará visível na loja assim que criado.</p>
                 </div>
                 <button 
                   type="button"
                   onClick={() => setFormData({...formData, active: !formData.active})}
                   className={cn("w-12 h-6 rounded-full transition-all relative", formData.active ? "bg-[#0094EB]" : "bg-slate-300")}
                 >
                    <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", formData.active ? "left-7" : "left-1")} />
                 </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-[#0094EB] text-white font-bold text-sm hover:bg-[#0E4787] shadow-lg">Criar Story</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default StoriesPage;