import React, { useEffect, useState, useMemo } from 'react';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { db } from '@/lib/db';
import {
  getVideoMetricsRows,
  type AnalyticsInterval,
  type VideoMetricsRow,
} from '@/lib/analytics';

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

type SortField =
  | 'title'
  | 'views'
  | 'ctr'
  | 'conversions'
  | 'revenue'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'duration';
type SortDir = 'asc' | 'desc';

const mapInterval = (timeRange: string): AnalyticsInterval => {
  if (timeRange === '7d') return '7';
  if (timeRange === '30d' || timeRange === '15d') return '30';
  if (timeRange === 'custom') return 'custom';
  return '30';
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ITEMS_PER_PAGE = 10;

export function VideosTab({ timeRange, customFrom, customTo }: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoMetricsRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const interval = mapInterval(timeRange);
        const customRange = {
          from: customFrom ? new Date(customFrom) : undefined,
          to: customTo ? new Date(customTo) : undefined,
        };

        const allVideos = await db.videos.getAll(storeId);
        const rows = await getVideoMetricsRows(
          storeId,
          allVideos,
          interval,
          customRange,
        );

        if (!mounted) return;
        setVideos(rows);
      } catch (e) {
        console.error('Erro ao carregar Vídeos:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [storeId, timeRange, customFrom, customTo]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...videos];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'views':
          valA = a.metrics.views;
          valB = b.metrics.views;
          break;
        case 'ctr':
          valA = a.metrics.ctr;
          valB = b.metrics.ctr;
          break;
        case 'conversions':
          valA = a.metrics.conversions;
          valB = b.metrics.conversions;
          break;
        case 'revenue':
          valA = a.metrics.revenue;
          valB = b.metrics.revenue;
          break;
        case 'likes':
          valA = a.metrics.likes;
          valB = b.metrics.likes;
          break;
        case 'comments':
          valA = a.metrics.comments;
          valB = b.metrics.comments;
          break;
        case 'shares':
          valA = a.metrics.shares;
          valB = b.metrics.shares;
          break;
        case 'duration':
          valA = a.duration || 0;
          valB = b.duration || 0;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDir === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [videos, search, sortField, sortDir]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginated = filteredAndSorted.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="inline ml-1" />
    ) : (
      <ChevronDown size={12} className="inline ml-1" />
    );
  };

  const Th = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={cn(
        'px-4 py-3 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors select-none',
        className,
      )}
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </th>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de busca */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Buscar por título do vídeo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094EB]/30 focus:border-[#0094EB] transition-all"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th field="title" className="min-w-[220px]">
                  Vídeo
                </Th>
                <Th field="views">Visualizações</Th>
                <Th field="ctr">CTR</Th>
                <Th field="conversions">Conversões</Th>
                <Th field="revenue">Receita</Th>
                <Th field="likes">Engajamento</Th>
                <Th field="duration">Duração</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((video) => (
                <tr
                  key={video.id}
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Vídeo */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400">
                            <Eye size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate max-w-[200px]">
                          {video.title}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {video.status === 'active' ? 'Ativo' : 'Inativo'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Visualizações */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.views.toLocaleString()}
                    </p>
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-black',
                        video.metrics.ctr >= 5
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : video.metrics.ctr >= 2
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400',
                      )}
                    >
                      {video.metrics.ctr.toFixed(1).replace('.', ',')}%
                    </span>
                  </td>

                  {/* Conversões */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.conversions.toLocaleString()}
                    </p>
                  </td>

                  {/* Receita */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.revenue > 0
                        ? `R$ ${video.metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                  </td>

                  {/* Engajamento */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Curtidas"
                      >
                        <Heart size={12} className="text-rose-400" />
                        {video.metrics.likes}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Comentários"
                      >
                        <MessageCircle size={12} className="text-emerald-400" />
                        {video.metrics.comments}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Compartilhamentos"
                      >
                        <Share2 size={12} className="text-amber-400" />
                        {video.metrics.shares}
                      </span>
                    </div>
                  </td>

                  {/* Duração */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {formatDuration(video.duration)}
                    </p>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-slate-400 dark:text-slate-500 font-bold text-sm"
                  >
                    {search.trim()
                      ? 'Nenhum vídeo encontrado para esta busca.'
                      : 'Nenhum vídeo cadastrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {filteredAndSorted.length} vídeos · Página {page + 1} de{' '}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
