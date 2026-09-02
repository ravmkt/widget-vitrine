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
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
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

      showSuccess('Story removido permanentemente.');

      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error('Erro ao excluir o story:', e);
      showError('Erro ao excluir o story.');
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'floating_widget':
        return <MousePointer2 size={16} />;
      case 'carousel':
      case 'dynamic_carousel':
        return <Layout size={16} />;
      case 'grid':
        return <Layers size={16} />;
      default:
        return <PlayCircle size={16} />;
    }
  };

  const getTypeBadgeClass = () =>
    'inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-sky-500/10 bg-sky-500/5 px-3.5 text-xs font-bold text-sky-400 whitespace-nowrap';

  const getLocalBadgeClass = () =>
    'inline-flex h-7 items-center justify-center rounded-full border border-slate-800 bg-slate-900/50 px-3.5 text-xs font-bold text-slate-400 whitespace-nowrap';

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans text-white">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Stories
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Gerencie as configurações de exibição e agrupamento de vídeos.
          </p>
        </div>

        <button
          onClick={() => navigate('/stories/new')}
          className="bg-[#ff7a29] hover:bg-[#e05e10] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-orange-500/10 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Novo Story
        </button>
      </div>

      {/* ── CARD PRINCIPAL UNIFICADO PREMIUM (Tema Escuro + rounded-2xl) ── */}
      <div className="bg-[#111524] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* BARRA DE FILTROS E BUSCA INTERNA DO CARD */}
        <div className="p-6 pb-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-white/5">
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar por nome, tipo ou local..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#171c30] border border-white/5 rounded-2xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-[#ff7a29] transition-all"
            />
          </div>

          {/* BOTÕES DE FILTRO PREMIUM (Laranja ativo / Escuro inativo) */}
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            {(['all', 'active', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border text-center flex-1 md:flex-initial cursor-pointer',
                  filterStatus === status
                    ? 'bg-[#ff7a29] border-[#ff7a29] text-white shadow-lg shadow-orange-500/15'
                    : 'bg-[#171c30] border-transparent text-slate-400 hover:text-white hover:bg-[#1e253c]',
                )}
              >
                {status === 'all'
                  ? 'Todos'
                  : status === 'active'
                    ? 'Ativos'
                    : 'Inativos'}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA DE STORIES NO ESTILO DO PRINT DE VÍDEOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#171c30]/40 border-b border-white/5">
                <th
                  onClick={() => handleSort('nome')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Story / Nome{' '}
                    {sortColumn === 'nome' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('tipo')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Tipo{' '}
                    {sortColumn === 'tipo' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('videos')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    Vídeos{' '}
                    {sortColumn === 'videos' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('local')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Localização{' '}
                    {sortColumn === 'local' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('visualizacoes')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    Visualizações{' '}
                    {sortColumn === 'visualizacoes' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('cliques')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    CTR / Cliques{' '}
                    {sortColumn === 'cliques' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className="cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    Status{' '}
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp size={12} className="text-[#ff7a29]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#ff7a29]" />
                      ))}
                  </span>
                </th>

                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.03]">
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
                    className="hover:bg-white/[0.015] border-b border-white/[0.02] transition-colors align-middle"
                  >
                    {/* COLUNA 1 - NOME (No formato do print com thumbnail/ícone, título e status embaixo) */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        {/* Thumbnail Fictício do Story baseado no Formato */}
                        <div className="w-12 h-12 rounded-xl bg-[#1a1f35] border border-white/5 flex items-center justify-center text-[#ff7a29] shrink-0 shadow-inner">
                          {getFormatIcon(story.format)}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-white truncate max-w-[200px] uppercase tracking-wide">
                            {story.title}
                          </h3>
                          <span className={cn(
                            "text-xs font-bold block mt-0.5",
                            active ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* COLUNA 2 - TIPO */}
                    <td className="px-6 py-5">
                      <span className={getTypeBadgeClass()}>
                        {getFormatIcon(story.format)}{' '}
                        {getFormatLabel(story.format)}
                      </span>
                    </td>

                    {/* COLUNA 3 - NÚMERO DE VÍDEOS */}
                    <td className="px-6 py-5 text-center font-black text-white text-sm">
                      {videoCounts[story.id] || 0}
                    </td>

                    {/* COLUNA 4 - LOCALIZAÇÃO */}
                    <td className="px-6 py-5">
                      <span
                        className={getLocalBadgeClass()}
                        title={pageRules[story.id] || 'Todas as Páginas'}
                      >
                        {pageRules[story.id] || 'Todas as Páginas'}
                      </span>
                    </td>

                    {/* COLUNA 5 - VISUALIZAÇÕES */}
                    <td className="px-6 py-5 text-center font-black text-white text-sm">
                      {views}
                    </td>

                    {/* COLUNA 6 - CTR / CLIQUES (Com badge vermelha do print para 0.0% e verde para melhor) */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className={cn(
                          "px-2.5 py-0.5 text-xs font-black rounded-full border",
                          ctr === 0 
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {ctr.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {clicks} cliques
                        </span>
                      </div>
                    </td>

                    {/* COLUNA 7 - STATUS (Toggle interativo) */}
                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(story)}
                        className={cn(
                          'inline-flex h-7 items-center justify-center rounded-full px-4 text-[10px] font-black uppercase tracking-wider border transition-all mx-auto cursor-pointer',
                          active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
                        )}
                        title={
                          active
                            ? 'Clique para desativar'
                            : 'Clique para ativar'
                        }
                      >
                        {active ? 'ATIVO' : 'INATIVO'}
                      </button>
                    </td>

                    {/* COLUNA 8 - AÇÕES */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center gap-1">
                        {/* 1. Preview */}
                        <button
                          onClick={() => {
                            window.open(
                              `/stories/preview/${story.id}`,
                              '_blank',
                              'noopener,noreferrer',
                            );
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                          title="Preview Story"
                        >
                          <Eye size={16} />
                        </button>

                        {/* 2. Editar */}
                        <button
                          onClick={() => navigate(`/stories/${story.id}`)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                          title="Editar Story"
                        >
                          <Edit3 size={16} />
                        </button>

                        {/* 3. Excluir */}
                        <button
                          onClick={() => handleDeleteClick(story)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
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

        {/* FEEDBACK CASO NÃO EXISTAM STORIES */}
        {filteredStories.length === 0 && (
          <div className="p-16 text-center border-t border-white/5 bg-[#14192a]/50">
            <PlayCircle size={48} className="mx-auto text-slate-600 dark:text-slate-400 mb-4 animate-pulse" />
            <p className="text-slate-400 font-bold">
              Nenhum Story encontrado.
            </p>
          </div>
        )}
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
