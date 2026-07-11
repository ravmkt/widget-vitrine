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
  XCircle,
  ChevronUp,
  ChevronDown
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const isStoryActive = (story: Story) => {
    const item = story as Story & { is_active?: boolean; active?: boolean; status?: string; enabled?: boolean };
    if (item.is_active === true) return true;
    if (item.active === true) return true;
    if (item.enabled === true) return true;
    if (item.status === 'active' || item.status === 'ativo') return true;
    return false;
  };

  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
      const active = isStoryActive(s);
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? active : !active);
      return matchesSearch && matchesStatus;
    });
  }, [stories, searchTerm, filterStatus]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const sortedStories = useMemo(() => {
    const rows = [...filteredStories];
    if (!sortColumn) return rows;

    const getSortValue = (story: Story) => {
      const active = isStoryActive(story);
      switch (sortColumn) {
        case 'nome':
          return story.title || '';
        case 'tipo':
          return getFormatLabel(story.format) || '';
        case 'videos':
          return videoCounts[story.id] || 0;
        case 'local':
          return locations[story.id] || 'Página Geral';
        case 'visualizacoes':
          return Number((story as any).views_count ?? (story as any).view_count ?? (story as any).views ?? (story as any).visualizacoes ?? (story as any).visualizations ?? 0);
        case 'cliques':
          return Number((story as any).clicks_count ?? (story as any).click_count ?? (story as any).clicks ?? (story as any).cliques ?? 0);
        case 'status':
          return active ? 'ATIVO' : 'DESATIVADO';
        default:
          return '';
      }
    };

    rows.sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === 'asc'
        ? String(valueA).localeCompare(String(valueB), 'pt-BR')
        : String(valueB).localeCompare(String(valueA), 'pt-BR');
    });

    return rows;
  }, [filteredStories, sortColumn, sortDirection, videoCounts, locations]);

  const handleToggleStatus = async (story: Story) => {
    try {
      const currentActive = isStoryActive(story);
      const nextActive = !currentActive;
      const updated = {
        ...story,
        active: nextActive,
        is_active: nextActive,
        status: nextActive ? 'active' : 'inactive'
      } as Story & Record<string, any>;
      await db.stories.save(updated as Story);
      setStories(prev =>
        prev.map(item =>
          item.id === story.id
            ? {
                ...item,
                active: nextActive,
                is_active: nextActive,
                status: nextActive ? 'active' : 'inactive'
              } as Story
            : item
        )
      );
      showSuccess(nextActive ? 'Story ativado com sucesso.' : 'Story desativado com sucesso.');
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

  function getFormatLabel(format: string) {
    switch (format) {
      case 'floating_widget': return 'Flutuante';
      case 'carousel': return 'Carrossel';
      case 'grid': return 'Grade';
      default: return format;
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'floating_widget': return <MousePointer2 size={14} />;
      case 'carousel': return <Layout size={14} />;
      case 'grid': return <Layers size={14} />;
      default: return <PlayCircle size={14} />;
    }
  };

  const getTypeBadgeClass = () => "inline-flex h-7 w-[120px] min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-[10px] text-xs font-bold text-[#0094EB] whitespace-nowrap";

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

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th onClick={() => handleSort('nome')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Nome {sortColumn === 'nome' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('tipo')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Tipo {sortColumn === 'tipo' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('videos')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center hover:opacity-75">
                  <span className="inline-flex items-center gap-1 justify-center">Vídeos {sortColumn === 'videos' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('local')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Local {sortColumn === 'local' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('visualizacoes')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center hover:opacity-75">
                  <span className="inline-flex items-center gap-1 justify-center">Visualizações {sortColumn === 'visualizacoes' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('cliques')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center hover:opacity-75">
                  <span className="inline-flex items-center gap-1 justify-center">Cliques {sortColumn === 'cliques' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th onClick={() => handleSort('status')} className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center hover:opacity-75">
                  <span className="inline-flex items-center gap-1 justify-center">Status {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStories.map((story) => {
                const views =
                  (story as any).views_count ??
                  (story as any).view_count ??
                  (story as any).views ??
                  (story as any).visualizacoes ??
                  (story as any).visualizations ??
                  0;

                const clicks =
                  (story as any).clicks_count ??
                  (story as any).click_count ??
                  (story as any).clicks ??
                  (story as any).cliques ??
                  0;

                return (
                  <tr key={story.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-800 truncate max-w-xs">{story.title}</h3>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={getTypeBadgeClass()}>
                        {getFormatIcon(story.format)} {getFormatLabel(story.format)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{videoCounts[story.id] || 0}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 truncate max-w-[180px]">{locations[story.id] || 'Página Geral'}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{views}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{clicks}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(story)}
                        className={cn(
                          "inline-flex h-8 w-[112px] min-w-[112px] items-center justify-center rounded-lg px-4 text-[10px] font-black uppercase tracking-wider border transition-all mx-auto",
                          isStoryActive(story)
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                        )}
                        title={isStoryActive(story) ? 'Story ativo' : 'Story desativado'}
                      >
                        {isStoryActive(story) ? 'ATIVO' : 'DESATIVADO'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => window.open(`/stories/preview/${story.id}`, "_blank", "noopener,noreferrer")}
                          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors"
                          title="Preview Story"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/stories/${story.id}`)}
                          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors"
                          title="Editar Story"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(story)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Story"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStories.length === 0 && (
          <div className="p-12 text-center">
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