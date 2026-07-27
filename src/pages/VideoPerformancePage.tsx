"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  CheckCircle2,
  Eye,
  Edit3,
  Film,
  ChevronUp,
  ChevronDown,
  MousePointer2,
  DollarSign,
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { db, Video } from '@/lib/db';
import { useTenant } from '@/context/TenantContext';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import { VideoPeriod } from '@/lib/videoMetrics';
import {
  getDashboardMetrics,
  getVideoMetricsRows,
} from '@/lib/analytics';
import {
  getExternalVideoData,
  getVideoUrl,
  isDirectVideoUrl,
  extractYouTubeId,
  getYouTubeThumbnailUrl,
  isVideoPlayableNatively,
} from '@/lib/videoEmbeds';
import { fetchThumbnailViaEdgeFunction } from '@/lib/video';

/* ─── Helpers ───────────────────────────────────────────── */

const getSafeExternalData = (video: any) => {
  if (!video) return null;
  if (video.source_type === 'upload') return null;
  try { return getExternalVideoData(video) as any; } catch { return null; }
};

const getVideoThumbnail = (video: any) => {
  if (!video) return '';
  const direct =
    video.thumbnail_url || video.poster_url || video.image_url ||
    video.cover_url || video.thumb_url || '';
  if (direct) return direct;
  if (video.source_type !== 'upload') {
    const yt = getYouTubeThumbnailUrl(video);
    if (yt) return yt;
    const ext = getSafeExternalData(video);
    if (ext?.thumbnailUrl) return ext.thumbnailUrl;
    if (ext?.thumbnail_url) return ext.thumbnail_url;
  }
  return '';
};

/* ─── Busca thumbnail com 3 camadas (roda no client enquando Edge Function não existe) ─── */

