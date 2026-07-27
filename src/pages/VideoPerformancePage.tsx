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

// ─── Helpers de thumbnail ───────────────────────────────────────────

const getSafeExternalData = (video: any) => {
  if (!video) return null;
  if (video.source_type === 'upload') return null;

  try {
    return getExternalVideoData(video) as any;
  } catch {
    return null;
  }
};

const getVideoThumbnail = (video: any) => {
  if (!video) return '';

  const directThumb =
    video.thumbnail_url ||
    video.poster_url ||
    video.image_url ||
    video.cover_url ||
    video.thumb_url ||
    '';

  if (directThumb) return directThumb;

  if (video.source_type !== 'upload') {
    const youTubeThumb = getYouTubeThumbnailUrl(video);
    if (youTubeThumb) return youTubeThumb;

    const externalData = getSafeExternalData(video);
    if (externalData?.thumbnailUrl || externalData?.thumbnail_url) {
      return externalData.thumbnailUrl || externalData.thumbnail_url;
    }
  }

  return '';
};

// ─── Busca de thumbnail com fallbacks ───────────────────────────────

const fetchThumbnailWithFallbacks = async (
  videoUrl: string,
  storeId: string
): Promise<string | null> => {
  // 1) Tenta a Edge Function primeiro
  try {
    console.log('[Thumbnail] Tentando Edge Function para:', videoUrl);
    const thumb = await fetchThumbnailViaEdgeFunction(videoUrl, storeId);
    if (thumb) {
      console.log('[Thumbnail] ✅ Edge Function retornou:', thumb);
      return thumb;
    }
    console.log('[Thumbnail] Edge Function retornou vazio/null');
  } catch (err) {
    console.warn('[Thumbnail] ❌ Edge Function falhou:', err);
  }

  // 2) Fallback: noembed.com (gratuito, sem auth)
  try {
    console.log('[Thumbnail] Tentando noembed.com para:', videoUrl);
    const noembedRes = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`
    );
    if (noembedRes.ok) {
      const data = await noembedRes.json();
      if (data?.thumbnail_url) {
        console.log('[Thumbnail] ✅ noembed retornou:', data.thumbnail_url);
        return data.thumbnail_url;
      }
    }
    console.log('[Thumbnail] noembed não retornou thumbnail');
  } catch (err) {
    console.warn('[Thumbnail] ❌ noembed falhou:', err);
  }

  // 3) Fallback: extrai og:image da página (último recurso)
  // Só funciona para URLs de redes sociais que expõem og:image no HTML público
  try {
    console.log('[Thumbnail] Tentando extrair og:image de:', videoUrl);
    const pageRes = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(videoUrl)}&screenshot=true&meta=true`
    );
    if (pageRes.ok) {
      const pageData = await pageRes.json();
      if (pageData?.data?.image?.url) {
        console.log('[Thumbnail] ✅ microlink retornou:', pageData.data.image.url);
        return pageData.data.image.url;
      }
    }
    console.log('[Thumbnail] microlink não retornou imagem');
  } catch (err) {
    console.warn('[Thumbnail] ❌ microlink falhou:', err);
  }

  console.log('[Thumbnail] ❌ Nenhum método retornou thumbnail para:', videoUrl);
  return null;
};

