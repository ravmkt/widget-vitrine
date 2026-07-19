"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product, resolveStoreId } from '@/lib/db';
import { useTenant } from '@/context/TenantContext';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Eye,
  Film,
  ChevronUp,
  ChevronDown,
  Play,
  ExternalLink,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { subDays, eachDayOfInterval } from 'date-fns';
import {
  getVideoMetricsRows,
} from '@/lib/analytics';
import {
  getExternalVideoData,
  getVideoUrl,
  isDirectVideoUrl,
  getYouTubeThumbnailUrl,
  extractYouTubeId,
  isVideoPlayableNatively,
} from '@/lib/videoEmbeds';

const getSafeExternalData = (video: Video | null) => {
  if (!video) return null;
  if (video.source_type === 'upload') return null;

  try {
    return getExternalVideoData(video as any) as any;
  } catch {
    return null;
  }
};

const getVideoThumbnail = (video: Video | null) => {
  if (!video) return '';

  const directThumb =
    video.thumbnail_url ||
    (video as any).poster_url ||
    (video as any).image_url ||
    (video as any).cover_url ||
    (video as any).thumb_url ||
    '';

  if (directThumb) return directThumb;

  if (video.source_type !== 'upload') {
    const youTubeThumb = getYouTubeThumbnailUrl(video as any);
    if (youTubeThumb) return youTubeThumb;

    const externalData = getSafeExternalData(video);
    if (externalData?.thumbnailUrl || externalData?.thumbnail_url) {
      return externalData.thumbnailUrl || externalData.thumbnail_url;
    }
  }

  return '';
};

const getSourceLabel = (sourceType?: string | null) => {
  if (sourceType === 'upload') return 'UPLOAD';
  if (sourceType === 'external_url') return 'URL';

  return 'VÍDEO';
};

const isExternalSource = (video: Video | null) => {
  if (!video) return false;
  return video.source_type === 'external_url';
};

const canPlayInsideApp = (video: Video | null) => {
  if (!video) return false;

  const url = getVideoUrl(video as any);

  if (video.source_type === 'upload' && url) return true;

  if (video.source_type === 'external_url') {
    if (isDirectVideoUrl(url)) return true;

    const externalData = getSafeExternalData(video);

    if (externalData?.embedUrl) return true;
  }

  return false;
};

