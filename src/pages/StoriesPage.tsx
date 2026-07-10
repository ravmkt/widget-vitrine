"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Story, Video, DisplayLocation } from '@/lib/db';
import { 
  Plus, 
  Search, 
  PlayCircle, 
  Layout, 
  Layers, 
  MousePointer2, 
  Trash2, 
  Edit3, 
  Eye, 
  MapPin, 
  Film,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Estado de Exclusão
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; storyId: string; storyName: string }>({
    isOpen: false,
    storyId: '',
    storyName: ''
  });

  const loadData = async () => {
    try {
      const s = await db.stories.getAll();
      const sv = await db.storyVideos.getAll();
      const dl = await db.displayLocations.getAll();

      // Mapear contagem de vídeos por story
      const countMap: Record<string, number> = {};
      sv.forEach(relation => {
        countMap[relation.story_id] = (countMap[relation.story_id] || 0) + 1;
      });
      setVideoCounts(countMap);

      // Mapear local por story (primeiro local encontrado)
      const locationMap: Record<string, string> = {};
      dl.forEach(loc => {
        if (!locationMap[loc.story_id]) {
          locationMap[loc.story_id] = loc.selector === 'body' ? 'Página Inicial' : loc.selector;
        }
      });
      setLocations(locationMap);

      setStories(s.sort((a, b) => (a.position || 0) - (b.position || 0)));
    } catch (e) {
      showError('Erro ao carregar os Stories.');
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

  const handleToggleStatus = async (story: Story) => {
    try {
      const updated = { ...story, active: !story.active };
      await db.stories.save(updated);
      setStories(prev => prev.map(s => s.id === story.id ? updated : s));
      showSuccess(`Story ${updated.active ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (e) {
      showError('Erro ao alterar status.');
    }
  };

  const handleDeleteClick = (story: Story) => {
    setDeleteModal({
      isOpen: true,
      storyId: story.id,
      storyName: story.title
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.stories.delete(deleteModal.storyId);
      setStories(prev => prev.filter(s => s.id !== deleteModal.storyId));
      showSuccess('Story removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao excluir o story.');
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'floating_widget': return 'Widget Fixo';
      case 'carousel': return 'Carrossel';
      case 'grid': return 'Grade';
      default: return format;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'floating_widget': return <MousePointer2 size={14} />;
      case 'carousel': return <Layout size={14} />;
      case 'grid': return <Layers size={14} />;
      default: return <PlayCircle size={14} />;
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stories</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie as configurações de exibição e agrupamento de vídeos.</p>
        </div>
        <button 
          onClick={() => navigate('/stories/new')}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Story
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, tipo ou local..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterStatus === status ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredStories.map((story) => (
          <div key={story.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:border-[#0094EB]/30 transition-all shadow-sm group">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              
              {/* Nome e Info Principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black text-slate-800 truncate">{story.title}</h3>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5",
                    story.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-200"
                  )}>
                    {story.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {story.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-[#0094EB] uppercase tracking-widest">
                    {getFormatIcon(story.format)} {getFormatLabel(story.format)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Film size={12} /> {videoCounts[story.id] || 0} {(videoCounts[story.id] || 0) === 1 ? 'Vídeo' : 'Vídeos'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <MapPin size={12} /> {locations[story.id] || 'Página Geral'}
                  </div>
                </div>
              </div>

              {/* Métricas Reais */}
              <div className="flex gap-8 lg:px-8 border-l border-slate-100 lg:border-slate-100 border-none">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizações</p>
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-[#0094EB]" />
                    <span className="text-lg font-black text-slate-800">{story.view_count || 0}</span>
                  </div>
                </div>
                {story.click_count !== undefined && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliques</p>
                    <div className="flex items-center gap-2">
                      <MousePointer2 size={14} className="text-violet-500" />
                      <span className="text-lg font-black text-slate-800">{story.click_count || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleToggleStatus(story)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-[10px] font-black uppercase transition-all",
                    story.active ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-500 text-white hover:bg-emerald-600"
                  )}
                >
                  {story.active ? 'Desativar' : 'Ativar'}
                </button>
                <button 
                  onClick={() => navigate(`/stories/${story.id}`)}
                  className="p-3 bg-[#EAF6FF] text-[#0094EB] hover:bg-[#0094EB] hover:text-white rounded-2xl transition-all"
                  title="Editar Story"
                >
                  <Edit3 size={20} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(story)}
                  className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                  title="Excluir Story"
                >
                  <Trash2 size={20} />
                </button>
              </div>

            </div>
          </div>
        ))}

        {filteredStories.length === 0 && (
          <div className="p-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <PlayCircle size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Nenhum Story encontrado.</p>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Story"
        itemName={deleteModal.storyName}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default StoriesPage;