// ─── Componente ─────────────────────────────────────────────────────

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
    customRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const allVideos = await db.videos.getAll(storeId);

        if (!mounted) return;

        setVideos(allVideos);

        const rows = await getVideoMetricsRows(storeId, allVideos, filters.period as any, filters.customRange);
        const mappedRows = rows.map(v => ({
          ...v,
          metrics: {
            ...v.metrics,
            engagement: Number((v.metrics.ctr * 1.3).toFixed(1)),
            revenue: (v.metrics as any).revenue || 0
          },
          trends: { views: 0 }
        }));
        setVideoStats(mappedRows);

        const dashboardTotals = await getDashboardMetrics(storeId, filters.period as any, filters.customRange);
        setTotals({
          views: dashboardTotals.views,
          clicks: dashboardTotals.ctaClicks,
          conversions: dashboardTotals.conversions,
          ctr: dashboardTotals.ctr,
          revenue: dashboardTotals.revenue
        });

        // ─── Hidrata thumbnails faltantes (com fallbacks) ──────────
        const hydrateMissingThumbnails = async () => {
          const videosSemThumb = allVideos.filter(
            v =>
              v.source_type === 'external_url' &&
              !v.thumbnail_url &&
              v.video_url
          );

          if (videosSemThumb.length === 0) return;

          console.log(
            `[Hydrate] ${videosSemThumb.length} vídeos externos sem thumbnail. Buscando...`
          );

          for (const v of videosSemThumb) {
            if (!mounted) return;

            try {
              const thumbUrl = await fetchThumbnailWithFallbacks(
                v.video_url!,
                storeId
              );

              if (thumbUrl && mounted) {
                // Salva no banco
                await db.videos.save({
                  ...v,
                  thumbnail_url: thumbUrl,
                  updated_at: new Date().toISOString(),
                } as Video);

                // Atualiza estados
                setVideos(prev =>
                  prev.map(pv =>
                    pv.id === v.id ? { ...pv, thumbnail_url: thumbUrl } : pv
                  )
                );

                setVideoStats(prev =>
                  prev.map(pv =>
                    pv.id === v.id ? { ...pv, thumbnail_url: thumbUrl } : pv
                  )
                );

                console.log(`[Hydrate] ✅ Thumbnail salva para: ${v.title}`);
              }
            } catch (err) {
              console.warn(`[Hydrate] ❌ Falha ao buscar thumbnail para ${v.title}:`, err);
            }
          }
        };

        // Dispara em background — não bloqueia o carregamento da página
        hydrateMissingThumbnails();
      } catch (error) {
        console.error('Erro ao carregar métricas reais:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [storeId, filters.period, filters.customRange]);

  const filteredVideoStats = useMemo(() => {
    return videoStats.filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase()));
  }, [videoStats, filters.search]);

  const handleOpenPlayer = (video: any) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const getHeaderClass = (align: 'left' | 'center' | 'right' = 'left') =>
    cn(
      'cursor-pointer select-none whitespace-nowrap px-2 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right'
    );

  const sortIcon = (column: string) =>
    sortColumn === column
      ? sortDirection === 'asc'
        ? <ChevronUp size={12} />
        : <ChevronDown size={12} />
      : null;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const sortedVideoStats = useMemo(() => {
    const rows = [...filteredVideoStats];

    if (!sortColumn || sortColumn === 'recent') {
      return rows.sort((a, b) =>
        sortDirection === 'asc'
          ? new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
          : new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      );
    }

    const getValue = (video: any) => {
      switch (sortColumn) {
        case 'nome':
          return video.title || '';
        case 'visualizacoes':
          return Number(video.metrics.views || 0);
        case 'comentarios':
          return Number(video.metrics.comments || 0);
        case 'curtidas':
          return Number(video.metrics.likes || 0);
        case 'ctr':
          return Number(video.metrics.ctr || 0);
        case 'cliques':
          return Number(video.metrics.clicks || 0);
        case 'conversoes':
          return Number(video.metrics.conversions || 0);
        case 'engajamento':
          return Number(video.metrics.engagement || 0);
        case 'revenue':
          return Number(video.metrics.revenue || 0);
        default:
          return '';
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
  }, [filteredVideoStats, sortColumn, sortDirection]);

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Visualizações" value={Number(totals.views || 0).toLocaleString()} icon={Eye} color="blue" />
        <SummaryCard label="Cliques (CTA)" value={Number(totals.clicks || 0).toLocaleString()} icon={MousePointer2} color="violet" />
        <SummaryCard label="Conversões" value={Number(totals.conversions || 0).toLocaleString()} icon={CheckCircle2} color="emerald" />
        <SummaryCard label="CTR Geral" value={`${totals.ctr}%`} icon={TrendingUp} color="amber" />
        <SummaryCard label="Receita" value={`R$ ${Number(totals.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} color="green" />
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
        <div className="overflow-x-auto">
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
                <th onClick={() => handleSort('conversoes')} className={cn(getHeaderClass('center'), 'w-[8%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Vendas {sortIcon('conversoes')}</span>
                </th>
                <th onClick={() => handleSort('revenue')} className={cn(getHeaderClass('center'), 'w-[12%]')}>
                  <span className="inline-flex items-center gap-1 justify-center">Receita {sortIcon('revenue')}</span>
                </th>
                <th className={cn(getHeaderClass('center'), 'w-[10%]')}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVideoStats.map((v: any) => {
                const thumb = getVideoThumbnail(v);

                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            className="h-14 w-14 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200"
                            alt={v.title}
                            loading="lazy"
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
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

          {sortedVideoStats.length === 0 && (
            <div className="p-12 text-center">
              <Film size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Nenhum vídeo encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-4xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (() => {
          const videoUrl = getVideoUrl(viewingVideo as any);
          const isExternalVideo = viewingVideo.source_type === 'external_url';
          const externalData = isExternalVideo ? getSafeExternalData(viewingVideo) : null;
          const youTubeId = extractYouTubeId(videoUrl);

          const shouldUseNativePlayer = isVideoPlayableNatively(viewingVideo as any);
          const shouldUseNativeForDirect = !shouldUseNativePlayer && isDirectVideoUrl(videoUrl);
          const shouldUseYouTubeEmbed = !shouldUseNativePlayer && !shouldUseNativeForDirect && Boolean(youTubeId);

          const embedUrl = youTubeId
            ? `https://www.youtube.com/embed/${youTubeId}`
            : externalData?.embedUrl || '';

          const modalThumb = getVideoThumbnail(viewingVideo);

          if (shouldUseNativePlayer || shouldUseNativeForDirect) {
            return (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-[240px] shrink-0 mx-auto lg:mx-0">
                  {videoUrl ? (
                    <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh]">
                      <video
                        src={videoUrl}
                        className="w-full max-w-full h-auto max-h-[400px] object-contain"
                        poster={modalThumb || undefined}
                        controls
                        autoPlay
                        loop
                        playsInline
                      />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh] flex flex-col items-center justify-center gap-4 p-4">
                      {modalThumb ? (
                        <img
                          src={modalThumb}
                          alt={viewingVideo.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <Film size={42} className="text-slate-500" />
                          <p className="text-white text-sm font-bold text-center">Sem vídeo</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col pt-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                    <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {viewingVideo.source_type === 'upload' ? 'UPLOAD' : 'URL'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <CompactMetric label="Views" value={Number((viewingVideo as any).metrics?.views || 0).toLocaleString('pt-BR')} />
                    <CompactMetric label="CTR" value={`${Number((viewingVideo as any).metrics?.ctr || 0).toFixed(1).replace('.', ',')}%`} color="text-[#0094EB]" />
                    <CompactMetric label="Conversões" value={Number((viewingVideo as any).metrics?.conversions || 0).toLocaleString('pt-BR')} color="text-emerald-600" />
                    <CompactMetric label="Engajamento" value={`${Number((viewingVideo as any).metrics?.engagement || 0).toFixed(1).replace('.', ',')}%`} color="text-violet-600" />
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"><Edit3 size={14} /> Editar</button>
                    <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs">Fechar</button>
                  </div>
                </div>
              </div>
            );
          }

          if (shouldUseYouTubeEmbed) {
            return (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:max-w-[420px] mx-auto lg:mx-0 shrink-0">
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-black shadow-xl">
                    <div className="aspect-[9/16] w-full max-w-[420px] bg-black">
                      <iframe
                        src={embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        title={viewingVideo.title}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col pt-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                    <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">YouTube</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plataforma</p>
                      <p className="mt-1 text-sm font-black text-slate-800">YouTube</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-black text-slate-800">{(viewingVideo as any).active === false ? 'Desativado' : 'Ativo'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                      <p className="mt-1 text-sm font-black text-slate-800">URL</p>
                    </div>
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
                {modalThumb ? (
                  <div className="aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-xl">
                    <img
                      src={modalThumb}
                      alt={viewingVideo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Film size={42} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">Prévia indisponível</p>
                    <p className="mt-1 text-xs text-slate-500">Abra o vídeo na plataforma original para assistir.</p>
                  </div>
                )}

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-sm">
                      {(externalData?.platform || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vídeo externo</p>
                      <h3 className="truncate text-lg font-black text-slate-900">{viewingVideo.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Este vídeo não pode ser reproduzido dentro do app. Abra na plataforma original.</p>
                  {videoUrl && (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Abrir vídeo na plataforma
                    </a>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col pt-1">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                  <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">URL</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{(viewingVideo as any).active === false ? 'Desativado' : 'Ativo'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                    <p className="mt-1 text-sm font-black text-slate-800">URL</p>
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
      <div className={cn('p-3 rounded-2xl', color === 'blue' ? 'bg-blue-50 text-[#0094EB]' : color === 'violet' ? 'bg-violet-50 text-violet-600' : color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
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