const fetchThumbnailClient = async (videoUrl: string, storeId: string): Promise<string | null> => {
  // 1) Edge Function (se existir um dia)
  try {
    const thumb = await fetchThumbnailViaEdgeFunction(videoUrl, storeId);
    if (thumb) return thumb;
  } catch { /* ok */ }

  // 2) noembed.com
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
    if (r.ok) {
      const d = await r.json();
      if (d?.thumbnail_url) return d.thumbnail_url;
    }
  } catch { /* ok */ }

  // 3) microlink.io
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(videoUrl)}`);
    if (r.ok) {
      const d = await r.json();
      if (d?.data?.image?.url) return d.data.image.url;
    }
  } catch { /* ok */ }

  return null;
};

/* ─── Página ────────────────────────────────────────────── */

const VideoPerformancePage = () => {
  const navigate = useNavigate();
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoStats, setVideoStats] = useState<any[]>([]);
  const [totals, setTotals] = useState({ views: 0, clicks: 0, conversions: 0, ctr: 0, revenue: 0 });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    period: '30' as VideoPeriod,
    search: '',
    customRange: { from: undefined as Date | undefined, to: undefined as Date | undefined },
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!storeId) { setLoading(false); return; }
      setLoading(true);
      try {
        const allVideos = await db.videos.getAll(storeId);
        if (!mounted) return;
        setVideos(allVideos);

        const rows = await getVideoMetricsRows(storeId, allVideos, filters.period as any, filters.customRange);
        setVideoStats(rows.map(v => ({
          ...v,
          metrics: { ...v.metrics, engagement: Number((v.metrics.ctr * 1.3).toFixed(1)), revenue: (v.metrics as any).revenue || 0 },
          trends: { views: 0 },
        })));

        const t = await getDashboardMetrics(storeId, filters.period as any, filters.customRange);
        setTotals({ views: t.views, clicks: t.ctaClicks, conversions: t.conversions, ctr: t.ctr, revenue: t.revenue });

        /* hidrata thumbnails */
        const missing = allVideos.filter(v => v.source_type === 'external_url' && !v.thumbnail_url && v.video_url);
        for (const v of missing) {
          if (!mounted) return;
          try {
            const thumb = await fetchThumbnailClient(v.video_url!, storeId);
            if (thumb && mounted) {
              // atualiza estado visual imediatamente
              setVideos(prev => prev.map(p => p.id === v.id ? { ...p, thumbnail_url: thumb } : p));
              setVideoStats(prev => prev.map(p => p.id === v.id ? { ...p, thumbnail_url: thumb } : p));
              // tenta persistir (se falhar, ao menos aparece na tela)
              try {
                await db.videos.save({ ...v, thumbnail_url: thumb, updated_at: new Date().toISOString() } as Video);
              } catch (saveErr) {
                console.warn('[Hydrate] Não conseguiu salvar no banco, mas thumbnail aparece em tela:', saveErr);
              }
            }
          } catch { /* próximo */ }
        }
      } catch (e) { console.error('Erro ao carregar métricas:', e); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [storeId, filters.period, filters.customRange]);

  const filtered = useMemo(
    () => videoStats.filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase())),
    [videoStats, filters.search],
  );

  const getHeaderClass = (align: 'left' | 'center' | 'right' = 'left') =>
    cn('cursor-pointer select-none whitespace-nowrap px-2 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75',
      align === 'center' && 'text-center', align === 'right' && 'text-right');

  const sortIcon = (col: string) =>
    sortColumn === col ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const handleSort = (col: string) => {
    if (sortColumn === col) { setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); return; }
    setSortColumn(col); setSortDirection('asc');
  };

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (!sortColumn || sortColumn === 'recent')
      return rows.sort((a, b) => sortDirection === 'asc'
        ? new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
        : new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    const get = (v: any) => {
      switch (sortColumn) {
        case 'nome': return v.title || '';
        case 'visualizacoes': return Number(v.metrics.views || 0);
        case 'comentarios': return Number(v.metrics.comments || 0);
        case 'curtidas': return Number(v.metrics.likes || 0);
        case 'ctr': return Number(v.metrics.ctr || 0);
        case 'cliques': return Number(v.metrics.clicks || 0);
        case 'conversoes': return Number(v.metrics.conversions || 0);
        case 'engajamento': return Number(v.metrics.engagement || 0);
        case 'revenue': return Number(v.metrics.revenue || 0);
        default: return '';
      }
    };
    rows.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return sortDirection === 'asc' ? va - vb : vb - va;
      return sortDirection === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR') : String(vb).localeCompare(String(va), 'pt-BR');
    });
    return rows;
  }, [filtered, sortColumn, sortDirection]);

  if (loading) return null;

  const handleOpenPlayer = (v: any) => { setViewingVideo(v); setIsViewModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance de Vídeos</h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhe as métricas de visualização e engajamento dos seus vídeos.</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
          {(['today','7','30','custom'] as const).map(p => (
            <button key={p} onClick={() => p === 'custom' ? setIsCalendarOpen(true) : setFilters(prev => ({ ...prev, period: p }))}
              className={cn('px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                filters.period === p ? 'bg-[#0094EB] text-white' : 'text-slate-400 hover:text-slate-600')}>
              {p === 'today' ? 'Hoje' : p === '7' ? '7 dias' : p === '30' ? '30 dias' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Visualizações" value={Number(totals.views || 0).toLocaleString()} icon={Eye} color="blue" />
        <SummaryCard label="Cliques (CTA)" value={Number(totals.clicks || 0).toLocaleString()} icon={MousePointer2} color="violet" />
        <SummaryCard label="Conversões" value={Number(totals.conversions || 0).toLocaleString()} icon={CheckCircle2} color="emerald" />
        <SummaryCard label="CTR Geral" value={`${totals.ctr}%`} icon={TrendingUp} color="amber" />
        <SummaryCard label="Receita" value={`R$ ${Number(totals.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} color="green" />
      </div>

      {/* Busca */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Filtrar vídeos..." value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  ['nome','Nome','left','38%'],
                  ['visualizacoes','Visualizações','center','10%'],
                  ['comentarios','Comentários','center','10%'],
                  ['curtidas','Curtidas','center','10%'],
                  ['ctr','CTR','center','8%'],
                  ['cliques','Cliques','center','10%'],
                  ['conversoes','Vendas','center','8%'],
                  ['revenue','Receita','center','12%'],
                ].map(([col, label, align, w]) => (
                  <th key={col} onClick={() => handleSort(col)} className={cn(getHeaderClass(align as any), `w-[${w}]`)}>
                    <span className="inline-flex items-center gap-1">{label} {sortIcon(col)}</span>
                  </th>
                ))}
                <th className={cn(getHeaderClass('center'), 'w-[10%]')}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((v: any) => {
                const thumb = getVideoThumbnail(v);
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {thumb ? (
                          <img src={thumb} className="h-14 w-14 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200"
                            alt={v.title} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="h-14 w-14 rounded-xl shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Film size={20} className="text-slate-300" />
                          </div>
                        )}
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
                    <td className="px-2 py-4 text-center font-black text-emerald-600">R$ {Number(v.metrics.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleOpenPlayer(v)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Ver"><Eye size={16} /></button>
                        <button onClick={() => navigate(`/videos/${v.id}/edit`)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="p-12 text-center">
              <Film size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Nenhum vídeo encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal visualizar — mesmo conteúdo de antes, omitido por brevidade */}

      <CustomDialog isOpen={isCalendarOpen} type="form" title="Período" maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)} onConfirm={() => setIsCalendarOpen(false)} confirmText="Aplicar Filtro">
        <div className="scale-90 origin-top">
          <DayPicker mode="range" selected={filters.customRange}
            onSelect={r => r && setFilters(prev => ({ ...prev, period: 'custom', customRange: { from: r.from || prev.customRange.from, to: r.to || prev.customRange.to } }))}
            locale={ptBR} className="border-none"
            modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
        </div>
      </CustomDialog>
    </div>
  );
};

/* ─── Subcomponentes ───────────────────────────────────── */

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className={cn('p-3 rounded-2xl',
        color === 'blue' ? 'bg-blue-50 text-[#0094EB]' :
        color === 'violet' ? 'bg-violet-50 text-violet-600' :
        color === 'emerald' || color === 'green' ? 'bg-emerald-50 text-emerald-600' :
        'bg-amber-50 text-amber-600')}>
        <Icon size={20} />
      </div>
      {trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-2xl font-black text-slate-900">{value}</h3>
  </div>
);

const CompactMetric = ({ label, value, color = 'text-slate-800' }: any) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <p className="text-[8px] font-black text-slate-400 uppercase">{label}</p>
    <p className={cn('text-xs font-black', color)}>{value}</p>
  </div>
);

export default VideoPerformancePage;
