"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Eye,
  Edit3,
  Film,
  ChevronUp,
  ChevronDown,
  Info,
  PlayCircle,
  MousePointer2,
  MessageCircle,
  ShoppingBag,
  BarChart3,
  Clock,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { db, Video } from '@/lib/db';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import { aggregateVideoMetrics, buildVideoMetricsRows, getVideoInterval, VideoPeriod } from '@/lib/videoMetrics';
import { getExternalVideoData } from '@/lib/videoEmbeds';

const VideoPerformancePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [showExternalPlayer, setShowExternalPlayer] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [filters, setFilters] = useState({
    period: '30' as VideoPeriod,
    search: '',
    customRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });

  useEffect(() => {
    const load = async () => {
      const allVideos = await db.videos.getAll();
      setVideos(allVideos);
      setLoading(false);
    };
    load();
  }, []);

  const activeInterval = useMemo(() => getVideoInterval(filters.period, filters.customRange), [filters]);

  const videoStats = useMemo(() => {
    return buildVideoMetricsRows(videos, activeInterval)
      .filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase()))
      .map(v => {
        const duration = Math.max(1, Math.round((activeInterval.end.getTime() - activeInterval.start.getTime()) / 86400000) + 1);
        const prevStart = subDays(activeInterval.start, duration);
        const prevEnd = subDays(activeInterval.end, duration);
        const prevMetrics = buildVideoMetricsRows([v], { start: prevStart, end: prevEnd })[0]?.metrics;
        const viewDiff = prevMetrics && prevMetrics.views > 0 ? Math.round(((v.metrics.views - prevMetrics.views) / prevMetrics.views) * 100) : 0;

        return {
          ...v,
          metrics: {
            ...v.metrics,
            engagement: Number((v.metrics.ctr * 1.3).toFixed(1))
          },
          trends: { views: viewDiff }
        };
      });
  }, [videos, filters.search, activeInterval]);

  const totals = useMemo(() => aggregateVideoMetrics(videoStats), [videoStats]);

  const handleOpenPlayer = (video: any) => {
    setViewingVideo(video);
    setShowExternalPlayer(false);
    setIsViewModalOpen(true);
  };

  const getProductName = (video: any) => {
    return video.product_name || video.productName || 'Sem produto';
  };

  const getHeaderClass = (align: 'left' | 'center' | 'right' = 'left') =>
    cn(
      'cursor-pointer select-none whitespace-nowrap px-2 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right'
    );

  const sortIcon = (column: string) => (
    sortColumn === column ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null
  );

  const [sortColumn, setSortColumn] = useState<string | null>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const sortedVideoStats = useMemo(() => {
    const rows = [...videoStats];
    if (!sortColumn || sortColumn === 'recent') return rows.sort((a, b) => sortDirection === 'asc'
      ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const getValue = (video: any) => {
      switch (sortColumn) {
        case 'nome': return video.title || '';
        case 'visualizacoes': return Number(video.metrics.views || 0);
        case 'comentarios': return Number(video.metrics.comments || 0);
        case 'curtidas': return Number(video.metrics.likes || 0);
        case 'ctr': return Number(video.metrics.ctr || 0);
        case 'cliques': return Number(video.metrics.clicks || 0);
        case 'conversoes': return Number(video.metrics.conversions || 0);
        case 'engajamento': return Number(video.metrics.engagement || 0);
        default: return '';
      }
    };

    rows.sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      return sortDirection === 'asc'
        ? String(valueA).localeCompare(String(valueB), 'pt-BR')
        : String(valueB).localeCompare(String(valueA), 'pt-BR');
    });
    return rows;
  }, [videoStats, sortColumn, sortDirection]);

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance de Vídeos</h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhe as métricas de visualização e engajamento dos seus vídeos.</p>
        </div>

        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
          {['today', '7', '30', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => p === 'custom' ? setIsCalendarOpen(true) : setFilters(prev => ({ ...prev, period: p as VideoPeriod }))}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                filters.period === p ? 'bg-[#0094EB] text-white' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {p === 'today' ? 'Hoje' : p === '7' ? '7 dias' : p === '30' ? '30 dias' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Visualizações" value={Number(totals.views || 0).toLocaleString()} icon={Eye} color="blue" trend="+12%" />
<SummaryCard label="Cliques (CTA)" value={Number(totals.clicks || 0).toLocaleString()} icon={MousePointer2} color="violet" trend="+5%" />
<SummaryCard label="Conversões" value={Number(totals.conversions || 0).toLocaleString()} icon={CheckCircle2} color="emerald" trend="+8%" />
        <SummaryCard label="CTR Geral" value={`${totals.ctr}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Filtrar vídeos..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-hidden">
          <table className="w-full max-w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th onClick={() => handleSort('nome')} className={cn(getHeaderClass(), 'w-[38%]')}>
                  <span className="inline-flex items-center gap-1">Nome {sortIcon('nome')}</span>
                </th>
                <th onClick={() => handleSort('visualizacoes')} className={cn(getHeaderClass('center'), 'w-[10%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Visualizações {sortIcon('visualizacoes')}</span>
                </th>
                <th onClick={() => handleSort('comentarios')} className={cn(getHeaderClass('center'), 'w-[10%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Comentários {sortIcon('comentarios')}</span>
                </th>
                <th onClick={() => handleSort('curtidas')} className={cn(getHeaderClass('center'), 'w-[10%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Curtidas {sortIcon('curtidas')}</span>
                </th>
                <th onClick={() => handleSort('ctr')} className={cn(getHeaderClass('center'), 'w-[8%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">CTR {sortIcon('ctr')}</span>
                </th>
                <th onClick={() => handleSort('cliques')} className={cn(getHeaderClass('center'), 'w-[10%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Cliques {sortIcon('cliques')}</span>
                </th>
                <th onClick={() => handleSort('conversoes')} className={cn(getHeaderClass('center'), 'w-[10%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Conversões {sortIcon('conversoes')}</span>
                </th>
                <th className={cn(getHeaderClass('center'), 'w-[12%]')}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVideoStats.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={v.thumbnail_url || ''}
                        className="h-14 w-14 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200"
                        alt={v.title}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-800 truncate">{v.title}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{v.source_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.views || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.comments || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.likes || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.ctr || 0).toFixed(1).replace('.', ',')}%</td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.clicks || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center font-black text-slate-800">{Number(v.metrics.conversions || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => handleOpenPlayer(v)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Ver"><Eye size={16} /></button>
                      <button onClick={() => navigate(`/videos/${v.id}/edit`)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-4xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (() => {
          const isExternalVideo = viewingVideo.source_type === 'external_url';
          const externalData = isExternalVideo ? getExternalVideoData(viewingVideo as any) : null;
          const platformLabel = externalData ? (externalData.platform === 'youtube' ? 'YouTube Shorts' : externalData.platform === 'instagram' ? 'Instagram Reel' : externalData.platform === 'tiktok' ? 'TikTok' : 'Vídeo externo') : '';
          const platformButtonLabel = externalData ? (externalData.platform === 'youtube' ? 'Abrir no YouTube' : externalData.platform === 'instagram' ? 'Abrir no Instagram' : externalData.platform === 'tiktok' ? 'Abrir no TikTok' : 'Abrir vídeo na plataforma') : 'Abrir vídeo na plataforma';

          if (!isExternalVideo) {
            return (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-[240px] shrink-0 mx-auto lg:mx-0">
                  {viewingVideo.video_url ? (
                    <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh]">
                      <video
                        src={viewingVideo.video_url}
                        className="w-full max-w-full h-auto max-h-[400px] object-contain"
                        poster={viewingVideo.thumbnail_url}
                        controls
                        autoPlay
                        loop
                      />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh] flex flex-col items-center justify-center gap-4 p-4">
                      <p className="text-white text-sm font-bold text-center">Sem vídeo</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col pt-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                    <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Conteúdo Real</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <CompactMetric label="Views" value={Number((viewingVideo as any).metrics?.views || 0)} />
                    <CompactMetric label="CTR" value={`${Number((viewingVideo as any).metrics?.ctr || 0).toFixed(1)}%`} color="text-[#0094EB]" />
                    <CompactMetric label="Conversões" value={Number((viewingVideo as any).metrics?.conversions || 0)} color="text-emerald-600" />
                    <CompactMetric label="Engajamento" value={`${(viewingVideo as any).metrics?.engagement || 0}%`} color="text-violet-600" />
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"><Edit3 size={14} /> Editar</button>
                    <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs">Fechar</button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:max-w-[420px] mx-auto lg:mx-0 shrink-0 space-y-4">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-sm">
                      {(externalData?.platform || 'v').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{platformLabel}</p>
                      <h3 className="truncate text-lg font-black text-slate-900">{viewingVideo.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Este vídeo será exibido usando o player oficial da plataforma.</p>
                  <p className="text-xs leading-5 text-slate-500">Vídeos de redes sociais são exibidos através do player oficial da plataforma. Alguns elementos da plataforma podem aparecer.</p>
                  <div className="flex flex-col gap-2">
                    {!showExternalPlayer && externalData?.embedUrl ? (
                      <button
                        type="button"
                        onClick={() => setShowExternalPlayer(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#0094EB] px-4 py-3 text-xs font-black text-white transition-colors hover:bg-[#0E4787]"
                      >
                        Assistir no app
                      </button>
                    ) : null}
                    <a
                      href={externalData?.sourceUrl || (viewingVideo as any).video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      {platformButtonLabel}
                    </a>
                  </div>
                </div>
                {showExternalPlayer && externalData?.embedUrl ? (
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-black shadow-xl">
                    <div className="aspect-[9/16] w-full max-w-[420px] bg-black">
                      <iframe
                        src={externalData.embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        title={viewingVideo.title}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    {externalData?.embedUrl ? (
                      <p className="text-sm font-bold text-slate-600">Clique em “Assistir no app” para carregar a prévia oficial.</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-700">Não foi possível carregar a prévia deste vídeo.</p>
                        <p className="mt-1 text-xs text-slate-500">Abra o vídeo na plataforma original para assistir.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col pt-1">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                  <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{platformLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plataforma</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{platformLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">ID Externo</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{externalData?.externalId || '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{viewingVideo.active ? 'Ativo' : 'Desativado'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{viewingVideo.source_type}</p>
                  </div>
                </div>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"><Edit3 size={14} /> Editar</button>
                  <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs">Fechar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </CustomDialog>

      <CustomDialog isOpen={isCalendarOpen} type="form" title="Período" maxWidth="max-w-md" onCancel={() => setIsCalendarOpen(false)} onConfirm={() => setIsCalendarOpen(false)} confirmText="Aplicar Filtro">
        <div className="scale-90 origin-top">
          <DayPicker mode="range" selected={filters.customRange} onSelect={(r) => r && setFilters(prev => ({ ...prev, period: 'custom' as VideoPeriod, customRange: { from: r.from || prev.customRange.from, to: r.to || prev.customRange.to } }))} locale={ptBR} className="border-none" modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
        </div>
      </CustomDialog>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className={cn('p-3 rounded-2xl', color === 'blue' ? 'bg-blue-50 text-[#0094EB]' : color === 'violet' ? 'bg-violet-50 text-violet-600' : color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
        <Icon size={20} />
      </div>
      {trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-2xl font-black text-slate-900">{value}</h3>
  </div>
);

const MetricItem = ({ label, value, trend }: any) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-black text-slate-800">{value}</span>
      {trend !== undefined && <span className="text-[10px] font-black text-emerald-500">{trend}%</span>}
    </div>
  </div>
);

const CompactMetric = ({ label, value, color = 'text-slate-800' }: any) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <p className="text-[8px] font-black text-slate-400 uppercase">{label}</p>
    <p className={cn('text-xs font-black', color)}>{value}</p>
  </div>
);

export default VideoPerformancePage;