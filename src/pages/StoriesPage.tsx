import React, { useEffect, useState, useMemo } from 'react';
import { db, Story, Video, StoryVideo, SizingModel, Appearance, Product } from '@/lib/db';
import { Plus, Eye, Trash2, Edit3, Film, Search, Filter, Play, Check, ChevronRight, Layers, Layout, Clock, MousePointer2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadData = async () => {
    try {
      const allStories = await db.stories.getAll();
      setStories(allStories.sort((a, b) => a.position - b.position));
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Meus Stories</h1>
          <p className="text-[#64748B] font-medium mt-1">Gerencie a exibição e os vídeos dos seus stories interativos.</p>
        </div>
        <button className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
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
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0094EB]/10"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-bold text-[#64748B] focus:outline-none"
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
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    story.active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
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