const VideoThumb = ({
  video,
  onClick,
  size = 'table',
}: {
  video: Video;
  onClick: () => void;
  size?: 'table' | 'large';
}) => {
  const thumb = getVideoThumbnail(video);
  const videoUrl = getVideoUrl(video as any);
  const canUseVideoPreview =
    !thumb &&
    Boolean(videoUrl) &&
    (video.source_type === 'upload' || isDirectVideoUrl(videoUrl));

  const wrapperClass =
    size === 'large'
      ? 'aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-xl'
      : 'h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100';

  const playClass =
    size === 'large'
      ? 'h-14 w-14 rounded-full bg-white/95 text-[#0094EB] shadow-xl'
      : 'h-7 w-7 rounded-full bg-white/95 text-[#0094EB] shadow-md';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative block shrink-0 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#0094EB]/30',
        wrapperClass,
      )}
      title={`Visualizar ${video.title}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : canUseVideoPreview ? (
        <video
          src={videoUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
          <Film size={size === 'large' ? 42 : 18} />
        </div>
      )}

      <div className="absolute inset-0 bg-black/20 opacity-100 transition-opacity group-hover:bg-black/30" />

      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('inline-flex items-center justify-center', playClass)}>
          <Play
            size={size === 'large' ? 26 : 14}
            className="ml-0.5 fill-current"
          />
        </span>
      </div>

      {size === 'large' && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">
            {getSourceLabel(video.source_type)}
          </span>

          {isExternalSource(video) && !isDirectVideoUrl(videoUrl) && (
            <span className="rounded-full bg-white/90 p-2 text-slate-700">
              <ExternalLink size={14} />
            </span>
          )}
        </div>
      )}
    </button>
  );
};

type VideoMetrics = {
  views: number;
  comments: number;
  likes: number;
  clicks: number;
  conversions: number;
  ctr: number;
  ctrValue: number;
  engagement: number;
  revenue: number;
};

type VideoWithMetrics = Video & {
  metrics?: VideoMetrics;
};

type ProcessedVideo = Video & {
  metrics: VideoMetrics;
};

const VideoGalleryPage = () => {
  const navigate = useNavigate();
  const { storeId: tenantStoreId, loading: tenantLoading } = useTenant();

  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoWithMetrics, setVideoWithMetrics] = useState<VideoWithMetrics[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'external_url'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<VideoWithMetrics | null>(null);
  const [showExternalPlayer, setShowExternalPlayer] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    videoId: string;
    videoTitle: string;
    usedInStories: boolean;
  }>({
    isOpen: false,
    videoId: '',
    videoTitle: '',
    usedInStories: false,
  });

  const resolveSafeStoreId = useCallback(async () => {
    try {
      const candidate =
        tenantStoreId ||
        localStorage.getItem('current_store_id') ||
        localStorage.getItem('store_id') ||
        localStorage.getItem('selected_store_id') ||
        '';

      const resolved = await resolveStoreId(candidate || undefined);

      if (resolved) {
        return resolved;
      }
    } catch {
      // fallback abaixo
    }

    try {
      const stores = await db.stores.getAll();

      if (stores?.[0]?.id) {
        return stores[0].id;
      }
    } catch {
      // sem fallback
    }

    return '';
  }, [tenantStoreId]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const safeStoreId = await resolveSafeStoreId();

        if (!mounted) return;

        if (!safeStoreId) {
          setVideos([]);
          setVideoWithMetrics([]);
          setProducts([]);
          setResolvedStoreId('');
          showError('Não foi possível identificar a loja atual.');
          return;
        }

        setResolvedStoreId(safeStoreId);

        const [allVideos, allProducts] = await Promise.all([
          db.videos.getAll(safeStoreId),
          db.products.getAll(safeStoreId),
        ]);

        if (!mounted) return;

        setVideos(allVideos || []);
        setProducts(allProducts || []);

        const rows = await getVideoMetricsRows(safeStoreId, allVideos || [], '30');
        console.log('[VideoGallery] métricas recebidas:', rows.map(r => ({ id: r.id, title: r.title, likes: r.metrics.likes, comments: r.metrics.comments, views: r.metrics.views })));
        const processed = rows.map(v => ({
          ...v,
          metrics: {
            views: v.metrics.views,
            comments: v.metrics.comments,
            likes: v.metrics.likes,
            clicks: v.metrics.ctaClicks,
            conversions: v.metrics.conversions,
            ctr: v.metrics.ctr,
            ctrValue: v.metrics.ctr,
            engagement: Number((v.metrics.ctr * 1.3).toFixed(1)),
            revenue: (v.metrics as any).revenue || 0
          }
        }));
        
        setVideoWithMetrics(processed);
      } catch (e) {
        console.error('Erro ao carregar vídeos:', e);
        showError('Erro ao carregar vídeos.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (!tenantLoading) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [tenantLoading, resolveSafeStoreId]);

  const processedVideos = useMemo<ProcessedVideo[]>(() => {
    return videoWithMetrics
      .filter(v => {
        const matchesSearch = (v.title || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        const matchesSource =
          filterSource === 'all' ||
          v.source_type === filterSource;

        const matchesProduct =
          productFilter === 'all' ||
          (v as any).product_id === productFilter;

        return matchesSearch && matchesSource && matchesProduct;
      })
      .map(v => v as ProcessedVideo)
      .sort((a, b) => {
        if (!sortColumn || sortColumn === 'recent') {
          return sortDirection === 'asc'
            ? new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
            : new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        }

        const getSortValue = (video: ProcessedVideo) => {
          switch (sortColumn) {
            case 'nome':
              return video.title || '';

            case 'produto':
              return products.find(p => p.id === (video as any).product_id)?.name || 'Sem produto';

            case 'visualizacoes':
              return Number(video.metrics.views || 0);

            case 'comentarios':
              return Number(video.metrics.comments || 0);

            case 'curtidas':
              return Number(video.metrics.likes || 0);

            case 'ctr':
              return Number(video.metrics.ctrValue || 0);

            default:
              return '';
          }
        };

        const valueA = getSortValue(a);
        const valueB = getSortValue(b);

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc'
            ? valueA - valueB
            : valueB - valueA;
        }

        return sortDirection === 'asc'
          ? String(valueA).localeCompare(String(valueB), 'pt-BR')
          : String(valueB).localeCompare(String(valueA), 'pt-BR');
      });
  }, [
    videoWithMetrics,
    products,
    searchTerm,
    filterSource,
    productFilter,
    sortColumn,
    sortDirection,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortColumn(column);
    setSortDirection(column === 'recent' ? 'desc' : 'asc');
  };

  const handleViewVideo = (video: VideoWithMetrics) => {
    setViewingVideo(video);

    setShowExternalPlayer(false);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    const checkUsedInStories = async () => {
      try {
        const safeStoreId = resolvedStoreId || await resolveSafeStoreId();

        if (!safeStoreId) {
          setDeleteModal({
            isOpen: true,
            videoId: video.id,
            videoTitle: video.title,
            usedInStories: false,
          });
          return;
        }

        const storyVideos = await db.storyVideos.getAll(safeStoreId);
        const isUsed = storyVideos.some(sv => sv.video_id === video.id);

        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: isUsed,
        });
      } catch (e) {
        console.error('Erro ao verificar stories vinculados:', e);

        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: false,
        });
      }
    };

    checkUsedInStories();
  };

  const handleConfirmDelete = async () => {
    try {
      const safeStoreId = resolvedStoreId || await resolveSafeStoreId();

      try {
        await (db.videos as any).delete(deleteModal.videoId, safeStoreId);
      } catch {
        await db.videos.delete(deleteModal.videoId);
      }

      setVideos(prev => prev.filter(v => v.id !== deleteModal.videoId));
      showSuccess('Vídeo removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error('Erro ao excluir o vídeo:', e);
      showError('Erro ao excluir o vídeo.');
    }
  };

  const getHeaderClass = (
    column: string,
    align: 'left' | 'center' | 'right' = 'left',
  ) =>
    cn(
      'cursor-pointer select-none whitespace-nowrap px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
    );

  const sortIcon = (column: string) => {
    if (sortColumn !== column) return null;

    return sortDirection === 'asc'
      ? <ChevronUp size={12} />
      : <ChevronDown size={12} />;
  };

  if (loading || tenantLoading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Vídeos
          </h1>

          <p className="text-slate-500 font-medium mt-1">
            Gerencie os vídeos disponíveis para exibição.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/videos/new')}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Vídeo
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />

          <input
            type="text"
            placeholder="Pesquisar por título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value as any)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Fontes</option>
            <option value="upload">Upload</option>
            <option value="external_url">URL</option>
          </select>

          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos os Produtos</option>

            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm max-w-full">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={cn(getHeaderClass('preview'), 'w-[78px]')}>
                  Vídeo
                </th>

                <th
                  onClick={() => handleSort('nome')}
                  className={cn(getHeaderClass('nome'), 'w-[28%]')}
                >
                  <span className="inline-flex items-center gap-1 max-w-full truncate">
                    Nome {sortIcon('nome')}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('produto')}
                  className={cn(getHeaderClass('produto'), 'w-[20%]')}
                >
                  <span className="inline-flex items-center gap-1 max-w-full truncate">
                    Produto vinculado {sortIcon('produto')}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('visualizacoes')}
                  className={cn(getHeaderClass('visualizacoes', 'center'), 'w-[110px]')}
                >
                  <span className="inline-flex items-center gap-1 justify-center max-w-full truncate">
                    Visualizações {sortIcon('visualizacoes')}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('comentarios')}
                  className={cn(getHeaderClass('comentarios', 'center'), 'w-[100px]')}
                >
                  <span className="inline-flex items-center gap-1 justify-center max-w-full truncate">
                    Comentários {sortIcon('comentarios')}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('curtidas')}
                  className={cn(getHeaderClass('curtidas', 'center'), 'w-[90px]')}
                >
                  <span className="inline-flex items-center gap-1 justify-center max-w-full truncate">
                    Curtidas {sortIcon('curtidas')}
                  </span>
                </th>

                <th
                  onClick={() => handleSort('ctr')}
                  className={cn(getHeaderClass('ctr', 'center'), 'w-[80px]')}
                >
                  <span className="inline-flex items-center gap-1 justify-center max-w-full truncate">
                    CTR {sortIcon('ctr')}
                  </span>
                </th>

                <th className={cn(getHeaderClass('receita', 'center'), 'w-[100px]')}>
                  <span className="inline-flex items-center gap-1 justify-center max-w-full truncate">
                    Receita
                  </span>
                </th>

                <th className={cn(getHeaderClass('acoes', 'center'), 'w-[150px]')}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {processedVideos.map(video => {
                const {
                  views,
                  comments,
                  likes,
                  ctrValue,
                  revenue,
                } = video.metrics;

                const productName =
                  products.find(p => p.id === (video as any).product_id)?.name ||
                  'Sem produto';

                const isUrlLike = video.source_type === 'external_url';

                return (
                  <tr
                    key={video.id}
                    className="hover:bg-slate-50/50 transition-colors align-middle"
                  >
                    <td className="px-3 py-4">
                      <VideoThumb
                        video={video}
                        onClick={() => handleViewVideo(video)}
                      />
                    </td>

                    <td className="px-3 py-4 min-w-0">
                      <p className="font-bold text-slate-800 truncate max-w-full">
                        {video.title}
                      </p>

                      <span
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border mt-1 truncate',
                          video.source_type === 'upload' &&
                            'bg-blue-50 text-blue-600 border-blue-100',
                          isUrlLike &&
                            'bg-red-50 text-red-600 border-red-100',
                          video.source_type !== 'upload' && !isUrlLike &&
                            'bg-slate-50 text-slate-500 border-slate-100',
                        )}
                      >
                        {getSourceLabel(video.source_type)}
                      </span>
                    </td>

                    <td className="px-3 py-4 min-w-0">
                      <span className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100 truncate">
                        <Film size={12} className="shrink-0" />

                        <span className="truncate">
                          {productName}
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-4 text-center font-black text-slate-800">
                      {views.toLocaleString('pt-BR')}
                    </td>

                    <td className="px-3 py-4 text-center font-black text-slate-800">
                      {comments.toLocaleString('pt-BR')}
                    </td>

                    <td className="px-3 py-4 text-center font-black text-slate-800">
                      {likes.toLocaleString('pt-BR')}
                    </td>

                    <td className="px-3 py-4 text-center font-black text-slate-800">
                      {Number(ctrValue || 0).toFixed(2).replace('.', ',')}%
                    </td>

                    <td className="px-3 py-4 text-center font-black text-emerald-600">
                      {Number(revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewVideo(video)}
                          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                          title="Ver"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/videos/${video.id}/edit`)}
                          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClick(video)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="Excluir"
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

        {processedVideos.length === 0 && (
          <div className="p-12 text-center">
            <Film size={48} className="mx-auto text-slate-300 mb-4" />

            <p className="text-slate-500 font-bold">
              Nenhum vídeo encontrado.
            </p>
          </div>
        )}
      </div>

      <CustomDialog
        isOpen={isViewModalOpen}
        type="form"
        title="Visualizar Vídeo"
        maxWidth="max-w-4xl"
        onCancel={() => setIsViewModalOpen(false)}
      >
        {viewingVideo && (() => {
          const videoUrl = getVideoUrl(viewingVideo as any);
          const externalData = getSafeExternalData(viewingVideo);
          const modalThumb = getVideoThumbnail(viewingVideo);
          const modalMetrics = viewingVideo.metrics || { views: 0, ctrValue: 0, conversions: 0, engagement: 0 };
          const youTubeId = extractYouTubeId(videoUrl);

          // upload → sempre player HTML5
          const shouldUseNativePlayer = isVideoPlayableNatively(viewingVideo as any);

          // external_url + arquivo direto → player HTML5
          const shouldUseNativeForDirect = !shouldUseNativePlayer && isDirectVideoUrl(videoUrl);

          // external_url + YouTube → embed iframe automático
          const shouldUseYouTubeEmbed =
            !shouldUseNativePlayer && !shouldUseNativeForDirect && Boolean(youTubeId);

          // Indica se há algum player interno possível
          const canPlayInApp = shouldUseNativePlayer || shouldUseNativeForDirect || shouldUseYouTubeEmbed;

          // Só mostra "Abrir na plataforma" se não houver player interno
          const showPlatformButton = !canPlayInApp;

          const embedUrl = youTubeId
            ? `https://www.youtube.com/embed/${youTubeId}`
            : externalData?.embedUrl || '';

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

                          <p className="text-white text-sm font-bold text-center">
                            Sem vídeo
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col pt-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {viewingVideo.title}
                    </h3>

                    <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {getSourceLabel(viewingVideo.source_type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Views
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        {modalMetrics.views.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        CTR
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0094EB]">
                        {Number(modalMetrics.ctrValue || 0).toFixed(1).replace('.', ',')}%
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Conversões
                      </p>

                      <p className="mt-1 text-sm font-black text-emerald-600">
                        {modalMetrics.conversions.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Engajamento
                      </p>

                      <p className="mt-1 text-sm font-black text-violet-600">
                        {`${Number(modalMetrics.engagement || 0).toFixed(1).replace('.', ',')}%`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)}
                      className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs"
                    >
                      Fechar
                    </button>
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
                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {viewingVideo.title}
                    </h3>

                    <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      YouTube
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Views
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        {modalMetrics.views.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        CTR
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0094EB]">
                        {Number(modalMetrics.ctrValue || 0).toFixed(1).replace('.', ',')}%
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Conversões
                      </p>

                      <p className="mt-1 text-sm font-black text-emerald-600">
                        {modalMetrics.conversions.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Engajamento
                      </p>

                      <p className="mt-1 text-sm font-black text-violet-600">
                        {`${Number(modalMetrics.engagement || 0).toFixed(1).replace('.', ',')}%`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)}
                      className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Fallback: nenhum player interno — mostra "Abrir na plataforma"
          return (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:max-w-[420px] mx-auto lg:mx-0 shrink-0 space-y-4">
                {modalThumb ? (
                  <VideoThumb
                    video={viewingVideo}
                    size="large"
                    onClick={() => {}}
                  />
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Film size={42} className="mx-auto mb-3 text-slate-300" />

                    <p className="text-sm font-bold text-slate-700">
                      Prévia indisponível
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Abra o vídeo na plataforma original para assistir.
                    </p>
                  </div>
                )}

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-sm">
                      {(externalData?.platform || 'v').charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Vídeo externo
                      </p>

                      <h3 className="truncate text-lg font-black text-slate-900">
                        {viewingVideo.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600">
                    Este vídeo não pode ser reproduzido dentro do app. Abra na plataforma original.
                  </p>

                  {showPlatformButton && videoUrl && (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Abrir vídeo na plataforma
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col pt-1">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-slate-900 mb-1">
                    {viewingVideo.title}
                  </h3>

                  <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {getSourceLabel(viewingVideo.source_type)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Plataforma
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      Externo
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {(viewingVideo as any).active === false ? 'Desativado' : 'Ativo'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Tipo
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {getSourceLabel(viewingVideo.source_type)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)}
                    className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Vídeo"
        itemName={deleteModal.videoTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        usedInStories={deleteModal.usedInStories}
      />
    </div>
  );
};

export default VideoGalleryPage;
