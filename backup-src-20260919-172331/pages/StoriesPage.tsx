"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { db, resolveStoreId, Story } from '@/lib/db';
import { logPanelActivity } from '@/lib/activityLog';
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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const navigate = useNavigate();
  const { currentStore } = useTenant();

  const [stories, setStories] = useState<Story[]>([]);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [pageRules, setPageRules] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');
  const [storeRealUrl, setStoreRealUrl] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    storyId: string;
    storyName: string;
  }>({
    isOpen: false,
    storyId: '',
    storyName: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const resolvedStoreId = await resolveStoreId();
      setCurrentStoreId(resolvedStoreId);

      try {
        const settings = await db.getSettings(resolvedStoreId);
        setStoreRealUrl(String(settings?.store_url || ''));
      } catch {
        setStoreRealUrl('');
      }

      const s = await db.stories.getAll(resolvedStoreId);
      const storyIds = s.map(story => story.id);

      const allSv = await db.storyVideos.getAll(resolvedStoreId);
      const sv = allSv.filter(v => storyIds.includes(v.story_id));

      const dl = await db.displayLocations.getAll(resolvedStoreId);
      const rules = await (db as any).pageRules.getAll(resolvedStoreId);

      const countMap: Record<string, number> = {};

      sv.forEach(relation => {
        countMap[relation.story_id] = (countMap[relation.story_id] || 0) + 1;
      });

      setVideoCounts(countMap);

      const locationMap: Record<string, string> = {};

      dl.forEach(loc => {
        if (!locationMap[loc.story_id]) {
          locationMap[loc.story_id] =
            loc.selector === 'body' ? 'Página Inicial' : loc.selector;
        }
      });

      setLocations(locationMap);

      const rulesMap: Record<string, string> = {};
      rules.forEach((rule: any) => {
        if (!rulesMap[rule.story_id]) {
          let label = "";
          switch (rule.condition_type) {
            case "home":
              label = "Somente na Home";
              break;
            case "all_pages":
              label = "Todas as Páginas";
              break;
            case "url_contains":
              label = `Contém: ${rule.value}`;
              break;
            case "url_not_contains":
              label = `Não contém: ${rule.value}`;
              break;
            case "url_not_equals":
              label = `Diferente de: ${rule.value}`;
              break;
            default:
              label = rule.condition_type || "Todas as Páginas";
          }
          rulesMap[rule.story_id] = label;
        }
      });

      setPageRules(rulesMap);

      setStories(s.sort((a, b) => (a.position || 0) - (b.position || 0)));
    } catch (e) {
      console.error('Erro ao carregar os Stories:', e);
      showError('Erro ao carregar os Stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isStoryActive = (story: Story) => {
    const item = story as Story & {
      is_active?: boolean;
      active?: boolean;
      status?: string;
      enabled?: boolean;
    };

    if (item.is_active === true) return true;
    if (item.active === true) return true;
    if (item.enabled === true) return true;
    if (item.status === 'active' || item.status === 'ativo') return true;

    return false;
  };

  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchesSearch = s.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const active = isStoryActive(s);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? active : !active);

      return matchesSearch && matchesStatus;
    });
  }, [stories, searchTerm, filterStatus]);

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'floating_widget':
        return 'Flutuante';
      case 'carousel':
        return 'Carrossel';
      case 'dynamic_carousel':
        return 'Carrossel Dinâmico';
      case 'grid':
        return 'Grade';
      default:
        return format;
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'));
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
          return Number(
            (story as any).views_count ??
              (story as any).view_count ??
              (story as any).views ??
              (story as any).visualizacoes ??
              (story as any).visualizations ??
              0,
          );

        case 'cliques':
          return Number(
            (story as any).clicks_count ??
              (story as any).click_count ??
              (story as any).clicks ??
              (story as any).cliques ??
              0,
          );

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
      const resolvedStoreId = await resolveStoreId(
        story.store_id || currentStoreId,
      );

      const currentActive = isStoryActive(story);
      const nextActive = !currentActive;

      const updatedStory: Story = {
        ...story,
        store_id: resolvedStoreId,
        active: nextActive,
      };

      await db.stories.save(updatedStory);
      logPanelActivity(nextActive ? 'story.activated' : 'story.deactivated', story.title, resolvedStoreId);

      setStories(prev =>
        prev.map(item =>
          item.id === story.id
            ? {
                ...item,
                store_id: resolvedStoreId,
                active: nextActive,
              }
            : item,
        ),
      );

      showSuccess(
        nextActive
          ? 'Story ativado com sucesso.'
          : 'Story desativado com sucesso.',
      );
    } catch (e) {
      console.error('Erro ao alterar status:', e);
      showError('Erro ao alterar status.');
    }
  };

  const handleDeleteClick = (story: Story) => {
    setDeleteModal({
      isOpen: true,
      storyId: story.id,
      storyName: story.title,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.stories.delete(deleteModal.storyId);
      logPanelActivity('story.deleted', deleteModal.storyName);

      setStories(prev => prev.filter(s => s.id !== deleteModal.storyId));

      showSuccess('Story removido com sucesso.');

      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error('Erro ao excluir o story:', e);
      showError('Erro ao excluir o story.');
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'floating_widget':
        return <MousePointer2 size={14} />;
      case 'carousel':
      case 'dynamic_carousel':
        return <Layout size={14} />;
      case 'grid':
        return <Layers size={14} />;
      default:
        return <PlayCircle size={14} />;
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Stories
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
            Gerencie as configurações de exibição e agrupamento de vídeos na sua loja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/stories/new')}
            className="flex items-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus size={16} className="!text-white stroke-[2.5]" />
            Novo Story
          </button>
        </div>
      </div>

      {/* ── CARD PRINCIPAL UNIFICADO ── */}
      <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-2xl overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">

        {/* BARRA INTERNA DE FILTROS E BUSCA */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-white/5 pb-5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8a90a0]" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do story..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#111524] pl-12 pr-4 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] focus:bg-white dark:focus:bg-[#111524]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-[#F8FAFC] dark:bg-[#111524] border border-transparent dark:border-white/5 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0] outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] cursor-pointer w-full sm:w-auto hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Desativados</option>
            </select>
          </div>
        </div>

        {/* ── BARRA INTERNA DE CONTAGEM E RESUMO ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#111524]/40 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0]">
              {filteredStories.length} {filteredStories.length === 1 ? 'story encontrado' : 'stories encontrados'}
            </p>
          </div>
        </div>

        {/* TABELA DE STORIES */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111524]/50 text-[10px] font-black uppercase text-slate-400 dark:text-[#8a90a0] tracking-widest">
                <th
                  onClick={() => handleSort('nome')}
                  className="cursor-pointer select-none px-6 py-4 text-left rounded-l-2xl w-56"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Story / Nome</span>
                    {sortColumn === 'nome' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('tipo')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-36"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Tipo</span>
                    {sortColumn === 'tipo' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('videos')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-28"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Vídeos</span>
                    {sortColumn === 'videos' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('local')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-40"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Localização</span>
                    {sortColumn === 'local' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('visualizacoes')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Visualizações</span>
                    {sortColumn === 'visualizacoes' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('cliques')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>CTR / Cliques</span>
                    {sortColumn === 'cliques' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th className="px-6 py-4 text-center w-32 rounded-r-2xl">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {sortedStories.map(story => {
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

                const ctr = views > 0 ? (clicks / views) * 100 : 0;
                const active = isStoryActive(story);

                return (
                  <tr
                    key={story.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* NOME */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#0091ff] dark:text-[#ff7a29] shrink-0">
                          {getFormatIcon(story.format)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-slate-800 dark:text-[#e8ecf4] truncate max-w-[180px]" title={story.title}>
                            {story.title}
                          </p>
                          <span className={cn(
                            "text-[10px] font-bold block mt-0.5",
                            active ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                          )}>
                            {active ? 'Ativo' : 'Desativado'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* TIPO */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#111524] text-slate-700 dark:text-[#c0c5d4] text-[11px] font-bold border border-slate-200/60 dark:border-white/5">
                        <span className="text-[#0091ff] dark:text-[#ff7a29]">{getFormatIcon(story.format)}</span>
                        <span>{getFormatLabel(story.format)}</span>
                      </span>
                    </td>

                    {/* VÍDEOS */}
                    <td className="px-4 py-3.5 text-center font-mono font-black text-xs text-slate-900 dark:text-white">
                      {videoCounts[story.id] || 0}
                    </td>

                    {/* LOCALIZAÇÃO */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#111524] text-slate-700 dark:text-[#c0c5d4] text-[11px] font-bold border border-slate-200/60 dark:border-white/5 max-w-[150px] truncate"
                        title={pageRules[story.id] || 'Todas as Páginas'}
                      >
                        <span className="truncate">{pageRules[story.id] || 'Todas as Páginas'}</span>
                      </span>
                    </td>

                    {/* VISUALIZAÇÕES */}
                    <td className="px-4 py-3.5 text-center font-mono font-black text-xs text-slate-900 dark:text-white">
                      {views}
                    </td>

                    {/* CTR / CLIQUES */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-black rounded-full border",
                          ctr === 0
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
                        )}>
                          {ctr.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#8a90a0] font-bold">
                          {clicks} cliques
                        </span>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center text-center w-full">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(story)}
                          className={cn(
                            'inline-flex h-7 w-[100px] items-center justify-center rounded-xl px-2.5 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all',
                            active
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100'
                          )}
                        >
                          {active ? 'ATIVO' : 'DESATIVADO'}
                        </button>
                      </div>
                    </td>

                    {/* AÇÕES */}
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `/stories/preview/${story.id}`,
                              '_blank',
                              'noopener,noreferrer',
                            );
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                          title="Visualizar preview"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/stories/${story.id}`)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                          title="Editar story"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClick(story)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Excluir story"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStories.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <PlayCircle size={40} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhum Story encontrado</p>
                      <p className="text-xs text-slate-400 dark:text-[#8a90a0]">
                        {searchTerm || filterStatus !== 'all'
                          ? 'Tente ajustar os filtros acima.'
                          : 'Clique em "Novo Story" para cadastrar seu primeiro story.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Story"
        itemName={deleteModal.storyName}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal(prev => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
};

export default StoriesPage;
