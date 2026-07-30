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
  BookOpen,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import {
  getExternalVideoData,
  getVideoUrl,
  isDirectVideoUrl,
  getYouTubeThumbnailUrl,
  extractYouTubeId,
  isVideoPlayableNatively,
} from '@/lib/videoEmbeds';
import { fetchThumbnailViaEdgeFunction } from '@/lib/video';

/* ─── Helpers ───────────────────────────────────────────── */

const getSafeExternalData = (video: Video | null) => {
  if (!video) return null;
  if (video.source_type === 'upload') return null;
  try { return getExternalVideoData(video as any) as any; } catch { return null; }
};

const getVideoThumbnail = (video: Video | null) => {
  if (!video) return '';
  const direct = video.thumbnail_url || (video as any).poster_url || (video as any).image_url || (video as any).cover_url || (video as any).thumb_url || '';
  if (direct) return direct;
  if (video.source_type !== 'upload') {
    const yt = getYouTubeThumbnailUrl(video as any);
    if (yt) return yt;
    const ext = getSafeExternalData(video);
    if (ext?.thumbnailUrl || ext?.thumbnail_url) return ext.thumbnailUrl || ext.thumbnail_url;
  }
  return '';
};

const getSourceLabel = (sourceType?: string | null) => {
  if (sourceType === 'upload') return 'UPLOAD';
  if (sourceType === 'external_url') return 'URL';
  return 'VÍDEO';
};

/* ─── Thumbnail com play ────────────────────────────────── */

