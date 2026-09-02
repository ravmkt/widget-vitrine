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
      <ChevronUp size={12} className="inline ml-1 shrink-0 text-[#0091ff] dark:text-[#ff7a29]" />
    ) : (
      <ChevronDown size={12} className="inline ml-1 shrink-0 text-[#0091ff] dark:text-[#ff7a29]" />
    );
  };

  const Th = ({
    field,
    children,
    className,
    align = 'left',
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
  }) => (
    <th
      className={cn(
        'px-4 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-800 dark:hover:text-slate-300 transition-colors select-none',
        align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right',
        className,
      )}
      onClick={() => handleSort(field)}
    >
      <div className={cn(
        'inline-flex items-center gap-1',
        align === 'center' && 'justify-center w-full'
      )}>
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff] dark:border-[#ff7a29]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Barra de busca Premium */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0091ff] dark:text-[#ff7a29]"
        />
        <input
          type="text"
          placeholder="Buscar por título do vídeo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] transition-all"
        />
      </div>

      {/* Tabela com Borda Arredondada Premium */}
      <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#ff7a29]/20">
                <Th field="title" className="min-w-[220px]" align="left">
                  Vídeo
                </Th>
                <Th field="views" align="center">Visualizações</Th>
                <Th field="ctr" align="center">CTR</Th>
                <Th field="conversions" align="center">Conversões</Th>
                <Th field="revenue" align="center">Receita</Th>
                <Th field="likes" align="center">Engajamento</Th>
                <Th field="duration" align="center">Duração</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((video) => (
                <tr
                  key={video.id}
                  className="border-b border-slate-100 dark:border-[#ff7a29]/10 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Vídeo */}
                  <td className="px-4 py-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-[#ff7a29]/20">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                            <Eye size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-black text-slate-850 dark:text-white truncate max-w-[200px]">
                          {video.title}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          {video.status === 'active' ? 'Ativo' : 'Inativo'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Visualizações */}
                  <td className="px-4 py-4 text-center">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.views.toLocaleString()}
                    </p>
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-2xl text-[11px] font-black border',
                        video.metrics.ctr >= 5
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                          : video.metrics.ctr >= 2
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
                      )}
                    >
                      {video.metrics.ctr.toFixed(1).replace('.', ',')}%
                    </span>
                  </td>

                  {/* Conversões */}
                  <td className="px-4 py-4 text-center">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.conversions.toLocaleString()}
                    </p>
                  </td>

                  {/* Receita */}
                  <td className="px-4 py-4 text-center">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {video.metrics.revenue > 0
                        ? `R$ ${video.metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                  </td>

                  {/* Engajamento */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Curtidas"
                      >
                        <Heart size={12} className="text-rose-500 dark:text-rose-400 fill-rose-500/10" />
                        {video.metrics.likes}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Comentários"
                      >
                        <MessageCircle size={12} className="text-emerald-500 dark:text-emerald-400 fill-emerald-500/10" />
                        {video.metrics.comments}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                        title="Compartilhamentos"
                      >
                        <Share2 size={12} className="text-amber-500 dark:text-amber-400" />
                        {video.metrics.shares}
                      </span>
                    </div>
                  </td>

                  {/* Duração */}
                  <td className="px-4 py-4 text-center">
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
                    className="px-4 py-16 text-center text-slate-450 dark:text-slate-500 font-bold text-sm"
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

        {/* Paginação Premium */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-[#ff7a29]/20 bg-slate-50/50 dark:bg-transparent">
            <p className="text-xs font-bold text-slate-500">
              {filteredAndSorted.length} vídeos · Página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