const VideoThumb = ({ video, onClick, size = 'table' }: { video: Video; onClick: () => void; size?: 'table' | 'large' }) => {
  const thumb = getVideoThumbnail(video);
  const videoUrl = getVideoUrl(video as any);
  const canUseVideoPreview = !thumb && Boolean(videoUrl) && (video.source_type === 'upload' || isDirectVideoUrl(videoUrl));

  const wrapperClass = size === 'large'
    ? 'aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-xl'
    : 'h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100';

  const playClass = size === 'large'
    ? 'h-14 w-14 rounded-full bg-white/95 text-[#0094EB] shadow-xl'
    : 'h-7 w-7 rounded-full bg-white/95 text-[#0094EB] shadow-md';

  return (
    <button type="button" onClick={onClick} className={cn('group relative block shrink-0 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#0094EB]/30', wrapperClass)} title={`Visualizar ${video.title}`}>
      {thumb ? (
        <img src={thumb} alt={video.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      ) : canUseVideoPreview ? (
        <video src={videoUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400"><Film size={size === 'large' ? 42 : 18} /></div>
      )}
      <div className="absolute inset-0 bg-black/20 opacity-100 transition-opacity group-hover:bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('inline-flex items-center justify-center', playClass)}><Play size={size === 'large' ? 26 : 14} className="ml-0.5 fill-current" /></span>
      </div>
      {size === 'large' && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">{getSourceLabel(video.source_type)}</span>
        </div>
      )}
    </button>
  );
};

/* ─── Página ────────────────────────────────────────────── */

const VideoGalleryPage = () => {
  const navigate = useNavigate();
  const { storeId: tenantStoreId, loading: tenantLoading } = useTenant();

  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyMap, setStoryMap] = useState<Record<string, string>>({});
  const [videoStoryMap, setVideoStoryMap] = useState<Record<string, Set<string>>>({});
  const [storyList, setStoryList] = useState<{ id: string; title: string }[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'external_url'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [storyFilter, setStoryFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; videoId: string; videoTitle: string; usedInStories: boolean }>({ isOpen: false, videoId: '', videoTitle: '', usedInStories: false });

  const resolveSafeStoreId = useCallback(async () => {
    try {
      const candidate = tenantStoreId || localStorage.getItem('current_store_id') || localStorage.getItem('store_id') || localStorage.getItem('selected_store_id') || '';
      const resolved = await resolveStoreId(candidate || undefined);
      if (resolved) return resolved;
    } catch {}
    try {
      const stores = await db.stores.getAll();
      if (stores?.[0]?.id) return stores[0].id;
    } catch {}
    return '';
  }, [tenantStoreId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const safeStoreId = await resolveSafeStoreId();
        if (!mounted) return;
        if (!safeStoreId) {
          setVideos([]); setProducts([]); setStoryMap({}); setVideoStoryMap({}); setStoryList([]); setResolvedStoreId('');
          showError('Não foi possível identificar a loja atual.');
          return;
        }
        setResolvedStoreId(safeStoreId);

        const [allVideos, allProducts, allStories, allStoryVideos] = await Promise.all([
          db.videos.getAll(safeStoreId),
          db.products.getAll(safeStoreId),
          db.stories.getAll(safeStoreId),
          db.storyVideos.getAll(safeStoreId),
        ]);

        if (!mounted) return;
        setVideos(allVideos || []);
        setProducts(allProducts || []);

        const storyNameById: Record<string, string> = {};
        (allStories || []).forEach(s => {
          storyNameById[s.id] = (s as any).title || (s as any).name || (s as any).nome || 'Story sem nome';
        });

        const sl = (allStories || []).map(s => ({ id: s.id, title: storyNameById[s.id] }));
        setStoryList(sl);

        // Mapa: videoId → Set de storyIds (para o filtro por ID)
        const vsMap: Record<string, Set<string>> = {};
        const map: Record<string, string> = {};
        (allStoryVideos || []).forEach(sv => {
          const videoId = sv.video_id || (sv as any).videoId;
          const storyId = sv.story_id || (sv as any).storyId;

          if (videoId && storyId && storyNameById[storyId]) {
            // Para exibição (nome do story)
            const existing = map[videoId];
            map[videoId] = existing ? `${existing}, ${storyNameById[storyId]}` : storyNameById[storyId];

            // Para filtro (ID do story)
            if (!vsMap[videoId]) vsMap[videoId] = new Set();
            vsMap[videoId].add(storyId);
          }
        });

        setStoryMap(map);
        setVideoStoryMap(vsMap);

        const videosSemThumb = (allVideos || []).filter(v => v.source_type === 'external_url' && !v.thumbnail_url && v.video_url);
        for (const v of videosSemThumb) {
          if (!mounted) return;
          try {
            const thumb = await fetchThumbnailViaEdgeFunction(v.video_url!, safeStoreId);
            if (thumb && mounted) {
              await db.videos.save({ ...v, thumbnail_url: thumb, updated_at: new Date().toISOString() } as Video);
              setVideos(prev => prev.map(pv => pv.id === v.id ? { ...pv, thumbnail_url: thumb } : pv));
            }
          } catch {}
        }
      } catch (e) {
        console.error('Erro ao carregar vídeos:', e);
        showError('Erro ao carregar vídeos.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (!tenantLoading) load();
    return () => { mounted = false; };
  }, [tenantLoading, resolveSafeStoreId]);

  const processedVideos = useMemo(() => {
    return videos
      .filter(v => {
        const matchSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchSource = filterSource === 'all' || v.source_type === filterSource;
        const matchProduct = productFilter === 'all' || (v as any).product_id === productFilter;
        const matchStory = storyFilter === 'all' || videoStoryMap[v.id]?.has(storyFilter);
        return matchSearch && matchSource && matchProduct && matchStory;
      })
      .sort((a, b) => {
        if (!sortColumn || sortColumn === 'recent') {
          return sortDirection === 'asc'
            ? new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
            : new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        }
        const get = (video: Video): string | number => {
          switch (sortColumn) {
            case 'nome': return video.title || '';
            case 'produto': return products.find(p => p.id === (video as any).product_id)?.name || 'Sem produto';
            case 'story': return storyMap[video.id] || '—';
            default: return '';
          }
        };
        const va = get(a), vb = get(b);
        if (typeof va === 'number' && typeof vb === 'number') return sortDirection === 'asc' ? va - vb : vb - va;
        return sortDirection === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR') : String(vb).localeCompare(String(va), 'pt-BR');
      });
  }, [videos, products, storyMap, videoStoryMap, searchTerm, filterSource, productFilter, storyFilter, sortColumn, sortDirection]);

  const handleSort = (col: string) => {
    if (sortColumn === col) { setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); return; }
    setSortColumn(col);
    setSortDirection(col === 'recent' ? 'desc' : 'asc');
  };

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = async (video: Video) => {
    try {
      const safeId = resolvedStoreId || await resolveSafeStoreId();
      if (!safeId) {
        setDeleteModal({ isOpen: true, videoId: video.id, videoTitle: video.title, usedInStories: false });
        return;
      }
      const storyVids = await db.storyVideos.getAll(safeId);
      const used = storyVids.some(sv => sv.video_id === video.id);
      setDeleteModal({ isOpen: true, videoId: video.id, videoTitle: video.title, usedInStories: used });
    } catch {
      setDeleteModal({ isOpen: true, videoId: video.id, videoTitle: video.title, usedInStories: false });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const safeId = resolvedStoreId || await resolveSafeStoreId();
      try { await (db.videos as any).delete(deleteModal.videoId, safeId); } catch { await db.videos.delete(deleteModal.videoId); }
      setVideos(prev => prev.filter(v => v.id !== deleteModal.videoId));
      showSuccess('Vídeo removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error('Erro ao excluir:', e);
      showError('Erro ao excluir o vídeo.');
    }
  };

  const getHeaderClass = (col: string, align: 'left' | 'center' | 'right' = 'left') =>
    cn('cursor-pointer select-none whitespace-nowrap px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75', align === 'center' && 'text-center', align === 'right' && 'text-right');

  const sortIcon = (col: string) => sortColumn === col ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  if (loading || tenantLoading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Galeria de Vídeos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os vídeos disponíveis para exibição nos stories.</p>
        </div>
        <button type="button" onClick={() => navigate('/videos/new')} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2">
          <Plus size={18} /> Novo Vídeo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar por título..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Fontes</option>
            <option value="upload">Upload</option>
            <option value="external_url">URL</option>
          </select>
          <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todos os Produtos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={storyFilter} onChange={e => setStoryFilter(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todos os Stories</option>
            {storyList.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABELA — larguras recalibradas
          ═══════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[880px] table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-[72px] px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left">
                  Vídeo
                </th>
                <th onClick={() => handleSort('nome')} className="w-[29%] cursor-pointer select-none px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Nome {sortIcon('nome')}</span>
                </th>
                <th onClick={() => handleSort('produto')} className="w-[23%] cursor-pointer select-none px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Produto {sortIcon('produto')}</span>
                </th>
                <th onClick={() => handleSort('story')} className="w-[23%] cursor-pointer select-none px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left hover:opacity-75">
                  <span className="inline-flex items-center gap-1">Story vinculado {sortIcon('story')}</span>
                </th>
                <th className="w-[120px] px-3 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedVideos.map(video => {
                const productName = products.find(p => p.id === (video as any).product_id)?.name || 'Sem produto';
                const storyName = storyMap[video.id] || '—';
                const isUrlLike = video.source_type === 'external_url';

                return (
                  <tr key={video.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                    {/* Thumb */}
                    <td className="px-3 py-4">
                      <VideoThumb video={video} onClick={() => handleViewVideo(video)} />
                    </td>

                    {/* Nome + badge de fonte */}
                    <td className="px-3 py-4 overflow-hidden">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{video.title}</p>
                        <span className={cn(
                          'inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border',
                          video.source_type === 'upload' && 'bg-blue-50 text-blue-600 border-blue-100',
                          isUrlLike && 'bg-red-50 text-red-600 border-red-100',
                          video.source_type !== 'upload' && !isUrlLike && 'bg-slate-50 text-slate-500 border-slate-100',
                        )}>
                          {getSourceLabel(video.source_type)}
                        </span>
                      </div>
                    </td>

                    {/* Produto */}
                    <td className="px-3 py-4 overflow-hidden">
                      <div className="min-w-0 max-w-full">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100 truncate max-w-full">
                          <Film size={12} className="shrink-0" />
                          <span className="truncate">{productName}</span>
                        </span>
                      </div>
                    </td>

                    {/* Story vinculado */}
                    <td className="px-3 py-4 overflow-hidden">
                      <div className="min-w-0 max-w-full">
                        {storyName !== '—' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100 truncate max-w-full">
                            <BookOpen size={12} className="shrink-0" />
                            <span className="truncate">{storyName}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button onClick={() => handleViewVideo(video)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors shrink-0" title="Ver"><Eye size={16} /></button>
                        <button onClick={() => navigate(`/videos/${video.id}/edit`)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors shrink-0" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteClick(video)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0" title="Excluir"><Trash2 size={16} /></button>
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
            <p className="text-slate-500 font-bold">Nenhum vídeo encontrado.</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL — idêntico ao anterior (sem métricas)
          ═══════════════════════════════════════════════════════ */}
<CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
  {viewingVideo && (() => {
    const videoUrl = getVideoUrl(viewingVideo as any);
    const externalData = getSafeExternalData(viewingVideo);
    const modalThumb = getVideoThumbnail(viewingVideo);
    const youTubeId = extractYouTubeId(videoUrl);
    const productName = products.find(p => p.id === (viewingVideo as any).product_id)?.name || 'Sem produto';
    const storyName = storyMap[viewingVideo.id] || '—';

    const shouldUseNativePlayer = isVideoPlayableNatively(viewingVideo as any);
    const shouldUseNativeForDirect = !shouldUseNativePlayer && isDirectVideoUrl(videoUrl);
    const shouldUseYouTubeEmbed = !shouldUseNativePlayer && !shouldUseNativeForDirect && Boolean(youTubeId);
    const embedUrl = youTubeId ? `https://www.youtube.com/embed/${youTubeId}` : externalData?.embedUrl || '';

    const hasPlayer = shouldUseNativePlayer || shouldUseNativeForDirect || shouldUseYouTubeEmbed;

    return (
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Player / Thumb */}
        <div className="w-full lg:w-[280px] shrink-0 mx-auto lg:mx-0">
          {hasPlayer ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black aspect-[9/16] w-full max-w-[280px] mx-auto">
              {shouldUseYouTubeEmbed ? (
                <iframe src={embedUrl} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" title={viewingVideo.title} />
              ) : videoUrl ? (
                <video src={videoUrl} className="w-full h-full object-contain" poster={modalThumb || undefined} controls playsInline />
              ) : (
                <div className="flex items-center justify-center h-full"><Film size={36} className="text-slate-500" /></div>
              )}
            </div>
          ) : modalThumb ? (
            <VideoThumb video={viewingVideo} size="large" onClick={() => {}} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center aspect-[9/16] max-w-[280px] mx-auto flex flex-col items-center justify-center">
              <Film size={36} className="mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Prévia indisponível</p>
            </div>
          )}
          {videoUrl && !hasPlayer && (
            <a href={videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 w-full">
              Abrir na plataforma <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Info + Ações */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-3">
            <h3 className="text-lg font-black text-slate-900 truncate">{viewingVideo.title}</h3>
            <span className="inline-block mt-1 bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{getSourceLabel(viewingVideo.source_type)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoCard label="Produto" value={productName} />
            <InfoCard label="Story vinculado" value={storyName} />
            <InfoCard label="Fonte" value={getSourceLabel(viewingVideo.source_type)} />
            <InfoCard label="Status" value={(viewingVideo as any).active === false ? 'Desativado' : 'Ativo'} />
          </div>

          <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
            <button onClick={() => { setIsViewModalOpen(false); navigate(`/videos/${viewingVideo.id}/edit`); }} className="flex-1 py-2.5 bg-[#0094EB] text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5">
              <Edit3 size={14} /> Editar
            </button>
            <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  })()}
</CustomDialog>

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="Excluir Vídeo" itemName={deleteModal.videoTitle} onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} usedInStories={deleteModal.usedInStories} />
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-800 truncate">{value}</p>
  </div>
);

export default VideoGalleryPage;
